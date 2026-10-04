import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, Activity, Plus, Trash2, HeartPulse, Sparkles, PlusCircle, RefreshCw, Zap, Moon, AlertTriangle, CheckCircle, Download
} from 'lucide-react';

export interface VitalsRecord {
  id: string;
  date: string;
  time: string;
  systolic: number;
  diastolic: number;
  bloodSugar: number;
  heartRate: number;
  mood: string;
  notes: string;
}

interface VitalsTabProps {
  vitalsList: VitalsRecord[];
  systolic: number;
  setSystolic: (v: number) => void;
  diastolic: number;
  setDiastolic: (v: number) => void;
  bloodSugar: number;
  setBloodSugar: (v: number) => void;
  heartRate: number;
  setHeartRate: (v: number) => void;
  mood: string;
  setMood: (v: string) => void;
  vitalsNotes: string;
  setVitalsNotes: (v: string) => void;
  vitalsSuccess: boolean;
  onSubmitVitals: (e: React.FormEvent) => void;
  onDeleteVital: (id: string) => void;
  journalEntry: string;
  setJournalEntry: (v: string) => void;
  journalFeedback: string | null;
  journalFeedbackLoading: boolean;
  onSubmitJournal: (e: React.FormEvent) => void;
  getBPFeedback: (sys: number, dia: number) => { label: string; color: string; desc: string };
  getSugarFeedback: (sugar: number) => { label: string; color: string; desc: string };
}

// Enterprise Trend Chart for Blood Pressure
function BPTrendChart({ vitals }: { vitals: VitalsRecord[] }) {
  if (vitals.length < 2) {
    return (
      <div className="h-48 w-full bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
        <p className="text-xs text-slate-400 font-bold">Add at least 2 entries to see BP trends.</p>
      </div>
    );
  }

  // Calculate coordinates for SVG paths
  const sortedVitals = [...vitals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const chartHeight = 160;
  const chartWidth = 400; // Aspect ratio width
  const paddingX = 20;
  const paddingY = 20;
  
  const minBP = 40;
  const maxBP = 200;
  
  const getX = (index: number) => paddingX + (index * ((chartWidth - paddingX * 2) / (sortedVitals.length - 1)));
  const getY = (val: number) => chartHeight - paddingY - (((val - minBP) / (maxBP - minBP)) * (chartHeight - paddingY * 2));

  const sysPoints = sortedVitals.map((v, i) => `${getX(i)},${getY(v.systolic)}`).join(' L ');
  const diaPoints = sortedVitals.map((v, i) => `${getX(i)},${getY(v.diastolic)}`).join(' L ');

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#DC2626]" />
            Blood Pressure Trend
          </h4>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sys / Dia (mmHg)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-rose-500">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div> Systolic
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-rose-500">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div> Diastolic
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto hide-scrollbar">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[300px]">
          {/* Grid lines */}
          {[60, 100, 140, 180].map(val => (
            <g key={val}>
              <line x1={0} y1={getY(val)} x2={chartWidth} y2={getY(val)} className="stroke-slate-100" strokeWidth="1" />
              <text x={0} y={getY(val) - 4} className="fill-slate-300 text-[10px] font-mono">{val}</text>
            </g>
          ))}

          {/* Data Paths */}
          <motion.path 
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            d={`M ${sysPoints}`} 
            className="stroke-rose-500 fill-none" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <motion.path 
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
            d={`M ${diaPoints}`} 
            className="stroke-rose-400 fill-none" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Data Points */}
          {sortedVitals.map((v, i) => (
            <g key={`pts-${i}`}>
              <motion.circle 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 + (i * 0.1) }}
                cx={getX(i)} cy={getY(v.systolic)} r="4" className="fill-white stroke-rose-500" strokeWidth="2" 
              />
              <motion.circle 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.7 + (i * 0.1) }}
                cx={getX(i)} cy={getY(v.diastolic)} r="4" className="fill-white stroke-rose-400" strokeWidth="2" 
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function VitalsGauge({
  label,
  value,
  subValue,
  unit,
  percentage,
  colorClass,
  feedbackText,
  feedbackColor,
  icon: IconComponent,
  pulse = false
}: any) {
  const radius = 35;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white border border-slate-200 p-5 rounded-[24px] text-center flex flex-col items-center justify-between shadow-sm relative overflow-hidden"
    >
      <span className="text-xs text-slate-500 font-black uppercase tracking-widest block mb-3">{label}</span>
      <div className="relative w-28 h-28 flex items-center justify-center my-2 pointer-events-none">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} className="stroke-slate-100 fill-none" strokeWidth={strokeWidth} />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            cx="50"
            cy="50"
            r={radius}
            className={`fill-none ${colorClass}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5 mt-1">
          {IconComponent && <IconComponent className={`h-5 w-5 mb-1 ${pulse ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />}
          <div className="text-xl font-black text-slate-900 tracking-tight leading-none">
            {value}
            {subValue && <span className="text-slate-400 text-sm font-bold">{subValue}</span>}
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{unit}</span>
        </div>
      </div>
      <div className={`mt-3 text-[11px] font-black uppercase tracking-wider border px-3 py-1 rounded-full w-full truncate ${feedbackColor}`}>
        {feedbackText}
      </div>
    </motion.div>
  );
}

export default function VitalsTab({
  vitalsList,
  systolic, setSystolic, diastolic, setDiastolic, bloodSugar, setBloodSugar, heartRate, setHeartRate, mood, setMood,
  vitalsNotes, setVitalsNotes, vitalsSuccess, onSubmitVitals, onDeleteVital,
  journalEntry, setJournalEntry, journalFeedback, journalFeedbackLoading, onSubmitJournal,
  getBPFeedback, getSugarFeedback
}: VitalsTabProps) {
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8" id="patient-vitals-tab-root">
      {/* Header section */}
      <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#DC2626] bg-[#FFF0F2] border border-[#FECDD3] px-2.5 py-0.5 rounded-md mb-2">
            Clinical Telemetry Logs
          </span>
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-[#DC2626]" />
            Vitals & Bio-Telemetry
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Log and monitor baseline physiological markers to share with your verified clinical care team.
          </p>
        </div>
        <button
          onClick={() => {}}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Download Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Journal */}
        <div className="lg:col-span-5 space-y-6">
          <motion.form variants={itemVariants} onSubmit={onSubmitVitals} className="bg-white border border-slate-200/80 rounded-[32px] p-8 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-4 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-[#DC2626]" />
              Record Markers
            </h4>

            {vitalsSuccess && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Physiological markers committed successfully!</span>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Sys pressure</label>
                <div className="relative">
                  <input type="number" value={systolic} onChange={(e) => setSystolic(Number(e.target.value))} className="w-full text-sm font-bold border border-slate-200 rounded-xl py-3 pl-4 pr-12 bg-slate-50 focus:bg-white focus:border-[#DC2626] outline-none transition-all shadow-xs" required min="70" max="220" />
                  <span className="absolute right-4 top-3.5 text-[11px] font-black text-slate-400">mmHg</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Dia pressure</label>
                <div className="relative">
                  <input type="number" value={diastolic} onChange={(e) => setDiastolic(Number(e.target.value))} className="w-full text-sm font-bold border border-slate-200 rounded-xl py-3 pl-4 pr-12 bg-slate-50 focus:bg-white focus:border-[#DC2626] outline-none transition-all shadow-xs" required min="40" max="140" />
                  <span className="absolute right-4 top-3.5 text-[11px] font-black text-slate-400">mmHg</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Glucose</label>
                <div className="relative">
                  <input type="number" value={bloodSugar} onChange={(e) => setBloodSugar(Number(e.target.value))} className="w-full text-sm font-bold border border-slate-200 rounded-xl py-3 pl-4 pr-12 bg-slate-50 focus:bg-white focus:border-[#DC2626] outline-none transition-all shadow-xs" required min="50" max="400" />
                  <span className="absolute right-4 top-3.5 text-[11px] font-black text-slate-400">mg/dL</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Heart Rate</label>
                <div className="relative">
                  <input type="number" value={heartRate} onChange={(e) => setHeartRate(Number(e.target.value))} className="w-full text-sm font-bold border border-slate-200 rounded-xl py-3 pl-4 pr-12 bg-slate-50 focus:bg-white focus:border-[#DC2626] outline-none transition-all shadow-xs" required min="40" max="200" />
                  <span className="absolute right-4 top-3.5 text-[11px] font-black text-slate-400">BPM</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Baseline Mood</label>
              <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full text-sm font-bold border border-slate-200 rounded-xl py-3 px-4 bg-slate-50 focus:bg-white focus:border-[#DC2626] outline-none cursor-pointer transition-all shadow-xs">
                <option value="Energetic">✨ Energetic & Vibrant</option>
                <option value="Restful">🧘 Restful & Calmed</option>
                <option value="Calm">⚖ Stable & Calm</option>
                <option value="Tired">🔋 Tired & Fatigued</option>
                <option value="Unwell">⚠️ Unwell / Sensations</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black py-4 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 duration-150">
              <Plus className="h-4 w-4" />
              <span>Commit Telemetry Entry</span>
            </button>
          </motion.form>

          {/* Clinical Wellness Journal */}
          <motion.div variants={itemVariants} className="relative overflow-hidden bg-gradient-to-br from-[#B91C1C] to-[#86102a] border border-slate-800 rounded-[32px] p-8 text-white space-y-5 shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFF0F2] rounded-xs blur-[40px] pointer-events-none"></div>
            
            <div className="space-y-2 relative z-10">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-[#FFF0F2] text-rose-400 border border-[#FECDD3] px-3 py-1 rounded-xs shadow-inner">
                <Sparkles className="h-3.5 w-3.5 text-rose-500" /> Clinical Wellness Interpreter
              </span>
              <h5 className="text-sm font-black uppercase tracking-wider mt-2">Self-Care Journal</h5>
            </div>

            <form onSubmit={onSubmitJournal} className="space-y-4 relative z-10">
              <textarea 
                value={journalEntry} onChange={(e) => setJournalEntry(e.target.value)}
                placeholder="Describe active symptoms or wellness observations..."
                rows={3}
                className="w-full text-sm font-medium bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-rose-400 focus:ring-1 focus:ring-[#DC2626]/30 text-white placeholder-slate-500 transition-all shadow-inner"
                required
              />
              <button disabled={journalFeedbackLoading} type="submit" className="w-full bg-[#DC2626] hover:bg-[#DC2626] disabled:bg-[#0F172A] text-white text-xs font-black py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                {journalFeedbackLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span>{journalFeedbackLoading ? 'Evaluating Parameters...' : 'Analyze Health Entry'}</span>
              </button>
            </form>

            {journalFeedback && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white/5 border border-[#FECDD3] rounded-xl p-4 text-[11px] text-slate-100 leading-relaxed font-bold whitespace-pre-line relative z-10 border-l-4 border-l-[#DC2626] shadow-inner">
                {journalFeedback}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Gauges & Trend Chart */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div variants={itemVariants} className="bg-slate-50/50 border border-slate-200/80 rounded-[32px] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#DC2626]" />
                Metrics Dashboard
              </h4>
            </div>

            {vitalsList.length === 0 ? (
              <div className="text-center py-24 space-y-4 bg-white rounded-xl border border-slate-100 shadow-xs">
                <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <HeartPulse className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">No telemetry records found. Commit your first entry.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Visual Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <VitalsGauge
                    label="Blood Pressure" value={String(vitalsList[0].systolic)} subValue={`/${vitalsList[0].diastolic}`} unit="mmHg"
                    percentage={((vitalsList[0].systolic - 70) / (190 - 70)) * 100}
                    colorClass={vitalsList[0].systolic > 140 ? 'stroke-rose-500' : vitalsList[0].systolic > 125 ? 'stroke-amber-500' : 'stroke-rose-500'}
                    feedbackText={getBPFeedback(vitalsList[0].systolic, vitalsList[0].diastolic).label}
                    feedbackColor={getBPFeedback(vitalsList[0].systolic, vitalsList[0].diastolic).color}
                    icon={Activity}
                  />
                  <VitalsGauge
                    label="Fasting Glucose" value={String(vitalsList[0].bloodSugar)} unit="mg/dL"
                    percentage={((vitalsList[0].bloodSugar - 50) / (250 - 50)) * 100}
                    colorClass={vitalsList[0].bloodSugar > 140 ? 'stroke-rose-500' : vitalsList[0].bloodSugar > 110 ? 'stroke-amber-500' : 'stroke-rose-500'}
                    feedbackText={getSugarFeedback(vitalsList[0].bloodSugar).label}
                    feedbackColor={getSugarFeedback(vitalsList[0].bloodSugar).color}
                    icon={Activity}
                  />
                  <VitalsGauge
                    label="Heart Rate" value={String(vitalsList[0].heartRate)} unit="BPM"
                    percentage={((vitalsList[0].heartRate - 40) / (140 - 40)) * 100}
                    colorClass={vitalsList[0].heartRate > 100 ? 'stroke-amber-500' : vitalsList[0].heartRate < 60 ? 'stroke-rose-400' : 'stroke-rose-500'}
                    feedbackText={vitalsList[0].heartRate > 100 ? '⚡ Tachycardia' : vitalsList[0].heartRate < 60 ? '💤 Bradycardia' : '❤️ HR Optimal'}
                    feedbackColor={vitalsList[0].heartRate > 100 ? 'bg-amber-50 text-amber-800 border-amber-100' : vitalsList[0].heartRate < 60 ? 'bg-[#FFF0F2] text-[#DC2626] border-[#FECDD3]' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}
                    icon={Heart} pulse={true}
                  />
                </div>

                {/* Trend Line Chart */}
                <BPTrendChart vitals={vitalsList} />

                {/* Chronological Logs */}
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest block px-2">Historical Logs</span>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {vitalsList.map((v) => (
                      <div key={v.id} className="group relative border border-slate-200 p-5 rounded-xl bg-white shadow-sm hover:shadow-md hover:border-[#FECDD3] transition-all duration-300">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex gap-2 items-center">
                            <span className="font-black text-slate-800 bg-slate-50 px-3 py-1 rounded-lg text-xs border border-slate-200">{v.date}</span>
                            <span className="text-slate-400 text-xs font-bold">{v.time}</span>
                          </div>
                          <button onClick={() => onDeleteVital(v.id)} className="text-slate-300 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-2 rounded-lg transition-all cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[11px] uppercase tracking-wider mb-1">Blood Pressure</span>
                            <span className="text-slate-900 font-black text-sm">{v.systolic}/{v.diastolic} <span className="text-xs text-slate-400 font-medium">mmHg</span></span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px] uppercase tracking-wider mb-1">Glucose Level</span>
                            <span className="text-slate-900 font-black text-sm">{v.bloodSugar} <span className="text-xs text-slate-400 font-medium">mg/dL</span></span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px] uppercase tracking-wider mb-1">Pulse Rate</span>
                            <span className="text-slate-900 font-black text-sm">{v.heartRate} <span className="text-xs text-slate-400 font-medium">BPM</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
