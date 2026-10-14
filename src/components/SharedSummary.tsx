import React, { useEffect, useState } from 'react';
import { formatDate } from '../locale';

/** Public, read-only page a patient's home doctor opens from a time-limited link. No sign-in, nothing beyond the summary. */
export default function SharedSummary({ token }: { token: string }) {
  const [d, setD] = useState<any | null | undefined>(undefined);
  useEffect(() => {
    fetch(`/api/tourism/shared/${encodeURIComponent(token)}`).then(r => r.json()).then(j => setD(j.status === 'success' ? j.data : null)).catch(() => setD(null));
  }, [token]);
  return (
    <main className="min-h-screen bg-slate-50 p-4 flex justify-center">
      <article className="bg-white border border-slate-200 w-full max-w-2xl p-6 space-y-3 self-start mt-6 text-sm">
        <h1 className="text-lg font-black">Discharge summary shared by a patient</h1>
        {d === undefined && <p className="text-slate-500">Loading…</p>}
        {(d === null || d?.found === false) && <p className="bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs font-semibold">This link is not valid. It may have expired or been withdrawn by the patient.</p>}
        {d?.found && (
          <>
            <p className="text-xs text-slate-600">{d.disclaimer}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs bg-slate-50 border border-slate-200 p-3">
              <dt className="text-slate-500">Patient</dt><dd className="font-bold">{d.patientName}</dd>
              <dt className="text-slate-500">Treated at</dt><dd>{d.facility}</dd>
              {d.treatedBy && (<><dt className="text-slate-500">Doctor</dt><dd>{d.treatedBy.name} ({d.treatedBy.specialization})</dd></>)}
              <dt className="text-slate-500">Discharged</dt><dd>{formatDate(d.dischargedAt)}</dd>
              <dt className="text-slate-500">Treatment</dt><dd>{d.treatment}</dd>
            </dl>
            <section><h2 className="text-xs font-black uppercase tracking-wide">Summary</h2><p className="whitespace-pre-wrap text-xs mt-1">{d.dischargeSummary}</p></section>
            {d.followUpPlan && <section><h2 className="text-xs font-black uppercase tracking-wide">Follow-up plan</h2><p className="whitespace-pre-wrap text-xs mt-1">{d.followUpPlan}</p></section>}
            <p className="text-[11px] text-slate-500">This link expires {formatDate(d.expiresAt)}.</p>
          </>
        )}
      </article>
    </main>
  );
}
