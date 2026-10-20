import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HeartHandshake,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Printer,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Plane,
  Shield,
  BadgeCheck,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Ambulance,
  Languages,
  Utensils,
  Car,
  Search,
  RefreshCw,
  X,
  CreditCard,
  MessageSquare,
  FileCheck
} from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { MyCases } from './MedicalTourism';

interface QuotationItem {
  label: string;
  category: string;
  amountSen: number;
}

interface Quotation {
  id: string;
  version: number;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  taxRatePct: number;
  total: number;
  inclusions?: string;
  exclusions: string;
  cancellationTerms: string;
  paymentTerms?: string;
  validUntil: string;
  status: string;
  createdAt: string;
  decidedAt?: string;
  currency: string;
}

interface AssistanceCase {
  id: string;
  trackingCode: string;
  status: string;
  summary: string;
  specialty?: string;
  patientType: 'local_malaysian' | 'expat_resident' | 'international_traveler';
  assistanceType: string;
  urgency: 'routine' | 'priority' | 'urgent';
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  homeCountry: string;
  insuranceCarrier?: string;
  guaranteeLetter: boolean;
  revisionNotes?: string;
  preferredFrom?: string;
  preferredTo?: string;
  needs?: Record<string, any>;
  facility?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    address?: string;
    phone?: string;
    email?: string;
    licenceNo?: string | null;
    mhtcMember?: boolean;
  };
  quotes: Quotation[];
  latestQuote?: Quotation | null;
  itinerary: Array<{ id: string; date: string; kind: string; title: string; note?: string }>;
  messages: Array<{ id: number; text: string; ts: string; senderId: string; senderName?: string; senderRole?: string }>;
  createdAt: string;
  updatedAt: string;
}

const CURRENCY_RATES: Record<string, { rate: number; symbol: string; label: string }> = {
  MYR: { rate: 1, symbol: 'RM', label: 'Ringgit Malaysia (the quote currency)' },
  USD: { rate: 0.23, symbol: '$', label: 'US Dollar' },
  SGD: { rate: 0.31, symbol: 'S$', label: 'Singapore Dollar' },
  EUR: { rate: 0.21, symbol: '€', label: 'Euro' },
  IDR: { rate: 3550, symbol: 'Rp', label: 'Indonesian Rupiah' },
  GBP: { rate: 0.18, symbol: '£', label: 'British Pound' },
  AUD: { rate: 0.35, symbol: 'A$', label: 'Australian Dollar' },
};

const CATEGORY_NAMES: Record<string, string> = {
  doctor_fees: 'Consultant & Specialist Fees',
  procedure: 'Procedure & Surgical Consumables',
  hospital_stay: 'Ward / Suite Accommodation',
  tests: 'Diagnostic Imaging & Laboratory',
  medication: 'Pharmacy & Infusion Therapy',
  follow_up: 'Post-Op Care & Rehabilitation',
  transport: 'Airport & Ambulance Transfer',
  interpreter: 'Language Liaison & Translation',
  other: 'Administrative & Concierge Services',
};

const STATUS_DISPLAY: Record<string, { label: string; color: string; border: string; bg: string }> = {
  enquiry: { label: 'Request sent', color: 'text-amber-800', border: 'border-amber-300', bg: 'bg-amber-50' },
  triage: { label: 'Being reviewed', color: 'text-blue-800', border: 'border-blue-300', bg: 'bg-blue-50' },
  quoted: { label: 'Quote received', color: 'text-sky-800', border: 'border-sky-300', bg: 'bg-sky-50' },
  accepted: { label: 'Quote accepted', color: 'text-emerald-800', border: 'border-emerald-300', bg: 'bg-emerald-50' },
  in_treatment: { label: 'In treatment', color: 'text-purple-800', border: 'border-purple-300', bg: 'bg-purple-50' },
  completed: { label: 'Completed', color: 'text-slate-800', border: 'border-slate-300', bg: 'bg-slate-100' },
  closed: { label: 'Closed', color: 'text-slate-500', border: 'border-slate-200', bg: 'bg-slate-50' },
};

export type AssistanceTab = 'enquiry' | 'cases' | 'guide' | 'track';

interface MedicalAssistanceModuleProps {
  embedded?: boolean;
  activeTab?: AssistanceTab;
  onTabChange?: (tab: AssistanceTab) => void;
}

export default function MedicalAssistanceModule({
  embedded = false,
  activeTab: controlledActiveTab,
  onTabChange: setControlledActiveTab,
}: MedicalAssistanceModuleProps = {}) {
  const [internalActiveTab, setInternalActiveTab] = useState<AssistanceTab>('enquiry');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = (tab: AssistanceTab) => {
    if (setControlledActiveTab) setControlledActiveTab(tab);
    setInternalActiveTab(tab);
  };
  const [selectedCurrency, setSelectedCurrency] = useState('MYR');
  const formRef = useRef<HTMLFormElement>(null);
  // Who is signed in (for prefilling the form), and the code + email a guest uses to see their own request
  const [me, setMe] = useState<{ name?: string; email?: string; phone?: string } | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  // Signed-in patients see their requests in the same screen as Global Patient Care; guests (code + email) keep the viewer below
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [guest, setGuest] = useState<{ code: string; email: string } | null>(null);
  const [step, setStep] = useState(1);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [actionError, setActionError] = useState('');

  // Cases List State
  const [cases, setCases] = useState<AssistanceCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCase, setSelectedCase] = useState<AssistanceCase | null>(null);
  const [activeCaseTab, setActiveCaseTab] = useState<'quotation' | 'messages' | 'itinerary'>('quotation');

  // Pro-Forma Printable Modal State
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [proformaData, setProformaData] = useState<any>(null);

  // Revision Request Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  // Direct Message State
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // New Enquiry Form State
  const [patientType, setPatientType] = useState<'local_malaysian' | 'expat_resident' | 'international_traveler'>('local_malaysian');
  const [assistanceType, setAssistanceType] = useState('elective_surgery');
  const [urgency, setUrgency] = useState<'routine' | 'priority' | 'urgent'>('routine');
  const [specialty, setSpecialty] = useState('Cardiology & Interventional');
  const [facilityId, setFacilityId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [homeCountry, setHomeCountry] = useState('MY');
  const [preferredFrom, setPreferredFrom] = useState('');
  const [preferredTo, setPreferredTo] = useState('');
  const [summary, setSummary] = useState('');
  const [insuranceCarrier, setInsuranceCarrier] = useState('');
  const [guaranteeLetter, setGuaranteeLetter] = useState(false);
  const [shareDocuments, setShareDocuments] = useState(true);

  // Assistance Needs Checkboxes
  const [needsInterpreter, setNeedsInterpreter] = useState(false);
  const [interpreterLanguage, setInterpreterLanguage] = useState('Arabic');
  const [needsAirportTransfer, setNeedsAirportTransfer] = useState(false);
  const [needsAmbulanceTransfer, setNeedsAmbulanceTransfer] = useState(false);
  const [needsVipConcierge, setNeedsVipConcierge] = useState(false);
  const [needsAccommodation, setNeedsAccommodation] = useState(false);
  const [needsHalalFood, setNeedsHalalFood] = useState(true);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<{ id: string; trackingCode: string } | null>(null);
  const [formError, setFormError] = useState('');

  // Track Guest Form State
  const [trackCode, setTrackCode] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Signed-in patients do not retype their details
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const u = d?.data?.user;
      if (d?.status !== 'success' || !u) return;
      setMeLoaded(true);
      setMe({ name: u.name, email: u.email, phone: d.data.patient?.phone });
      setFullName(v => v || u.name || '');
      setEmail(v => v || u.email || '');
      setPhone(v => v || d.data.patient?.phone || '');
    }).catch(() => {}).finally(() => setMeLoaded(true));
  }, []);

  // A guest proves it is their request with the code AND the email; a signed-in patient needs neither
  const withEmail = (url: string) => (guest ? `${url}${url.includes('?') ? '&' : '?'}email=${encodeURIComponent(guest.email)}` : url);
  const guestBody = () => (guest ? { email: guest.email } : {});

  // Fetch facilities list
  const [facilities, setFacilities] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/tourism/facilities')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && Array.isArray(d.data)) {
          setFacilities(d.data);
          if (d.data.length > 0 && !facilityId) {
            setFacilityId(d.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Cases
  const loadCases = useCallback(() => {
    setLoadingCases(true);
    fetch(guest ? `/api/assistance/cases?trackingCode=${encodeURIComponent(guest.code)}&email=${encodeURIComponent(guest.email)}` : '/api/assistance/cases')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && Array.isArray(d.data)) {
          setCases(d.data);
          if (d.data.length > 0 && !selectedCase) {
            setSelectedCase(d.data[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCases(false));
  }, [selectedCase, guest]);

  useEffect(() => {
    if (activeTab === 'cases') {
      loadCases();
    }
  }, [activeTab, loadCases]);

  // Convert MYR amount to chosen display currency
  const formatCur = (amountMYR: number) => {
    const config = CURRENCY_RATES[selectedCurrency] || CURRENCY_RATES.MYR;
    const converted = amountMYR * config.rate;
    if (selectedCurrency === 'IDR') {
      return `${config.symbol} ${Math.round(converted).toLocaleString()}`;
    }
    return `${config.symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Move to the next step only when the fields on this step are filled in correctly
  const stepIsValid = (n: number) =>
    [...(formRef.current?.querySelectorAll(`[data-step="${n}"] input, [data-step="${n}"] select, [data-step="${n}"] textarea`) ?? [])]
      .every(el => (el as HTMLInputElement).reportValidity());
  const goNext = () => { if (stepIsValid(step)) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const goBack = () => setStep(Math.max(1, step - 1));

  // Submit New Medical Enquiry
  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccessMessage(null);

    if (step < 3) { goNext(); return; }
    if (!stepIsValid(3)) return;
    if (!facilityId) { setFormError('No hospital is available to receive your request right now. Please try again later.'); setStep(2); return; }
    if (summary.trim().length < 15) {
      setFormError('Please describe the condition or the treatment you want in at least 15 characters.');
      setStep(2);
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      setFormError('Please provide the patient contact person full name and email address.');
      return;
    }

    setFormSubmitting(true);
    try {
      const resp = await fetch('/api/assistance/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: fullName.trim(),
          patientEmail: email.trim(),
          patientPhone: phone.trim(),
          homeCountry,
          patientType,
          assistanceType,
          urgency,
          specialty,
          facilityId,
          summary: summary.trim(),
          insuranceCarrier: insuranceCarrier.trim(),
          guaranteeLetter,
          preferredFrom: preferredFrom || undefined,
          preferredTo: preferredTo || undefined,
          shareDocuments,
          needs: {
            interpreter: needsInterpreter,
            interpreterLanguage: needsInterpreter ? interpreterLanguage : undefined,
            airportTransfer: needsAirportTransfer,
            ambulanceTransfer: needsAmbulanceTransfer,
            vipConcierge: needsVipConcierge,
            accommodation: needsAccommodation,
            halalFood: needsHalalFood,
          }
        })
      });

      const data = await resp.json();
      if (resp.ok && data.status === 'success') {
        setFormSuccessMessage({
          id: data.data.id,
          trackingCode: data.data.trackingCode,
        });
        if (!me) setGuest({ code: data.data.trackingCode, email: email.trim() });
        // Reset form
        setSummary('');
        setStep(1);
      } else {
        setFormError(data.message || 'Failed to submit enquiry. Please verify the information provided.');
      }
    } catch {
      setFormError('A network error occurred while submitting your medical enquiry.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Quotation Decision (Accept / Decline / Request Revision)
  const handleQuoteDecision = async (action: 'accept' | 'decline' | 'request_revision') => {
    if (!selectedCase || !selectedCase.latestQuote) return;
    setDecisionSubmitting(true);
    setActionError('');
    try {
      const resp = await fetch(`/api/assistance/cases/${selectedCase.id}/quote-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: selectedCase.latestQuote.id,
          action,
          notes: action === 'request_revision' ? revisionNotes : undefined,
          ...guestBody(),
        })
      });
      const data = await resp.json();
      if (resp.ok && data.status === 'success') {
        setSelectedCase(data.data);
        setShowRevisionModal(false);
        setShowAcceptConfirm(false);
        setRevisionNotes('');
        loadCases();
      } else {
        setActionError(data.message || 'Your answer could not be saved. Please try again.');
      }
    } catch {
      setActionError('Network error. Your answer was not saved. Please try again.');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  // Send Direct Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !replyMessage.trim()) return;
    setSendingMsg(true);
    try {
      const resp = await fetch(`/api/assistance/cases/${selectedCase.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyMessage.trim(), ...guestBody() })
      });
      if (resp.ok) {
        setReplyMessage('');
        // Refresh single case
        const refreshed = await fetch(withEmail(`/api/assistance/cases/${selectedCase.id}`)).then(r => r.json());
        if (refreshed.status === 'success') {
          setSelectedCase(refreshed.data);
        }
      }
    } catch {
      setActionError('The message was not sent. Please try again.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Fetch Pro-Forma Quotation Data for Printing
  const openProformaDocument = async (caseId: string) => {
    try {
      const resp = await fetch(withEmail(`/api/assistance/cases/${caseId}/proforma`));
      const data = await resp.json();
      if (resp.ok && data.status === 'success') {
        setProformaData(data.data);
        setShowProformaModal(true);
      } else {
        setActionError(data.message || 'There is no quotation document for this request yet.');
      }
    } catch {
      setActionError('The quotation document could not be loaded. Please try again.');
    }
  };

  // Track Guest Case Lookup
  const handleTrackCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    if (!trackCode.trim() || !trackEmail.trim()) {
      setTrackError('Please provide both your Tracking Code and the Contact Email used during submission.');
      return;
    }
    setTrackingLoading(true);
    try {
      const resp = await fetch(`/api/assistance/cases?trackingCode=${encodeURIComponent(trackCode.trim())}&email=${encodeURIComponent(trackEmail.trim())}`);
      const data = await resp.json();
      if (resp.ok && data.status === 'success' && data.data.length > 0) {
        setGuest({ code: trackCode.trim().toUpperCase(), email: trackEmail.trim() });
        setSelectedCase(data.data[0]);
        setActiveTab('cases');
      } else {
        setTrackError('No request matches that code and email. Check both and try again.');
      }
    } catch {
      setTrackError('An error occurred during lookup.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className={embedded ? "w-full text-slate-800" : "w-full bg-[color:var(--t-bg)] min-h-screen text-slate-800 pb-16"}>
      {/* Module Header */}
      {!embedded && (
        <DashboardHeader
          icon={HeartHandshake}
          eyebrow="Treatment quotes"
          title="Treatment quotes and assistance"
          description="Ask a hospital for an itemised quote, then accept it or ask for changes. Sending a request is free and does not commit you."
          tabs={[
            { id: 'enquiry', label: 'Request a quote', icon: FileText },
            { id: 'cases', label: 'My requests and quotes', icon: DollarSign },
            { id: 'guide', label: 'Travel guide', icon: Globe },
            ...(me ? [] : [{ id: 'track', label: 'Track a request', icon: Search }]),
          ]}
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t as any)}
        />
      )}

      <div className={embedded ? "space-y-6 pt-2" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>

        {/* ========================================================================= */}
        {/* TAB 1: REQUEST A TREATMENT QUOTE (three short steps) */}
        {/* ========================================================================= */}
        {activeTab === 'enquiry' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-[color:var(--t-200)] p-6 space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[color:var(--t-600)]" aria-hidden="true" />
                  Request a treatment quote
                </h2>
                <p className="text-xs text-slate-700 mt-1">
                  Tell a hospital what you need and it replies with an itemised quote. Sending this request is free and does not commit you.
                </p>
              </div>

              {formSuccessMessage && (
                <div role="status" className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-base">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
                    Request sent. Your reference is <span className="font-mono">{formSuccessMessage.trackingCode}</span>
                  </div>
                  <p>
                    The hospital will review it and add a quote to your request. {me ? 'You will find it under My requests and quotes.' : 'Keep this reference and the email you used: you need both to see your request later.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => { if (me) setOpenCaseId(formSuccessMessage.id); setActiveTab('cases'); }}
                    className="min-h-[44px] px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white font-bold text-xs cursor-pointer"
                  >
                    View my request
                  </button>
                </div>
              )}

              {formError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <ol aria-label="Steps" className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                {['About you', 'What you need', 'Extras and consent'].map((t, i) => (
                  <li key={t} aria-current={step === i + 1 ? 'step' : undefined} className={step === i + 1 ? 'font-extrabold text-[color:var(--t-700)]' : step > i + 1 ? 'font-semibold text-slate-800' : 'text-slate-700'}>
                    {i + 1}. {t}{step > i + 1 ? ' (done)' : ''}
                  </li>
                ))}
              </ol>

              <form ref={formRef} onSubmit={handleSubmitEnquiry} noValidate className="space-y-5">
                {/* STEP 1: who */}
                <div data-step="1" hidden={step !== 1} className="space-y-4">
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-bold text-slate-800 block">Where do you live? *</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'local_malaysian', title: 'Malaysian citizen', text: 'You hold a MyKad.', home: 'MY' },
                        { id: 'expat_resident', title: 'Living in Malaysia', text: 'Employment pass, MM2H, student or similar.', home: homeCountry === 'MY' ? 'GB' : homeCountry },
                        { id: 'international_traveler', title: 'Travelling to Malaysia', text: 'You would come to Malaysia for treatment.', home: homeCountry === 'MY' ? 'ID' : homeCountry },
                      ].map(o => (
                        <label key={o.id} className={`flex items-start gap-3 p-3 min-h-[44px] border cursor-pointer ${patientType === o.id ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)]' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                          <input type="radio" name="patientType" className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={patientType === o.id} onChange={() => { setPatientType(o.id as any); setHomeCountry(o.home); }} />
                          <span><span className="block text-xs font-bold text-slate-900">{o.title}</span><span className="block text-xs text-slate-700">{o.text}</span></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {patientType !== 'local_malaysian' && (
                    <div className="space-y-1 sm:max-w-xs">
                      <label htmlFor="aq-country" className="text-xs font-bold text-slate-800 block">Country you live in</label>
                      <select id="aq-country" value={homeCountry} onChange={(e) => setHomeCountry(e.target.value)} className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]">
                        {[['ID', 'Indonesia'], ['SG', 'Singapore'], ['CN', 'China'], ['IN', 'India'], ['AU', 'Australia'], ['GB', 'United Kingdom'], ['US', 'United States'], ['SA', 'Saudi Arabia'], ['AE', 'United Arab Emirates'], ['JP', 'Japan'], ['MY', 'Malaysia'], ['XX', 'Other']].map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label htmlFor="aq-name" className="text-xs font-bold text-slate-800 block">Full name *</label>
                    <input id="aq-name" type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Fatimah binti Ali" className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="aq-email" className="text-xs font-bold text-slate-800 block">Email *</label>
                      <input id="aq-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="aq-phone" className="text-xs font-bold text-slate-800 block">Phone or WhatsApp (helps the hospital reach you)</label>
                      <input id="aq-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+60 12-345 6789" className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]" />
                    </div>
                  </div>
                </div>

                {/* STEP 2: what */}
                <div data-step="2" hidden={step !== 2} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="aq-type" className="text-xs font-bold text-slate-800 block">What do you need? *</label>
                      <select id="aq-type" value={assistanceType} onChange={(e) => setAssistanceType(e.target.value)} className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]">
                        <option value="elective_surgery">A procedure and hospital stay</option>
                        <option value="specialist_consult">A specialist consultation or second opinion</option>
                        <option value="urgent_evacuation">Transfer between hospitals</option>
                        <option value="maternity_care">Maternity and delivery</option>
                        <option value="executive_screening">A full health screening</option>
                        <option value="oncology_workup">Cancer care</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="aq-specialty" className="text-xs font-bold text-slate-800 block">Medical specialty *</label>
                      <select id="aq-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]">
                        <option value="Cardiology & Interventional">Cardiology and heart surgery</option>
                        <option value="Orthopaedics & Joint Reconstruction">Orthopaedics (knee, hip, joints)</option>
                        <option value="Oncology & Surgical Oncology">Oncology and radiotherapy</option>
                        <option value="Obstetrics & Gynaecology">Obstetrics, gynaecology and IVF</option>
                        <option value="Neurology & Neurosurgery">Neurology and neurosurgery</option>
                        <option value="Gastroenterology & Bariatric">Gastroenterology and endoscopy</option>
                        <option value="Paediatrics & Neonatology">Paediatrics</option>
                        <option value="Executive Health Screening">Health screening</option>
                      </select>
                    </div>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-xs font-bold text-slate-800 block">How soon do you need a reply? *</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'routine', title: 'Routine', text: 'Within a few weeks' },
                        { id: 'priority', title: 'Soon', text: 'Within about a week' },
                        { id: 'urgent', title: 'Urgent', text: 'As soon as possible' },
                      ].map(o => (
                        <label key={o.id} className={`flex items-start gap-3 p-3 min-h-[44px] border cursor-pointer ${urgency === o.id ? (o.id === 'urgent' ? 'border-red-700 bg-red-50' : 'border-[color:var(--t-600)] bg-[color:var(--t-50)]') : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                          <input type="radio" name="urgency" className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={urgency === o.id} onChange={() => setUrgency(o.id as any)} />
                          <span><span className="block text-xs font-bold text-slate-900">{o.title}</span><span className="block text-xs text-slate-700">{o.text}</span></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {(urgency === 'urgent' || assistanceType === 'urgent_evacuation') && (
                    <div role="alert" className="p-4 bg-red-50 border-2 border-red-300 text-red-950 text-xs space-y-1">
                      <p className="font-extrabold flex items-center gap-2"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> If someone is in danger now, do not wait for this request.</p>
                      <p>Call <strong>999</strong> (Malaysia) or go to the nearest emergency department. This form is not an emergency service and may not be read straight away.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="aq-facility" className="text-xs font-bold text-slate-800 block">Hospital *</label>
                      {facilities.length <= 1 ? (
                        <p className={`min-h-[44px] flex items-center text-xs font-semibold ${facilities[0] ? 'text-slate-900' : 'text-rose-900'}`}>{facilities[0] ? `${facilities[0].name}${facilities[0].city ? `, ${facilities[0].city}` : ''}` : 'No hospital is available right now. Please try again later.'}</p>
                      ) : (
                        <select id="aq-facility" value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]">
                          {facilities.map(f => <option key={f.id} value={f.id}>{f.name}{f.city ? ` (${f.city})` : ''}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="aq-from" className="text-xs font-bold text-slate-800 block">Earliest date you could start</label>
                      <input id="aq-from" type="date" value={preferredFrom} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setPreferredFrom(e.target.value)} className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="aq-summary" className="text-xs font-bold text-slate-800 block">Describe your condition or the treatment you want *</label>
                    <textarea id="aq-summary" rows={5} required minLength={15} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Symptoms, any diagnosis you have been given, past operations, the procedure you are asking about…" className="w-full px-3 py-2 border border-slate-300 text-xs bg-white leading-relaxed focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]" />
                    <p className="text-xs text-slate-700">At least 15 characters. Do not put passport, card or bank numbers here. You can share reports later in Messages.</p>
                  </div>
                </div>

                {/* STEP 3: extras and consent */}
                <div data-step="3" hidden={step !== 3} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="aq-insurer" className="text-xs font-bold text-slate-800 block">Insurance provider (optional)</label>
                      <input id="aq-insurer" type="text" value={insuranceCarrier} onChange={(e) => setInsuranceCarrier(e.target.value)} placeholder="e.g. Great Eastern, Bupa, Cigna, Allianz" className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]" />
                    </div>
                    <label className="flex items-center gap-3 min-h-[44px] sm:mt-7 px-3 border border-slate-300 bg-white cursor-pointer text-xs font-semibold text-slate-900">
                      <input type="checkbox" checked={guaranteeLetter} onChange={(e) => setGuaranteeLetter(e.target.checked)} className="h-5 w-5 shrink-0 accent-[color:var(--t-600)]" />
                      Ask the hospital about a guarantee letter from my insurer
                    </label>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-xs font-bold text-slate-800 block">Help you would like arranged (optional)</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { label: 'A medical interpreter', v: needsInterpreter, set: setNeedsInterpreter },
                        { label: 'Airport pickup', v: needsAirportTransfer, set: setNeedsAirportTransfer },
                        { label: 'Ambulance between hospitals', v: needsAmbulanceTransfer, set: setNeedsAmbulanceTransfer },
                        { label: 'A private suite', v: needsVipConcierge, set: setNeedsVipConcierge },
                        { label: 'A hotel for family', v: needsAccommodation, set: setNeedsAccommodation },
                        { label: 'Halal meals', v: needsHalalFood, set: setNeedsHalalFood },
                      ].map(o => (
                        <label key={o.label} className="flex items-center gap-3 min-h-[44px] px-3 border border-slate-300 bg-white cursor-pointer text-xs font-semibold text-slate-900">
                          <input type="checkbox" checked={o.v} onChange={(e) => o.set(e.target.checked)} className="h-5 w-5 shrink-0 accent-[color:var(--t-600)]" />
                          {o.label}
                        </label>
                      ))}
                    </div>
                    {needsInterpreter && (
                      <div className="space-y-1 sm:max-w-xs">
                        <label htmlFor="aq-lang" className="text-xs font-bold text-slate-800 block">Language</label>
                        <select id="aq-lang" value={interpreterLanguage} onChange={(e) => setInterpreterLanguage(e.target.value)} className="w-full px-3 min-h-[44px] border border-slate-300 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]">
                          <option value="Arabic">Arabic</option>
                          <option value="Mandarin">Mandarin</option>
                          <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                          <option value="Japanese">Japanese</option>
                          <option value="Russian">Russian</option>
                          <option value="French">French</option>
                        </select>
                      </div>
                    )}
                  </fieldset>

                  <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-800">
                    <input type="checkbox" required checked={shareDocuments} onChange={(e) => setShareDocuments(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--t-600)]" />
                    <span>I agree that MedCred and the hospital I chose may read what I have written here, only to assess my request and prepare a quote (Personal Data Protection Act 2010). *</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <button type="button" onClick={goBack} disabled={step === 1} className="min-h-[44px] px-5 border border-slate-300 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    Back
                  </button>
                  {step < 3 ? (
                    <button type="button" onClick={goNext} className="min-h-[44px] px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer">
                      Next
                    </button>
                  ) : (
                    <button type="submit" disabled={formSubmitting} className="min-h-[44px] px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer flex items-center gap-2 disabled:opacity-60">
                      {formSubmitting ? (<><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…</>) : (<><Send className="h-4 w-4" aria-hidden="true" /> Send request</>)}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[color:var(--t-600)]" aria-hidden="true" />
                  What happens next
                </h3>
                <ol className="space-y-3 text-xs text-slate-800 list-decimal ml-5">
                  <li><strong>The hospital reads your request.</strong> Reply times differ between hospitals.</li>
                  <li><strong>You get an itemised quote</strong> with what is included, what is not, and how long the price is valid.</li>
                  <li><strong>You decide.</strong> Accept it, ask for changes, or ask questions. Accepting does not charge you.</li>
                  <li><strong>The hospital arranges the details</strong> with you: dates, transfers and any insurer guarantee letter.</li>
                </ol>
              </div>

              <div role="note" className="bg-red-50 border border-red-200 p-4 text-xs text-red-950 space-y-1">
                <p className="font-extrabold">In an emergency, call 999.</p>
                <p>This service is for planned and urgent-but-stable care. It is not an emergency line.</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY REQUESTS AND QUOTES */}
        {/* ========================================================================= */}
        {activeTab === 'cases' && meLoaded && me && (
          <MyCases openId={openCaseId} onOpen={setOpenCaseId} onFind={() => setActiveTab('enquiry')} />
        )}

        {activeTab === 'cases' && meLoaded && !me && (
          <div className="space-y-4">
          {cases.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label htmlFor="currency-select" className="font-bold text-slate-800">Show prices in</label>
              <select
                id="currency-select"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="border border-slate-300 bg-white text-xs font-semibold px-3 min-h-[44px] cursor-pointer focus:outline-none focus:border-[color:var(--t-600)]"
              >
                {Object.entries(CURRENCY_RATES).map(([code, item]) => (
                  <option key={code} value={code}>{code} - {item.label}</option>
                ))}
              </select>
              <span className="text-xs text-slate-700">Other currencies are a rough guide only. The hospital bills in ringgit (RM).</span>
            </div>
          )}
          {actionError && <p role="alert" className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs">{actionError}</p>}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Cases List */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Active Cases ({cases.length})
                </span>
                <button
                  type="button"
                  onClick={loadCases}
                  className="text-xs text-[color:var(--t-600)] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>

              {loadingCases && (
                <div className="p-8 text-center text-xs text-slate-400">Loading cases…</div>
              )}

              {!loadingCases && cases.length === 0 && (
                <div className="bg-white border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 space-y-2">
                  <FileText className="h-8 w-8 text-slate-600 mx-auto" aria-hidden="true" />
                  <p className="text-sm font-bold text-slate-900">You have no requests yet.</p>
                  <p className="text-xs text-slate-700">{me ? 'Ask a hospital for a quote and it will appear here.' : 'If you already sent a request, use "Track a request" with your reference and email.'}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('enquiry')}
                    className="mt-2 min-h-[44px] px-4 bg-[color:var(--t-600)] text-white text-xs font-bold cursor-pointer"
                  >
                    Request a quote
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {cases.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
                  const st = STATUS_DISPLAY[c.status] || STATUS_DISPLAY.enquiry;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className={`p-3.5 border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[color:var(--t-600)] bg-white shadow-sm ring-1 ring-[color:var(--t-600)]'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-black text-slate-900">{c.trackingCode}</span>
                            <span className="text-2xs uppercase font-extrabold px-1.5 py-0.2 bg-slate-100 text-slate-700">
                              {c.patientType === 'local_malaysian' ? '🇲🇾 Local' : c.patientType === 'expat_resident' ? '🌏 Expat' : '✈️ Int’l'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{c.summary}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-2xs font-black uppercase border shrink-0 ${st.bg} ${st.color} ${st.border}`}>
                          {st.label}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>{c.facility?.name || 'Accredited Facility'}</span>
                        {c.latestQuote && (
                          <span className="font-mono font-black text-emerald-800">
                            {formatCur(c.latestQuote.total)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Case & Quotation Detail */}
            <div className="lg:col-span-7">
              {selectedCase ? (
                <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-5">
                  {/* Case Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-slate-900 tracking-tight">
                          Case {selectedCase.trackingCode}
                        </span>
                        <span className={`px-2 py-0.5 text-2xs font-black uppercase border ${
                          STATUS_DISPLAY[selectedCase.status]?.bg || 'bg-slate-50'
                        } ${STATUS_DISPLAY[selectedCase.status]?.color || 'text-slate-700'} ${
                          STATUS_DISPLAY[selectedCase.status]?.border || 'border-slate-300'
                        }`}>
                          {STATUS_DISPLAY[selectedCase.status]?.label || selectedCase.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Patient: <strong>{selectedCase.patientName}</strong> · Origin: {selectedCase.homeCountry} · Created {new Date(selectedCase.createdAt).toLocaleDateString('en-MY')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedCase.latestQuote && (
                        <button
                          type="button"
                          onClick={() => openProformaDocument(selectedCase.id)}
                          className="px-3 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Official Pro-Forma Quote
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Case Navigation Tabs */}
                  <div className="flex items-center gap-1 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveCaseTab('quotation')}
                      className={`px-3 py-2 text-xs font-bold uppercase cursor-pointer border-b-2 ${
                        activeCaseTab === 'quotation'
                          ? 'border-[color:var(--t-600)] text-[color:var(--t-600)]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Treatment Quotation ({selectedCase.quotes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCaseTab('itinerary')}
                      className={`px-3 py-2 text-xs font-bold uppercase cursor-pointer border-b-2 ${
                        activeCaseTab === 'itinerary'
                          ? 'border-[color:var(--t-600)] text-[color:var(--t-600)]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Assistance Itinerary ({selectedCase.itinerary.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCaseTab('messages')}
                      className={`px-3 py-2 text-xs font-bold uppercase cursor-pointer border-b-2 ${
                        activeCaseTab === 'messages'
                          ? 'border-[color:var(--t-600)] text-[color:var(--t-600)]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Care Coordination Chat ({selectedCase.messages.length})
                    </button>
                  </div>

                  {/* 1. Quotation Card */}
                  {activeCaseTab === 'quotation' && (
                    <div className="space-y-4">
                      {selectedCase.latestQuote ? (
                        <div className="border border-slate-200 bg-white">
                          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                                Quotation Version v{selectedCase.latestQuote.version}
                              </span>
                              <span className="text-xs text-slate-500 ml-2">
                                Valid until {selectedCase.latestQuote.validUntil}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-500">Estimated Total:</span>
                              <span className="text-base font-black font-mono text-emerald-800 ml-2">
                                {formatCur(selectedCase.latestQuote.total)}
                              </span>
                              {selectedCurrency !== 'MYR' && (
                                <span className="block text-xs text-slate-400 font-mono">
                                  Base: RM {selectedCase.latestQuote.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Itemized Table */}
                          <div className="p-4 overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
                                  <th className="py-2 font-bold">Category</th>
                                  <th className="py-2 font-bold">Clinical Service Description</th>
                                  <th className="py-2 font-bold text-right">Price ({selectedCurrency})</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selectedCase.latestQuote.items.map((it, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-2 font-bold text-slate-600">
                                      {CATEGORY_NAMES[it.category] || it.category}
                                    </td>
                                    <td className="py-2 text-slate-800 font-medium">
                                      {it.label}
                                    </td>
                                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                                      {formatCur(it.amountSen / 100)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-slate-200">
                                  <td colSpan={2} className="pt-2 text-right font-bold text-slate-600">
                                    Subtotal:
                                  </td>
                                  <td className="pt-2 text-right font-mono font-bold text-slate-900">
                                    {formatCur(selectedCase.latestQuote.subtotal)}
                                  </td>
                                </tr>
                                {selectedCase.latestQuote.tax > 0 && (
                                  <tr>
                                    <td colSpan={2} className="py-1 text-right text-slate-500 text-xs">
                                      Healthcare Service Tax ({selectedCase.latestQuote.taxRatePct}% SST):
                                    </td>
                                    <td className="py-1 text-right font-mono text-slate-600 text-xs">
                                      {formatCur(selectedCase.latestQuote.tax)}
                                    </td>
                                  </tr>
                                )}
                                <tr>
                                  <td colSpan={2} className="pt-2 text-right text-xs font-black text-slate-900">
                                    Grand Total:
                                  </td>
                                  <td className="pt-2 text-right text-xs font-black font-mono text-emerald-800">
                                    {formatCur(selectedCase.latestQuote.total)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Terms & Inclusions */}
                          <div className="p-4 bg-slate-50/60 border-t border-slate-200 text-xs space-y-2">
                            {selectedCase.latestQuote.inclusions && (
                              <p className="text-slate-700">
                                <strong className="text-slate-900">What is Included:</strong> {selectedCase.latestQuote.inclusions}
                              </p>
                            )}
                            <p className="text-slate-700">
                              <strong className="text-slate-900">What is Excluded:</strong> {selectedCase.latestQuote.exclusions}
                            </p>
                            <p className="text-slate-700">
                              <strong className="text-slate-900">Cancellation Terms:</strong> {selectedCase.latestQuote.cancellationTerms}
                            </p>
                            {selectedCase.latestQuote.paymentTerms && (
                              <p className="text-slate-700">
                                <strong className="text-slate-900">Payment & Settlement:</strong> {selectedCase.latestQuote.paymentTerms}
                              </p>
                            )}
                          </div>

                          {/* Quotation Action Buttons */}
                          {selectedCase.status === 'quoted' && (
                            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                              <span className="text-xs text-slate-700">
                                The hospital is waiting for your answer.
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowRevisionModal(true)}
                                  className="px-3 min-h-[44px] border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer"
                                >
                                  Ask for changes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setActionError(''); setShowAcceptConfirm(true); }}
                                  disabled={decisionSubmitting}
                                  className="px-4 min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                                >
                                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                  Accept this quote
                                </button>
                              </div>
                            </div>
                          )}

                          {selectedCase.status === 'accepted' && (
                            <div className="p-3 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              You accepted this quote. The hospital will contact you to arrange the details.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-2">
                          <Clock className="h-6 w-6 text-slate-400 mx-auto" />
                          <p className="text-sm font-bold text-slate-700">Quotation formulation in progress.</p>
                          <p>The facility clinical team is reviewing your intake notes. Once ready, an itemized quote will appear here.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Itinerary Card */}
                  {activeCaseTab === 'itinerary' && (
                    <div className="space-y-3">
                      {selectedCase.itinerary.length === 0 ? (
                        <div className="p-8 bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-1">
                          <Calendar className="h-6 w-6 text-slate-400 mx-auto" />
                          <p className="text-sm font-bold text-slate-700">No scheduled itinerary items yet.</p>
                          <p>The hospital coordinator will schedule your admission, consultations, and discharge timeline upon quotation confirmation.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 border border-slate-200">
                          {selectedCase.itinerary.map((it) => (
                            <div key={it.id} className="p-3 flex items-start gap-3 bg-white">
                              <div className="p-2 bg-[color:var(--t-50)] text-[color:var(--t-700)] font-black text-xs font-mono shrink-0">
                                {it.date}
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-slate-900">{it.title}</span>
                                <span className="ml-2 text-2xs font-extrabold uppercase px-1.5 py-0.2 bg-slate-100 text-slate-600">
                                  {it.kind}
                                </span>
                                {it.note && <p className="text-xs text-slate-600">{it.note}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Care Coordination Chat */}
                  {activeCaseTab === 'messages' && (
                    <div className="space-y-3">
                      <div className="border border-slate-200 bg-slate-50 p-3 h-72 overflow-y-auto space-y-2.5">
                        {selectedCase.messages.map((m) => {
                          const isSystem = m.senderId === 'system';
                          return (
                            <div
                              key={m.id}
                              className={`p-2.5 text-xs max-w-lg ${
                                isSystem
                                  ? 'bg-amber-50 border border-amber-200 text-amber-900 mx-auto text-center'
                                  : m.senderId.startsWith('usr-')
                                  ? 'bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-slate-800 ml-auto'
                                  : 'bg-white border border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1 font-semibold">
                                <span>{m.senderName || m.senderId}</span>
                                <span>{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Box */}
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message to the hospital medical assistance desk..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          className="flex-1 border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                        />
                        <button
                          type="submit"
                          disabled={sendingMsg}
                          className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold uppercase cursor-pointer"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : cases.length > 0 ? (
                <div className="p-12 bg-white border border-dashed border-slate-300 text-center text-xs text-slate-700">
                  Choose a request from the list to see its quote, itinerary and messages.
                </div>
              ) : null}
            </div>
          </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EXPAT & INTERNATIONAL CARE GUIDE */}
        {/* ========================================================================= */}
        {activeTab === 'guide' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Plane className="h-4 w-4 text-[color:var(--t-600)]" />
                Medical Travel Visa & MHTC
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                International healthcare travelers visiting Malaysia can access dedicated Medical e-Visas through the Malaysia Healthcare Travel Council (MHTC). MHTC member hospitals issue formal medical endorsement letters facilitating entry passes for patients and companions.
              </p>
              <div className="text-xs text-slate-700 space-y-1 bg-slate-50 p-3 border border-slate-200">
                <p>✓ Fast-track medical immigration counter at KLIA</p>
                <p>✓ Airport lounge and ambulance gate transfer</p>
                <p>✓ Extension support for prolonged hospital recovery</p>
              </div>
            </div>

            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[color:var(--t-600)]" />
                Letter of Guarantee (LOG) & Insurance
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Most Malaysian private medical centres support direct cashless billing via Letters of Guarantee (LOG) from major international insurers (Cigna, Bupa Global, Allianz Worldwide, Aetna International, Prudential, AIA, Great Eastern).
              </p>
              <div className="text-xs text-slate-700 space-y-1 bg-slate-50 p-3 border border-slate-200">
                <p>✓ 0% SST on healthcare services for Malaysian citizens</p>
                <p>✓ Pre-authorization submission within 24-48 hours</p>
                <p>✓ Multi-currency settlement (MYR, USD, SGD, EUR)</p>
              </div>
            </div>

            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Ambulance className="h-4 w-4 text-[color:var(--t-600)]" />
                Medical Evacuation & Fit-to-Fly
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                For high-acuity patients, accredited air and ground ambulance services operate between regional airports (KLIA, Subang, Penang) and hospital intensive care suites with specialized flight physicians.
              </p>
              <div className="text-xs text-slate-700 space-y-1 bg-slate-50 p-3 border border-slate-200">
                <p>✓ Fit-to-fly assessment certificates issued before departure</p>
                <p>✓ Discharge summaries formatted for home country GP</p>
                <p>✓ 24/7 ICU & Cath Lab emergency preparedness</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TRACK GUEST INQUIRY */}
        {/* ========================================================================= */}
        {activeTab === 'track' && (
          <div className="max-w-xl mx-auto bg-white border border-[color:var(--t-200)] p-6 space-y-4">
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Search className="h-4 w-4 text-[color:var(--t-600)]" />
                Track Medical Assistance Inquiry
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                If you sent a request without signing in, enter your reference (for example <code>MED-MY-AB12CD34</code>) and contact email to view your itemized quotation and updates.
              </p>
            </div>

            {trackError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            <form onSubmit={handleTrackCase} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MED-MY-AB12CD34"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  className="w-full border border-slate-300 px-3 min-h-[44px] text-xs font-mono uppercase bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Email used on the request *
                </label>
                <input
                  type="email"
                  required
                  placeholder="The email you used during enquiry submission"
                  value={trackEmail}
                  onChange={(e) => setTrackEmail(e.target.value)}
                  className="w-full border border-slate-300 px-3 min-h-[44px] text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <button
                type="submit"
                disabled={trackingLoading}
                className="w-full min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {trackingLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Find my request
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PRO-FORMA QUOTATION (PRINTABLE) */}
      {/* ========================================================================= */}
      {showProformaModal && proformaData && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 shadow-2xl">
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Official Pro-Forma Medical Document Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowProformaModal(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {proformaData.facility.name}
                </h1>
                {proformaData.facility.address && <p className="text-xs text-slate-700 mt-0.5">{proformaData.facility.address}</p>}
                <p className="text-xs text-slate-700">
                  {[proformaData.facility.licenceNo && `Licence: ${proformaData.facility.licenceNo}`, proformaData.facility.phone && `Tel: ${proformaData.facility.phone}`].filter(Boolean).join(' · ')}
                </p>
                {proformaData.facility.mhtcMember && (
                  <span className="inline-block mt-1 text-2xs font-black uppercase px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-300">
                    Malaysia Healthcare Travel Council (MHTC) Endorsed
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-400 block">
                  {proformaData.referenceNumber}
                </span>
                <span className="text-xs text-slate-600 block mt-1">
                  Issue Date: <strong>{proformaData.issueDate}</strong>
                </span>
                <span className="text-xs text-slate-600 block">
                  Valid Until: <strong>{proformaData.validUntil}</strong>
                </span>
              </div>
            </div>

            <div className="border-t-2 border-slate-900 pt-3">
              <h2 className="text-center font-black text-base uppercase tracking-wider text-slate-900">
                {proformaData.documentTitle}
              </h2>
            </div>

            {/* Patient & Clinical Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 border border-slate-200">
              <div>
                <span className="text-xs font-black uppercase text-slate-400 block">Patient Information</span>
                <p className="font-bold text-slate-900 mt-1">{proformaData.patient.name}</p>
                <p className="text-slate-600">Nationality: {proformaData.patient.nationality}</p>
                <p className="text-slate-600">Insurance / Settlement: {proformaData.patient.insuranceCarrier}</p>
              </div>
              <div>
                <span className="text-xs font-black uppercase text-slate-400 block">Clinical Overview</span>
                <p className="font-bold text-slate-900 mt-1">Specialty: {proformaData.clinicalDetails.specialty}</p>
                <p className="text-slate-600 line-clamp-2">{proformaData.clinicalDetails.clinicalSummary}</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="p-2.5 font-bold">Item Description</th>
                    <th className="p-2.5 font-bold">Category</th>
                    <th className="p-2.5 font-bold text-right">Amount (MYR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proformaData.items.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-medium text-slate-900">{it.label}</td>
                      <td className="p-2.5 text-slate-600">{CATEGORY_NAMES[it.category] || it.category}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        RM {(it.amountSen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right">Subtotal:</td>
                    <td className="p-2.5 text-right font-mono">
                      RM {proformaData.subtotalMYR.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {proformaData.taxMYR > 0 && (
                    <tr>
                      <td colSpan={2} className="p-1.5 text-right text-xs text-slate-600">
                        Service Tax ({proformaData.taxRatePct}% SST):
                      </td>
                      <td className="p-1.5 text-right font-mono text-xs">
                        RM {proformaData.taxMYR.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-300 text-xs font-black text-slate-900">
                    <td colSpan={2} className="p-2.5 text-right">TOTAL PAYABLE:</td>
                    <td className="p-2.5 text-right font-mono text-emerald-800">
                      RM {proformaData.totalMYR.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Terms and Exclusions */}
            <div className="text-xs text-slate-600 space-y-1.5 border-t border-slate-200 pt-3">
              <p><strong>Inclusions:</strong> {proformaData.inclusions}</p>
              <p><strong>Exclusions:</strong> {proformaData.exclusions}</p>
              <p><strong>Cancellation:</strong> {proformaData.cancellationTerms}</p>
              <p><strong>Payment Guidelines:</strong> {proformaData.paymentTerms}</p>
            </div>

            <div className="pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
              {proformaData.regulatoryNotice}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM ACCEPTING A QUOTE */}
      {/* ========================================================================= */}
      {showAcceptConfirm && selectedCase?.latestQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="accept-title">
          <div className="bg-white border border-slate-300 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 id="accept-title" className="font-extrabold text-lg text-slate-900">Accept this quote?</h3>
            <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-slate-700">Hospital</dt><dd className="font-bold text-slate-900">{selectedCase.facility?.name || 'The hospital'}</dd>
              <dt className="text-slate-700">Total</dt><dd className="font-extrabold text-slate-900 tabular-nums">RM {selectedCase.latestQuote.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}{selectedCurrency !== 'MYR' ? ` (about ${formatCur(selectedCase.latestQuote.total)})` : ''}</dd>
              {selectedCase.latestQuote.validUntil && <><dt className="text-slate-700">Valid until</dt><dd className="font-bold text-slate-900">{new Date(selectedCase.latestQuote.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></>}
            </dl>
            <p className="text-xs text-slate-800">
              Accepting tells the hospital you want to go ahead at this price. <strong>It does not charge you.</strong> The hospital will contact you about dates and how to pay. Check what is not included and the cancellation terms first.
            </p>
            {actionError && <p role="alert" className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs">{actionError}</p>}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAcceptConfirm(false)} className="min-h-[44px] px-4 border border-slate-300 text-slate-800 text-xs font-bold cursor-pointer">Not yet</button>
              <button type="button" disabled={decisionSubmitting} onClick={() => handleQuoteDecision('accept')} className="min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer disabled:opacity-60">
                {decisionSubmitting ? 'Saving…' : 'Yes, accept this quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REQUEST QUOTATION REVISION / NEGOTIATE */}
      {/* ========================================================================= */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-slate-900">
                Ask for changes to this quote
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowRevisionModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-800">
              Say what you would like changed, for example a different room type or a different date.
            </p>
            {actionError && <p role="alert" className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs">{actionError}</p>}

            <textarea
              rows={4}
              required
              placeholder="e.g. Please revise room category from VIP Suite to Standard Single Room, and adjust target admission to the third week of November."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={decisionSubmitting || !revisionNotes.trim()}
                onClick={() => handleQuoteDecision('request_revision')}
                className="px-4 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold uppercase cursor-pointer"
              >
                {decisionSubmitting ? 'Sending…' : 'Send request for changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
