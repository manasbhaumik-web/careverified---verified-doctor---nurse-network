import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, Phone, Pill, Search, Send, ShieldCheck, X, Thermometer, Truck, CheckCircle2 } from 'lucide-react';
import DashboardHeader, { BannerKpis, FilterSelect } from './DashboardHeader';
import { useTr } from '../locale';

interface Pharmacy { id: string; name: string; address: string; city: string | null; phone: string | null; hours: string | null; services: string[]; deliveryMethods?: string[]; coldChain?: boolean; panelInsurers?: string[]; licenceVerified?: boolean; licenceExpiresOn?: string | null }
interface Rx { id: string; code: string; status: string; validUntil: string; pharmacyId: string | null; fillStatus?: string | null; fillReason?: string | null; items: { name: string; strength?: string }[] }
const FILL_LABEL: Record<string, string> = { received: 'received', preparing: 'being prepared', ready: 'ready for pickup', cannot_fill: 'could not be filled' };
const DELIVERY_LABEL: Record<string, string> = { pharmacy_courier: 'Cold-Chain Courier', grab: 'GrabExpress', lalamove: 'Lalamove Express', other_courier: 'Nationwide Courier', courier: 'Courier Delivery', pickup: 'Self-Pickup' };

const ALL = 'all';
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

/** Patient: browse partner pharmacies and send an active prescription to one. */
export default function PharmacyFinder({ embedded = false }: { embedded?: boolean } = {}) {
  const tx = useTr();
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
  const filtersOn = query.trim() !== '' || city !== ALL || service !== ALL;

  const send = async (p: Pharmacy) => {
    if (!chosen) return;
    setSending(true); setMsg(null);
    const d = await jpost(`/api/prescriptions/${chosen}/send`, { pharmacyId: p.id, shareSafety: share }).catch(() => null);
    setMsg({ id: p.id, ok: d?.status === 'success', text: d?.message || tx('Could not send the prescription. Try again.') });
    setSending(false);
    if (d?.status === 'success') { setOpenId(null); setChosen(''); setShare(false); loadRx(); }
  };

  return (
    <div className={embedded ? "w-full space-y-4" : "w-full space-y-0"}>
      {!embedded && (
        <DashboardHeader
          icon={Pill}
          eyebrow={tx('Partner pharmacies')}
          title={tx('Find a pharmacy')}
          description={tx('Browse partner pharmacies and send your e-prescription to the one that suits you.')}
          actions={
            <BannerKpis items={[
              { value: pharmacies ? list.length : '—', label: tx('Pharmacies') },
              { value: pharmacies ? cities.length : '—', label: tx('Cities') },
              { value: pharmacies ? list.filter(p => p.services.includes('24 hours')).length : '—', label: tx('Open 24h') },
            ]} />
          }
        />
      )}

      <div className={embedded ? "space-y-5 pt-2" : "max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"}>
        {/* Unified Single-Row Filter Control Bar */}
        <section aria-label={tx('Find pharmacies')} className="bg-white border border-[color:var(--t-200)] rounded-none p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-[999_1_300px] min-w-[min(100%,300px)]">
              <label htmlFor="pharmacy-search" className="sr-only">{tx('Search pharmacies')}</label>
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="pharmacy-search"
                type="text"
                placeholder={tx('Search by pharmacy name, street, or city (e.g. Bangsar, Georgetown, Johor Bahru)…')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={tx('Clear search query')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Inline Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5 flex-auto max-w-full">
              <FilterSelect label={tx('City')} value={city} onChange={setCity}>
                <option value={ALL}>{tx('All Cities ({n})', { n: cities.length })}</option>
                {cities.map(c => <option key={c} value={c}>{tx(c)}</option>)}
              </FilterSelect>

              <FilterSelect label={tx('Service')} value={service} onChange={setService}>
                <option value={ALL}>{tx('Any Service ({n})', { n: services.length })}</option>
                {services.map(s => <option key={s} value={s}>{tx(s)}</option>)}
              </FilterSelect>
            </div>
          </div>

          {/* Active Filter Summary & Result Counter Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[color:var(--t-100)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 tabular-nums" aria-live="polite">
                {tx('Showing')} <strong className="font-black text-[color:var(--ink)]">{shown.length}</strong> {tx(list.length === 1 ? 'of {n} pharmacy' : 'of {n} pharmacies', { n: list.length })}
              </span>
              {city !== ALL && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                  {tx('City: ')}{tx(city)}
                  <button type="button" onClick={() => setCity(ALL)} className="hover:text-slate-900 cursor-pointer" aria-label={tx('Remove city filter')}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {service !== ALL && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                  {tx('Service: ')}{tx(service)}
                  <button type="button" onClick={() => setService(ALL)} className="hover:text-slate-900 cursor-pointer" aria-label={tx('Remove service filter')}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>

            {filtersOn && (
              <button
                type="button"
                onClick={() => { setQuery(''); setCity(ALL); setService(ALL); }}
                className="text-xs font-bold text-[color:var(--t-700)] hover:text-[color:var(--dark)] underline underline-offset-2 cursor-pointer"
              >
                {tx('Reset Filters')}
              </button>
            )}
          </div>
        </section>

        {pharmacies === null ? (
          <div className="bg-white border border-[color:var(--t-200)] rounded-none p-12 text-center text-xs font-semibold text-slate-600">
            {tx('Loading verified pharmacies…')}
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white border border-[color:var(--t-200)] rounded-none p-12 text-center space-y-3">
            <Pill className="h-10 w-10 text-[color:var(--t-300)] mx-auto" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">{list.length === 0 ? tx('No partner pharmacies registered yet') : tx('No pharmacies match your criteria')}</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">{list.length === 0 ? tx('Partner pharmacies will appear here once onboarding is complete.') : tx('Try adjusting your city filter or search terms.')}</p>
            {filtersOn && (
              <div className="pt-2">
                <button type="button" onClick={() => { setQuery(''); setCity(ALL); setService(ALL); }} className="h-10 px-5 text-xs font-bold uppercase tracking-wider text-white bg-[color:var(--t-600)] hover:bg-[color:var(--dark)] cursor-pointer transition-colors rounded-none">
                  {tx('Reset All Filters')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <section aria-label={tx('Pharmacies')} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map(p => {
              const sentHere = activeRx.filter(r => r.pharmacyId === p.id);
              const isOpen = openId === p.id;
              return (
                <article key={p.id} className="app-card-interactive app-card-equal p-5">
                  <div className="space-y-3">
                    {/* Eyebrow Badges: Full-width top row prevents title crushing */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="app-badge badge-success">
                        <ShieldCheck className="h-3 w-3 shrink-0" />
                        {tx('NPRA Licensed')}
                      </span>
                      {p.coldChain ? (
                        <span className="app-badge badge-cyan shrink-0">
                          <Thermometer className="h-3 w-3 shrink-0" />
                          {tx('Cold Chain ❄️')}
                        </span>
                      ) : (
                        <span className="app-badge badge-neutral shrink-0">
                          {tx('Standard Storage')}
                        </span>
                      )}
                    </div>

                    {/* Full-width 2-line title & location */}
                    <div>
                      <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 leading-snug line-clamp-2 min-h-[3rem]" title={p.name}>
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-600 flex items-start gap-1.5 mt-1 min-h-[2rem] line-clamp-2" title={p.address}>
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                        <span>{p.address}{p.city && !p.address.toLowerCase().includes(p.city.toLowerCase()) ? `, ${tx(p.city)}` : ''}</span>
                      </p>
                    </div>

                    {/* Operational Hours, Contact & Delivery Method Box */}
                    <div className="app-info-box space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{p.hours ? tx(p.hours) : '09:00 AM – 10:00 PM'}</span>
                        </div>
                        {p.phone && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <a href={`tel:${p.phone.replace(/[^+\d]/g, '')}`} className="font-mono font-medium text-slate-900 hover:text-[color:var(--t-700)] hover:underline">{p.phone}</a>
                          </div>
                        )}
                      </div>
                      {p.deliveryMethods && p.deliveryMethods.length > 0 && (
                        <div className="flex items-start gap-1.5 pt-1 border-t border-[color:var(--t-100)]/80 text-xs">
                          <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1 text-slate-600">
                            <strong className="font-semibold text-slate-800">{tx('Delivery:')}</strong> {p.deliveryMethods.map(m => tx(DELIVERY_LABEL[m] ?? m)).join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Specialized Clinical Services */}
                    {p.services.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        <span className="text-2xs font-mono font-bold uppercase tracking-wider text-slate-400 block">{tx('Specialized Clinical Services')}</span>
                        <div className="grid grid-cols-2 gap-1 text-xs text-slate-700">
                          {p.services.slice(0, 4).map(s => (
                            <div key={s} className="flex items-center gap-1 truncate" title={s}>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span className="truncate">{tx(s)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom-Aligned Routing Status & Action Area */}
                  <div className="app-card-footer mt-auto pt-3 flex flex-col gap-2.5">
                    {sentHere.length > 0 && (
                      <p className="w-full text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-none p-2.5">
                        {tx('Your prescription')} {sentHere.map(r => `${r.code}${r.fillStatus ? ` (${tx(FILL_LABEL[r.fillStatus] ?? r.fillStatus)}${r.fillStatus === 'cannot_fill' && r.fillReason ? `: ${r.fillReason}` : ''})` : ''}`).join(', ')} {sentHere.length === 1 ? tx('was routed here. Show the code at the counter or wait for pickup confirmation.') : tx('were routed here. Show the code at the counter or wait for pickup confirmation.')}
                      </p>
                    )}
                    {msg?.id === p.id && (
                      <p role="status" className={`w-full text-xs font-bold p-2.5 border rounded-none ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-300' : 'text-rose-900 bg-rose-50 border-rose-300'}`}>{msg.text}</p>
                    )}

                    {isOpen ? (
                      <div className="w-full space-y-2.5 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3 rounded-none">
                        <label htmlFor={`rx-${p.id}`} className="text-xs font-black uppercase tracking-wider text-slate-700 block">{tx('Select active prescription to route')}</label>
                        <select id={`rx-${p.id}`} value={chosen} onChange={e => setChosen(e.target.value)} className="w-full border border-[color:var(--t-200)] bg-white px-3 h-9 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]">
                          <option value="">{tx('Select prescription…')}</option>
                          {activeRx.map(r => (
                            <option key={r.id} value={r.id}>{r.code} · {r.items[0]?.name ?? tx('Prescription')}{r.items.length > 1 ? ` +${r.items.length - 1}` : ''} · {tx('valid until {date}', { date: fmt(r.validUntil) })}</option>
                          ))}
                        </select>
                        <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                          <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} className="mt-0.5 h-4 w-4 rounded-none accent-[color:var(--t-600)]" />
                          <span>{tx('Share my registered allergies and medication list with this pharmacy for contraindication checks')} <b>{tx('(recommended)')}</b>.</span>
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          <button type="button" onClick={() => send(p)} disabled={!chosen || sending} className="btn btn-sm btn-primary whitespace-nowrap flex-1">{sending ? tx('Routing…') : tx('Send Prescription')}</button>
                          <button type="button" onClick={() => { setOpenId(null); setChosen(''); }} className="btn btn-sm btn-secondary whitespace-nowrap">{tx('Cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-2xs uppercase font-bold text-slate-400 tracking-wider">NPRA Registered</span>
                          <span className="text-xs font-semibold text-slate-700 truncate block">Dispensary</span>
                        </div>
                        <button
                          type="button"
                          disabled={activeRx.length === 0}
                          onClick={() => { setOpenId(p.id); setChosen(activeRx.length === 1 ? activeRx[0].id : ''); setMsg(null); }}
                          className="btn btn-sm btn-primary whitespace-nowrap shrink-0"
                          title={activeRx.length === 0 ? tx('You have no active prescription to route') : tx('Send prescription here')}
                        >
                          <Send className="h-3.5 w-3.5 shrink-0" />
                          <span>{tx('Send Rx Here')}</span>
                        </button>
                      </div>
                    )}
                    {!isOpen && activeRx.length === 0 && (
                      <p className="text-xs text-slate-500 font-medium">{tx('No active prescription pending. Counter visits and walk-in consultations welcomed.')}</p>
                    )}
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
