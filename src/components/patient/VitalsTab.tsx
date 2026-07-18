import React from 'react';
import { 
  Heart, Activity, Plus, Trash2, HeartPulse, Sparkles, PlusCircle, RefreshCw, Zap, Moon, AlertTriangle, CheckCircle 
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

interface VitalsGaugeProps {
  label: string;
  value: string;
  subValue?: string;
  unit: string;
  percentage: number;
  colorClass: string;
  feedbackText: string;
  feedbackColor: string;
  icon?: React.ComponentType<any>;
  pulse?: boolean;
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
}: VitalsGaugeProps) {
  const radius = 30;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius; // approx 188.5
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="group border border-slate-200 p-4.5 rounded-2xl bg-white text-center flex flex-col items-center justify-between shadow-3xs transition-all duration-300 hover:shadow-2xs hover:border-slate-350 relative overflow-hidden">
      {/* Label header */}
      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-2">{label}</span>

      {/* SVG Radial Dial Gauge */}
      <div className="relative w-24 h-24 flex items-center justify-center my-1 pointer-events-none">
        <svg className={`w-full h-full transform -rotate-90`} viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="stroke-slate-100 fill-none"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            className={`fill-none transition-all duration-700 ease-out ${colorClass}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>

        {/* Floating Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
          {IconComponent && <IconComponent className={`h-4 w-4 ${pulse ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />}
          <div className="text-base font-black text-slate-850 tracking-tight leading-none mt-0.5">
            {value}
            {subValue && <span className="text-slate-400 text-xs font-bold">{subValue}</span>}
          </div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">{unit}</span>
        </div>
      </div>

      {/* Feedback Badge pill */}
      <div className={`mt-2 text-[8px] font-black uppercase tracking-widest border px-2.5 py-0.5 rounded-full ${feedbackColor}`}>
        {feedbackText}
      </div>
    </div>
  );
}

export default function VitalsTab({
  vitalsList,
  systolic,
  setSystolic,
  diastolic,
  setDiastolic,
  bloodSugar,
  setBloodSugar,
  heartRate,
  setHeartRate,
  mood,
  setMood,
  vitalsNotes,
  setVitalsNotes,
  vitalsSuccess,
  onSubmitVitals,
  onDeleteVital,
  journalEntry,
  setJournalEntry,
  journalFeedback,
  journalFeedbackLoading,
  onSubmitJournal,
  getBPFeedback,
  getSugarFeedback
}: VitalsTabProps) {
  return (
    <div className="space-y-8 animate-fade-in animate-duration-300" id="patient-vitals-tab-root">
      {/* Header section */}
      <div className="border-b border-slate-100 pb-5">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#0d9488] bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-md mb-2">
          Clinical Telemetry Logs
        </span>
        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-[#0d9488]" />
          Vitals & Bio-Telemetry
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Log and monitor baseline physiological markers to share with your verified clinical care team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Vitals Form & Self-care Journal */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={onSubmitVitals} className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm space-y-5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3.5 flex items-center gap-2">
              <PlusCircle className="h-4.5 w-4.5 text-[#0d9488]" />
              Record Physiological Markers
            </h4>

            {vitalsSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                <span>Physiological markers committed successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Sys pressure</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={systolic} 
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-3 pl-3.5 pr-10 bg-slate-50/50 focus:bg-white focus:border-[#0d9488] outline-none transition-all duration-150"
                    required
                    min="70"
                    max="220"
                  />
                  <span className="absolute right-3 top-3.5 text-[9px] font-black text-slate-400">mmHg</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Dia pressure</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={diastolic} 
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-3 pl-3.5 pr-10 bg-slate-50/50 focus:bg-white focus:border-[#0d9488] outline-none transition-all duration-150"
                    required
                    min="40"
                    max="140"
                  />
                  <span className="absolute right-3 top-3.5 text-[9px] font-black text-slate-400">mmHg</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Fasting Glucose</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={bloodSugar} 
                    onChange={(e) => setBloodSugar(Number(e.target.value))}
                    className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-3 pl-3.5 pr-12 bg-slate-50/50 focus:bg-white focus:border-[#0d9488] outline-none transition-all duration-150"
                    required
                    min="50"
                    max="400"
                  />
                  <span className="absolute right-3 top-3.5 text-[9px] font-black text-slate-400">mg/dL</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Heart Rate</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={heartRate} 
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-3 pl-3.5 pr-12 bg-slate-50/50 focus:bg-white focus:border-[#0d9488] outline-none transition-all duration-150"
                    required
                    min="40"
                    max="200"
                  />
                  <span className="absolute right-3 top-3.5 text-[9px] font-black text-slate-400">BPM</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Subjective Baseline Mood</label>
              <select 
                value={mood} 
                onChange={(e) => setMood(e.target.value)}
                className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-3 px-3 bg-slate-50/50 focus:bg-white focus:border-[#0d9488] outline-none cursor-pointer transition-all duration-150"
              >
                <option value="Energetic">✨ Energetic &amp; Vibrant</option>
                <option value="Restful">🧘 Restful &amp; Calmed</option>
                <option value="Calm">⚖ Stable &amp; Calm</option>
                <option value="Tired">🔋 Tired &amp; Fatigued</option>
                <option value="Unwell">⚠️ Unwell / Feeling Sensation Changes</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Logger Notes</label>
              <textarea 
                value={vitalsNotes} 
                onChange={(e) => setVitalsNotes(e.target.value)}
                placeholder="e.g. Taken 15 minutes after waking up, relaxed sitting position."
                rows={2}
                className="w-full text-xs font-medium border-2 border-slate-200 rounded-xl p-3.5 bg-slate-50/50 focus:bg-white focus:border-[#0d9488] outline-none transition-all duration-150"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95 duration-150"
            >
              <Plus className="h-4 w-4" />
              <span>Commit Telemetry Entry</span>
            </button>
          </form>

          {/* Self-Care Wellness Journal Interpretive Assistant */}
          <div className="relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-[28px] p-6 text-white space-y-4 shadow-xl">
            <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full shadow-inner">
                <Sparkles className="h-3 w-3 text-teal-400" /> AI Wellness Interpreter
              </span>
              <h5 className="text-xs font-black uppercase tracking-wider mt-1.5">Self-Care Wellness Journal</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Describe active symptoms or wellness observations. Our clinical triage logic matches guidelines from your verified panel specialists.
              </p>
            </div>

            <form onSubmit={onSubmitJournal} className="space-y-3 relative z-10">
              <textarea 
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
                placeholder="e.g. Feeling persistent dry cough at night with slight fever, staying well hydrated..."
                rows={3}
                className="w-full text-xs font-semibold bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 text-white placeholder-slate-600 transition-all"
                required
              />
              <button 
                type="submit"
                disabled={journalFeedbackLoading}
                className="w-full bg-[#0d9488] hover:bg-[#0f766e] disabled:bg-teal-700/60 text-white text-xs font-black py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {journalFeedbackLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{journalFeedbackLoading ? 'Evaluating Parameters...' : 'Analyze Health Entry'}</span>
              </button>
            </form>

            {journalFeedback && (
              <div className="bg-white/5 border border-teal-500/20 rounded-2xl p-4 text-[11px] text-slate-200 leading-relaxed font-bold whitespace-pre-line animate-fade-in relative z-10 border-l-4 border-l-[#0d9488]">
                {journalFeedback}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Historical Logs & Graphical Dials */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm space-y-6">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3.5 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-[#0d9488]" />
              Physiological Metrics Dashboard
            </h4>

            {vitalsList.length === 0 ? (
              <div className="text-center py-24 space-y-4">
                <div className="h-14 w-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto shadow-3xs">
                  <HeartPulse className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">No telemetry records found. Commit your first entry on the left to activate visual metrics dials.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visual Telemetry Gauges for latest entry */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Blood Pressure Gauge */}
                  <VitalsGauge
                    label="Blood Pressure"
                    value={String(vitalsList[0].systolic)}
                    subValue={`/${vitalsList[0].diastolic}`}
                    unit="mmHg"
                    percentage={((vitalsList[0].systolic - 70) / (190 - 70)) * 100}
                    colorClass={
                      vitalsList[0].systolic > 140 
                        ? 'stroke-rose-500' 
                        : vitalsList[0].systolic > 125 
                          ? 'stroke-amber-500' 
                          : 'stroke-teal-500'
                    }
                    feedbackText={getBPFeedback(vitalsList[0].systolic, vitalsList[0].diastolic).label}
                    feedbackColor={getBPFeedback(vitalsList[0].systolic, vitalsList[0].diastolic).color}
                    icon={Activity}
                  />

                  {/* Fasting Glucose Gauge */}
                  <VitalsGauge
                    label="Fasting Glucose"
                    value={String(vitalsList[0].bloodSugar)}
                    unit="mg/dL"
                    percentage={((vitalsList[0].bloodSugar - 50) / (250 - 50)) * 100}
                    colorClass={
                      vitalsList[0].bloodSugar > 140 
                        ? 'stroke-rose-500' 
                        : vitalsList[0].bloodSugar > 110 
                          ? 'stroke-amber-500' 
                          : 'stroke-teal-500'
                    }
                    feedbackText={getSugarFeedback(vitalsList[0].bloodSugar).label}
                    feedbackColor={getSugarFeedback(vitalsList[0].bloodSugar).color}
                    icon={Activity}
                  />

                  {/* Heart Rate Gauge */}
                  <VitalsGauge
                    label="Heart Rate"
                    value={String(vitalsList[0].heartRate)}
                    unit="BPM"
                    percentage={((vitalsList[0].heartRate - 40) / (140 - 40)) * 100}
                    colorClass={
                      vitalsList[0].heartRate > 100 
                        ? 'stroke-amber-500' 
                        : vitalsList[0].heartRate < 60 
                          ? 'stroke-blue-500' 
                          : 'stroke-rose-500'
                    }
                    feedbackText={
                      vitalsList[0].heartRate > 100 
                        ? '⚡ Tachycardia' 
                        : vitalsList[0].heartRate < 60 
                          ? '💤 Bradycardia' 
                          : '❤️ HR Optimal'
                    }
                    feedbackColor={
                      vitalsList[0].heartRate > 100 
                        ? 'bg-amber-50 text-amber-800 border-amber-100' 
                        : vitalsList[0].heartRate < 60 
                          ? 'bg-blue-50 text-blue-800 border-blue-100' 
                          : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    }
                    icon={Heart}
                    pulse={true}
                  />
                </div>

                {/* Timeline List of Records */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Chronological Telemetry logs</span>
                  
                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin">
                    {vitalsList.map((v) => (
                      <div key={v.id} className="group relative border border-slate-150 p-4.5 rounded-2xl hover:bg-slate-50/50 hover:border-teal-500/20 transition-all text-xs space-y-3 bg-white">
                        
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2 items-center">
                            <span className="font-extrabold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg text-[10px] border border-slate-200 shadow-3xs">{v.date}</span>
                            <span className="text-slate-400 text-[10px] font-bold">{v.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-3xs">
                              {v.mood === 'Energetic' ? '⚡ Energetic' : v.mood === 'Restful' ? '🧘 Restful' : v.mood === 'Calm' ? '⚖ Calm' : v.mood === 'Tired' ? '🔋 Tired' : '⚠️ Unwell'}
                            </span>
                            <button 
                              onClick={() => onDeleteVital(v.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer p-1.5 rounded-md hover:bg-rose-50"
                              title="Delete telemetry record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-[11px] font-bold text-slate-700 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Blood Pressure</span>
                            <span className="text-slate-800 font-black">{v.systolic}/{v.diastolic} <span className="text-[9px] text-slate-400 font-normal">mmHg</span></span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Glucose Level</span>
                            <span className="text-slate-800 font-black">{v.bloodSugar} <span className="text-[9px] text-slate-400 font-normal">mg/dL</span></span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Pulse Rate</span>
                            <span className="text-slate-800 font-black">{v.heartRate} <span className="text-[9px] text-slate-400 font-normal">BPM</span></span>
                          </div>
                        </div>

                        {v.notes && (
                          <p className="text-[10px] text-slate-500 font-bold bg-slate-50 border border-slate-100 p-2.5 rounded-xl italic leading-relaxed">
                            "{v.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

