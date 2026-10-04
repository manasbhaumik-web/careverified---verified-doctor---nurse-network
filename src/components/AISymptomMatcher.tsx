import React, { useState } from 'react';
import { Activity, Loader, ChevronRight, AlertTriangle, HelpCircle } from 'lucide-react';

interface AISymptomMatcherProps {
  onSelectSpecialty: (specialty: string) => void;
}

export default function AISymptomMatcher({ onSelectSpecialty }: AISymptomMatcherProps) {
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('any');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          patientAge: age ? Number(age) : undefined,
          patientGender: gender !== 'any' ? gender : undefined
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setResult(data);
        if (data.data?.recommendedSpecialty) {
          onSelectSpecialty(data.data.recommendedSpecialty);
        }
      } else {
        throw new Error(data.message || 'Failed to complete symptom matching.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    if (result?.data?.recommendedSpecialty) {
      onSelectSpecialty(result.data.recommendedSpecialty);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#FFF0F2]/50 via-white to-[#FFF0F2]/30 border-2 border-[#FECDD3]/80 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300" id="ai-symptom-matcher">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-[#DC2626] text-white rounded-xl shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            Symptom Triage
          </h3>
          <p className="text-[11px] text-slate-500 font-semibold">Evaluate symptoms to find recommended medical specialties</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Describe your symptoms (e.g. chest pressure, red skin rash, chronic headache):</label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Type symptoms... (e.g. A persistent dry cough and light fever of 101F since last night)"
            rows={2}
            className="w-full text-xs border-2 border-slate-200/80 rounded-xl p-3 bg-white shadow-inner outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-semibold placeholder-slate-400 transition-all"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Patient Age (Optional)</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3 bg-white outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-semibold transition-all"
              min={0}
              max={120}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3 bg-white outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-extrabold text-slate-700 cursor-pointer transition-all"
            >
              <option value="any">Any Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !symptoms.trim()}
          className="w-full bg-[#DC2626] hover:bg-[#0F172A] disabled:bg-rose-400 text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
        >
          {loading ? (
            <>
              <Loader className="h-3.5 w-3.5 animate-spin" />
              Evaluating...
            </>
          ) : (
            <>
              <Activity className="h-3.5 w-3.5" />
              Evaluate Symptoms
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border-2 border-red-100 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="font-semibold">{error}</div>
        </div>
      )}

      {result && (
        <div className="mt-5 bg-white border-2 border-[#FECDD3] rounded-xl p-4 shadow-sm space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b-2 border-slate-100/80 pb-3">
            <div>
              <span className="text-[10px] font-extrabold text-[#DC2626] uppercase tracking-wider">Matched Result</span>
              <h4 className="text-sm font-extrabold text-slate-800">{result.data.recommendedSpecialty}</h4>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">Confidence</span>
              <span className="text-xs font-extrabold text-[#DC2626]">{Math.round(result.data.confidenceScore * 100)}%</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-700 block mb-1">Clinical Justification:</span>
              <p className="text-slate-600 leading-relaxed font-semibold bg-slate-50/50 p-3 rounded-lg border-2 border-slate-200/40">{result.data.clinicalJustification}</p>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg border-2 border-slate-200/40">
              <span className="font-bold text-slate-700">Triage Urgency:</span>
              <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${result.data.symptomSeverity === 'High/Urgent'
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : result.data.symptomSeverity === 'Medium'
                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                {result.data.symptomSeverity}
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-1">Recommended Clinical Action:</span>
              <p className="text-slate-600 leading-relaxed font-semibold">{result.data.recommendedAction}</p>
            </div>
          </div>

          <div className="border-t-2 border-slate-100/80 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              Source: {result.source}
            </span>
            <button
              onClick={handleApplyFilter}
              className="bg-[#DC2626] hover:bg-[#0F172A] text-white rounded-lg px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
            >
              Filter Doctors & Nurses
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {result.warning && (
            <p className="text-[10px] text-amber-600 bg-amber-50 p-2.5 rounded-lg leading-relaxed text-center font-bold border border-amber-150">
              {result.warning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
