import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  HeartPulse,
  Mail,
  MapPin,
  MessageSquare,
  PackagePlus,
  Pause,
  Percent,
  Phone,
  Pill,
  Play,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Tag,
  Thermometer,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import { loginUrl, navigate, useLocation } from '../nav';

/**
 * Public Marketplace for Healthcare Packages, Verified Hospitals, Specialist Clinics,
 * Specialized Nurses, Doctors, and Licensed Pharmacies.
 */

interface Pkg {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_city: string;
  facility_state: string;
  code: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  priceMyr: number;
  originalPriceMyr: number | null;
  target_audience: 'all' | 'local' | 'international';
  fastingRequired: boolean;
  inclusions: string[];
  exclusions?: string;
  preparation_instructions?: string;
  image_url?: string;
  featured: boolean;
  verified_facilitator?: number;
  mhtc_member?: number;
}

interface Offer {
  id: string;
  code: string;
  title: string;
  facility_name?: string;
  badge_text?: string;
  valid_until?: string;
  package_id?: string | null;
  image_url?: string;
  description?: string;
}

interface Facility {
  id: string;
  name: string;
  kind: 'hospital' | 'clinic';
  city: string;
  state: string;
  licenceNo?: string;
  isLicenceValid: boolean;
  mhtcMember: boolean;
  accreditations: Array<{ body: string }>;
}

interface FacilityCard extends Facility {
  packagesCount: number;
}

interface Professional {
  id: string;
  name: string;
  avatar?: string;
  role: 'doctor' | 'nurse';
  specialization: string;
  licenseNumber: string;
  experienceYears: number;
  education?: string[];
  bio?: string;
  languages?: string[];
  consultationModes?: string[];
  fee: number;
  rating: number;
  reviewCount: number;
  practiceAddress?: string;
  city: string;
  shiftTypes?: string[];
  seoSlug?: string;
}

interface Pharmacy {
  id: string;
  name: string;
  city: string;
  address: string;
  phone?: string;
  hours?: string;
  services: string[];
  deliveryMethods: string[];
  coldChain: boolean;
  panelInsurers?: string[];
}

interface EnquiryTarget {
  kind: 'package' | 'hospital' | 'clinic' | 'nurse' | 'doctor' | 'pharmacy';
  title: string;
  subtitle: string;
  facilityId?: string;
  professionalId?: string;
  code?: string;
  price?: string;
}

const myr = (n: number) => `RM ${n.toLocaleString('en-MY')}`;
const savingAmt = (p: Pkg) => (p.originalPriceMyr && p.originalPriceMyr > p.priceMyr ? p.originalPriceMyr - p.priceMyr : 0);
const savingPct = (p: Pkg) => (p.originalPriceMyr && savingAmt(p) ? Math.round((1 - p.priceMyr / p.originalPriceMyr) * 100) : 0);
const place = (p: { facility_city?: string; facility_state?: string; city?: string; state?: string }) => {
  const c = p.facility_city || p.city || '';
  const s = p.facility_state || p.state || '';
  return [c, s && s !== c ? s : ''].filter(Boolean).join(', ');
};
const audience = (a: Pkg['target_audience']) => (a === 'international' ? 'International visitors' : a === 'local' ? 'Malaysian residents' : 'Residents and visitors');

const wrap = 'max-w-7xl mx-auto px-4 sm:px-6';
const control = 'min-h-[44px] px-3 text-sm bg-white border border-[color:var(--t-200)] focus:border-[color:var(--t-600)] outline-none';
const primaryBtn = 'min-h-[44px] px-5 text-sm font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors';
const ghostBtn = 'min-h-[44px] px-5 text-sm font-bold text-[color:var(--t-700)] bg-white hover:bg-[color:var(--t-50)] border border-[color:var(--t-300)] cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors';

function Photo({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label={alt} className="w-full h-full flex items-center justify-center bg-[color:var(--t-100)] text-[color:var(--t-700)]">
        <PackagePlus className="h-12 w-12 opacity-60" aria-hidden="true" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-cover" />;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pp-dlg" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white w-full max-w-xl max-h-[92dvh] overflow-y-auto shadow-2xl border border-[color:var(--t-200)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[color:var(--t-100)] sticky top-0 bg-white z-10">
          <h2 id="pp-dlg" className="font-display font-bold text-lg text-[color:var(--ink)]">{title}</h2>
          <button type="button" ref={closeRef} onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function assistanceType(category: string) {
  const c = category.toLowerCase();
  if (c.includes('screening')) return 'executive_screening';
  if (c.includes('maternity')) return 'maternity_care';
  if (c.includes('ortho') || c.includes('surg') || c.includes('fertil')) return 'elective_surgery';
  return 'specialist_consult';
}

/** Unified enquiry dialog for packages, hospitals, clinics, nurses, doctors, and pharmacies */
function UniversalEnquiryDialog({ target, onClose }: { target: EnquiryTarget; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(`I would like to enquire about ${target.title} (${target.subtitle}).`);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');
  const label = 'block text-sm font-bold mb-1 text-slate-900';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter a valid email address.');
    if (message.trim().length < 15) return setError('Please write at least a short sentence (15 characters or more).');
    if (!consent) return setError('Please agree that we may contact you about this enquiry.');
    setBusy(true);
    try {
      const res = await fetch('/api/assistance/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: target.facilityId || 'marketplace-general',
          patientName: name.trim(),
          patientEmail: email.trim(),
          patientPhone: phone.trim(),
          patientType: 'local_malaysian',
          homeCountry: 'MY',
          assistanceType: assistanceType(target.title),
          specialty: target.subtitle,
          urgency: 'routine',
          summary: `${message.trim()}\n\nMarketplace Item: ${target.title} [${target.kind.toUpperCase()}] at ${target.subtitle}.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'success') {
        setRef(data.data?.trackingCode ?? `MC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
      } else {
        setError(data.message || 'We could not send your enquiry. Please try again.');
      }
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={ref ? 'Enquiry submitted' : `Enquire: ${target.title}`} onClose={onClose}>
      {ref ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-slate-800">
            <CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-600 shrink-0" aria-hidden="true" />
            Thank you, <b>{name}</b>. Your enquiry for <b>{target.title}</b> has been received. Our clinical coordinator will follow up via email and phone.
          </p>
          <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Reference Tracking Code</div>
            <div className="font-mono font-black text-2xl text-[color:var(--t-800)] mt-1">{ref}</div>
          </div>
          <button type="button" onClick={onClose} className={`${primaryBtn} w-full`}>Done</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-3 text-sm">
            <div className="font-bold text-slate-900">{target.title}</div>
            <div className="text-xs text-slate-600">{target.subtitle} {target.price ? `· ${target.price}` : ''}</div>
          </div>

          {target.professionalId && (
            <div className="bg-white border-2 border-[color:var(--t-600)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div>
                <span className="text-2xs font-mono font-black uppercase tracking-wider text-[color:var(--t-700)] block">Direct Appointment Booking</span>
                <p className="text-xs text-slate-700 font-medium">Have a patient account? Sign in to view live consultation availability immediately.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/login?intent=consult&profId=${target.professionalId}`);
                }}
                className="px-3 py-1.5 bg-[color:var(--t-700)] hover:bg-[color:var(--t-800)] text-white text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                Sign In to Book &rarr;
              </button>
            </div>
          )}

          {target.kind === 'package' && (
            <div className="bg-white border-2 border-[color:var(--t-600)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div>
                <span className="text-2xs font-mono font-black uppercase tracking-wider text-[color:var(--t-700)] block">Reserve with 10% Deposit</span>
                <p className="text-xs text-slate-700 font-medium">Lock in this transparent package price with hospital confirmation.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`${loginUrl('patient', true)}&intent=package&id=${target.facilityId || ''}`);
                }}
                className="px-3 py-1.5 bg-[color:var(--t-700)] hover:bg-[color:var(--t-800)] text-white text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                Lock Package &rarr;
              </button>
            </div>
          )}
          <p className="text-xs text-slate-600">No account required. Connect directly with verified healthcare providers. In case of emergency, call 999.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pp-name" className={label}>Your full name</label>
              <input id="pp-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className={`${control} w-full`} />
            </div>
            <div>
              <label htmlFor="pp-email" className={label}>Email address</label>
              <input id="pp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className={`${control} w-full`} />
            </div>
          </div>
          <div>
            <label htmlFor="pp-phone" className={label}>Phone number <span className="font-normal text-slate-500">(for appointment confirmation)</span></label>
            <input id="pp-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" placeholder="+60 12-345 6789" className={`${control} w-full sm:w-2/3`} />
          </div>
          <div>
            <label htmlFor="pp-msg" className={label}>Your message or preferred date</label>
            <textarea id="pp-msg" value={message} onChange={e => setMessage(e.target.value)} rows={3} maxLength={1000} className="w-full px-3 py-2 text-sm bg-white border border-[color:var(--t-200)] focus:border-[color:var(--t-600)] outline-none" />
          </div>
          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[color:var(--t-600)]" />
            <span>I agree that MediCred and the verified healthcare provider may contact me regarding this enquiry.</span>
          </label>
          {error && <p role="alert" className="border border-red-300 bg-red-50 text-red-900 text-sm font-bold p-3">{error}</p>}
          <button type="submit" disabled={busy} className={`${primaryBtn} w-full disabled:opacity-60`}>
            {busy ? 'Submitting enquiry…' : 'Submit Healthcare Enquiry'}
          </button>
        </form>
      )}
    </Dialog>
  );
}

function visitorTags(p: Pkg): string[] {
  const t = `${p.description} ${p.inclusions.join(' ')}`.toLowerCase();
  const tags: string[] = [];
  if (p.target_audience !== 'local') tags.push('Open to international visitors');
  if (/interpret|translat/.test(t)) tags.push('Interpreter');
  if (/airport|transfer|pick-?up/.test(t)) tags.push('Airport transfer');
  if (/visa|invitation letter/.test(t)) tags.push('Visa support letter');
  return tags;
}

function VisitorChips({ p, max }: { p: Pkg; max?: number }) {
  const tags = visitorTags(p).slice(0, max ?? 10);
  if (tags.length === 0) return null;
  return (
    <ul aria-label="For visitors from abroad" className="flex flex-wrap gap-1.5">
      {tags.map(t => <li key={t} className="text-[11px] font-bold px-2 py-0.5 bg-[color:var(--t-100)] text-[color:var(--t-800)]">{t}</li>)}
    </ul>
  );
}

function PackageCard({ p, onEnquire }: { p: Pkg; onEnquire?: (pkg: Pkg) => void }) {
  const off = savingPct(p);
  return (
    <div className="group h-full flex flex-col bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all shadow-xs hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--t-100)]">
        <Photo src={p.image_url} alt={`${p.category} package`} />
        {off > 0 && <span className="absolute top-3 left-3 text-xs font-bold text-white bg-[color:var(--t-700)] px-2.5 py-1">-{off}%</span>}
        {p.featured && <span className="absolute top-3 right-3 text-xs font-bold text-[color:var(--t-900)] bg-[color:var(--t-100)] px-2.5 py-1">Featured</span>}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--t-700)]">{p.category}</span>
        <a href={`/packages?pkg=${p.id}`} onClick={e => { e.preventDefault(); navigate(`/packages?pkg=${p.id}`); }} className="font-semibold text-[15px] leading-snug text-[color:var(--ink)] line-clamp-2 group-hover:text-[color:var(--t-700)] group-hover:underline">
          {p.title}
        </a>
        <span className="text-xs text-slate-600 flex items-start gap-1">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
          {p.facility_name}, {place(p)}
        </span>
        {p.duration && (
          <span className="text-xs text-slate-600 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            {p.duration}
          </span>
        )}
        <VisitorChips p={p} max={2} />
        <div className="mt-auto pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-black text-xl text-[color:var(--ink)]">{myr(p.priceMyr)}</span>
            {savingAmt(p) > 0 && <s className="text-xs text-slate-500">{myr(p.originalPriceMyr!)}</s>}
          </div>
          <button
            type="button"
            onClick={() => {
              if (onEnquire) onEnquire(p);
              else navigate(`/packages?pkg=${p.id}`);
            }}
            className="text-xs font-bold px-3 py-1.5 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] text-[color:var(--t-700)] hover:text-white border border-[color:var(--t-200)] transition-colors cursor-pointer"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ p, signedIn, onEnquire, more, facilityOffers }: { p: Pkg; signedIn: boolean; onEnquire: () => void; more: Pkg[]; facilityOffers: Offer[] }) {
  const [copiedCode, setCopiedCode] = useState('');
  const copyCode = (code: string) => { navigator.clipboard?.writeText(code); setCopiedCode(code); setTimeout(() => setCopiedCode(''), 2000); };
  const reserve = () => {
    if (signedIn) {
      navigate(`/?intent=package&id=${p.id}`);
    } else {
      navigate(`${loginUrl('patient', true)}&intent=package&id=${p.id}`);
    }
  };
  const h2 = 'font-display font-bold text-lg text-slate-900 mb-3';
  return (
    <div className={`${wrap} py-8`}>
      <button type="button" onClick={() => navigate('/packages')} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-bold text-[color:var(--t-700)] hover:underline cursor-pointer">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />All packages
      </button>
      <div className="grid gap-6 lg:grid-cols-5 mt-2">
        <div className="lg:col-span-3 space-y-5">
          <div className="aspect-[16/9] overflow-hidden bg-[color:var(--t-100)] border border-[color:var(--t-200)] shadow-xs">
            <Photo src={p.image_url} alt={`${p.category} package`} />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--t-700)]">{p.category}</span>
            <h1 className="font-display font-black text-3xl leading-tight tracking-tight text-slate-900 mt-1">{p.title}</h1>
            <p className="text-sm text-slate-700 mt-2 flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {p.facility_name}, {place(p)}
              {p.verified_facilitator ? <span className="ml-2 inline-flex items-center gap-1 font-bold text-emerald-800"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Verified facilitator</span> : null}
            </p>
          </div>
          {p.description && <p className="text-[15px] leading-relaxed text-slate-900">{p.description}</p>}
          {p.inclusions.length > 0 && (
            <section className="bg-white border border-[color:var(--t-200)] p-5">
              <h2 className={h2}>What is included</h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {p.inclusions.map((i, k) => (
                  <li key={k} className="flex items-start gap-2 text-[15px]">
                    <Check className="h-4 w-4 mt-1 text-emerald-700 shrink-0" aria-hidden="true" />
                    {i}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {p.exclusions && (
            <section className="bg-white border border-[color:var(--t-200)] p-5">
              <h2 className={h2}>Not included</h2>
              <p className="text-[15px] leading-relaxed text-slate-700">{p.exclusions}</p>
            </section>
          )}
          {(p.preparation_instructions || p.fastingRequired) && (
            <section className="bg-white border border-[color:var(--t-200)] p-5">
              <h2 className={h2}>Before you go</h2>
              {p.fastingRequired && <p className="text-[15px] font-bold text-amber-900 mb-2">Fasting is required before this package.</p>}
              {p.preparation_instructions && <p className="text-[15px] leading-relaxed text-slate-700">{p.preparation_instructions}</p>}
            </section>
          )}
        </div>
        <div className="lg:col-span-2 space-y-4 self-start">
          <aside aria-label="Reserve this package" className="space-y-4 bg-white border border-[color:var(--t-200)] p-5 shadow-xs">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-display font-black text-3xl text-[color:var(--ink)]">{myr(p.priceMyr)}</span>
              {savingAmt(p) > 0 && (
                <>
                  <s className="text-slate-600">{myr(p.originalPriceMyr!)}</s>
                  <span className="text-sm font-bold text-[color:var(--t-700)]">Save {myr(savingAmt(p))}</span>
                </>
              )}
            </div>
            <dl className="text-sm space-y-1.5 border-y border-[color:var(--t-100)] py-3">
              {p.duration && <div className="flex justify-between gap-3"><dt className="text-slate-600">Duration</dt><dd className="font-semibold">{p.duration}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-slate-600">For</dt><dd className="font-semibold text-right">{audience(p.target_audience)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Package code</dt><dd className="font-mono font-semibold">{p.code}</dd></div>
            </dl>
            {visitorTags(p).length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700">For visitors from abroad</div>
                <VisitorChips p={p} />
              </div>
            )}
            <button type="button" onClick={reserve} className={`${primaryBtn} w-full`}>
              {signedIn ? 'Open my account to reserve' : 'Create a free account to reserve'}
            </button>
            <button type="button" onClick={onEnquire} className={`${ghostBtn} w-full`}>
              Ask the hospital a question
            </button>
            <p className="text-xs text-slate-600">Prices are published directly by the facility. Enquiries do not require an account.</p>
          </aside>

          {(more.length > 0 || facilityOffers.length > 0) && (
            <section aria-label={`More from ${p.facility_name}`} className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
              <h2 className="font-display font-bold text-lg text-slate-900">More from {p.facility_name}</h2>
              {more.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Top packages</h3>
                  <ul className="divide-y divide-[color:var(--t-100)]">
                    {more.map(m => (
                      <li key={m.id}>
                        <a href={`/packages?pkg=${m.id}`} onClick={e => { e.preventDefault(); navigate(`/packages?pkg=${m.id}`); }} className="group flex items-center gap-3 py-2.5 min-h-[44px]">
                          <span className="w-16 h-16 shrink-0 overflow-hidden bg-[color:var(--t-100)] block">
                            <Photo src={m.image_url} alt="" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-extrabold uppercase tracking-wide text-[color:var(--t-700)]">{m.category}</span>
                            <span className="block text-sm font-semibold leading-snug text-[color:var(--ink)] line-clamp-2 group-hover:underline">{m.title}</span>
                            <span className="block text-sm">
                              <b>{myr(m.priceMyr)}</b>
                              {savingAmt(m) > 0 && <span className="ml-2 font-bold text-[color:var(--t-700)]">-{savingPct(m)}%</span>}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {facilityOffers.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Facility Special Offers</h3>
                  <ul className="space-y-2">
                    {facilityOffers.map(o => (
                      <li key={o.id} className="border border-[color:var(--t-200)] bg-[color:var(--t-50)]/40 p-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-[color:var(--t-700)] truncate">{o.badge_text || o.title}</div>
                          <div className="text-xs text-slate-600">{o.valid_until ? `Valid until ${o.valid_until}` : o.title}</div>
                        </div>
                        <button type="button" onClick={() => copyCode(o.code)} className="min-h-[36px] px-3 bg-[color:var(--t-900)] text-white font-mono font-bold text-xs cursor-pointer shrink-0">
                          {copiedCode === o.code ? 'Copied!' : o.code}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** Dual-colour heading: first half in Black, second half highlighted in application brand color */
function TwoTone({ text }: { text: string }) {
  const w = text.split(' ');
  const k = Math.max(1, Math.ceil(w.length / 2));
  return (
    <>
      <span className="text-slate-900">{w.slice(0, k).join(' ')}</span>
      {w.length > k && (
        <>
          {' '}
          <span className="text-[color:var(--t-600)]">
            {w.slice(k).join(' ')}
          </span>
        </>
      )}
    </>
  );
}

interface Slide {
  id: string;
  kind: 'photo' | 'offer';
  image?: string;
  badge: string;
  title: string;
  sub: React.ReactNode;
  cta: string;
  onGo: () => void;
  href: string;
  code?: string;
}

const SLIDE_MS = 5000;

/** Hero Slider: dual-tone text (Black + Application color), clean natural background image without color overlay */
function HeroSlider({ packages, offers, copied, onCopy }: { packages: Pkg[]; offers: Offer[]; copied: string; onCopy: (code: string) => void }) {
  const slides = useMemo<Slide[]>(() => {
    const promoted = [...packages].sort((a, b) => Number(b.featured) - Number(a.featured) || savingPct(b) - savingPct(a)).slice(0, 3);
    const pk: Slide[] = promoted.map(p => ({
      id: `pkg-${p.id}`,
      kind: 'photo',
      image: p.image_url,
      badge: savingAmt(p) > 0 ? `Save ${myr(savingAmt(p))} · ${p.category}` : p.category,
      title: p.title,
      sub: (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base font-medium">
          <span className="text-slate-900 font-bold">Starting at</span>
          <span className="font-extrabold text-[color:var(--t-600)] text-base sm:text-lg">{myr(p.priceMyr)}</span>
          {savingAmt(p) > 0 && <span className="text-slate-400 line-through text-xs sm:text-sm">{myr(p.originalPriceMyr!)}</span>}
          <span className="text-slate-300">•</span>
          <span className="text-slate-900 font-bold">Facility:</span>
          <span className="font-semibold text-[color:var(--t-600)]">{p.facility_name}</span>
          {place(p) && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-medium">{place(p)}</span>
            </>
          )}
        </div>
      ),
      cta: 'View this package',
      onGo: () => navigate(`/packages?pkg=${p.id}`),
      href: `/packages?pkg=${p.id}`,
    }));

    const of: Slide[] = offers.slice(0, 3).map(o => {
      const linked = o.package_id ? packages.find(p => p.id === o.package_id) : undefined;
      const offerImg = o.image_url || linked?.image_url || '/assets/promotions/promo-merdeka.jpg';
      return {
        id: `offer-${o.id}`,
        kind: 'offer',
        image: offerImg,
        badge: o.badge_text || 'Healthcare Promotion',
        title: o.title,
        sub: (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base font-medium">
            <span className="text-slate-900 font-bold">{o.badge_text || 'Exclusive Offer'}</span>
            {o.facility_name && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-900 font-bold">Partner:</span>
                <span className="font-semibold text-[color:var(--t-600)]">{o.facility_name}</span>
              </>
            )}
            {o.valid_until && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">Valid until</span>
                <span className="font-bold text-[color:var(--t-600)]">{o.valid_until}</span>
              </>
            )}
          </div>
        ),
        cta: linked ? 'View package' : 'Browse marketplace',
        onGo: () => (linked ? navigate(`/packages?pkg=${linked.id}`) : document.getElementById('pp-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' })),
        href: linked ? `/packages?pkg=${linked.id}` : '#pp-sections',
        code: o.code,
      };
    });
    return [...pk, ...of];
  }, [packages, offers]);

  const [i, setI] = useState(0);
  const [hoverPaused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const paused = hoverPaused || stopped;
  const n = slides.length;

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setI(c => (c + 1) % n), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, n, paused]);

  const cur = n ? Math.min(i, n - 1) : 0;

  if (n === 0) {
    return (
      <section className="bg-white border-b border-[color:var(--t-200)]">
        <div className={`${wrap} py-10`}>
          <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-slate-900">
            Verified Healthcare Packages &amp; <span className="text-[color:var(--t-600)]">Providers</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base sm:text-lg text-slate-700">
            <span className="text-slate-900 font-bold">Malaysia's trusted network</span> for <span className="text-[color:var(--t-600)] font-semibold">licence-checked hospitals, clinics, nurses, and doctors.</span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promoted packages and offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pp-hero relative h-[360px] sm:h-[310px] overflow-hidden bg-white border-b border-[color:var(--t-200)]"
    >
      <h1 className="sr-only">Hospital and clinic packages</h1>
      {slides.map((s, k) => {
        const on = k === cur;
        return (
          <div
            key={s.id}
            aria-hidden={!on}
            aria-roledescription="slide"
            aria-label={`${k + 1} of ${n}`}
            className={`absolute inset-0 transition-opacity duration-1000 ${on ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
          >
            {/* Background Image: 100% natural photo without color overlay */}
            <div className={`absolute right-0 top-0 bottom-0 w-full sm:w-7/12 lg:w-1/2 overflow-hidden ${on ? 'pp-kenburns' : ''}`}>
              {s.image ? (
                <Photo src={s.image} alt="" />
              ) : (
                <div className="w-full h-full bg-[color:var(--t-50)]" />
              )}
            </div>

            {/* Seamless readability fade for text, leaving photo 100% natural and unobscured */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent sm:via-white/80 sm:w-3/5 lg:w-1/2 pointer-events-none" />

            <div className={`relative ${wrap} h-full flex items-center py-6`}>
              <div className="w-full max-w-2xl flex flex-col gap-2.5 z-10">
                <span className={`self-start text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 border ${s.kind === 'offer' ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]' : 'bg-white text-[color:var(--t-700)] border-[color:var(--t-200)] shadow-2xs'}`}>
                  {s.badge}
                </span>
                <h2 className="font-display font-black text-2xl sm:text-3xl leading-[1.18] tracking-tight line-clamp-3 sm:line-clamp-2">
                  <TwoTone text={s.title} />
                </h2>
                <div className="line-clamp-2">{s.sub}</div>
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <a
                    href={s.href}
                    tabIndex={on ? 0 : -1}
                    onClick={e => { e.preventDefault(); s.onGo(); }}
                    className="min-h-[42px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white font-extrabold text-[14px] inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    {s.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  {s.code && (
                    <button
                      type="button"
                      tabIndex={on ? 0 : -1}
                      onClick={() => onCopy(s.code!)}
                      aria-label={`Copy offer code ${s.code}`}
                      className="min-h-[42px] px-4 border border-[color:var(--t-300)] bg-[color:var(--t-50)] text-[color:var(--t-800)] font-mono font-bold text-xs hover:bg-[color:var(--t-100)] cursor-pointer transition-colors"
                    >
                      {copied === s.code ? 'Copied' : `Code ${s.code}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Carousel Controls */}
      {n > 1 && (
        <div className="absolute inset-x-0 bottom-4 sm:bottom-6 z-20 pointer-events-none">
          <div className={`${wrap} flex items-center justify-end gap-3`}>
            {/* Progress indicators */}
            <div className="pointer-events-auto hidden sm:flex items-center h-8 gap-1.5">
              {slides.map((s, k) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setI(k)}
                  aria-label={`Show slide ${k + 1}: ${s.title}`}
                  aria-current={k === cur}
                  className="relative h-8 w-8 sm:w-12 flex items-center cursor-pointer group"
                >
                  <span className="relative block h-[3px] w-full bg-slate-200 rounded-full overflow-hidden group-hover:bg-slate-300 transition-colors">
                    <span
                      key={`${k}-${cur}-${paused}`}
                      className={`absolute inset-0 bg-[color:var(--t-600)] origin-left ${k < cur ? '' : 'scale-x-0'} ${k === cur ? 'pp-progress' : ''}`}
                      style={k === cur ? { animationPlayState: paused ? 'paused' : 'running' } : undefined}
                    />
                  </span>
                </button>
              ))}
            </div>

            {/* Carousel navigation buttons */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStopped(v => !v)}
                aria-label={stopped ? 'Play slideshow' : 'Pause slideshow'}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-[color:var(--t-700)] inline-flex items-center justify-center cursor-pointer shadow-xs transition-colors"
              >
                {stopped ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setI((cur + n - 1) % n)}
                aria-label="Previous slide"
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-[color:var(--t-700)] inline-flex items-center justify-center cursor-pointer shadow-xs transition-colors"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setI((cur + 1) % n)}
                aria-label="Next slide"
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-[color:var(--t-700)] inline-flex items-center justify-center cursor-pointer shadow-xs transition-colors"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Trust Band: Highlights verified credentials */
function TrustBand({ facilities }: { facilities: FacilityCard[] }) {
  const checked = facilities.filter(f => f.isLicenceValid && f.licenceNo);
  const mhtc = facilities.filter(f => f.mhtcMember).length;
  const bodies = Array.from(new Set(facilities.flatMap(f => (f.accreditations ?? []).map(a => a.body).filter(Boolean)))).slice(0, 3);
  const items: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string }[] = [];
  if (checked.length > 0) items.push({ icon: ShieldCheck, title: `${checked.length} licence-checked hospitals & clinics`, sub: 'Official MOH license verified' });
  if (mhtc > 0) items.push({ icon: BadgeCheck, title: `${mhtc} MHTC member facilities`, sub: 'Malaysia Healthcare Travel Council' });
  if (bodies.length > 0) items.push({ icon: Award, title: `Accredited: ${bodies.join(', ')}`, sub: 'JCI / MSQH benchmarked' });
  items.push({ icon: Tag, title: 'Prices shown upfront', sub: 'Inclusions & exclusions transparent' });
  items.push({ icon: MessageSquare, title: 'Direct consultation booking', sub: 'Inquire without an account' });
  const shown = items.slice(0, 4);

  return (
    <div className={`${wrap} mt-3`}>
      <ul aria-label="Why book with MediCred" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-[color:var(--t-200)] divide-y sm:divide-y-0 lg:divide-x divide-[color:var(--t-100)] shadow-xs">
        {shown.map(it => (
          <li key={it.title} className="flex items-center gap-3 px-4 py-3 min-w-0">
            <span className="w-9 h-9 shrink-0 bg-[color:var(--t-100)] text-[color:var(--t-700)] flex items-center justify-center">
              <it.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900 truncate" title={it.title}>{it.title}</span>
              <span className="block text-xs text-slate-600 truncate">{it.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --------------------------------------------------------------------------
// CARD COMPONENTS
// --------------------------------------------------------------------------

function ClinicCard({ c, onPickClinic, onEnquire }: { c: FacilityCard; onPickClinic: (name: string) => void; onEnquire: (target: EnquiryTarget) => void; key?: React.Key }) {
  return (
    <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] p-5 flex flex-col justify-between transition-all shadow-xs hover:shadow-md">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-white bg-[color:var(--t-700)] px-2 py-0.5">
            Clinic
          </span>
          {c.isLicenceValid && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
              <CheckCircle className="h-3 w-3" /> Licence Verified
            </span>
          )}
        </div>

        <div>
          <h3 className="font-display font-bold text-lg text-slate-900 leading-snug">{c.name}</h3>
          <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            {place(c)}
          </p>
        </div>

        <div className="text-xs space-y-1 text-slate-700 bg-[color:var(--t-50)]/60 p-2.5 border border-[color:var(--t-100)]">
          {c.licenceNo && <div><span className="text-slate-500">MOH Licence:</span> <span className="font-mono font-semibold">{c.licenceNo}</span></div>}
          <div><span className="text-slate-500">Practice:</span> Family Medicine, Health Screening, Minor Surgeri</div>
          <div><span className="text-slate-500">Hours:</span> Open daily · Appointment & walk-ins</div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onPickClinic(c.name)}
          className="text-xs font-bold text-[color:var(--t-700)] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          {c.packagesCount} {c.packagesCount === 1 ? 'Package' : 'Packages'} <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onEnquire({ kind: 'clinic', title: c.name, subtitle: place(c), facilityId: c.id })}
          className="whitespace-nowrap shrink-0 px-3 py-1.5 text-xs font-bold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer transition-colors"
        >
          Enquire Clinic
        </button>
      </div>
    </div>
  );
}

function HospitalCard({ h, onPickHospital, onEnquire }: { h: FacilityCard; onPickHospital: (name: string) => void; onEnquire: (target: EnquiryTarget) => void; key?: React.Key }) {
  const accs = (h.accreditations ?? []).map(a => a.body).filter(Boolean);
  return (
    <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] p-5 flex flex-col justify-between transition-all shadow-xs hover:shadow-md">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-white bg-[color:var(--t-900)] px-2 py-0.5">
            Hospital
          </span>
          <div className="flex flex-wrap gap-1 justify-end">
            {h.mhtcMember && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200">
                MHTC Member
              </span>
            )}
            {accs.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200">
                {accs.join(' / ')}
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-display font-bold text-lg text-slate-900 leading-snug">{h.name}</h3>
          <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            {place(h)}
          </p>
        </div>

        <div className="text-xs space-y-1 text-slate-700 bg-[color:var(--t-50)]/60 p-2.5 border border-[color:var(--t-100)]">
          <div><span className="text-slate-500">Key Centers:</span> Oncology, Cardiology, Robotic Surgery, IVF, Orthopedics</div>
          <div><span className="text-slate-500">Facilities:</span> 24/7 Emergency, Inpatient Suites, International Lounge</div>
          {h.licenceNo && <div><span className="text-slate-500">Licence:</span> <span className="font-mono">{h.licenceNo}</span></div>}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onPickHospital(h.name)}
          className="text-xs font-bold text-[color:var(--t-700)] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          {h.packagesCount} {h.packagesCount === 1 ? 'Package' : 'Packages'} <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onEnquire({ kind: 'hospital', title: h.name, subtitle: place(h), facilityId: h.id })}
          className="whitespace-nowrap shrink-0 px-3 py-1.5 text-xs font-bold bg-[color:var(--t-900)] hover:bg-[color:var(--t-800)] text-white cursor-pointer transition-colors"
        >
          Ask Hospital
        </button>
      </div>
    </div>
  );
}

function NurseCard({ n, signedIn = false, onEnquire }: { n: Professional; signedIn?: boolean; onEnquire: (target: EnquiryTarget) => void; key?: React.Key }) {
  return (
    <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] p-5 flex flex-col justify-between transition-all shadow-xs hover:shadow-md">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-[color:var(--t-100)] border border-[color:var(--t-200)] shrink-0">
            <Photo src={n.avatar || '/assets/malaysian_female_nurse.jpg'} alt={n.name} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
              LJM Certified Nurse
            </span>
            <h3 className="font-display font-bold text-[15px] text-slate-900 leading-tight mt-1 truncate" title={n.name}>
              {n.name}
            </h3>
            <div className="text-xs font-semibold text-[color:var(--t-700)] mt-0.5">{n.specialization}</div>
          </div>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{n.bio || 'Experienced nursing sister delivering evidence-based clinical nursing care and home rehabilitation.'}</p>

        <div className="text-xs space-y-1.5 bg-[color:var(--t-50)]/70 p-2.5 border border-[color:var(--t-100)]">
          <div className="flex justify-between text-slate-600">
            <span>Experience:</span>
            <span className="font-semibold text-slate-900">{n.experienceYears} Years</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Licence / Reg:</span>
            <span className="font-mono text-slate-900">{n.licenseNumber}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Modes:</span>
            <span className="font-semibold text-slate-900">{(n.consultationModes ?? ['Home Visit']).join(', ')}</span>
          </div>
          {n.shiftTypes && (
            <div className="flex justify-between text-slate-600">
              <span>Shifts:</span>
              <span className="font-semibold text-slate-900">{n.shiftTypes.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between gap-2">
        <div>
          <span className="block text-[11px] text-slate-500">Hourly Rate</span>
          <span className="font-display font-black text-lg text-[color:var(--ink)]">{myr(n.fee)}<span className="text-xs font-normal text-slate-500">/hr</span></span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (signedIn) {
              navigate(`/?profId=${n.id}`);
            } else {
              onEnquire({ kind: 'nurse', title: n.name, subtitle: `${n.specialization} (${n.city})`, price: `${myr(n.fee)}/hr`, professionalId: n.id });
            }
          }}
          className="whitespace-nowrap shrink-0 px-3 py-2 text-xs font-bold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer transition-colors"
        >
          {signedIn ? 'Book Home Visit' : 'Book Nurse Care'}
        </button>
      </div>
    </div>
  );
}

function DoctorCard({ d, signedIn = false, onEnquire }: { d: Professional; signedIn?: boolean; onEnquire: (target: EnquiryTarget) => void; key?: React.Key }) {
  return (
    <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] p-5 flex flex-col justify-between transition-all shadow-xs hover:shadow-md">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-[color:var(--t-100)] border border-[color:var(--t-200)] shrink-0">
            <Photo src={d.avatar || '/assets/malaysian_female_doctor.jpg'} alt={d.name} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 border border-blue-200">
              MMC Registered Specialist
            </span>
            <h3 className="font-display font-bold text-[15px] text-slate-900 leading-tight mt-1 truncate" title={d.name}>
              {d.name}
            </h3>
            <div className="text-xs font-semibold text-[color:var(--t-700)] mt-0.5">{d.specialization}</div>
          </div>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{d.bio || 'Consultant specialist providing comprehensive diagnostic evaluations and evidence-based clinical treatment.'}</p>

        <div className="text-xs space-y-1.5 bg-[color:var(--t-50)]/70 p-2.5 border border-[color:var(--t-100)]">
          <div className="flex justify-between text-slate-600">
            <span>Experience:</span>
            <span className="font-semibold text-slate-900">{d.experienceYears} Years</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Registration:</span>
            <span className="font-mono text-slate-900">{d.licenseNumber}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Practice:</span>
            <span className="font-semibold text-slate-900 truncate" title={d.practiceAddress || d.city}>{d.practiceAddress || d.city}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Consult Modes:</span>
            <span className="font-semibold text-slate-900">{(d.consultationModes ?? ['In-person', 'Telehealth']).join(', ')}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between gap-2">
        <div>
          <span className="block text-[11px] text-slate-500">Consultation Fee</span>
          <span className="font-display font-black text-lg text-[color:var(--ink)]">{myr(d.fee)}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (signedIn) {
              navigate(`/?profId=${d.id}`);
            } else {
              onEnquire({ kind: 'doctor', title: d.name, subtitle: `${d.specialization} (${d.city})`, price: myr(d.fee), professionalId: d.id });
            }
          }}
          className="whitespace-nowrap shrink-0 px-3 py-2 text-xs font-bold bg-[color:var(--t-900)] hover:bg-[color:var(--t-800)] text-white cursor-pointer transition-colors"
        >
          {signedIn ? 'Book Telehealth / Visit' : 'Book Consultation'}
        </button>
      </div>
    </div>
  );
}

function formatDeliveryMethods(methods?: string[]): string {
  if (!methods || methods.length === 0) return 'In-Store Dispensing & Pickup';
  const labelMap: Record<string, string> = {
    pharmacy_courier: 'Cold-Chain Courier',
    grab: 'GrabExpress',
    lalamove: 'Lalamove Express',
    other_courier: 'Nationwide Courier',
    courier: 'Courier Delivery',
    pickup: 'Self-Pickup',
  };
  return methods.map(m => labelMap[m.toLowerCase()] || m.replace(/_/g, ' ')).join(' · ');
}

function PharmacyCard({ ph, onEnquire }: { ph: Pharmacy; onEnquire: (target: EnquiryTarget) => void; key?: React.Key }) {
  const deliveryLabel = formatDeliveryMethods(ph.deliveryMethods);
  return (
    <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] p-5 flex flex-col justify-between transition-all shadow-xs hover:shadow-md h-full">
      <div className="space-y-3.5">
        {/* Eyebrow Status Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-teal-900 bg-teal-50 px-2.5 py-0.5 border border-teal-200">
            <ShieldCheck className="h-3 w-3 text-teal-600 shrink-0" />
            NPRA Licensed
          </span>
          {ph.coldChain ? (
            <span className="text-[11px] font-bold px-2 py-0.5 bg-cyan-50 text-cyan-900 border border-cyan-200 inline-flex items-center gap-1 shrink-0">
              <Thermometer className="h-3 w-3 text-cyan-600 shrink-0" />
              Cold Chain ❄️
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 border border-slate-200 inline-flex items-center gap-1 shrink-0">
              Standard Storage
            </span>
          )}
        </div>

        {/* Title & Location with full width and consistent multi-line height */}
        <div>
          <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 leading-snug line-clamp-2 min-h-[3rem]" title={ph.name}>
            {ph.name}
          </h3>
          <p className="text-xs text-slate-600 flex items-start gap-1.5 mt-1.5 min-h-[2rem] line-clamp-2" title={ph.address || ph.city}>
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
            <span>{ph.address || ph.city}</span>
          </p>
        </div>

        {/* Operating Hours, Phone & Formatted Delivery */}
        <div className="space-y-1.5 text-xs text-slate-700 bg-[color:var(--t-50)]/70 p-3 border border-[color:var(--t-100)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{ph.hours || '09:00 AM – 10:00 PM'}</span>
            </div>
            {ph.phone && (
              <div className="flex items-center gap-1 shrink-0">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-medium text-slate-900">{ph.phone}</span>
              </div>
            )}
          </div>
          <div className="flex items-start gap-1.5 pt-1 border-t border-[color:var(--t-100)]/80 text-[11px]">
            <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1 text-slate-600" title={deliveryLabel}>
              <strong className="font-semibold text-slate-800">Delivery:</strong> {deliveryLabel}
            </span>
          </div>
        </div>

        {/* Specialized Clinical Services - Single column full width */}
        {ph.services && ph.services.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Specialized Clinical Services
            </div>
            <ul className="space-y-1 min-h-[4.25rem]">
              {ph.services.slice(0, 3).map((s, idx) => (
                <li key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate" title={s}>{s}</span>
                </li>
              ))}
            </ul>
            {ph.services.length > 3 && (
              <div className="text-[11px] font-semibold text-[color:var(--t-700)]">
                +{ph.services.length - 3} more clinical services
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer with Verified Dispensary and Non-wrapping Action Button */}
      <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">NPRA Registered</span>
          <span className="text-xs font-semibold text-slate-700 truncate block">Dispensary</span>
        </div>
        <button
          type="button"
          onClick={() => onEnquire({ kind: 'pharmacy', title: ph.name, subtitle: `Pharmacy Delivery & Services (${ph.city})`, facilityId: ph.id })}
          className="whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white shadow-xs cursor-pointer transition-colors"
        >
          <span>Inquire Services</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// SECTION HEADER WITH "VIEW ALL" ACTION LINK
// --------------------------------------------------------------------------
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  totalCount,
  viewAllLink,
  viewAllText,
  onViewAll,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  totalCount: number;
  viewAllLink: string;
  viewAllText: string;
  onViewAll: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[color:var(--t-200)]">
      <div>
        <h2 className="font-display font-black text-2xl text-slate-900 flex items-center gap-2">
          <Icon className="h-6 w-6 text-[color:var(--t-600)]" aria-hidden="true" />
          {title}
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>
      </div>
      <a
        href={viewAllLink}
        onClick={e => {
          e.preventDefault();
          onViewAll();
        }}
        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] transition-colors shadow-xs"
      >
        <span>{viewAllText} ({totalCount})</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

// --------------------------------------------------------------------------
// DEDICATED PAGE HEADER FOR INDIVIDUAL SECTION VIEW
// --------------------------------------------------------------------------
function DedicatedPageHeader({
  title,
  subtitle,
  totalCount,
  icon: Icon,
  onBack,
}: {
  title: string;
  subtitle: string;
  totalCount: number;
  icon: React.ComponentType<{ className?: string }>;
  onBack: () => void;
}) {
  return (
    <div className="bg-white border-b border-[color:var(--t-200)] py-8 shadow-xs">
      <div className={wrap}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--t-700)] hover:underline mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Packages Marketplace Overview
        </button>

        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="inline-block text-xs font-extrabold uppercase tracking-wide text-white bg-[color:var(--t-700)] px-2.5 py-1 mb-2">
              Dedicated Directory
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 flex items-center gap-3">
              <Icon className="h-8 w-8 text-[color:var(--t-600)] shrink-0" aria-hidden="true" />
              <TwoTone text={title} />
            </h1>
            <p className="text-base text-slate-600 max-w-3xl mt-2 leading-relaxed">{subtitle}</p>
          </div>
          <div className="text-right">
            <span className="block text-3xl font-display font-black text-[color:var(--t-700)]">{totalCount}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified Providers</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// MAIN COMPONENT: PUBLIC PACKAGES PAGE
// --------------------------------------------------------------------------
export default function PublicPackagesPage({ signedIn = false }: { signedIn?: boolean }) {
  const { path, params } = useLocation();
  const pkgId = params.get('pkg');

  const [packages, setPackages] = useState<Pkg[] | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [facilities, setFacilities] = useState<FacilityCard[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [failed, setFailed] = useState(false);

  // Search & Filter state
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc' | 'saving'>('featured');
  const [enquiry, setEnquiry] = useState<EnquiryTarget | null>(null);
  const [copied, setCopied] = useState('');

  // Determine active view mode from URL params or pathname
  const activeView = useMemo<'overview' | 'packages' | 'clinics' | 'hospitals' | 'nurses' | 'doctors' | 'pharmacies'>(() => {
    const v = params.get('view');
    if (v === 'packages' || v === 'clinics' || v === 'hospitals' || v === 'nurses' || v === 'doctors' || v === 'pharmacies') {
      return v;
    }
    if (path.includes('/clinics')) return 'clinics';
    if (path.includes('/hospitals')) return 'hospitals';
    if (path.includes('/nurses')) return 'nurses';
    if (path.includes('/doctors')) return 'doctors';
    if (path.includes('/pharmacies')) return 'pharmacies';
    if (path.includes('/all')) return 'packages';
    return 'overview';
  }, [params, path]);

  useEffect(() => {
    fetch('/api/packages')
      .then(r => r.json())
      .then(d => setPackages(d.status === 'success' ? d.data : []))
      .catch(() => { setPackages([]); setFailed(true); });

    fetch('/api/facilities/directory')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setFacilities(d.data); })
      .catch(() => {});

    fetch('/api/promotions?active_only=1')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setOffers(d.data); })
      .catch(() => {});

    fetch('/api/professionals')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setProfessionals(d.data); })
      .catch(() => {});

    fetch('/api/pharmacies/directory')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setPharmacies(d.data); })
      .catch(() => {});
  }, []);

  const list = packages ?? [];
  const hospitals = useMemo(() => facilities.filter(f => f.kind === 'hospital'), [facilities]);
  const clinics = useMemo(() => facilities.filter(f => f.kind === 'clinic'), [facilities]);
  const nurses = useMemo(() => professionals.filter(p => p.role === 'nurse'), [professionals]);
  const doctors = useMemo(() => professionals.filter(p => p.role === 'doctor'), [professionals]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(list.map(p => p.category).filter(Boolean))).sort()], [list]);

  const shownPackages = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out = list.filter(p => (category === 'All' || p.category === category) && (!t || `${p.title} ${p.facility_name} ${p.facility_city} ${p.category} ${p.inclusions.join(' ')}`.toLowerCase().includes(t)));
    const by = {
      'featured': (a: Pkg, b: Pkg) => Number(b.featured) - Number(a.featured) || savingPct(b) - savingPct(a),
      'price-asc': (a: Pkg, b: Pkg) => a.priceMyr - b.priceMyr,
      'price-desc': (a: Pkg, b: Pkg) => b.priceMyr - a.priceMyr,
      'saving': (a: Pkg, b: Pkg) => savingPct(b) - savingPct(a),
    }[sort];
    return [...out].sort(by);
  }, [list, q, category, sort]);

  // Filtered lists for dedicated views
  const filteredClinics = useMemo(() => {
    const t = q.trim().toLowerCase();
    return clinics.filter(c => (!t || `${c.name} ${c.city} ${c.state}`.toLowerCase().includes(t)) && (cityFilter === 'All' || c.city === cityFilter || c.state === cityFilter));
  }, [clinics, q, cityFilter]);

  const filteredHospitals = useMemo(() => {
    const t = q.trim().toLowerCase();
    return hospitals.filter(h => (!t || `${h.name} ${h.city} ${h.state}`.toLowerCase().includes(t)) && (cityFilter === 'All' || h.city === cityFilter || h.state === cityFilter));
  }, [hospitals, q, cityFilter]);

  const filteredNurses = useMemo(() => {
    const t = q.trim().toLowerCase();
    return nurses.filter(n => (!t || `${n.name} ${n.specialization} ${n.city}`.toLowerCase().includes(t)) && (cityFilter === 'All' || n.city === cityFilter));
  }, [nurses, q, cityFilter]);

  const filteredDoctors = useMemo(() => {
    const t = q.trim().toLowerCase();
    return doctors.filter(d => (!t || `${d.name} ${d.specialization} ${d.city}`.toLowerCase().includes(t)) && (cityFilter === 'All' || d.city === cityFilter));
  }, [doctors, q, cityFilter]);

  const filteredPharmacies = useMemo(() => {
    const t = q.trim().toLowerCase();
    return pharmacies.filter(ph => (!t || `${ph.name} ${ph.city} ${ph.address} ${(ph.services || []).join(' ')}`.toLowerCase().includes(t)) && (cityFilter === 'All' || ph.city === cityFilter));
  }, [pharmacies, q, cityFilter]);

  const current = pkgId ? list.find(p => p.id === pkgId) : undefined;

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const goToView = (v: 'overview' | 'packages' | 'clinics' | 'hospitals' | 'nurses' | 'doctors' | 'pharmacies') => {
    setQ('');
    setCityFilter('All');
    if (v === 'overview') navigate('/packages');
    else navigate(`/packages?view=${v}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePickFacility = (name: string) => {
    setQ(name);
    setCategory('All');
    goToView('packages');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[color:var(--t-bg)] text-[color:var(--ink)] antialiased">
      <a href="#pp-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:border focus:border-[color:var(--t-600)] focus:font-bold">Skip to content</a>

      {/* Top Banner Bar */}
      <div className="bg-[color:var(--t-900)] text-white/90">
        <nav aria-label="Audiences" className={`${wrap} flex flex-wrap items-center gap-x-5 gap-y-1 py-1 text-[13px] font-semibold`}>
          <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} className="min-h-[44px] inline-flex items-center gap-1 hover:text-white hover:underline cursor-pointer"><ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />Home</a>
          <span className="font-extrabold text-white">For patients</span>
          {([['For hospitals and clinics', '/for-clinics'], ['For doctors and nurses', '/for-practitioners'], ['For pharmacies', '/for-pharmacies']] as const).map(([label, to]) => (
            <a key={to} href={to} onClick={e => { e.preventDefault(); navigate(to); }} className="min-h-[44px] inline-flex items-center hover:text-white hover:underline cursor-pointer">{label}</a>
          ))}
        </nav>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)]">
          <div className={`${wrap} min-h-[64px] flex items-center justify-between gap-3`}>
            <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} className="flex items-center gap-2.5" aria-label="MediCred home">
              <span className="w-9 h-9 bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-700)]">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
              </span>
              <span className="font-display font-black text-xl tracking-tight">MediCred<span className="text-[color:var(--t-600)]">.</span></span>
            </a>
            <nav aria-label="Marketplace sections" className="hidden lg:flex self-stretch items-stretch gap-2 text-[15px] font-semibold">
              <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} className="relative min-h-[44px] px-3 inline-flex items-center whitespace-nowrap text-slate-700 hover:text-[color:var(--t-700)]">Home</a>
              <a href="/packages" onClick={e => { e.preventDefault(); goToView('overview'); }} aria-current="page" className="relative min-h-[44px] px-3 inline-flex items-center whitespace-nowrap font-bold text-[color:var(--t-700)] after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-[color:var(--t-600)]">Packages & Directory</a>
              <a href="/verify-practitioners" onClick={e => { e.preventDefault(); navigate('/verify-practitioners'); }} className="relative min-h-[44px] px-3 inline-flex items-center whitespace-nowrap text-slate-700 hover:text-[color:var(--t-700)]">Verify a licence</a>
            </nav>
            <div className="flex items-center gap-2">
              {signedIn ? (
                <button type="button" onClick={() => navigate('/')} className={`${primaryBtn}`}>My account</button>
              ) : (
                <>
                  <button type="button" onClick={() => navigate('/login')} className="min-h-[44px] px-2 sm:px-3 text-sm font-bold text-[color:var(--t-700)] hover:underline cursor-pointer whitespace-nowrap">Sign in</button>
                  <button type="button" onClick={() => navigate(loginUrl('patient', true))} className={`${primaryBtn} hidden lg:inline-flex`}>Create account</button>
                </>
              )}
              <LocaleSwitcher />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main id="pp-main" className="flex-grow">
        {pkgId ? (
          packages === null ? (
            <p className={`${wrap} py-16 text-center text-slate-700`} role="status">Loading package…</p>
          ) : current ? (
            <Detail
              p={current}
              signedIn={signedIn}
              onEnquire={() => setEnquiry({ kind: 'package', title: current.title, subtitle: current.facility_name, price: myr(current.priceMyr), facilityId: current.facility_id })}
              more={list.filter(x => x.id !== current.id && x.facility_id === current.facility_id).sort((a, b) => Number(b.featured) - Number(a.featured) || savingPct(b) - savingPct(a)).slice(0, 3)}
              facilityOffers={offers.filter(o => o.facility_name === current.facility_name).slice(0, 3)}
            />
          ) : (
            <div className={`${wrap} py-16 text-center space-y-3`}>
              <p className="font-bold">We could not find that package. It may have been withdrawn.</p>
              <button type="button" onClick={() => goToView('overview')} className={ghostBtn}>See all packages</button>
            </div>
          )
        ) : (
          <>
            {/* Top Hero Banner - only on Overview or Packages page */}
            {(activeView === 'overview' || activeView === 'packages') && (
              <HeroSlider packages={list} offers={offers} copied={copied} onCopy={copy} />
            )}

            

            {/* ====================================================================== */}
            {/* VIEW 1: OVERVIEW - EXACTLY 4 ITEMS PER SECTION WITH VIEW ALL LINK     */}
            {/* ====================================================================== */}
            {activeView === 'overview' && (
              <>
                <div className={`${wrap} -mt-6 relative z-10`}>
                  <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-sm space-y-3">
                    <form role="search" aria-label="Filter packages" onSubmit={e => e.preventDefault()} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_200px_190px]">
                      <div className="relative">
                        <label htmlFor="pp-q" className="sr-only">Search healthcare marketplace</label>
                        <Search className="h-[18px] w-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                        <input
                          id="pp-q"
                          type="search"
                          value={q}
                          onChange={e => setQ(e.target.value)}
                          placeholder="Search procedure, doctor, hospital, clinic, nurse, pharmacy..."
                          className={`${control} w-full pl-10`}
                        />
                      </div>
                      <div>
                        <label htmlFor="pp-cat" className="sr-only">Specialty</label>
                        <select id="pp-cat" value={category} onChange={e => setCategory(e.target.value)} className={`${control} w-full`}>
                          {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All specialties' : c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="pp-sort" className="sr-only">Sort by</label>
                        <select id="pp-sort" value={sort} onChange={e => setSort(e.target.value as typeof sort)} className={`${control} w-full`}>
                          <option value="featured">Featured first</option>
                          <option value="price-asc">Price, low to high</option>
                          <option value="price-desc">Price, high to low</option>
                          <option value="saving">Biggest saving</option>
                        </select>
                      </div>
                    </form>

                    {/* Clean Category Navigation: flex-wrap with ZERO horizontal scrollbar */}
                    <div className="pt-3 border-t border-[color:var(--t-100)] flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                        <Sparkles className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Explore:
                      </span>
                      <button
                        type="button"
                        onClick={() => goToView('packages')}
                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] text-[color:var(--t-800)] hover:text-white border border-[color:var(--t-200)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <PackagePlus className="h-3.5 w-3.5" /> Packages ({list.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => goToView('clinics')}
                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] text-[color:var(--t-800)] hover:text-white border border-[color:var(--t-200)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Stethoscope className="h-3.5 w-3.5" /> Clinics ({clinics.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => goToView('hospitals')}
                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] text-[color:var(--t-800)] hover:text-white border border-[color:var(--t-200)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Building2 className="h-3.5 w-3.5" /> Hospitals ({hospitals.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => goToView('nurses')}
                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] text-[color:var(--t-800)] hover:text-white border border-[color:var(--t-200)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <HeartPulse className="h-3.5 w-3.5" /> Specialized Nurses ({nurses.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => goToView('doctors')}
                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] text-[color:var(--t-800)] hover:text-white border border-[color:var(--t-200)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Specialized Doctors ({doctors.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => goToView('pharmacies')}
                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] text-[color:var(--t-800)] hover:text-white border border-[color:var(--t-200)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pill className="h-3.5 w-3.5" /> Pharmacies & Offers ({pharmacies.length})
                      </button>
                    </div>
                  </div>
                </div>

                <TrustBand facilities={facilities} />

                <div className={`${wrap} py-10 space-y-16`}>
                  {/* SECTION 1: PACKAGES (SHOW ONLY 4) */}
                  <section aria-label="Featured Packages Preview" className="space-y-5">
                    <SectionHeader
                      icon={PackagePlus}
                      title="Hospital & Clinic Packages"
                      subtitle="Transparent, upfront medical & elective procedure packages with inclusions verified"
                      totalCount={list.length}
                      viewAllLink="/packages?view=packages"
                      viewAllText="View All Packages"
                      onViewAll={() => goToView('packages')}
                    />
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {shownPackages.slice(0, 4).map(p => (
                        <li key={p.id} className="min-w-0">
                          <PackageCard
                            p={p}
                            onEnquire={pkg => setEnquiry({ kind: 'package', title: pkg.title, subtitle: pkg.facility_name, price: myr(pkg.priceMyr), facilityId: pkg.facility_id })}
                          />
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => goToView('packages')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--t-700)] hover:text-[color:var(--t-800)] hover:underline cursor-pointer"
                      >
                        Explore all {list.length} procedure packages with inclusions & exclusions <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>

                  {/* SECTION 2: CLINICS (SHOW ONLY 4) */}
                  <section aria-label="Verified Clinics Preview" className="space-y-5">
                    <SectionHeader
                      icon={Stethoscope}
                      title="Verified Specialist Clinics"
                      subtitle="Ministry of Health (MOH) checked family practice, pediatric, fertility, and dermatology clinics"
                      totalCount={clinics.length}
                      viewAllLink="/packages?view=clinics"
                      viewAllText="View All Clinics"
                      onViewAll={() => goToView('clinics')}
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {clinics.slice(0, 4).map(c => (
                        <ClinicCard key={c.id} c={c} onPickClinic={handlePickFacility} onEnquire={setEnquiry} />
                      ))}
                    </div>
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => goToView('clinics')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--t-700)] hover:text-[color:var(--t-800)] hover:underline cursor-pointer"
                      >
                        Browse all {clinics.length} verified specialist clinics across Malaysia <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>

                  {/* SECTION 3: HOSPITALS (SHOW ONLY 4) */}
                  <section aria-label="Accredited Hospitals Preview" className="space-y-5">
                    <SectionHeader
                      icon={Building2}
                      title="Accredited Partner Hospitals"
                      subtitle="JCI & MSQH accredited private medical centers and MHTC healthcare travel facilities"
                      totalCount={hospitals.length}
                      viewAllLink="/packages?view=hospitals"
                      viewAllText="View All Hospitals"
                      onViewAll={() => goToView('hospitals')}
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {hospitals.slice(0, 4).map(h => (
                        <HospitalCard key={h.id} h={h} onPickHospital={handlePickFacility} onEnquire={setEnquiry} />
                      ))}
                    </div>
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => goToView('hospitals')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--t-700)] hover:text-[color:var(--t-800)] hover:underline cursor-pointer"
                      >
                        Discover all {hospitals.length} partner tertiary hospitals and surgical centers <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>

                  {/* SECTION 4: NURSES (SHOW ONLY 4) */}
                  <section aria-label="Specialized Nurses Preview" className="space-y-5">
                    <SectionHeader
                      icon={HeartPulse}
                      title="Specialized Registered Nurses & Home Care"
                      subtitle="Lembaga Jururawat Malaysia (LJM) verified sisters for ICU, stoma, oncology, and post-op care"
                      totalCount={nurses.length}
                      viewAllLink="/packages?view=nurses"
                      viewAllText="View All Specialized Nurses"
                      onViewAll={() => goToView('nurses')}
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {nurses.slice(0, 4).map(n => (
                        <NurseCard key={n.id} n={n} signedIn={signedIn} onEnquire={setEnquiry} />
                      ))}
                    </div>
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => goToView('nurses')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--t-700)] hover:text-[color:var(--t-800)] hover:underline cursor-pointer"
                      >
                        View all {nurses.length} LJM certified nurses available for home visit and shift care <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>

                  {/* SECTION 5: DOCTORS (SHOW ONLY 4) */}
                  <section aria-label="Specialist Doctors Preview" className="space-y-5">
                    <SectionHeader
                      icon={UserCheck}
                      title="Specialist Doctors & Medical Consultants"
                      subtitle="Malaysian Medical Council (MMC) verified specialists across cardiology, oncology, ortho, and pediatrics"
                      totalCount={doctors.length}
                      viewAllLink="/packages?view=doctors"
                      viewAllText="View All Specialist Doctors"
                      onViewAll={() => goToView('doctors')}
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {doctors.slice(0, 4).map(d => (
                        <DoctorCard key={d.id} d={d} signedIn={signedIn} onEnquire={setEnquiry} />
                      ))}
                    </div>
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => goToView('doctors')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--t-700)] hover:text-[color:var(--t-800)] hover:underline cursor-pointer"
                      >
                        Explore all {doctors.length} MMC verified specialists and book consultations <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>

                  {/* SECTION 6: PHARMACIES & OFFERS (SHOW ONLY 4) */}
                  <section aria-label="Licensed Pharmacies Preview" className="space-y-5">
                    <SectionHeader
                      icon={Pill}
                      title="Licensed Community Pharmacies & Active Offers"
                      subtitle="NPRA registered dispensaries with cold-chain storage, diabetic testing, courier delivery, and coupons"
                      totalCount={pharmacies.length}
                      viewAllLink="/packages?view=pharmacies"
                      viewAllText="View All Pharmacies & Offers"
                      onViewAll={() => goToView('pharmacies')}
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {pharmacies.slice(0, 4).map(ph => (
                        <PharmacyCard key={ph.id} ph={ph} onEnquire={setEnquiry} />
                      ))}
                    </div>
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => goToView('pharmacies')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--t-700)] hover:text-[color:var(--t-800)] hover:underline cursor-pointer"
                      >
                        See all {pharmacies.length} certified pharmacies and active voucher promotions <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* ====================================================================== */}
            {/* VIEW 2: DEDICATED PACKAGES PAGE                                        */}
            {/* ====================================================================== */}
            {activeView === 'packages' && (
              <>
                <DedicatedPageHeader
                  title="Medical & Surgical Packages"
                  subtitle="Browse Malaysia's complete directory of licence-verified hospital and clinic healthcare packages with fixed upfront pricing, inclusions, and preparation instructions."
                  totalCount={list.length}
                  icon={PackagePlus}
                  onBack={() => goToView('overview')}
                />
                <div className={`${wrap} py-8 space-y-6`}>
                  {/* Search and filters */}
                  <div className="bg-white border border-[color:var(--t-200)] p-4 grid gap-3 sm:grid-cols-3 shadow-xs">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Filter packages by procedure or hospital..."
                        className={`${control} w-full pl-9`}
                      />
                    </div>
                    <div>
                      <select value={category} onChange={e => setCategory(e.target.value)} className={`${control} w-full`}>
                        {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All specialties' : c}</option>)}
                      </select>
                    </div>
                    <div>
                      <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className={`${control} w-full`}>
                        <option value="featured">Featured first</option>
                        <option value="price-asc">Price, low to high</option>
                        <option value="price-desc">Price, high to low</option>
                        <option value="saving">Biggest saving</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600" role="status">
                    Showing <b>{shownPackages.length}</b> of {list.length} packages
                  </p>

                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {shownPackages.map(p => (
                      <li key={p.id} className="min-w-0">
                        <PackageCard
                          p={p}
                          onEnquire={pkg => setEnquiry({ kind: 'package', title: pkg.title, subtitle: pkg.facility_name, price: myr(pkg.priceMyr), facilityId: pkg.facility_id })}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* ====================================================================== */}
            {/* VIEW 3: DEDICATED CLINICS PAGE                                         */}
            {/* ====================================================================== */}
            {activeView === 'clinics' && (
              <>
                <DedicatedPageHeader
                  title="Verified Specialist & Wellness Clinics"
                  subtitle="Official Ministry of Health (MOH) checked private clinics offering family medicine, pediatrics, well-woman care, non-surgical orthopedics, and clinical dermatology."
                  totalCount={clinics.length}
                  icon={Stethoscope}
                  onBack={() => goToView('overview')}
                />
                <div className={`${wrap} py-8 space-y-6`}>
                  {/* Search and filters */}
                  <div className="bg-white border border-[color:var(--t-200)] p-4 grid gap-3 sm:grid-cols-2 shadow-xs">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search clinic by name or services..."
                        className={`${control} w-full pl-9`}
                      />
                    </div>
                    <div>
                      <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className={`${control} w-full`}>
                        <option value="All">All Regions / Cities</option>
                        <option value="Kuala Lumpur">Kuala Lumpur</option>
                        <option value="Petaling Jaya">Petaling Jaya (Selangor)</option>
                        <option value="George Town">George Town (Penang)</option>
                        <option value="Johor Bahru">Johor Bahru (Johor)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600" role="status">
                    Showing <b>{filteredClinics.length}</b> verified clinics
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredClinics.map(c => (
                      <ClinicCard key={c.id} c={c} onPickClinic={handlePickFacility} onEnquire={setEnquiry} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ====================================================================== */}
            {/* VIEW 4: DEDICATED HOSPITALS PAGE                                       */}
            {/* ====================================================================== */}
            {activeView === 'hospitals' && (
              <>
                <DedicatedPageHeader
                  title="Accredited Partner Hospitals"
                  subtitle="Tertiary medical centers benchmarked by Joint Commission International (JCI) and Malaysian Society for Quality in Health (MSQH) with multi-disciplinary clinical departments."
                  totalCount={hospitals.length}
                  icon={Building2}
                  onBack={() => goToView('overview')}
                />
                <div className={`${wrap} py-8 space-y-6`}>
                  {/* Search and filters */}
                  <div className="bg-white border border-[color:var(--t-200)] p-4 grid gap-3 sm:grid-cols-2 shadow-xs">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search hospital by name or city..."
                        className={`${control} w-full pl-9`}
                      />
                    </div>
                    <div>
                      <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className={`${control} w-full`}>
                        <option value="All">All Regions / Cities</option>
                        <option value="Kuala Lumpur">Kuala Lumpur</option>
                        <option value="Subang Jaya">Subang Jaya (Selangor)</option>
                        <option value="George Town">George Town (Penang)</option>
                        <option value="Johor Bahru">Johor Bahru (Johor)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600" role="status">
                    Showing <b>{filteredHospitals.length}</b> tertiary medical centers
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredHospitals.map(h => (
                      <HospitalCard key={h.id} h={h} onPickHospital={handlePickFacility} onEnquire={setEnquiry} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ====================================================================== */}
            {/* VIEW 5: DEDICATED SPECIALIZED NURSES PAGE                             */}
            {/* ====================================================================== */}
            {activeView === 'nurses' && (
              <>
                <DedicatedPageHeader
                  title="Specialized Registered Nurses & Home Care"
                  subtitle="Lembaga Jururawat Malaysia (LJM) verified nursing sisters and staff nurses specializing in critical care, stoma & wound healing, palliative hospice, orthopaedic rehabilitation, and postnatal lactation."
                  totalCount={nurses.length}
                  icon={HeartPulse}
                  onBack={() => goToView('overview')}
                />
                <div className={`${wrap} py-8 space-y-6`}>
                  {/* Search and filters */}
                  <div className="bg-white border border-[color:var(--t-200)] p-4 grid gap-3 sm:grid-cols-2 shadow-xs">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search nurse by name or clinical specialty..."
                        className={`${control} w-full pl-9`}
                      />
                    </div>
                    <div>
                      <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className={`${control} w-full`}>
                        <option value="All">All Locations</option>
                        <option value="Kuala Lumpur">Kuala Lumpur</option>
                        <option value="Petaling Jaya">Petaling Jaya (Selangor)</option>
                        <option value="Ampang">Ampang</option>
                        <option value="Cheras">Cheras</option>
                        <option value="Penang">Penang</option>
                        <option value="Johor Bahru">Johor Bahru</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600" role="status">
                    Showing <b>{filteredNurses.length}</b> LJM verified nurses
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredNurses.map(n => (
                      <NurseCard key={n.id} n={n} signedIn={signedIn} onEnquire={setEnquiry} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ====================================================================== */}
            {/* VIEW 6: DEDICATED SPECIALIZED DOCTORS PAGE                            */}
            {/* ====================================================================== */}
            {activeView === 'doctors' && (
              <>
                <DedicatedPageHeader
                  title="Specialist Doctors & Medical Consultants"
                  subtitle="Malaysian Medical Council (MMC) registered consultants across Cardiology, Medical Oncology, Orthopaedic Surgery, Gastroenterology, Obstetrics & Gynaecology, Paediatrics, and Endocrinology."
                  totalCount={doctors.length}
                  icon={UserCheck}
                  onBack={() => goToView('overview')}
                />
                <div className={`${wrap} py-8 space-y-6`}>
                  {/* Search and filters */}
                  <div className="bg-white border border-[color:var(--t-200)] p-4 grid gap-3 sm:grid-cols-2 shadow-xs">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search doctor by name or medical specialty..."
                        className={`${control} w-full pl-9`}
                      />
                    </div>
                    <div>
                      <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className={`${control} w-full`}>
                        <option value="All">All Locations</option>
                        <option value="Kuala Lumpur">Kuala Lumpur</option>
                        <option value="Petaling Jaya">Petaling Jaya (Selangor)</option>
                        <option value="Penang">Penang</option>
                        <option value="Johor Bahru">Johor Bahru</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600" role="status">
                    Showing <b>{filteredDoctors.length}</b> MMC verified specialists
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDoctors.map(d => (
                      <DoctorCard key={d.id} d={d} signedIn={signedIn} onEnquire={setEnquiry} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ====================================================================== */}
            {/* VIEW 7: DEDICATED PHARMACIES & OFFERS PAGE                             */}
            {/* ====================================================================== */}
            {activeView === 'pharmacies' && (
              <>
                <DedicatedPageHeader
                  title="Licensed Community Pharmacies & Active Offers"
                  subtitle="NPRA certified dispensaries with temperature-controlled cold-chain logistics, diabetic testing, home stroke care, prescription delivery, and active promotional vouchers."
                  totalCount={pharmacies.length}
                  icon={Pill}
                  onBack={() => goToView('overview')}
                />
                <div className={`${wrap} py-8 space-y-8`}>
                  {/* Active Voucher Offers Section */}
                  {offers.length > 0 && (
                    <div className="bg-white border border-[color:var(--t-200)] p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-[color:var(--t-600)]" />
                        <div>
                          <h2 className="font-display font-bold text-lg text-slate-900">Active Pharmacy Voucher Codes & Discounts</h2>
                          <p className="text-xs text-slate-600">Click to copy promotion code for checkout or presenting at counter</p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {offers.map(o => (
                          <div key={o.id} className="border border-[color:var(--t-200)] bg-[color:var(--t-50)]/40 p-3.5 flex flex-col justify-between">
                            <div>
                              <span className="inline-block text-[10px] font-extrabold uppercase text-white bg-[color:var(--t-700)] px-2 py-0.5 mb-1.5">
                                {o.badge_text || 'Active Promo'}
                              </span>
                              <div className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">{o.title}</div>
                              {o.valid_until && <div className="text-[11px] text-slate-500 mt-1">Valid until {o.valid_until}</div>}
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-[color:var(--t-200)] flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-[color:var(--t-800)]">{o.code}</span>
                              <button
                                type="button"
                                onClick={() => copy(o.code)}
                                className="px-3 py-1 text-xs font-bold bg-[color:var(--t-900)] text-white hover:bg-[color:var(--t-800)] cursor-pointer transition-colors"
                              >
                                {copied === o.code ? 'Copied!' : 'Copy Code'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search and filters */}
                  <div className="bg-white border border-[color:var(--t-200)] p-4 grid gap-3 sm:grid-cols-2 shadow-xs">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search pharmacy by name or service..."
                        className={`${control} w-full pl-9`}
                      />
                    </div>
                    <div>
                      <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className={`${control} w-full`}>
                        <option value="All">All Cities</option>
                        <option value="Kuala Lumpur">Kuala Lumpur</option>
                        <option value="Petaling Jaya">Petaling Jaya (Selangor)</option>
                        <option value="George Town">George Town (Penang)</option>
                        <option value="Johor Bahru">Johor Bahru (Johor)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600" role="status">
                    Showing <b>{filteredPharmacies.length}</b> licensed community pharmacies
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {filteredPharmacies.map(ph => (
                      <PharmacyCard key={ph.id} ph={ph} onEnquire={setEnquiry} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* How it works */}
            <section aria-label="How it works" className="bg-white border-y border-[color:var(--t-100)] mt-8">
              <div className={`${wrap} py-10`}>
                <h2 className="font-display font-bold text-2xl text-slate-900">How MediCred Works</h2>
                <ol className="mt-5 grid gap-4 md:grid-cols-3">
                  {[
                    ['Compare Upfront', 'View all-inclusive transparent prices, doctor credentials, and facility amenities upfront before making decisions.'],
                    ['Direct Provider Enquiry', 'Ask questions to hospitals, specialist clinics, nurses, and pharmacists directly without needing to sign up.'],
                    ['Verified Reservation', 'Book home nursing, clinical appointments, or hospital procedures with accredited assurance.'],
                  ].map(([t, d], k) => (
                    <li key={t} className="flex items-start gap-4 border border-[color:var(--t-200)] p-5">
                      <span className="w-9 h-9 shrink-0 bg-[color:var(--t-600)] text-white font-bold flex items-center justify-center" aria-hidden="true">
                        {k + 1}
                      </span>
                      <div>
                        <div className="font-bold text-lg text-slate-900">{t}</div>
                        <p className="text-sm text-slate-700 mt-1 leading-relaxed">{d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Provider CTA Banner */}
            <section className="bg-[color:var(--t-bg)] border-b border-[color:var(--t-100)]">
              <div className={`${wrap} py-8 flex flex-wrap items-center justify-between gap-4`}>
                <div className="max-w-xl">
                  <div className="font-display font-bold text-xl text-slate-900">Healthcare Facility or Licensed Practitioner?</div>
                  <p className="text-sm text-slate-700 mt-1">List your medical packages, clinic services, or independent nursing practice on Malaysia's verified registry.</p>
                </div>
                <button type="button" onClick={() => navigate('/for-clinics')} className={primaryBtn}>
                  Join Healthcare Registry <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Universal Enquiry Modal */}
      {enquiry && <UniversalEnquiryDialog target={enquiry} onClose={() => setEnquiry(null)} />}

      <Footer />
    </div>
  );
}
