import React from 'react';
import { scopeOf } from '../registries';

type P = { verificationScope?: 'verified-in-malaysia' | 'verified-abroad'; registrationType?: string; medicalCouncil?: string; nursingCouncil?: string; isDemo?: boolean };

/** Says where the licence was checked, so a reviewed Malaysian register is not confused with a foreign licence. */
export default function VerificationScopeBadge({ prof, className = '' }: { prof: P; className?: string }) {
  const inMy = scopeOf(prof) === 'verified-in-malaysia';
  const tag = prof.registrationType === 'specialist' ? ' · Specialist' : prof.registrationType === 'provisional' ? ' · Provisional' : '';
  if (prof.isDemo) {
    return <span className={`inline-block text-xs font-bold px-1.5 py-0.5 border bg-amber-50 border-amber-300 text-amber-900 ${className}`} title="Invented test profile with a DEMO- registration number">Demo profile · not a real practitioner</span>;
  }
  return (
    <span className={`inline-block text-xs font-bold px-1.5 py-0.5 border ${inMy ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-sky-50 border-sky-300 text-sky-900'} ${className}`}>
      {inMy ? 'Register checked in Malaysia' : 'Verified abroad'}{tag}
    </span>
  );
}
