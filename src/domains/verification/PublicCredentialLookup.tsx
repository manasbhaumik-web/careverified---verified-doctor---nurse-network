import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock, AlertTriangle, Ban } from 'lucide-react';
import { useTr } from '../../locale';

export interface PublicCredential {
  name: string; role: string; specialty: string | null; registrationNumber: string; registeringBody: string | null;
  status: 'verified' | 'expiring' | 'expired' | 'suspended'; validFrom: string | null; validUntil: string | null;
  facility: string | null; scope: string | null; badge: string;
}

const STATUS = {
  verified: { label: 'Verified', cls: 'bg-emerald-50 border-emerald-300 text-emerald-900', Icon: ShieldCheck },
  expiring: { label: 'Expiring soon', cls: 'bg-amber-50 border-amber-300 text-amber-950', Icon: Clock },
  expired: { label: 'Expired', cls: 'bg-rose-50 border-rose-300 text-rose-900', Icon: AlertTriangle },
  suspended: { label: 'Suspended', cls: 'bg-rose-50 border-rose-300 text-rose-900', Icon: Ban },
} as const;

/**
 * Live registration status from the public credential lookup (no login). Searches by name or registration number,
 * and opens one practitioner directly from a QR/badge link (/verify?badge=...).
 */
export default function PublicCredentialLookup({ query, role }: { query: string; role: 'all' | 'doctor' | 'nurse' }) {
  const tx = useTr();
  const [results, setResults] = useState<PublicCredential[] | null>(null);
  const [badge, setBadge] = useState<PublicCredential | null | undefined>(undefined);
  const q = query.trim();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('badge');
    if (!token) return;
    fetch(`/api/public/credentials/${encodeURIComponent(token)}`).then(r => r.json())
      .then(r => setBadge(r?.data?.found ? r.data.credential : null)).catch(() => setBadge(null));
  }, []);

  useEffect(() => {
    if (q.length < 3) { setResults(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q });
      if (role !== 'all') params.set('role', role);
      fetch(`/api/public/credentials?${params}`, { signal: ctl.signal }).then(r => r.json())
        .then(r => setResults(r?.status === 'success' ? r.data : [])).catch(() => { /* aborted or offline */ });
    }, 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, role]);

  const card = (c: PublicCredential) => {
    const s = STATUS[c.status]; const Icon = s.Icon;
    return (
      <li key={c.badge} className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap gap-4 items-start justify-between">
        <div className="min-w-0 space-y-1">
          <p className="font-extrabold text-[color:var(--ink)]">{c.name}</p>
          <p className="text-xs text-slate-600">{[c.role, c.specialty].filter(Boolean).join(' · ')}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-slate-700 pt-1">
            <dt className="font-bold">{tx('Registering body')}</dt><dd>{c.registeringBody ?? '—'}</dd>
            <dt className="font-bold">{tx('Registration no.')}</dt><dd className="font-mono">{c.registrationNumber}</dd>
            <dt className="font-bold">{tx('Valid')}</dt><dd>{c.validFrom ?? '—'} → {c.validUntil ?? '—'}</dd>
            <dt className="font-bold">{tx('Practising at')}</dt><dd>{c.facility ?? '—'}</dd>
          </dl>
        </div>
        <div className="flex items-start gap-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 border ${s.cls}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{tx(s.label)}</span>
          <img src={`/api/public/credentials/${c.badge}/qr.svg`} alt={tx('QR code for this practitioner’s verification page')} width={72} height={72} className="border border-[color:var(--t-200)]" loading="lazy" />
        </div>
      </li>
    );
  };

  if (badge === undefined && results === null) return null;
  return (
    <section aria-label={tx('Live registration status')} className="space-y-3">
      {badge === null && <p role="status" className="text-sm text-slate-700 bg-white border border-[color:var(--t-200)] p-4">{tx('No current registration was found for that badge.')}</p>}
      {badge && <ul className="space-y-3">{card(badge)}</ul>}
      {results && (results.length > 0
        ? <ul className="space-y-3">{results.map(card)}</ul>
        : <p role="status" className="text-sm text-slate-700 bg-white border border-[color:var(--t-200)] p-4">{tx('No verified registration matched your search.')}</p>)}
    </section>
  );
}
