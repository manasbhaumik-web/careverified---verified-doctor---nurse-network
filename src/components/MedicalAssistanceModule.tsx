import React, { useState, useEffect, useCallback } from 'react';
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
    licenceNo?: string;
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
  MYR: { rate: 1, symbol: 'RM', label: 'Ringgit Malaysia (Base)' },
  USD: { rate: 0.23, symbol: '$', label: 'US Dollar (~0.23)' },
  SGD: { rate: 0.31, symbol: 'S$', label: 'Singapore Dollar (~0.31)' },
  EUR: { rate: 0.21, symbol: '€', label: 'Euro (~0.21)' },
  IDR: { rate: 3550, symbol: 'Rp', label: 'Indonesian Rupiah (~3,550)' },
  GBP: { rate: 0.18, symbol: '£', label: 'British Pound (~0.18)' },
  AUD: { rate: 0.35, symbol: 'A$', label: 'Australian Dollar (~0.35)' },
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
  enquiry: { label: 'Enquiry Received', color: 'text-amber-800', border: 'border-amber-300', bg: 'bg-amber-50' },
  triage: { label: 'Clinical Triage', color: 'text-blue-800', border: 'border-blue-300', bg: 'bg-blue-50' },
  quoted: { label: 'Quotation Ready', color: 'text-sky-800', border: 'border-sky-300', bg: 'bg-sky-50' },
  accepted: { label: 'Quote Accepted', color: 'text-emerald-800', border: 'border-emerald-300', bg: 'bg-emerald-50' },
  in_treatment: { label: 'In-Treatment / Active Assistance', color: 'text-purple-800', border: 'border-purple-300', bg: 'bg-purple-50' },
  completed: { label: 'Discharged & Completed', color: 'text-slate-800', border: 'border-slate-300', bg: 'bg-slate-100' },
  closed: { label: 'Closed', color: 'text-slate-500', border: 'border-slate-200', bg: 'bg-slate-50' },
};

export default function MedicalAssistanceModule() {
  const [activeTab, setActiveTab] = useState<'enquiry' | 'cases' | 'guide' | 'track'>('enquiry');
  const [selectedCurrency, setSelectedCurrency] = useState('MYR');

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
    fetch('/api/assistance/cases')
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
  }, [selectedCase]);

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

  // Submit New Medical Enquiry
  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccessMessage(null);

    if (summary.trim().length < 15) {
      setFormError('Please describe the clinical condition or requested medical treatment in at least 15 characters.');
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
        // Reset form
        setSummary('');
        loadCases();
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
    try {
      const resp = await fetch(`/api/assistance/cases/${selectedCase.id}/quote-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: selectedCase.latestQuote.id,
          action,
          notes: action === 'request_revision' ? revisionNotes : undefined,
        })
      });
      const data = await resp.json();
      if (resp.ok && data.status === 'success') {
        setSelectedCase(data.data);
        setShowRevisionModal(false);
        setRevisionNotes('');
        loadCases();
      } else {
        alert(data.message || 'Could not update quote status.');
      }
    } catch {
      alert('Network error while processing quotation response.');
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
        body: JSON.stringify({ text: replyMessage.trim() })
      });
      if (resp.ok) {
        setReplyMessage('');
        // Refresh single case
        const refreshed = await fetch(`/api/assistance/cases/${selectedCase.id}`).then(r => r.json());
        if (refreshed.status === 'success') {
          setSelectedCase(refreshed.data);
        }
      }
    } catch {
      alert('Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Fetch Pro-Forma Quotation Data for Printing
  const openProformaDocument = async (caseId: string) => {
    try {
      const resp = await fetch(`/api/assistance/cases/${caseId}/proforma`);
      const data = await resp.json();
      if (resp.ok && data.status === 'success') {
        setProformaData(data.data);
        setShowProformaModal(true);
      } else {
        alert(data.message || 'Quotation pro-forma is not yet generated for this case.');
      }
    } catch {
      alert('Unable to load official quotation document.');
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
        setSelectedCase(data.data[0]);
        setActiveTab('cases');
      } else {
        setTrackError('No active case found matching that Tracking Code and Email address. Please verify your details.');
      }
    } catch {
      setTrackError('An error occurred during lookup.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="w-full bg-[color:var(--t-bg)] min-h-screen text-slate-800 pb-16">
      {/* Module Header */}
      <DashboardHeader
        icon={HeartHandshake}
        eyebrow="Clinical Logistics & Cross-Border Care"
        title="Patient Enquiries, Assistance & Treatment Quotations"
        description="Comprehensive clinical intake, itemized surgical & hospital quotations, and logistical assistance coordination for local Malaysian citizens, resident expatriates, and MHTC international medical travelers."
        tabs={[
          { id: 'enquiry', label: 'Request Treatment Quote', icon: FileText },
          { id: 'cases', label: `My Inquiries & Quotes (${cases.length})`, icon: DollarSign },
          { id: 'guide', label: 'Expat & Travel Care Guide', icon: Globe },
          { id: 'track', label: 'Track Guest Inquiry', icon: Search },
        ]}
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as any)}
      />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Global Currency & Fast Info Bar */}
        <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-[color:var(--t-600)]" />
              Accredited Care Standards:
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
              Act 586 Licensed
            </span>
            <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-300 font-bold">
              MHTC Medical Travel Partner
            </span>
            <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-300 font-bold">
              JCI & MSQH Verified
            </span>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 font-bold">
              Panel LOG Direct Billing
            </span>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="currency-select" className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              Currency View:
            </label>
            <select
              id="currency-select"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="border border-[color:var(--t-200)] bg-white text-xs font-mono font-bold py-1 px-2.5 rounded-none cursor-pointer focus:outline-none focus:border-[color:var(--t-600)]"
            >
              {Object.entries(CURRENCY_RATES).map(([code, item]) => (
                <option key={code} value={code}>
                  {code} - {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SUBMIT MEDICAL ENQUIRY & REQUEST QUOTATION */}
        {/* ========================================================================= */}
        {activeTab === 'enquiry' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-[color:var(--t-200)] p-6 space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[color:var(--t-600)]" />
                  Clinical Intake & Treatment Quotation Request
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Complete this form to receive an official itemized treatment quotation, consultant schedule, and customized clinical assistance plan from accredited Malaysian private hospitals.
                </p>
              </div>

              {formSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    Enquiry Registered Successfully! Reference: {formSuccessMessage.trackingCode}
                  </div>
                  <p className="leading-relaxed">
                    Our hospital clinical coordination desk has received your request. An itemized treatment quotation will be prepared and linked to your case reference.
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('cases')}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase cursor-pointer"
                    >
                      View in My Inquiries & Quotes →
                    </button>
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitEnquiry} className="space-y-6">
                {/* 1. Patient Classification */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    1. Patient Origin & Legal Residency Status *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => { setPatientType('local_malaysian'); setHomeCountry('MY'); }}
                      className={`p-3 text-left border cursor-pointer transition-all ${
                        patientType === 'local_malaysian'
                          ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)] text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <span>🇲🇾</span> Local Malaysian Citizen
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        MyKad ID holder. 0% SST on healthcare, domestic insurance panel & Medisave.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setPatientType('expat_resident'); if (homeCountry === 'MY') setHomeCountry('GB'); }}
                      className={`p-3 text-left border cursor-pointer transition-all ${
                        patientType === 'expat_resident'
                          ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)] text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <span>🌏</span> Expatriate Resident
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Employment Pass, MM2H, Diplomat or Student residing in Malaysia.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setPatientType('international_traveler'); if (homeCountry === 'MY') setHomeCountry('ID'); }}
                      className={`p-3 text-left border cursor-pointer transition-all ${
                        patientType === 'international_traveler'
                          ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)] text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <span>✈️</span> International Traveler
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Traveling to Malaysia for medical care. MHTC visa & airport support eligible.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Assistance Category & Urgency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      2. Care Category *
                    </label>
                    <select
                      value={assistanceType}
                      onChange={(e) => setAssistanceType(e.target.value)}
                      className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    >
                      <option value="elective_surgery">Surgical Procedure & Hospital Stay</option>
                      <option value="specialist_consult">Specialist Consultation & Second Opinion</option>
                      <option value="urgent_evacuation">Urgent Medical Evacuation & Inter-Hospital Transfer</option>
                      <option value="maternity_care">Maternity & Delivery for Expat Families</option>
                      <option value="executive_screening">Executive Full-Body Health Screening</option>
                      <option value="oncology_workup">Oncology & Advanced Cancer Care</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Urgency / Triage Priority *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setUrgency('routine')}
                        className={`p-2 text-center text-xs font-bold uppercase cursor-pointer border ${
                          urgency === 'routine' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Routine (2-4 wks)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrgency('priority')}
                        className={`p-2 text-center text-xs font-bold uppercase cursor-pointer border ${
                          urgency === 'priority' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Priority (3-7 days)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrgency('urgent')}
                        className={`p-2 text-center text-xs font-bold uppercase cursor-pointer border ${
                          urgency === 'urgent' ? 'bg-red-700 text-white border-red-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Urgent (&lt;48 hrs)
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Specialty & Target Facility */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Medical Specialty *
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    >
                      <option value="Cardiology & Interventional">Cardiology & Cardiothoracic Surgery</option>
                      <option value="Orthopaedics & Joint Reconstruction">Orthopaedics & Robotic Knee/Hip</option>
                      <option value="Oncology & Surgical Oncology">Oncology, Radiotherapy & CyberKnife</option>
                      <option value="Obstetrics & Gynaecology">Obstetrics, Gynaecology & IVF</option>
                      <option value="Neurology & Neurosurgery">Neurology & Minimally Invasive Neurosurgery</option>
                      <option value="Gastroenterology & Bariatric">Gastroenterology, Hepatology & Endoscopy</option>
                      <option value="Paediatrics & Neonatology">Paediatrics & Paediatric Surgery</option>
                      <option value="Executive Health Screening">Executive Screening & Preventative Health</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Preferred Licensed Facility *
                    </label>
                    <select
                      value={facilityId}
                      onChange={(e) => setFacilityId(e.target.value)}
                      className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    >
                      {facilities.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name} {f.city ? `(${f.city})` : ''} {f.mhtcMember ? '★ MHTC' : ''}
                        </option>
                      ))}
                      {facilities.length === 0 && (
                        <option value="fac-demo-1">Demo Specialist Hospital (Kuala Lumpur)</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* 4. Patient Identity & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe / Fatimah Ali"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="patient@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      placeholder="+60-12-345-6789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>
                </div>

                {/* 5. Dates & Insurance */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Preferred Admission / Start
                    </label>
                    <input
                      type="date"
                      value={preferredFrom}
                      onChange={(e) => setPreferredFrom(e.target.value)}
                      className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Insurance Provider / Panel
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Great Eastern, Bupa, Cigna, Allianz"
                      value={insuranceCarrier}
                      onChange={(e) => setInsuranceCarrier(e.target.value)}
                      className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2 border border-slate-200 bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={guaranteeLetter}
                        onChange={(e) => setGuaranteeLetter(e.target.checked)}
                        className="rounded-none text-[color:var(--t-600)]"
                      />
                      Request Insurance Guarantee Letter (LOG) Coordination
                    </label>
                  </div>
                </div>

                {/* 6. Clinical Description */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Clinical Summary & Medical Background *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe symptoms, primary diagnosis, past surgical history, requested procedures, or attach current medical scans..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full border border-slate-300 p-2.5 text-xs bg-white leading-relaxed focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                {/* 7. Specialized Assistance Services */}
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Specialized Medical Assistance Services Requested
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    <label className="flex items-center gap-2 p-2 border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={needsInterpreter}
                        onChange={(e) => setNeedsInterpreter(e.target.checked)}
                      />
                      <Languages className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-800">Medical Interpreter</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={needsAirportTransfer}
                        onChange={(e) => setNeedsAirportTransfer(e.target.checked)}
                      />
                      <Car className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-800">KLIA Airport Meet & Chauffeur</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={needsAmbulanceTransfer}
                        onChange={(e) => setNeedsAmbulanceTransfer(e.target.checked)}
                      />
                      <Ambulance className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-800">Inter-Hospital Ambulance</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={needsVipConcierge}
                        onChange={(e) => setNeedsVipConcierge(e.target.checked)}
                      />
                      <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-800">VIP Private Suite & Concierge</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={needsAccommodation}
                        onChange={(e) => setNeedsAccommodation(e.target.checked)}
                      />
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-800">Family Hotel Booking</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={needsHalalFood}
                        onChange={(e) => setNeedsHalalFood(e.target.checked)}
                      />
                      <Utensils className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-800">Halal Certified Clinical Meals</span>
                    </label>
                  </div>

                  {needsInterpreter && (
                    <div className="pt-2 flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-700">Preferred Language:</span>
                      <select
                        value={interpreterLanguage}
                        onChange={(e) => setInterpreterLanguage(e.target.value)}
                        className="border border-slate-300 p-1.5 text-xs bg-white"
                      >
                        <option value="Arabic">Arabic (العربية)</option>
                        <option value="Mandarin">Mandarin (中文)</option>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Japanese">Japanese (日本語)</option>
                        <option value="Russian">Russian (Русский)</option>
                        <option value="French">French (Français)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Consent & Submit */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      required
                      checked={shareDocuments}
                      onChange={(e) => setShareDocuments(e.target.checked)}
                      className="mt-0.5 rounded-none"
                    />
                    <span>
                      I authorize CareVerified and the designated licensed healthcare facility to review these clinical details for the sole purpose of triage, medical case assessment, and quotation formulation in compliance with the Personal Data Protection Act 2010 (PDPA).
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full sm:w-auto px-8 py-3 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    {formSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Transmitting Clinical Intake…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Request for Official Quotation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar Guide */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 text-white p-5 space-y-3">
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  What Happens Next?
                </h3>
                <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                  <li>
                    <strong className="text-white">Clinical Triage:</strong> Senior nursing and medical staff review your clinical notes within 4-12 hours.
                  </li>
                  <li>
                    <strong className="text-white">Itemized Quotation:</strong> The hospital generates an official pro-forma breakdown of surgeon fees, room category, OT charges, and inclusions.
                  </li>
                  <li>
                    <strong className="text-white">One-Click Acceptance:</strong> You review the price in MYR or foreign currency, and either accept, request revisions, or ask questions.
                  </li>
                  <li>
                    <strong className="text-white">Logistics & Care:</strong> Once accepted, your itinerary, airport transfer, and Letter of Guarantee (LOG) coordination are mobilized.
                  </li>
                </ol>
              </div>

              <div className="bg-white border border-[color:var(--t-200)] p-4 text-xs space-y-3">
                <h4 className="font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                  <Plane className="h-4 w-4 text-[color:var(--t-600)]" />
                  For International & Expat Patients
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Malaysia is consistently ranked among the world's top healthcare travel destinations. All partner hospitals are licensed under Act 586 and monitored by the Ministry of Health Malaysia (KKM).
                </p>
                <div className="p-2.5 bg-sky-50 border border-sky-200 text-sky-900 font-bold">
                  Emergency Medical Travel Assistance Hotline:
                  <br />
                  <span className="font-mono text-sm font-black">+60-3-2727-8900</span> (24/7 Desk)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY INQUIRIES & OFFICIAL TREATMENT QUOTATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'cases' && (
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
                  <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700">No medical inquiries registered yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('enquiry')}
                    className="mt-2 px-3 py-1.5 bg-[color:var(--t-600)] text-white text-xs font-bold uppercase cursor-pointer"
                  >
                    Submit New Request →
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
                            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 bg-slate-100 text-slate-700">
                              {c.patientType === 'local_malaysian' ? '🇲🇾 Local' : c.patientType === 'expat_resident' ? '🌏 Expat' : '✈️ Int’l'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{c.summary}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase border shrink-0 ${st.bg} ${st.color} ${st.border}`}>
                          {st.label}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
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
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
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
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
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
                              <span className="text-[11px] text-slate-500 ml-2">
                                Valid until {selectedCase.latestQuote.validUntil}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-500">Estimated Total:</span>
                              <span className="text-base font-black font-mono text-emerald-800 ml-2">
                                {formatCur(selectedCase.latestQuote.total)}
                              </span>
                              {selectedCurrency !== 'MYR' && (
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  Base: RM {selectedCase.latestQuote.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Itemized Table */}
                          <div className="p-4 overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
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
                                    <td colSpan={2} className="py-1 text-right text-slate-500 text-[11px]">
                                      Healthcare Service Tax ({selectedCase.latestQuote.taxRatePct}% SST):
                                    </td>
                                    <td className="py-1 text-right font-mono text-slate-600 text-[11px]">
                                      {formatCur(selectedCase.latestQuote.tax)}
                                    </td>
                                  </tr>
                                )}
                                <tr>
                                  <td colSpan={2} className="pt-2 text-right text-sm font-black text-slate-900">
                                    Grand Total:
                                  </td>
                                  <td className="pt-2 text-right text-sm font-black font-mono text-emerald-800">
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
                              <span className="text-xs text-slate-500">
                                Awaiting your formal review and decision.
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowRevisionModal(true)}
                                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase cursor-pointer"
                                >
                                  Request Revision / Negotiate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuoteDecision('accept')}
                                  disabled={decisionSubmitting}
                                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase cursor-pointer flex items-center gap-1.5 shadow-sm"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Accept Quotation
                                </button>
                              </div>
                            </div>
                          )}

                          {selectedCase.status === 'accepted' && (
                            <div className="p-3 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              This quotation has been officially accepted. Hospital admission & logistics are being scheduled.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-2">
                          <Clock className="h-6 w-6 text-slate-400 mx-auto" />
                          <p className="font-bold text-slate-700">Quotation formulation in progress.</p>
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
                          <p className="font-bold text-slate-700">No scheduled itinerary items yet.</p>
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
                                <span className="ml-2 text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-slate-100 text-slate-600">
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
                              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 mb-1 font-semibold">
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
              ) : (
                <div className="p-12 bg-white border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  Select a case from the list on the left to inspect its treatment quotation, itinerary, and care coordination messages.
                </div>
              )}
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
                If you submitted an enquiry as a guest or international visitor, enter your tracking code (e.g. <code>MED-MY-7821</code>) and contact email to view your itemized quotation and updates.
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
                  Case Tracking Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MED-MY-7821 or MED-INT-9932"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  className="w-full border border-slate-300 p-2 text-xs font-mono uppercase bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Contact Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="The email you used during enquiry submission"
                  value={trackEmail}
                  onChange={(e) => setTrackEmail(e.target.value)}
                  className="w-full border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <button
                type="submit"
                disabled={trackingLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                {trackingLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Lookup Case & Quotation
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL PRO-FORMA MEDICAL QUOTATION (PRINTABLE) */}
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
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
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
                <p className="text-xs text-slate-600 mt-0.5">{proformaData.facility.address}</p>
                <p className="text-xs text-slate-500">
                  Licence: {proformaData.facility.licenceNo} · Tel: {proformaData.facility.phone}
                </p>
                {proformaData.facility.mhtcMember && (
                  <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-300">
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
                <span className="text-[10px] font-black uppercase text-slate-400 block">Patient Information</span>
                <p className="font-bold text-slate-900 mt-1">{proformaData.patient.name}</p>
                <p className="text-slate-600">Nationality: {proformaData.patient.nationality}</p>
                <p className="text-slate-600">Insurance / Settlement: {proformaData.patient.insuranceCarrier}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Clinical Overview</span>
                <p className="font-bold text-slate-900 mt-1">Specialty: {proformaData.clinicalDetails.specialty}</p>
                <p className="text-slate-600 line-clamp-2">{proformaData.clinicalDetails.clinicalSummary}</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px]">
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
                      <td colSpan={2} className="p-1.5 text-right text-[11px] text-slate-600">
                        Service Tax ({proformaData.taxRatePct}% SST):
                      </td>
                      <td className="p-1.5 text-right font-mono text-[11px]">
                        RM {proformaData.taxMYR.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-300 text-sm font-black text-slate-900">
                    <td colSpan={2} className="p-2.5 text-right">TOTAL PAYABLE:</td>
                    <td className="p-2.5 text-right font-mono text-emerald-800">
                      RM {proformaData.totalMYR.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Terms and Exclusions */}
            <div className="text-[11px] text-slate-600 space-y-1.5 border-t border-slate-200 pt-3">
              <p><strong>Inclusions:</strong> {proformaData.inclusions}</p>
              <p><strong>Exclusions:</strong> {proformaData.exclusions}</p>
              <p><strong>Cancellation:</strong> {proformaData.cancellationTerms}</p>
              <p><strong>Payment Guidelines:</strong> {proformaData.paymentTerms}</p>
            </div>

            <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
              {proformaData.regulatoryNotice}
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
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                Request Quotation Revision
              </h3>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Specify what adjustments you require from the hospital (e.g. room category adjustment, date change, exclusion of optional companion items):
            </p>

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
                {decisionSubmitting ? 'Transmitting…' : 'Submit Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
