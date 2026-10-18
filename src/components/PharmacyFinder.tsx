import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, Phone, Pill, Search, Send } from 'lucide-react';
import DashboardHeader, { BannerKpis, FilterSelect } from './DashboardHeader';

interface Pharmacy { id: string; name: string; address: string; city: string | null; phone: string | null; hours: string | null; services: string[]; deliveryMethods?: string[]; coldChain?: boolean; panelInsurers?: string[]; licenceVerified?: boolean; licenceExpiresOn?: string | null }
interface Rx { id: string; code: string; status: string; validUntil: string; pharmacyId: string | null; fillStatus?: string | null; fillReason?: string | null; items: { name: string; strength?: string }[] }
const FILL_LABEL: Record<string, string> = { received: 'received', preparing: 'being prepared', ready: 'ready for pickup', cannot_fill: 'could not be filled' };

const ALL = 'all';
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

/** Patient: browse partner pharmacies and send an active prescription to one. */
export default function PharmacyFinder({ embedded = false }: { embedded?: boolean } = {}) {
  const [pharmacies, setPharmacies] = useState<Pharmacy[] | null>(null);
  const [rx, setRx] = useState<Rx[]>([]);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState(ALL);
  const [service, setService] = useState(ALL);
  const [openId, setOpenId] = useState<string | null>(null);
  const [chosen, setChosen] = useState('');
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [share, setShare] = useState(false);

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
    const d = await jpost(`/api/prescriptions/${chosen}/send`, { pharmacyId: p.id, shareSafety: share }).catch(() => null);
    setMsg({ id: p.id, ok: d?.status === 'success', text: d?.message || 'Could not send the prescription. Try again.' });
    setSending(false);
    if (d?.status === 'success') { setOpenId(null); setChosen(''); setShare(false); loadRx(); }
  };

  return (
    <div className={embedded ? "w-full space-y-4" : "w-full space-y-0"}>
      {!embedded && (
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
      )}

      <div className={embedded ? "space-y-5 pt-2" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"}>
        <section aria-label="Find pharmacies" className="bg-white border border-[color:var(--t-200)] rounded-none p-5 space-y-4">
        <label htmlFor="pharmacy-search" className="sr-only">Search pharmacies</label>
        <div className="flex items-center gap-3 border border-slate-300 bg-white px-4 h-12 focus-within:border-[color:var(--t-600)] transition-colors">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input id="pharmacy-search" type="text" placeholder="Search by pharmacy name, street, or city (e.g. Bangsar, Georgetown, Johor Bahru)…" value={query} onChange={e => setQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400 font-medium" />
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
            <button type="button" onClick={() => { setQuery(''); setCity(ALL); setService(ALL); }} className="h-10 px-4 text-xs font-bold uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] cursor-pointer transition-colors rounded-none">
              Clear filters
            </button>
          )}
          <span className="ml-auto self-center text-xs font-mono font-bold text-slate-600 tabular-nums bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-none" aria-live="polite">
            {shown.length} result{shown.length === 1 ? '' : 's'}
          </span>
        </div>
      </section>

      {pharmacies === null ? (
        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-12 text-center text-sm font-semibold text-slate-600">
          Loading verified pharmacies…
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-12 text-center space-y-3">
          <Pill className="h-10 w-10 text-[color:var(--t-300)] mx-auto" />
          <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">{list.length === 0 ? 'No partner pharmacies registered yet' : 'No pharmacies match your criteria'}</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">{list.length === 0 ? 'Partner pharmacies will appear here once onboarding is complete.' : 'Try adjusting your city filter or search terms.'}</p>
          {filtersOn && (
            <div className="pt-2">
              <button type="button" onClick={() => { setQuery(''); setCity(ALL); setService(ALL); }} className="h-10 px-5 text-xs font-bold uppercase tracking-wider text-white bg-[color:var(--t-600)] hover:bg-[color:var(--dark)] cursor-pointer transition-colors rounded-none">
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <section aria-label="Pharmacies" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(p => {
            const sentHere = activeRx.filter(r => r.pharmacyId === p.id);
            const isOpen = openId === p.id;
            return (
              <article key={p.id} className="bg-white border border-slate-250 hover:border-[color:var(--t-600)] transition-colors rounded-none p-5 flex flex-col gap-3 min-w-0">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-900 leading-snug [overflow-wrap:anywhere] uppercase tracking-wide">{p.name}</h2>
                  <p className="text-xs text-slate-600 font-semibold mt-1.5 flex gap-2 [overflow-wrap:anywhere]"><MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" /><span>{p.address}{p.city && !p.address.toLowerCase().includes(p.city.toLowerCase()) ? `, ${p.city}` : ''}</span></p>
                  {p.phone && <p className="text-xs font-semibold text-slate-700 mt-1 flex gap-2"><Phone className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" /><a href={`tel:${p.phone.replace(/[^+\d]/g, '')}`} className="font-bold text-[color:var(--t-700)] hover:underline">{p.phone}</a></p>}
                  {p.hours && <p className="text-xs font-semibold text-slate-600 mt-1 flex gap-2 [overflow-wrap:anywhere]"><Clock className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" /><span>{p.hours}</span></p>}
                </div>
                {p.services.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 pt-1">
                    {p.services.map(s => (
                      <li key={s} className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 border rounded-none ${s === '24 hours' ? 'text-emerald-800 bg-emerald-50 border-emerald-300' : 'text-[color:var(--t-700)] bg-[color:var(--t-50)] border-[color:var(--t-200)]'}`}>{s}</li>
                    ))}
                  </ul>
                )}

                <div className="text-[11px] text-slate-600 font-semibold space-y-1">
                  {p.licenceVerified && <p className="text-emerald-800">Licence and pharmacist checked by MedCred{p.licenceExpiresOn ? ` · licence valid to ${p.licenceExpiresOn}` : ''}</p>}
                  {p.deliveryMethods && p.deliveryMethods.length > 0 && <p>Delivers (Malaysia): {p.deliveryMethods.map(m => ({ pharmacy_courier: 'own rider', grab: 'Grab', lalamove: 'Lalamove', other_courier: 'courier' } as Record<string, string>)[m] ?? m).join(', ')}{p.coldChain ? ' · cold-chain medicines (e.g. insulin) can be delivered' : ''}</p>}
                  {p.panelInsurers && p.panelInsurers.length > 0 && <p>Insurance panel: {p.panelInsurers.join(', ')}</p>}
                </div>

                {sentHere.length > 0 && (
                  <p className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-none p-3">
                    Your prescription {sentHere.map(r => `${r.code}${r.fillStatus ? ` (${FILL_LABEL[r.fillStatus] ?? r.fillStatus}${r.fillStatus === 'cannot_fill' && r.fillReason ? `: ${r.fillReason}` : ''})` : ''}`).join(', ')} {sentHere.length === 1 ? 'was' : 'were'} routed here. Show the code at the counter or wait for pickup confirmation.
                  </p>
                )}
                {msg?.id === p.id && (
                  <p role="status" className={`text-xs font-bold p-3 border rounded-none ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-300' : 'text-rose-900 bg-rose-50 border-rose-300'}`}>{msg.text}</p>
                )}

                <div className="mt-auto pt-3 border-t border-slate-200 space-y-3">
                  {isOpen && (
                    <div className="space-y-3 bg-slate-50 border border-slate-250 p-3.5 rounded-none">
                      <label htmlFor={`rx-${p.id}`} className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">Select active prescription to route</label>
                      <select id={`rx-${p.id}`} value={chosen} onChange={e => setChosen(e.target.value)} className="w-full border border-slate-300 bg-white px-3 h-10 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]">
                        <option value="">Select prescription…</option>
                        {activeRx.map(r => (
                          <option key={r.id} value={r.id}>{r.code} · {r.items[0]?.name ?? 'Prescription'}{r.items.length > 1 ? ` +${r.items.length - 1}` : ''} · valid until {fmt(r.validUntil)}</option>
                        ))}
                      </select>
                      <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                        <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} className="mt-0.5 h-4 w-4 rounded-none accent-[color:var(--t-600)]" />
                        <span>Share my registered allergies and medication list with this pharmacy for contraindication checks <b>(recommended)</b>.</span>
                      </label>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => send(p)} disabled={!chosen || sending} className="flex-1 h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--dark)] disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none transition-all">{sending ? 'Routing…' : 'Send Prescription'}</button>
                        <button type="button" onClick={() => { setOpenId(null); setChosen(''); }} className="h-10 px-4 border border-slate-300 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none hover:bg-slate-100 transition-all">Cancel</button>
                      </div>
                    </div>
                  )}
                  {!isOpen && (
                    <button type="button" disabled={activeRx.length === 0} onClick={() => { setOpenId(p.id); setChosen(activeRx.length === 1 ? activeRx[0].id : ''); setMsg(null); }}
                      className="w-full h-11 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] active:bg-[color:var(--t-800)] border border-[color:var(--t-700)] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-none inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-none">
                      <Send className="h-4 w-4" /> Send my prescription here
                    </button>
                  )}
                  {!isOpen && activeRx.length === 0 && <p className="text-[11px] text-slate-500 font-medium">You have no active prescription to route. Once prescribed by a doctor, it will appear here.</p>}
                </div>
              </article>
            );
          })}
        </section>
      )}
      </div>
    </div>
  );
}
