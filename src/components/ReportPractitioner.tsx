import React, { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';

/** Lets a patient who has booked a practitioner file a complaint with the medical board. */
export default function ReportPractitioner({ professionalId }: { professionalId: string }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (open && categories.length === 0) {
      fetch('/api/complaint-categories').then(r => r.json()).then(d => d.status === 'success' && setCategories(d.data)).catch(() => {});
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const d = await fetch('/api/complaints', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalId, category, description }),
      }).then(r => r.json());
      setMsg({ ok: d.status === 'success', text: d.message || 'Something went wrong.' });
      if (d.status === 'success') { setDescription(''); setCategory(''); }
    } catch {
      setMsg({ ok: false, text: 'Server connection error.' });
    } finally { setBusy(false); }
  };

  const field = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#DC2626]';
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:text-rose-700 rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-sm cursor-pointer">
        <Flag className="h-4 w-4" /> Report a concern
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 bg-white border border-slate-200 rounded-xl p-4 space-y-3 max-w-md">
          <p className="text-xs text-slate-600">Reports go to the medical board, not to the practitioner. You can only report someone you have booked.</p>
          <select className={field} value={category} onChange={e => setCategory(e.target.value)} required>
            <option value="">Choose a category…</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea className={field} rows={4} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What happened? (at least 20 characters)" minLength={20} maxLength={2000} required />
          {msg && <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
          <button disabled={busy} className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-white text-xs font-extrabold px-4 py-2 rounded-xl cursor-pointer">
            {busy ? 'Sending…' : 'Submit report'}
          </button>
        </form>
      )}
    </div>
  );
}
