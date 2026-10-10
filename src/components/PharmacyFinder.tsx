import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, Phone, Pill, Search, Send } from 'lucide-react';
import DashboardHeader, { BannerKpis, FilterSelect } from './DashboardHeader';

interface Pharmacy { id: string; name: string; address: string; city: string | null; phone: string | null; hours: string | null; services: string[] }
interface Rx { id: string; code: string; status: string; validUntil: string; pharmacyId: string | null; items: { name: string; strength?: string }[] }

const ALL = 'all';
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

/** Patient: browse partner pharmacies and send an active prescription to one. */
export default function PharmacyFinder() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[] | null>(null);
  const [rx, setRx] = useState<Rx[]>([]);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState(ALL);
  const [service, setService] = useState(ALL);
  const [openId, setOpenId] = useState<string | null>(null);
  const [chosen, setChosen] = useState('');
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const loadRx = useCallback(async () => {
    const d = await fetch('/api/records/me').then(r => r.json()).catch(() => null);
    if (d?.status === 'success') setRx(d.data.prescriptions ?? []);
  }, []);
  useEffect(() => {
    fetch('/api/pharmacies').then(r => r.json()).then(d => setPharmacies(d.status === 'success' ? d.data : [])).catch(() => setPharmacies([]));
    loadRx();
  }, [loadRx]);

  const list = pharmacies ?? [];
  const cities = useMemo(() => Array.from(new Set(list.map(p => p.city).filter(Boolean) as string[])).sort(), [list]);
  const services = useMemo(() => Array.from(new Set(list.flatMap(p => p.services))).sort(), [list]);
  const activeRx = rx.filter(r => r.status === 'active');

  const shown = list.filter(p => {
    const q = query.trim().toLowerCase();
    return (q === '' || `${p.name} ${p.address} ${p.city ?? ''}`.toLowerCase().includes(q))
      && (city === ALL || p.city === city)
      && (service === ALL || p.services.includes(service));
  });
  const filtersOn = query !== '' || city !== ALL || service !== ALL;

  const send = async (p: Pharmacy) => {
    if (!chosen) return;
    setSending(true); setMsg(null);
    const d = await jpost(`/api/prescriptions/${chosen}/send`, { pharmacyId: p.id }).catch(() => null);
    setMsg({ id: p.id, ok: d?.status === 'success', text: d?.message || 'Could not send the prescription. Try again.' });
    setSending(false);
    if (d?.status === 'success') { setOpenId(null); setChosen(''); loadRx(); }
  };

  return (
    <div className="w-full space-y-5">
      <DashboardHeader
        icon={Pill}
        eyebrow="Partner pharmacies"
        title="Find a pharmacy"
        description="Browse partner pharmacies and send your e-prescription to the one that suits you."
        actions={
          <BannerKpis items={[
            { value: pharmacies ? list.length : '—', label: 'Pharmacies' },
            { value: pharmacies ? cities.length : '—', label: 'Cities' },
            { value: pharmacies ? list.filter(p => p.services.includes('24 hours')).length : '—', label: 'Open 24h' },
          ]} />
        }
      />

      <section aria-label="Find pharmacies" className="bg-white border border-[color:var(--t-200)] shadow-xs px-5 py-4 space-y-3">
        <label htmlFor="pharmacy-search" className="sr-only">Search pharmacies</label>
        <div className="flex items-center gap-2.5 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3.5 min-h-[44px] focus-within:border-[color:var(--t-600)]">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input id="pharmacy-search" type="text" placeholder="Search by name, address or city" value={query} onChange={e => setQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder-slate-500" />
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <FilterSelect label="City" value={city} onChange={setCity}>
            <option value={ALL}>All cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>
          <FilterSelect label="Service" value={service} onChange={setService}>
            <option value={ALL}>Any service</option>
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          {filtersOn && (
            <button type="button" onClick={() => { setQuery(''); setCity(ALL); setService(ALL); }} className="min-h-[40px] px-3 text-[13px] font-bold text-[color:var(--t-700)] hover:underline cursor-pointer">Clear filters</button>
          )}
          <span className="ml-auto self-center text-[13px] text-slate-600 tabular-nums" aria-live="polite">{shown.length} result{shown.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      {pharmacies === null ? (
        <p className="text-sm text-slate-600">Loading pharmacies…</p>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2">
          <Pill className="h-10 w-10 text-[color:var(--t-200)] mx-auto" />
          <h2 className="text-sm font-bold">{list.length === 0 ? 'No partner pharmacies yet' : 'No pharmacies match your search'}</h2>
          <p className="text-[13px] text-slate-600">{list.length === 0 ? 'Check back soon.' : 'Try a different name, city or service.'}</p>
        </div>
      ) : (
        <section aria-label="Pharmacies" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(p => {
            const sentHere = activeRx.filter(r => r.pharmacyId === p.id);
            const isOpen = openId === p.id;
            return (
              <article key={p.id} className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-3 min-w-0">
                <div className="min-w-0">
                  <h2 className="text-[17px] font-bold text-[color:var(--ink)] leading-snug [overflow-wrap:anywhere]">{p.name}</h2>
                  <p className="text-[13px] text-[color:var(--ink-2)] mt-1 flex gap-2 [overflow-wrap:anywhere]"><MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" /><span>{p.address}{p.city && !p.address.toLowerCase().includes(p.city.toLowerCase()) ? `, ${p.city}` : ''}</span></p>
                  {p.phone && <p className="text-[13px] mt-1 flex gap-2"><Phone className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" /><a href={`tel:${p.phone.replace(/[^+\d]/g, '')}`} className="font-semibold text-[color:var(--t-700)] hover:underline">{p.phone}</a></p>}
                  {p.hours && <p className="text-[13px] mt-1 flex gap-2 [overflow-wrap:anywhere]"><Clock className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" /><span>{p.hours}</span></p>}
                </div>
                {p.services.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {p.services.map(s => (
                      <li key={s} className={`text-[11px] font-bold px-2.5 py-0.5 border ${s === '24 hours' ? 'text-[color:var(--e-800)] bg-[color:var(--e-50)] border-[color:var(--e-200)]' : 'text-[color:var(--t-700)] bg-[color:var(--t-50)] border-[color:var(--t-200)]'}`}>{s}</li>
                    ))}
                  </ul>
                )}

                {sentHere.length > 0 && (
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5">
                    Your prescription {sentHere.map(r => r.code).join(', ')} {sentHere.length === 1 ? 'was' : 'were'} sent here. Show the pharmacy the code.
                  </p>
                )}
                {msg?.id === p.id && (
                  <p role="status" className={`text-xs font-bold p-2.5 border ${msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{msg.text}</p>
                )}

                <div className="mt-auto pt-3 border-t border-[color:var(--t-100)] space-y-2">
                  {isOpen && (
                    <div className="space-y-2">
                      <label htmlFor={`rx-${p.id}`} className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Choose a prescription</label>
                      <select id={`rx-${p.id}`} value={chosen} onChange={e => setChosen(e.target.value)} className="w-full border border-slate-200 bg-white px-3 min-h-[40px] text-[13px]">
                        <option value="">Select…</option>
                        {activeRx.map(r => (
                          <option key={r.id} value={r.id}>{r.code} · {r.items[0]?.name ?? 'Prescription'}{r.items.length > 1 ? ` +${r.items.length - 1}` : ''} · valid until {fmt(r.validUntil)}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => send(p)} disabled={!chosen || sending} className="flex-1 min-h-[40px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white text-xs font-extrabold cursor-pointer">{sending ? 'Sending…' : 'Send'}</button>
                        <button type="button" onClick={() => { setOpenId(null); setChosen(''); }} className="min-h-[40px] px-4 border border-slate-200 text-xs font-bold cursor-pointer">Cancel</button>
                      </div>
                    </div>
                  )}
                  {!isOpen && (
                    <button type="button" disabled={activeRx.length === 0} onClick={() => { setOpenId(p.id); setChosen(activeRx.length === 1 ? activeRx[0].id : ''); setMsg(null); }}
                      className="w-full min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-[13px] font-bold inline-flex items-center justify-center gap-2 cursor-pointer">
                      <Send className="h-4 w-4" /> Send my prescription here
                    </button>
                  )}
                  {!isOpen && activeRx.length === 0 && <p className="text-[11px] text-slate-500">You have no active prescription to send. After a doctor issues one it will appear here.</p>}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
