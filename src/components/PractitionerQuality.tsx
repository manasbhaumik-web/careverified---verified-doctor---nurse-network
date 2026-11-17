import { CustomSelect } from '../shared/ui/CustomSelect';
import React, { useCallback, useEffect, useState } from 'react';
import { Award, ClipboardCheck, Flag, GraduationCap, ShieldAlert, Star } from 'lucide-react';
import { useTr } from '../locale';
import WorkspaceHeader from '../shared/ui/WorkspaceHeader';
import { BannerBadge } from '../shared/ui/DashboardHeader';

const jreq = (url: string, method = 'POST', body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const field = 'form-input h-11 text-xs border-[color:var(--t-200)] bg-[color:var(--t-bg)] focus:bg-white';
const lab = 'text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1';
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');
const statusBadge = (status: string) => {
  if (status === 'approved' || status === 'done' || status === 'resolved') return 'app-badge badge-success';
  if (status === 'rejected' || status === 'critical' || status === 'high') return 'app-badge bg-rose-50 text-rose-800 border-rose-200';
  if (status === 'pending' || status === 'open' || status === 'investigating') return 'app-badge badge-brand';
  return 'app-badge badge-neutral';
};

async function uploadEvidence(file: File, kind: 'cpd' | 'certificate'): Promise<string | null> {
  const f = new FormData(); f.append('file', file); f.append('kind', kind);
  const d = await fetch('/api/documents', { method: 'POST', body: f }).then(r => r.json());
  return d.status === 'success' ? d.data.id : null;
}

/** Practitioner quality hub: ratings, CPD, specialty certificates, peer review, incidents. */
export default function PractitionerQuality({ profileId, embedded = false }: { profileId: string | null; embedded?: boolean }) {
  const tx = useTr();
  const [tab, setTab] = useState<'reviews' | 'cpd' | 'peer' | 'incidents'>('cpd');
  const [cred, setCred] = useState<any | null>(null);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

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

  if (!profileId) {
    return (
      <div className={embedded ? "space-y-6 w-full" : "page-w mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full"}>
        <WorkspaceHeader
          icon={Award}
          eyebrow={tx('Continuous Professional Development · Audit')}
          title={tx('Quality Assurance, CPD Points & Peer Reviews')}
          description={tx('Log verified CPD education credits, submit peer clinical audits, and review regulatory practice compliance with the medical council.')}
          badges={<BannerBadge tone="brand">{tx('MMC CPD Accredited')}</BannerBadge>}
        />
        <p className="bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold p-5 max-w-2xl">
          {tx('Submit your credentials in the Practitioner Portal first. Quality tools open once you have a profile.')}
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6 w-full" : "page-w mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full"}>
      <WorkspaceHeader
        icon={Award}
        eyebrow={tx('Continuous Professional Development · Audit')}
        title={tx('Quality Assurance, CPD Points & Peer Reviews')}
        description={tx('Log verified CPD education credits, submit peer clinical audits, and review regulatory practice compliance with the medical council.')}
        badges={
          <div className="flex items-center gap-1.5 flex-wrap">
            <BannerBadge tone="brand">{tx('MMC CPD Accredited')}</BannerBadge>
            {cred && (
              <BannerBadge tone="success">
                {cred.pointsApproved ?? 0} / {cred.target ?? 50} {tx('CPD Points')}
              </BannerBadge>
            )}
          </div>
        }
        tabs={[
          { id: 'cpd', label: tx('CPD & Certificates'), icon: GraduationCap },
          { id: 'peer', label: tx('Peer Review'), icon: ClipboardCheck },
          { id: 'incidents', label: tx('Report Incident'), icon: ShieldAlert },
          { id: 'reviews', label: tx('Review Moderation'), icon: Star, count: cred?.reviews?.count },
        ]}
        activeTab={tab}
        onTabChange={(id) => { setTab(id as any); setMsg(null); }}
        tabsLabel={tx('Quality Assurance and CPD Sections')}
      />
      {msg && <p role="status" className={`text-xs font-bold p-3 border ${msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-800 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      {tab === 'reviews' && (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)] items-start">
          <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-xs"><p className={lab}>{tx('Average Rating')}</p><p className="text-3xl font-black tabular-nums text-[color:var(--ink)]">{cred?.reviews.average ?? '—'}</p></div>
            <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-xs"><p className={lab}>{tx('Published Reviews')}</p><p className="text-3xl font-black tabular-nums text-[color:var(--ink)]">{cred?.reviews.count ?? 0}</p></div>
          </div>
          <p className="text-xs text-[color:var(--ink-2)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-3 leading-relaxed">{tx('Only patients who have concluded a consultation visit can submit ratings. You can report reviews that breach ethical or privacy guidelines.')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 items-start">
          {myReviews.length === 0 ? <p className="text-xs text-slate-500 bg-white border border-[color:var(--t-200)] p-8 text-center lg:col-span-2">{tx('No patient reviews recorded yet.')}</p> : myReviews.map(r => (
            <article key={r.id} className="bg-white border border-[color:var(--t-200)] p-5 text-xs space-y-2 shadow-xs">
              <p className="font-bold text-amber-500 flex items-center justify-between">
                <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className="text-xs text-slate-500 font-mono font-normal">{r.date}</span>
              </p>
              {r.comment && <p className="text-xs text-[color:var(--ink)] leading-relaxed font-medium">"{r.comment}"</p>}
              {r.replyText && <p className="text-xs bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-2.5 text-[color:var(--ink-2)]"><b>{tx('Your response:')}</b> {r.replyText}</p>}
              {reportingId === r.id ? (
                <div className="pt-2 border-t border-[color:var(--t-100)] space-y-2">
                  <input
                    type="text"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder={tx('Specify ethical or privacy guideline breach...')}
                    className={field}
                    maxLength={300}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!reportReason.trim()}
                      onClick={async () => {
                        const d = await jreq(`/api/reviews/${r.id}/report`, 'POST', { reason: reportReason.trim() });
                        say(d.status === 'success', d.message || tx('Could not report.'));
                        if (d.status === 'success') { setReportingId(null); setReportReason(''); }
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      {tx('Submit Report')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setReportingId(null); setReportReason(''); }}
                      className="btn btn-sm btn-secondary"
                    >
                      {tx('Cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setReportingId(r.id); setReportReason(''); }}
                  className="text-xs font-bold text-slate-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer pt-1"
                >
                  <Flag className="h-3 w-3" /> {tx('Report review to board')}
                </button>
              )}
            </article>
          ))}
          </div>
        </section>
      )}

      {tab === 'cpd' && cred && <CpdSection cred={cred} reload={load} say={say} />}
      {tab === 'peer' && <PeerSection say={say} />}
      {tab === 'incidents' && <IncidentSection say={say} />}
    </div>
  );
}

function CpdSection({ cred, reload, say }: { cred: any; reload: () => void; say: (ok: boolean, t: string) => void }) {
  const tx = useTr();
  const today = new Date().toISOString().slice(0, 10);
  const [cpd, setCpd] = useState({ title: '', category: 'course', points: '', activityDate: today, provider: '' });
  const [cpdFile, setCpdFile] = useState<File | null>(null);
  const [cert, setCert] = useState({ name: '', issuer: '', issuedDate: '', expiryDate: '' });
  const [certFile, setCertFile] = useState<File | null>(null);
  const pct = Math.min(100, Math.round((cred.pointsApproved / cred.target) * 100));

  const addCpd = async (e: React.FormEvent) => {
    e.preventDefault();
    const documentId = cpdFile ? await uploadEvidence(cpdFile, 'cpd') : undefined;
    if (cpdFile && !documentId) return say(false, tx('The evidence file could not be uploaded (PDF, JPG or PNG, up to 5 MB).'));
    const d = await jreq('/api/me/cpd', 'POST', { ...cpd, points: Number(cpd.points), documentId });
    say(d.status === 'success', d.status === 'success' ? tx('Submitted for verification.') : d.message);
    if (d.status === 'success') { setCpd({ ...cpd, title: '', points: '', provider: '' }); setCpdFile(null); reload(); }
  };
  const addCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile) return say(false, tx('Attach a copy of the certificate.'));
    const documentId = await uploadEvidence(certFile, 'certificate');
    if (!documentId) return say(false, tx('The file could not be uploaded (PDF, JPG or PNG, up to 5 MB).'));
    const d = await jreq('/api/me/specialty-certs', 'POST', { ...cert, expiryDate: cert.expiryDate || undefined, documentId });
    say(d.status === 'success', d.status === 'success' ? tx('Submitted for verification.') : d.message);
    if (d.status === 'success') { setCert({ name: '', issuer: '', issuedDate: '', expiryDate: '' }); setCertFile(null); reload(); }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-start">
      <div className="space-y-5 min-w-0">
      <section className="bg-white border border-[color:var(--t-200)] p-6 space-y-3 shadow-xs">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)]">CPD Progress for {cred.year}</h3>
        <div className="h-3 bg-slate-100 border border-[color:var(--t-100)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-[color:var(--t-600)] transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="text-xs"><b className="tabular-nums font-mono text-base text-[color:var(--ink)]">{cred.pointsApproved}</b> of {cred.target} verified annual points{cred.pointsPending ? ` · ${cred.pointsPending} awaiting review` : ''}</p>
        <p className="text-xs text-[color:var(--ink-2)]">{tx('Annual points are audited against MMC / LJM renewal prerequisites before Annual Practising Certificate dispatch.')}</p>
      </section>

      <form onSubmit={addCpd} className="bg-white border border-[color:var(--t-200)] p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-xs">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)] sm:col-span-2">{tx('Log Continuous Professional Development')}</h3>
        <div className="sm:col-span-2"><label className={lab}>{tx('Activity Title')}</label><input className="w-full h-12 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] focus:bg-white px-3.5 text-xs text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] transition-colors" value={cpd.title} onChange={e => setCpd({ ...cpd, title: e.target.value })} required maxLength={150} placeholder={tx('e.g. National Cardiology Symposium 2026')} /></div>
        <div><label className={lab}>{tx('Category')}</label><CustomSelect className="form-select w-full h-12 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] focus:bg-white px-3 text-xs text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] transition-colors cursor-pointer" value={cpd.category} onChange={e => setCpd({ ...cpd, category: e.target.value })}>{['course', 'conference', 'publication', 'teaching', 'self-study'].map(c => <option key={c}>{c}</option>)}</CustomSelect></div>
        <div><label className={lab}>{tx('Points Claimed')}</label><input type="number" step="0.5" min="0.5" max="50" className="w-full h-12 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] focus:bg-white px-3.5 text-xs text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] transition-colors" value={cpd.points} onChange={e => setCpd({ ...cpd, points: e.target.value })} required placeholder="e.g. 5.0" /></div>
        <div><label className={lab}>{tx('Completion Date')}</label><input type="date" max={today} className="w-full h-12 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] focus:bg-white px-3.5 text-xs text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] transition-colors" value={cpd.activityDate} onChange={e => setCpd({ ...cpd, activityDate: e.target.value })} required /></div>
        <div><label className={lab}>{tx('Provider / Accreditor')}</label><input className="w-full h-12 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] focus:bg-white px-3.5 text-xs text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] transition-colors" value={cpd.provider} onChange={e => setCpd({ ...cpd, provider: e.target.value })} maxLength={120} placeholder={tx('e.g. MMA / College of Surgeons')} /></div>
        <label className="sm:col-span-2 text-xs font-bold border border-dashed border-[color:var(--t-200)] bg-[color:var(--t-bg)] hover:bg-slate-50 p-4 text-center cursor-pointer transition-colors block">{cpdFile ? cpdFile.name : 'Attach Certificate of Attendance (PDF, JPG, PNG up to 5 MB)'}<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCpdFile(e.target.files?.[0] ?? null)} /></label>
        <button className="sm:col-span-2 h-12 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer transition-colors shadow-xs">{tx('Submit CPD for Verification')}</button>
      </form>
      </div>
      <div className="space-y-5 min-w-0">

      <section className="bg-white border border-[color:var(--t-200)] p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)]">{tx('Your CPD entries')}</h3>
        {cred.entries.length === 0 ? <p className="text-xs text-slate-500">{tx('None yet.')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs"><thead><tr className="text-left text-xs uppercase text-slate-500 border-b border-[color:var(--t-100)]"><th className="py-2 pr-3">{tx('Date')}</th><th className="pr-3">{tx('Activity')}</th><th className="pr-3">{tx('Points')}</th><th className="pr-3">{tx('Status')}</th><th /></tr></thead>
              <tbody className="divide-y divide-[color:var(--t-100)]">{cred.entries.map((e: any) => (
                <tr key={e.id}><td className="py-2.5 pr-3 font-mono tabular-nums text-slate-600">{e.activity_date}</td><td className="pr-3"><span className="font-bold text-[color:var(--ink)]">{e.title}</span><span className="text-slate-400"> · {e.category}</span>{e.review_note ? <span className="block text-rose-700 mt-0.5">{e.review_note}</span> : null}</td><td className="pr-3 font-mono font-bold tabular-nums">{e.points}</td>
                  <td className="pr-3"><span className={statusBadge(e.status)}>{tx(e.status)}</span></td>
                  <td className="text-right">{e.status === 'pending' && <button className="text-rose-700 hover:underline font-bold cursor-pointer" onClick={async () => { await jreq(`/api/me/cpd/${e.id}`, 'DELETE'); reload(); }}>{tx('Remove')}</button>}</td></tr>
              ))}</tbody></table>
          </div>
        )}
      </section>

      <form onSubmit={addCert} className="bg-white border border-[color:var(--t-200)] p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-xs">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)] sm:col-span-2 flex items-center gap-2"><Award className="h-4 w-4 text-[color:var(--t-600)]" /> {tx('Specialty certificates')}</h3>
        <div><label className={lab}>{tx('Certificate')}</label><input className={field} value={cert.name} onChange={e => setCert({ ...cert, name: e.target.value })} required placeholder={tx('e.g. MRCP (UK)')} maxLength={150} /></div>
        <div><label className={lab}>{tx('Issued by')}</label><input className={field} value={cert.issuer} onChange={e => setCert({ ...cert, issuer: e.target.value })} required maxLength={150} /></div>
        <div><label className={lab}>{tx('Issued')}</label><input type="date" className={field} value={cert.issuedDate} onChange={e => setCert({ ...cert, issuedDate: e.target.value })} required /></div>
        <div><label className={lab}>{tx('Expires (if it does)')}</label><input type="date" className={field} value={cert.expiryDate} onChange={e => setCert({ ...cert, expiryDate: e.target.value })} /></div>
        <label className="sm:col-span-2 text-xs font-bold border border-dashed border-[color:var(--t-200)] bg-[color:var(--t-bg)] hover:bg-slate-50 p-4 text-center cursor-pointer transition-colors block">{certFile ? certFile.name : 'Attach a copy of the certificate (required)'}<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCertFile(e.target.files?.[0] ?? null)} /></label>
        <button className="sm:col-span-2 h-11 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer transition-colors shadow-xs">{tx('Submit for verification')}</button>
        {cred.certs.length > 0 && (
          <ul className="sm:col-span-2 text-xs divide-y divide-[color:var(--t-100)] border-t border-[color:var(--t-100)] pt-2">{cred.certs.map((c: any) => (
            <li key={c.id} className="py-2.5 flex items-center justify-between gap-3"><span><b>{c.name}</b> · {c.issuer}{c.expiry_date ? ` · expires ${c.expiry_date}` : ''}{c.review_note ? <span className="block text-rose-700 mt-0.5">{c.review_note}</span> : null}</span><span className={statusBadge(c.status)}>{c.status === 'approved' ? tx('Shown on profile') : tx(c.status)}</span></li>
          ))}</ul>
        )}
      </form>
      </div>
    </div>
  );
}

function PeerSection({ say }: { say: (ok: boolean, t: string) => void }) {
  const tx = useTr();
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
    say(d.status === 'success', d.status === 'success' ? tx('Review submitted. Thank you.') : d.message);
    if (d.status === 'success') { setOpen(null); load(); }
  };
  const c = open?.content;
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 items-start">
      <section className="bg-white border border-[color:var(--t-200)] p-6 space-y-3 min-w-0 shadow-xs">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)]">{tx('Cases for you to review')}</h3>
        <p className="text-xs text-slate-500">{tx('Colleagues\' work, with the patient and the author hidden. Treat what you read as confidential.')}</p>
        {tasks.length === 0 ? <p className="text-xs text-slate-500">{tx('Nothing assigned.')}</p> : (
          <ul className="divide-y divide-[color:var(--t-100)] text-xs">{tasks.map(t => (
            <li key={t.id} className="py-2.5 flex items-center justify-between gap-3"><span className="font-semibold text-[color:var(--ink)]">{t.subject_type === 'prescription' ? 'Prescription' : 'Consultation note'} · <span className="text-slate-500 font-normal">assigned {day(t.assigned_at)}</span></span>
              {t.status === 'pending' ? <button onClick={() => openCase(t.id)} className="btn btn-sm btn-secondary">{tx('Review')}</button> : <span className={statusBadge('done')}>{tx('Completed')}</span>}</li>
          ))}</ul>
        )}
      </section>

      {open && (
        <section className="bg-white border-2 border-[color:var(--t-200)] p-5 space-y-3 xl:col-span-2">
          <h3 className="text-sm font-extrabold">{c?.kind ?? 'Case'}</h3>
          {c && <div className="text-xs space-y-1.5 bg-slate-50 border border-slate-200 p-3">
            {'subjective' in c ? (['subjective', 'objective', 'assessment', 'plan'] as const).map(k => <p key={k}><span className="text-xs font-extrabold uppercase text-slate-500 mr-2">{k}</span>{c[k]}</p>) : (
              <>
                <p><span className="text-xs font-extrabold uppercase text-slate-500 mr-2">{tx('Diagnosis')}</span>{c.diagnosis}</p>
                <ul className="list-disc ml-5">{c.items.map((i: any, k: number) => <li key={k}>{i.name} {i.strength} · {i.dose}, {i.frequency}, {i.durationDays} days, qty {i.quantity}</li>)}</ul>
                <p className="text-xs">Patient record was {c.patientRecordWasShared ? 'shared' : 'NOT shared'} with the prescriber. Warnings raised: {c.safetyWarnings?.length ? c.safetyWarnings.map((w: any) => `${w.severity}: ${w.message}`).join(' | ') : 'none'}. {Object.keys(c.overrideReasons ?? {}).length ? `Override reasons: ${Object.values(c.overrideReasons).join(' | ')}` : ''}</p>
              </>
            )}
          </div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lab}>{tx('Outcome')}</label><CustomSelect className={`form-select ${field}`} value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })}><option value="no_concerns">{tx('No concerns')}</option><option value="minor_concerns">{tx('Minor concerns')}</option><option value="significant_concerns">{tx('Significant concerns')}</option></CustomSelect></div>
            <div><label className={lab}>{tx('Quality score (1 low, 5 high)')}</label><CustomSelect className={`form-select ${field}`} value={form.score} onChange={e => setForm({ ...form, score: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</CustomSelect></div>
          </div>
          <div><label className={lab}>Comments {form.outcome !== 'no_concerns' ? '(required)' : '(optional)'}</label><textarea className={field} rows={3} value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} maxLength={3000} /></div>
          <div className="flex gap-2"><button onClick={submit} className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">{tx('Submit review')}</button><button onClick={() => setOpen(null)} className="border border-slate-200 text-xs font-bold px-4 py-2.5 cursor-pointer">{tx('Cancel')}</button></div>
        </section>
      )}

      <section className="bg-white border border-[color:var(--t-200)] p-6 space-y-3 min-w-0 shadow-xs">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)]">{tx('Feedback on your own work')}</h3>
        {about.length === 0 ? <p className="text-xs text-slate-500">{tx('No peer feedback yet.')}</p> : about.map(a => (
          <article key={a.id} className="border border-[color:var(--t-200)] bg-[color:var(--t-bg)] p-3.5 text-xs space-y-1"><p className="font-bold text-[color:var(--ink)] flex items-center justify-between gap-2"><span>{a.subject_type === 'prescription' ? 'Prescription' : 'Consultation note'} · score {a.score}/5 · {a.outcome.replace(/_/g, ' ')}</span><span className="text-xs text-slate-400 font-mono font-normal">{day(a.completed_at)}</span></p>{a.comments && <p className="text-xs text-slate-700">{a.comments}</p>}</article>
        ))}
      </section>
    </div>
  );
}

function IncidentSection({ say }: { say: (ok: boolean, t: string) => void }) {
  const tx = useTr();
  const [form, setForm] = useState({ kind: 'near_miss', severity: 'low', description: '' });
  const [mine, setMine] = useState<any[]>([]);
  const load = useCallback(() => fetch('/api/incidents/mine').then(r => r.json()).then(d => d.status === 'success' && setMine(d.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jreq('/api/incidents', 'POST', form);
    say(d.status === 'success', d.status === 'success' ? tx('Reported. The board has been notified.') : d.message);
    if (d.status === 'success') { setForm({ ...form, description: '' }); load(); }
  };
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 items-start">
      <form onSubmit={submit} className="bg-white border border-[color:var(--t-200)] p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)]">{tx('Report a patient-safety incident or near miss')}</h3>
        <p className="text-xs text-slate-500">Reporting is how we learn. Do not include patient names; describe what happened. For anyone in immediate danger call 999 first.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={lab}>{tx('Type')}</label><CustomSelect className={`form-select ${field}`} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
            <option value="near_miss">{tx('Near miss')}</option><option value="adverse_drug_event">{tx('Adverse drug event')}</option><option value="patient_harm">{tx('Patient harm')}</option><option value="misconduct">{tx('Misconduct')}</option><option value="privacy">{tx('Privacy or data issue')}</option><option value="system">{tx('Platform problem')}</option><option value="other">{tx('Other')}</option></CustomSelect></div>
          <div><label className={lab}>{tx('Severity')}</label><CustomSelect className={`form-select ${field}`} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}><option value="low">{tx('Low')}</option><option value="medium">{tx('Medium')}</option><option value="high">{tx('High')}</option><option value="critical">{tx('Critical')}</option></CustomSelect></div>
        </div>
        <textarea className="form-textarea text-xs border-[color:var(--t-200)] bg-[color:var(--t-bg)] focus:bg-white p-3" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={tx('What happened? (at least 20 characters)')} required minLength={20} maxLength={4000} aria-label={tx('Description')} />
        <button className="h-11 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer transition-colors shadow-xs">{tx('Submit report')}</button>
      </form>
      <section className="bg-white border border-[color:var(--t-200)] p-6 min-w-0 shadow-xs space-y-3"><h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)]">{tx('Your reports')}</h3>
        {mine.length === 0 ? <p className="text-xs text-slate-500">{tx('No reports yet.')}</p> : <ul className="divide-y divide-[color:var(--t-100)] text-xs">{mine.map(i => <li key={i.id} className="py-2.5 flex items-start justify-between gap-3"><div><b className="capitalize text-[color:var(--ink)]">{i.kind.replace(/_/g, ' ')}</b> · <span className="uppercase font-mono text-2xs font-bold">{i.severity}</span> <span className="text-xs text-slate-400 font-mono">{day(i.createdAt)}</span>{i.resolution && <p className="text-xs text-slate-600 mt-1">Outcome: {i.resolution}</p>}</div><span className={statusBadge(i.status)}>{tx(i.status)}</span></li>)}</ul>}</section>
    </div>
  );
}
