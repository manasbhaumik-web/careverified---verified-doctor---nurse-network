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
      const response = await fetch('/api/symptom-matching', {
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
    <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-xs" id="ai-symptom-matcher">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-[color:var(--t-600)] text-white">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)] flex items-center gap-1.5">
            Symptom-to-Specialty Triage
          </h3>
          <p className="text-xs text-[color:var(--ink-2)]">Evaluate clinical complaints to find recommended medical specialties</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ink)] mb-1.5">Describe your symptoms (e.g. chest pressure, rash, migraine):</label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe symptoms... (e.g. A persistent dry cough and light fever since yesterday)"
            rows={2}
            className="w-full text-xs border border-[color:var(--t-200)] p-3 bg-[color:var(--t-bg)] focus:bg-white outline-none focus:border-[color:var(--t-600)] font-medium text-[color:var(--ink)] placeholder-slate-400 transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ink)] mb-1.5">Age (Optional)</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 35"
              className="w-full h-12 text-xs border border-[color:var(--t-200)] px-3.5 bg-[color:var(--t-bg)] focus:bg-white outline-none focus:border-[color:var(--t-600)] font-semibold text-[color:var(--ink)] transition-colors"
              min={0}
              max={120}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ink)] mb-1.5">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-12 text-xs border border-[color:var(--t-200)] px-3 bg-[color:var(--t-bg)] focus:bg-white outline-none focus:border-[color:var(--t-600)] font-semibold text-[color:var(--ink)] cursor-pointer transition-colors"
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
          className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white h-12 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Evaluating Symptoms…
            </>
          ) : (
            <>
              <Activity className="h-4 w-4" />
              Evaluate Clinical Symptoms
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

      {result?.emergency && (
        <div role="alert" className="mt-5 bg-rose-50 border-2 border-rose-400 p-4 text-rose-900 space-y-1">
          <p className="font-black">This may be an emergency: {result.emergency.reasons.join(', ')}.</p>
          <p className="text-sm font-bold">Call {result.emergency.numbers.map((n: any) => n.number).join(' or ')} now instead of waiting for an appointment.</p>
        </div>
      )}

      {result && (
        <div className="mt-5 bg-white border border-[color:var(--t-200)] p-5 shadow-xs space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-[color:var(--t-100)] pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-[color:var(--t-700)] uppercase tracking-wider">Suggested Specialty</span>
              <h4 className="text-sm font-extrabold text-[color:var(--ink)]">{result.data.recommendedSpecialty}</h4>
            </div>
            <div className="text-right max-w-[12rem]">
              <span className="text-[10px] text-slate-500 block font-medium">Algorithmic matching · Non-diagnostic</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-[color:var(--ink)] block mb-1">Clinical Justification:</span>
              <p className="text-[color:var(--ink-2)] leading-relaxed bg-[color:var(--t-bg)] p-3 border border-[color:var(--t-200)]">{result.data.clinicalJustification}</p>
            </div>

            <div className="flex justify-between items-center p-3 border border-[color:var(--t-200)] bg-[color:var(--t-bg)]">
              <span className="font-bold text-[color:var(--ink)]">Triage Urgency:</span>
              <span className={`px-2.5 py-1 font-mono font-bold text-[10px] uppercase tracking-wider ${result.data.symptomSeverity === 'High/Urgent'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : result.data.symptomSeverity === 'Medium'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                {result.data.symptomSeverity}
              </span>
            </div>

            <div>
              <span className="font-bold uppercase tracking-wider text-[color:var(--ink)] block mb-1">Recommended Action:</span>
              <p className="text-[color:var(--ink-2)] leading-relaxed">{result.data.recommendedAction}</p>
            </div>
          </div>

          <div className="border-t border-[color:var(--t-100)] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              Source: {result.source}
            </span>
            <button
              onClick={handleApplyFilter}
              className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white h-10 px-5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              Filter Directory for {result.data.recommendedSpecialty}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {result.warning && (
            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 leading-relaxed text-center font-bold border border-amber-200">
              {result.warning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
