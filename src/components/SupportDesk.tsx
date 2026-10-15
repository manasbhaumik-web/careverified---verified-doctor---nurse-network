import React, { useCallback, useEffect, useState } from 'react';
import { TestimonialForm } from './TestimonialPanels';
import { AlertTriangle, LifeBuoy } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { useLocale } from '../locale/store';

const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const field = 'border border-slate-200 bg-white px-3 py-2 text-sm w-full focus:outline-none focus:border-[color:var(--t-600)]';
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

/** Help & support for patients and practitioners: open a ticket, follow replies. Safety concerns are answered first. */
export default function SupportDesk() {
  const [cats, setCats] = useState<{ name: string; priority: string; respondWithinHours: number }[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [open, setOpen] = useState<any | null>(null);
  const [form, setForm] = useState({ category: '', subject: '', body: '', target: '' });
  const [reply, setReply] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([fetch('/api/support/categories').then(r => r.json()), fetch('/api/support/tickets').then(r => r.json())]);
    if (c.status === 'success') setCats(c.data);
    if (t.status === 'success') setTickets(t.data);
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const { lang } = useLocale();
  const [hours, setHours] = useState<{ open: boolean; nextChange: string; text: Record<string, string> } | null>(null);
  useEffect(() => { fetch('/api/support/hours').then(r => r.json()).then(d => d.status === 'success' && setHours(d.data)).catch(() => {}); }, []);

  // Other pages (e.g. the Medical Library's "Report a problem") can hand over a draft subject.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('support_prefill');
      if (!raw) return;
      sessionStorage.removeItem('support_prefill');
      const p = JSON.parse(raw);
      setForm(f => ({ ...f, category: String(p.category || ''), subject: String(p.subject || '').slice(0, 120) }));
    } catch { /* ignore */ }
  }, []);

  const openTicket = async (id: string) => {
    const d = await fetch(`/api/support/tickets/${id}`).then(r => r.json());
    if (d.status === 'success') setOpen(d.data);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    const d = await jpost('/api/support/tickets', { ...form, target: form.category === 'Report a user' ? form.target : undefined });
    if (d.status === 'success') {
      setMsg({ ok: true, text: `Ticket opened. We aim to reply within ${d.data.respondWithinHours} hour${d.data.respondWithinHours === 1 ? '' : 's'}.` });
      setForm({ category: '', subject: '', body: '', target: '' });
      load(); openTicket(d.data.id);
    } else setMsg({ ok: false, text: d.message });
  };

  const send = async () => {
    if (!open || !reply.trim()) return;
    const d = await jpost(`/api/support/tickets/${open.id}/reply`, { body: reply });
    if (d.status === 'success') { setReply(''); openTicket(open.id); load(); } else setMsg({ ok: false, text: d.message });
  };
  const resolve = async () => { if (open) { await jpost(`/api/support/tickets/${open.id}/resolve`); openTicket(open.id); load(); } };
  const chosen = cats.find(c => c.name === form.category);

  return (
    <div className="w-full space-y-5">
      <DashboardHeader
        icon={LifeBuoy}
        eyebrow="Support"
        title="Help & support"
        description="Tell us what went wrong. Safety concerns are answered first."
        actions={
          <p className="text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-900 p-3 flex gap-2 items-center max-w-sm"><AlertTriangle className="h-4 w-4 shrink-0" />If you or someone else is in danger, call 999. Do not wait for a support reply.</p>
        }
      />

      {hours && (
        <p role="status" className={`text-xs font-semibold border p-3 ${hours.open ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {hours.open ? 'Our team is online now.' : `Our team is away. We will reply from ${new Date(hours.nextChange).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: '2-digit', minute: '2-digit' })} Malaysia time.`}
          {' '}Support hours: {hours.text[lang] ?? hours.text.en}. Replies to urgent safety concerns are prioritised.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)] items-start">
      <div className="space-y-5 min-w-0">

      <form onSubmit={create} className="bg-white border border-[color:var(--t-200)] p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)]">Open a Support Ticket</h2>
        <select className="w-full h-12 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3 text-sm text-[color:var(--ink)] focus:bg-white focus:outline-none focus:border-[color:var(--t-600)] transition-colors cursor-pointer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required aria-label="Category">
          <option value="">Select ticket category…</option>
          {cats.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {chosen && <p className="text-xs text-[color:var(--ink-2)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-2.5">Target resolution window: <b className="text-[color:var(--ink)]">{chosen.respondWithinHours} hour{chosen.respondWithinHours === 1 ? '' : 's'}</b>.</p>}
        {form.category === 'Report a user' && <input className="w-full h-12 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3.5 text-sm text-[color:var(--ink)] focus:bg-white focus:outline-none focus:border-[color:var(--t-600)] transition-colors" placeholder="Who are you reporting? (Practitioner or Pharmacy name)" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} maxLength={100} />}
        <input className="w-full h-12 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3.5 text-sm text-[color:var(--ink)] focus:bg-white focus:outline-none focus:border-[color:var(--t-600)] transition-colors" placeholder="Ticket Subject (summary)" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required minLength={3} maxLength={120} />
        <textarea className="w-full border border-[color:var(--t-200)] bg-[color:var(--t-bg)] p-3 text-sm text-[color:var(--ink)] focus:bg-white focus:outline-none focus:border-[color:var(--t-600)] transition-colors" rows={4} placeholder="Detailed explanation of the issue or clinical question…" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required minLength={10} maxLength={3000} />
        {msg && <p role="status" className={`text-xs font-bold p-3 border ${msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-800 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}
        <button className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold h-12 flex items-center justify-center cursor-pointer transition-colors shadow-xs">Submit Ticket to Care Operations</button>
      </form>

      {cats.length > 0 && (
        <section className="bg-white border border-[color:var(--t-200)] p-5 shadow-xs">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[color:var(--ink)] mb-3">Service Level Agreement (SLA)</h2>
          <ul className="divide-y divide-[color:var(--t-100)] text-xs">
            {cats.map(c => (
              <li key={c.name} className="py-2 flex justify-between items-center gap-3">
                <span className="font-medium text-[color:var(--ink)]">{c.name}</span>
                <span className="font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">within {c.respondWithinHours}h</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>

      <div className="grid md:grid-cols-[280px_minmax(0,1fr)] gap-5 min-w-0">
        <section className="bg-white border border-slate-200 p-4">
          <h2 className="text-sm font-extrabold mb-2">Your tickets</h2>
          {tickets.length === 0 ? <p className="text-xs text-slate-500">None yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {tickets.map(t => (
                <li key={t.id}><button onClick={() => openTicket(t.id)} className={`w-full text-left py-2.5 cursor-pointer ${open?.id === t.id ? 'font-bold' : ''}`}>
                  <p className="text-sm truncate">{t.subject}</p><p className="text-[11px] text-slate-500">{t.category} · {t.status}</p>
                </button></li>
              ))}
            </ul>
          )}
        </section>
        <section className="bg-white border border-slate-200 p-4">
          {!open ? <p className="text-sm text-slate-500">Select a ticket to read the conversation.</p> : (
            <div className="space-y-3">
              <div className="flex justify-between gap-3"><div><h3 className="text-sm font-extrabold">{open.subject}</h3><p className="text-[11px] text-slate-500">{open.category} · {open.status} · opened {when(open.createdAt)}</p></div>
                {open.status !== 'resolved' && <button onClick={resolve} className="text-xs font-bold border border-slate-200 px-3 py-1.5 h-fit cursor-pointer">Mark resolved</button>}</div>
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {open.messages.map((m: any) => (
                  <li key={m.id} className={`text-sm p-3 border ${m.fromStaff ? 'bg-[color:var(--t-50)] border-[color:var(--t-200)]' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[10px] font-extrabold uppercase text-slate-500 mb-1">{m.fromStaff ? 'MedCred support' : 'You'} · {when(m.ts)}</p>{m.body}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input className={field} value={reply} onChange={e => setReply(e.target.value)} placeholder={open.status === 'resolved' ? 'Reply to reopen this ticket' : 'Write a reply'} maxLength={3000} aria-label="Reply" />
                <button onClick={send} disabled={!reply.trim()} className="bg-[color:var(--t-600)] disabled:bg-slate-300 text-white text-xs font-extrabold px-4 cursor-pointer">Send</button>
              </div>
            </div>
          )}
        </section>
      </div>
      </div>
      <TestimonialForm />
    </div>
  );
}
