import React, { useState } from 'react';
import { Siren, X } from 'lucide-react';

/** Always-visible emergency button for patients: numbers first, then an optional alert to the on-call team. */
export default function SOSButton() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{ numbers: { label: string; number: string }[]; disclaimer: string; verifyLocal?: boolean } | null>(null);
  const [country, setCountry] = useState(() => { try { return localStorage.getItem('medcred-sos-country') || 'MY'; } catch { return 'MY'; } });
  const [result, setResult] = useState<{ mapUrl: string | null; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (c: string) => {
    const d = await fetch(`/api/emergency/info?country=${encodeURIComponent(c)}`).then(r => r.json()).catch(() => null);
    if (d?.status === 'success') setInfo(d.data);
  };

  const show = async () => {
    setOpen(true); setResult(null); setError('');
    await load(country);
  };

  const changeCountry = (v: string) => {
    const c = v.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    setCountry(c);
    if (c.length === 2) {
      try { localStorage.setItem('medcred-sos-country', c); } catch { /* ignore */ }
      load(c);
    }
  };

  const alertTeam = async () => {
    setBusy(true); setError('');
    const pos = await new Promise<GeolocationPosition | null>(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(p => resolve(p), () => resolve(null), { timeout: 6000, maximumAge: 60_000 });
    });
    try {
      const d = await fetch('/api/emergency', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pos?.coords.latitude, lng: pos?.coords.longitude }),
      }).then(r => r.json());
      if (d.status === 'success') setResult(d.data); else setError(d.message || 'Could not send the alert.');
    } catch { setError('Could not reach the server. Call the emergency number now.'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={show} className="inline-flex items-center gap-1.5 h-11 px-3 bg-white text-[color:var(--t-700)] text-xs font-black border-0 hover:bg-rose-50 cursor-pointer shadow-xs" aria-label="Emergency help">
        <Siren className="h-4 w-4" /> SOS
      </button>
      {open && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label="Emergency help">
          <div className="bg-white w-full max-w-md border-2 border-rose-500 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-black text-rose-700 flex items-center gap-2"><Siren className="h-5 w-5" /> Emergency</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              {(info?.numbers ?? [{ label: 'National emergency', number: '999' }]).map(n => (
                <a key={n.number} href={`tel:${n.number}`} className="flex items-center justify-between bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 font-black">
                  <span className="text-xs font-bold">{n.label}</span><span className="text-2xl">{n.number}</span>
                </a>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Where are you? (country code)
              <input value={country} onChange={e => changeCountry(e.target.value)} maxLength={2} aria-label="Country code for emergency numbers"
                className="w-14 border border-slate-300 p-1 text-center font-bold uppercase" />
            </label>
            {info?.verifyLocal && <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2">We do not have the local number for this country. 112 works on many mobile networks, but check the local emergency number.</p>}
            <p className="text-xs text-slate-600">{info?.disclaimer ?? 'MedCred is not an emergency service. Call the number above first.'}</p>

            {!result ? (
              <>
                {error && <p className="text-xs font-bold text-rose-700">{error}</p>}
                <button onClick={alertTeam} disabled={busy} className="w-full border-2 border-rose-300 text-rose-800 font-extrabold text-sm py-2.5 hover:bg-rose-50 disabled:opacity-60 cursor-pointer">
                  {busy ? 'Sending…' : 'Also alert the MedCred on-call team (shares your location)'}
                </button>
              </>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1">
                <p className="font-bold">{result.message}</p>
                {result.mapUrl && <a href={result.mapUrl} target="_blank" rel="noreferrer" className="underline font-bold">Find hospitals near you (OpenStreetMap)</a>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
