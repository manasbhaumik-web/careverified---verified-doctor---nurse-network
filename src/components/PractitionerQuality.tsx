import React, { useCallback, useEffect, useState } from 'react';
import { Award, ClipboardCheck, Flag, GraduationCap, ShieldAlert, Star } from 'lucide-react';

const jreq = (url: string, method = 'POST', body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const field = 'border border-slate-200 bg-white px-3 py-2 text-sm w-full focus:outline-none focus:border-[#DC2626]';
const lab = 'text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1';
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

async function uploadEvidence(file: File, kind: 'cpd' | 'certificate'): Promise<string | null> {
  const f = new FormData(); f.append('file', file); f.append('kind', kind);
  const d = await fetch('/api/documents', { method: 'POST', body: f }).then(r => r.json());
  return d.status === 'success' ? d.data.id : null;
}

/** Practitioner quality hub: ratings, CPD, specialty certificates, peer review, incidents. */
export default function PractitionerQuality({ profileId }: { profileId: string | null }) {
  const [tab, setTab] = useState<'reviews' | 'cpd' | 'peer' | 'incidents'>('reviews');
  const [cred, setCred] = useState<any | null>(null);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([
      fetch('/api/me/credentials').then(x => x.json()),
      profileId ? fetch(`/api/reviews?professionalId=${profileId}`).then(x => x.json()) : Promise.resolve(null),
    ]);
    if (c.status === 'success') setCred(c.data);
    if (r?.status === 'success') setMyReviews(r.data);
  }, [profileId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const say = (ok: boolean, text: string) => setMsg({ ok, text });

  if (!profileId) return <p className="bg-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold p-5 max-w-2xl">Submit your credentials in the Practitioner Portal first. Quality tools open once you have a profile.</p>;

  const tabs = [['reviews', 'Ratings & reviews', Star], ['cpd', 'CPD & certificates', GraduationCap], ['peer', 'Peer review', ClipboardCheck], ['incidents', 'Report an incident', ShieldAlert]] as const;
  return (
    <div className="space-y-4 max-w-5xl">
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map(([id, text, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setMsg(null); }}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${tab === id ? 'border-b-2 border-[#DC2626] text-[#B91C1C]' : 'text-slate-500'}`}><Icon className="h-3.5 w-3.5" /> {text}</button>
        ))}
      </div>
      {msg && <p role="status" className={`text-xs font-bold p-2.5 border ${msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      {tab === 'reviews' && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div className="bg-white border border-slate-200 p-4"><p className={lab}>Average rating</p><p className="text-3xl font-black tabular-nums">{cred?.reviews.average ?? '—'}</p></div>
            <div className="bg-white border border-slate-200 p-4"><p className={lab}>Published reviews</p><p className="text-3xl font-black tabular-nums">{cred?.reviews.count ?? 0}</p></div>
          </div>
          <p className="text-xs text-slate-600">Only patients with a completed visit can review you. If a review breaks the rules (personal details, abuse, not about care), report it and the board will decide.</p>
          {myReviews.length === 0 ? <p className="text-sm text-slate-500 bg-white border border-slate-200 p-4">No reviews yet.</p> : myReviews.map(r => (
            <article key={r.id} className="bg-white border border-slate-200 p-4 text-sm space-y-1">
              <p className="font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} <span className="text-xs text-slate-500 font-normal">{r.date}</span></p>
              {r.comment && <p>{r.comment}</p>}
              {r.replyText && <p className="text-xs bg-slate-50 border border-slate-100 p-2">Your reply: {r.replyText}</p>}
              <button onClick={async () => {
                const reason = window.prompt('Why does this review break the rules?'); if (!reason) return;
                const d = await jreq(`/api/reviews/${r.id}/report`, 'POST', { reason }); say(d.status === 'success', d.message || 'Could not report.');
              }} className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer"><Flag className="h-3 w-3" /> Report this review</button>
            </article>
          ))}
        </section>
      )}

      {tab === 'cpd' && cred && <CpdSection cred={cred} reload={load} say={say} />}
      {tab === 'peer' && <PeerSection say={say} />}
      {tab === 'incidents' && <IncidentSection say={say} />}
    </div>
  );
}

function CpdSection({ cred, reload, say }: { cred: any; reload: () => void; say: (ok: boolean, t: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [cpd, setCpd] = useState({ title: '', category: 'course', points: '', activityDate: today, provider: '' });
  const [cpdFile, setCpdFile] = useState<File | null>(null);
  const [cert, setCert] = useState({ name: '', issuer: '', issuedDate: '', expiryDate: '' });
  const [certFile, setCertFile] = useState<File | null>(null);
  const pct = Math.min(100, Math.round((cred.pointsApproved / cred.target) * 100));

  const addCpd = async (e: React.FormEvent) => {
    e.preventDefault();
    const documentId = cpdFile ? await uploadEvidence(cpdFile, 'cpd') : undefined;
    if (cpdFile && !documentId) return say(false, 'The evidence file could not be uploaded (PDF, JPG or PNG, up to 5 MB).');
    const d = await jreq('/api/me/cpd', 'POST', { ...cpd, points: Number(cpd.points), documentId });
    say(d.status === 'success', d.status === 'success' ? 'Submitted for verification.' : d.message);
    if (d.status === 'success') { setCpd({ ...cpd, title: '', points: '', provider: '' }); setCpdFile(null); reload(); }
  };
  const addCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile) return say(false, 'Attach a copy of the certificate.');
    const documentId = await uploadEvidence(certFile, 'certificate');
    if (!documentId) return say(false, 'The file could not be uploaded (PDF, JPG or PNG, up to 5 MB).');
    const d = await jreq('/api/me/specialty-certs', 'POST', { ...cert, expiryDate: cert.expiryDate || undefined, documentId });
    say(d.status === 'success', d.status === 'success' ? 'Submitted for verification.' : d.message);
    if (d.status === 'success') { setCert({ name: '', issuer: '', issuedDate: '', expiryDate: '' }); setCertFile(null); reload(); }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#FECDD3] p-5 space-y-2">
        <h3 className="text-sm font-extrabold">CPD points for {cred.year}</h3>
        <div className="h-3 bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-3 bg-[#DC2626]" style={{ width: `${pct}%` }} /></div>
        <p className="text-sm"><b className="tabular-nums">{cred.pointsApproved}</b> of {cred.target} verified points{cred.pointsPending ? ` · ${cred.pointsPending} awaiting verification` : ''}</p>
        <p className="text-[11px] text-slate-500">The annual target is set by the platform and may differ from your council's rule. Check your council's requirement.</p>
      </section>

      <form onSubmit={addCpd} className="bg-white border border-slate-200 p-5 grid sm:grid-cols-2 gap-3">
        <h3 className="text-sm font-extrabold sm:col-span-2">Log CPD activity</h3>
        <div className="sm:col-span-2"><label className={lab}>Title</label><input className={field} value={cpd.title} onChange={e => setCpd({ ...cpd, title: e.target.value })} required maxLength={150} /></div>
        <div><label className={lab}>Type</label><select className={field} value={cpd.category} onChange={e => setCpd({ ...cpd, category: e.target.value })}>{['course', 'conference', 'publication', 'teaching', 'self-study'].map(c => <option key={c}>{c}</option>)}</select></div>
        <div><label className={lab}>Points</label><input type="number" step="0.5" min="0.5" max="50" className={field} value={cpd.points} onChange={e => setCpd({ ...cpd, points: e.target.value })} required /></div>
        <div><label className={lab}>Date</label><input type="date" max={today} className={field} value={cpd.activityDate} onChange={e => setCpd({ ...cpd, activityDate: e.target.value })} required /></div>
        <div><label className={lab}>Provider (optional)</label><input className={field} value={cpd.provider} onChange={e => setCpd({ ...cpd, provider: e.target.value })} maxLength={120} /></div>
        <label className="sm:col-span-2 text-xs font-bold border border-dashed border-slate-300 px-3 py-2 cursor-pointer">{cpdFile ? cpdFile.name : 'Attach evidence (certificate of attendance), PDF/JPG/PNG'}<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCpdFile(e.target.files?.[0] ?? null)} /></label>
        <button className="bg-[#DC2626] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer w-fit">Submit</button>
      </form>

      <section className="bg-white border border-slate-200 p-5">
        <h3 className="text-sm font-extrabold mb-2">Your CPD entries</h3>
        {cred.entries.length === 0 ? <p className="text-xs text-slate-500">None yet.</p> : (
          <table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase text-slate-500"><th className="py-1">Date</th><th>Activity</th><th>Points</th><th>Status</th><th /></tr></thead>
            <tbody>{cred.entries.map((e: any) => (
              <tr key={e.id} className="border-t border-slate-100"><td className="py-1.5">{e.activity_date}</td><td>{e.title}<span className="text-slate-400"> · {e.category}</span>{e.review_note ? <span className="block text-rose-700">{e.review_note}</span> : null}</td><td className="tabular-nums">{e.points}</td>
                <td className="font-bold">{e.status}</td>
                <td>{e.status === 'pending' && <button className="text-rose-700 font-bold cursor-pointer" onClick={async () => { await jreq(`/api/me/cpd/${e.id}`, 'DELETE'); reload(); }}>Remove</button>}</td></tr>
            ))}</tbody></table>
        )}
      </section>

      <form onSubmit={addCert} className="bg-white border border-slate-200 p-5 grid sm:grid-cols-2 gap-3">
        <h3 className="text-sm font-extrabold sm:col-span-2 flex items-center gap-2"><Award className="h-4 w-4 text-[#DC2626]" /> Specialty certificates</h3>
        <div><label className={lab}>Certificate</label><input className={field} value={cert.name} onChange={e => setCert({ ...cert, name: e.target.value })} required placeholder="e.g. MRCP (UK)" maxLength={150} /></div>
        <div><label className={lab}>Issued by</label><input className={field} value={cert.issuer} onChange={e => setCert({ ...cert, issuer: e.target.value })} required maxLength={150} /></div>
        <div><label className={lab}>Issued</label><input type="date" className={field} value={cert.issuedDate} onChange={e => setCert({ ...cert, issuedDate: e.target.value })} required /></div>
        <div><label className={lab}>Expires (if it does)</label><input type="date" className={field} value={cert.expiryDate} onChange={e => setCert({ ...cert, expiryDate: e.target.value })} /></div>
        <label className="sm:col-span-2 text-xs font-bold border border-dashed border-slate-300 px-3 py-2 cursor-pointer">{certFile ? certFile.name : 'Attach a copy of the certificate (required)'}<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCertFile(e.target.files?.[0] ?? null)} /></label>
        <button className="bg-[#DC2626] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer w-fit">Submit for verification</button>
        <ul className="sm:col-span-2 text-xs divide-y divide-slate-100">{cred.certs.map((c: any) => (
          <li key={c.id} className="py-2 flex justify-between gap-3"><span><b>{c.name}</b> · {c.issuer}{c.expiry_date ? ` · expires ${c.expiry_date}` : ''}{c.review_note ? <span className="block text-rose-700">{c.review_note}</span> : null}</span><span className="font-bold">{c.status === 'approved' ? 'Shown on your profile' : c.status}</span></li>
        ))}</ul>
      </form>
    </div>
  );
}

function PeerSection({ say }: { say: (ok: boolean, t: string) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [about, setAbout] = useState<any[]>([]);
  const [open, setOpen] = useState<any | null>(null);
  const [form, setForm] = useState({ outcome: 'no_concerns', score: 4, comments: '' });
  const load = useCallback(async () => {
    const [t, a] = await Promise.all([fetch('/api/peer-reviews/mine').then(r => r.json()), fetch('/api/peer-reviews/about-me').then(r => r.json())]);
    if (t.status === 'success') setTasks(t.data);
    if (a.status === 'success') setAbout(a.data);
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const openCase = async (id: string) => { const d = await fetch(`/api/peer-reviews/${id}`).then(r => r.json()); if (d.status === 'success') { setOpen(d.data); setForm({ outcome: 'no_concerns', score: 4, comments: '' }); } };
  const submit = async () => {
    const d = await jreq(`/api/peer-reviews/${open.id}/submit`, 'POST', form);
    say(d.status === 'success', d.status === 'success' ? 'Review submitted. Thank you.' : d.message);
    if (d.status === 'success') { setOpen(null); load(); }
  };
  const c = open?.content;
  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 p-5 space-y-2">
        <h3 className="text-sm font-extrabold">Cases for you to review</h3>
        <p className="text-[11px] text-slate-500">Colleagues' work, with the patient and the author hidden. Treat what you read as confidential.</p>
        {tasks.length === 0 ? <p className="text-xs text-slate-500">Nothing assigned.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">{tasks.map(t => (
            <li key={t.id} className="py-2 flex justify-between gap-3"><span>{t.subject_type === 'prescription' ? 'Prescription' : 'Consultation note'} · assigned {day(t.assigned_at)}</span>
              {t.status === 'pending' ? <button onClick={() => openCase(t.id)} className="text-xs font-bold text-[#B91C1C] cursor-pointer">Review</button> : <span className="text-xs font-bold text-slate-500">done</span>}</li>
          ))}</ul>
        )}
      </section>

      {open && (
        <section className="bg-white border-2 border-[#FECDD3] p-5 space-y-3">
          <h3 className="text-sm font-extrabold">{c?.kind ?? 'Case'}</h3>
          {c && <div className="text-sm space-y-1.5 bg-slate-50 border border-slate-200 p-3">
            {'subjective' in c ? (['subjective', 'objective', 'assessment', 'plan'] as const).map(k => <p key={k}><span className="text-[10px] font-extrabold uppercase text-slate-500 mr-2">{k}</span>{c[k]}</p>) : (
              <>
                <p><span className="text-[10px] font-extrabold uppercase text-slate-500 mr-2">Diagnosis</span>{c.diagnosis}</p>
                <ul className="list-disc ml-5">{c.items.map((i: any, k: number) => <li key={k}>{i.name} {i.strength} · {i.dose}, {i.frequency}, {i.durationDays} days, qty {i.quantity}</li>)}</ul>
                <p className="text-xs">Patient record was {c.patientRecordWasShared ? 'shared' : 'NOT shared'} with the prescriber. Warnings raised: {c.safetyWarnings?.length ? c.safetyWarnings.map((w: any) => `${w.severity}: ${w.message}`).join(' | ') : 'none'}. {Object.keys(c.overrideReasons ?? {}).length ? `Override reasons: ${Object.values(c.overrideReasons).join(' | ')}` : ''}</p>
              </>
            )}
          </div>}
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={lab}>Outcome</label><select className={field} value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })}><option value="no_concerns">No concerns</option><option value="minor_concerns">Minor concerns</option><option value="significant_concerns">Significant concerns</option></select></div>
            <div><label className={lab}>Quality score (1 low, 5 high)</label><select className={field} value={form.score} onChange={e => setForm({ ...form, score: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</select></div>
          </div>
          <div><label className={lab}>Comments {form.outcome !== 'no_concerns' ? '(required)' : '(optional)'}</label><textarea className={field} rows={3} value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} maxLength={3000} /></div>
          <div className="flex gap-2"><button onClick={submit} className="bg-[#DC2626] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Submit review</button><button onClick={() => setOpen(null)} className="border border-slate-200 text-xs font-bold px-4 py-2.5 cursor-pointer">Cancel</button></div>
        </section>
      )}

      <section className="bg-white border border-slate-200 p-5 space-y-2">
        <h3 className="text-sm font-extrabold">Feedback on your own work</h3>
        {about.length === 0 ? <p className="text-xs text-slate-500">No peer feedback yet.</p> : about.map(a => (
          <article key={a.id} className="border border-slate-100 p-3 text-sm"><p className="font-bold">{a.subject_type === 'prescription' ? 'Prescription' : 'Consultation note'} · score {a.score}/5 · {a.outcome.replace(/_/g, ' ')} <span className="text-xs text-slate-400 font-normal">{day(a.completed_at)}</span></p>{a.comments && <p className="text-xs mt-1">{a.comments}</p>}</article>
        ))}
      </section>
    </div>
  );
}

function IncidentSection({ say }: { say: (ok: boolean, t: string) => void }) {
  const [form, setForm] = useState({ kind: 'near_miss', severity: 'low', description: '' });
  const [mine, setMine] = useState<any[]>([]);
  const load = useCallback(() => fetch('/api/incidents/mine').then(r => r.json()).then(d => d.status === 'success' && setMine(d.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jreq('/api/incidents', 'POST', form);
    say(d.status === 'success', d.status === 'success' ? 'Reported. The board has been notified.' : d.message);
    if (d.status === 'success') { setForm({ ...form, description: '' }); load(); }
  };
  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="bg-white border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-extrabold">Report a patient-safety incident or near miss</h3>
        <p className="text-[11px] text-slate-500">Reporting is how we learn. Do not include patient names; describe what happened. For anyone in immediate danger call 999 first.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={lab}>Type</label><select className={field} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
            <option value="near_miss">Near miss</option><option value="adverse_drug_event">Adverse drug event</option><option value="patient_harm">Patient harm</option><option value="misconduct">Misconduct</option><option value="privacy">Privacy or data issue</option><option value="system">Platform problem</option><option value="other">Other</option></select></div>
          <div><label className={lab}>Severity</label><select className={field} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
        </div>
        <textarea className={field} rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What happened? (at least 20 characters)" required minLength={20} maxLength={4000} aria-label="Description" />
        <button className="bg-[#DC2626] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Submit report</button>
      </form>
      {mine.length > 0 && <section className="bg-white border border-slate-200 p-5"><h3 className="text-sm font-extrabold mb-2">Your reports</h3>
        <ul className="divide-y divide-slate-100 text-sm">{mine.map(i => <li key={i.id} className="py-2"><b>{i.kind.replace(/_/g, ' ')}</b> · {i.severity} · <span className="font-bold">{i.status}</span> <span className="text-xs text-slate-400">{day(i.createdAt)}</span>{i.resolution && <p className="text-xs text-slate-600">Outcome: {i.resolution}</p>}</li>)}</ul></section>}
    </div>
  );
}
