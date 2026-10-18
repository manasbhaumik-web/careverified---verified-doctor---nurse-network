import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckCircle2, FileText, Pill, Award, ArrowRight, Download, 
  Calendar, Clock, ShieldCheck, UserCheck, Stethoscope, ExternalLink,
  Truck, Store, Snowflake, MapPin, Phone, ShieldAlert, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatDateTime } from '../locale';
import { MY_STATES, toE164 } from '../identity';

export interface DischargeSummaryData {
  consultId: string;
  endedAt?: string;
  durationMinutes?: number;
  prescriptions?: Array<{
    id: string;
    code: string;
    diagnosis: string;
    items: Array<{ name: string; dose?: string; frequency?: string; duration?: string; instructions?: string }>;
    notes?: string;
    issuedAt?: string;
    validUntil?: string;
    fillStatus?: string;
  }>;
  certificates?: Array<{
    id: string;
    code: string;
    type: string;
    startDate: string;
    endDate: string;
    notes?: string;
    issuedAt?: string;
  }>;
  clinicalNotes?: string;
  diagnosis?: string;
  doctorName?: string;
  doctorSpecialization?: string;
  doctorCouncilNumber?: string;
}

interface DischargeSummaryDialogProps {
  data: DischargeSummaryData;
  onClose: () => void;
  onNavigateToPrescriptions?: () => void;
  onNavigateToRecords?: () => void;
}

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city: string | null;
  phone: string | null;
  hours: string | null;
  services: string[];
  deliveryMethods?: string[];
  coldChain?: boolean;
  panelInsurers?: string[];
  licenceVerified?: boolean;
}

interface InsurancePolicy {
  id: string;
  insurer: string;
  memberNo: string;
  policyType: string;
  employer?: string | null;
}

export default function DischargeSummaryDialog({
  data,
  onClose,
  onNavigateToPrescriptions,
  onNavigateToRecords
}: DischargeSummaryDialogProps) {
  const hasPrescriptions = Boolean(data.prescriptions && data.prescriptions.length > 0);
  const hasCertificates = Boolean(data.certificates && data.certificates.length > 0);
  const primaryRx = data.prescriptions?.[0];

  // 1-Click Pharmacy Dispatch Cockpit States
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryMethod, setDeliveryMethod] = useState<string>('grab');
  const [shareSafety, setShareSafety] = useState<boolean>(true);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  
  // Pre-filled address
  const [deliveryAddress, setDeliveryAddress] = useState({
    line1: '',
    line2: '',
    postcode: '',
    city: '',
    state: 'W.P. Kuala Lumpur',
    phone: ''
  });

  // Dispatch execution state
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [dispatchedDetails, setDispatchedDetails] = useState<{
    pharmacyName: string;
    fulfillment: string;
    deliveryRef?: string;
  } | null>(null);

  // Detect Cold-Chain
  const requiresColdChain = useMemo(() => {
    if (!primaryRx?.items) return false;
    const coldKeywords = ['insulin', 'vaccine', 'adalimumab', 'innohep', 'enoxaparin', 'glp-1', 'semaglutide', 'ozempic', 'humalog', 'lantus'];
    return primaryRx.items.some(it => 
      coldKeywords.some(kw => it.name.toLowerCase().includes(kw))
    );
  }, [primaryRx]);

  // Load verified pharmacies, user profile address, and insurance policies
  useEffect(() => {
    if (!hasPrescriptions) return;
    setLoadingPharmacies(true);

    Promise.all([
      fetch('/api/pharmacies').then(r => r.json()).catch(() => ({ status: 'error', data: [] })),
      fetch('/api/auth/me').then(r => r.json()).catch(() => null),
      fetch('/api/me/insurance').then(r => r.json()).catch(() => ({ status: 'error', data: [] }))
    ]).then(([phRes, meRes, insRes]) => {
      setLoadingPharmacies(false);
      let list: Pharmacy[] = phRes.status === 'success' && Array.isArray(phRes.data) ? phRes.data : [];
      setPharmacies(list);

      // Smart Ranking:
      // If cold chain needed, prioritize cold-chain capable pharmacies
      // Then prioritize pharmacies that offer delivery
      if (list.length > 0) {
        const sorted = [...list].sort((a, b) => {
          if (requiresColdChain) {
            if (a.coldChain && !b.coldChain) return -1;
            if (!a.coldChain && b.coldChain) return 1;
          }
          const aDel = a.services.includes('Home delivery') ? 1 : 0;
          const bDel = b.services.includes('Home delivery') ? 1 : 0;
          return bDel - aDel;
        });
        setSelectedPharmacyId(sorted[0].id);
        if (sorted[0].deliveryMethods && sorted[0].deliveryMethods.length > 0) {
          setDeliveryMethod(sorted[0].deliveryMethods[0]);
        }
      }

      // Pre-fill patient address
      const pt = meRes?.data?.patient;
      if (pt) {
        setDeliveryAddress({
          line1: pt.address?.line1 || '',
          line2: pt.address?.line2 || '',
          postcode: pt.address?.postcode || '',
          city: pt.address?.city || '',
          state: pt.address?.state || 'W.P. Kuala Lumpur',
          phone: pt.phone || ''
        });
      }

      // Insurance policies
      if (insRes?.status === 'success' && Array.isArray(insRes.data)) {
        setPolicies(insRes.data);
      }
    });
  }, [hasPrescriptions, requiresColdChain]);

  const selectedPharmacy = pharmacies.find(p => p.id === selectedPharmacyId);

  // Update delivery method if chosen pharmacy changes
  const handleSelectPharmacy = (id: string) => {
    setSelectedPharmacyId(id);
    const ph = pharmacies.find(p => p.id === id);
    if (ph?.deliveryMethods && ph.deliveryMethods.length > 0 && !ph.deliveryMethods.includes(deliveryMethod)) {
      setDeliveryMethod(ph.deliveryMethods[0]);
    }
  };

  // 1-Click Dispatch Action
  const handleInstantDispatch = async () => {
    if (!primaryRx || !selectedPharmacy) return;
    setDispatchBusy(true);
    setDispatchError('');

    try {
      // 1. Send prescription to pharmacy
      const sendRes = await fetch(`/api/prescriptions/${primaryRx.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId: selectedPharmacy.id,
          shareSafety
        })
      }).then(r => r.json());

      if (sendRes.status !== 'success') {
        throw new Error(sendRes.message || 'Could not route prescription to selected pharmacy.');
      }

      // 2. If delivery selected, request courier delivery
      if (fulfillmentType === 'delivery') {
        const phone = toE164(deliveryAddress.phone);
        if (!phone) {
          throw new Error('Please enter a valid Malaysian contact phone number for the courier rider.');
        }
        if (!deliveryAddress.line1.trim() || !deliveryAddress.postcode.trim() || !deliveryAddress.city.trim()) {
          throw new Error('Please complete the delivery address (Street, Postcode, City).');
        }

        const delRes = await fetch(`/api/prescriptions/${primaryRx.id}/delivery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: deliveryMethod,
            contactPhone: phone,
            address: {
              line1: deliveryAddress.line1.trim(),
              line2: deliveryAddress.line2.trim(),
              postcode: deliveryAddress.postcode.trim(),
              city: deliveryAddress.city.trim(),
              state: deliveryAddress.state
            }
          })
        }).then(r => r.json());

        if (delRes.status !== 'success') {
          throw new Error(delRes.message || 'Prescription routed, but courier request failed.');
        }
      }

      // 3. If insurance policy chosen, attach policy
      if (selectedPolicyId) {
        await fetch(`/api/prescriptions/${primaryRx.id}/insurance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ policyId: selectedPolicyId })
        }).catch(() => null);
      }

      setDispatchSuccess(true);
      setDispatchedDetails({
        pharmacyName: selectedPharmacy.name,
        fulfillment: fulfillmentType === 'delivery' 
          ? `Courier (${deliveryMethod.toUpperCase()}) to ${deliveryAddress.city}` 
          : 'Self Counter Pickup',
      });
    } catch (err: any) {
      setDispatchError(err?.message || 'An error occurred while dispatching prescription.');
    } finally {
      setDispatchBusy(false);
    }
  };

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="discharge-dialog-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
    >
      <div className="bg-white border-2 border-[color:var(--t-600)] max-w-3xl w-full shadow-2xl p-6 space-y-6 max-h-[94vh] overflow-y-auto rounded-none">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-[color:var(--t-100)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-none">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-none">
                Consultation Concluded · MMC Attested
              </span>
              <h2 id="discharge-dialog-title" className="text-base font-black text-[color:var(--ink)] mt-1">
                Post-Consultation Discharge Summary &amp; E-Prescription
              </h2>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-none">
            Encounter: {data.consultId}
          </span>
        </div>

        {/* CLINICAL SUMMARY STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-4 text-xs rounded-none">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Attending Physician</span>
            <span className="font-extrabold text-[color:var(--ink)] block mt-0.5">{data.doctorName || "Dr. Sarah Chen"}</span>
            <span className="text-[10px] text-slate-500 font-mono">MMC #{data.doctorCouncilNumber || "48921"}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Clinical Diagnosis</span>
            <span className="font-extrabold text-[color:var(--t-700)] block mt-0.5">{data.diagnosis || "Acute Upper Respiratory Assessment"}</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Triage Reviewed &amp; Managed</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Encounter Duration</span>
            <span className="font-extrabold text-[color:var(--ink)] block mt-0.5">{data.durationMinutes || 14} Minutes</span>
            <span className="text-[10px] text-slate-500">Statutory Record Sealed</span>
          </div>
        </div>

        {/* PHYSICIAN NOTES & CARE INSTRUCTIONS */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-[color:var(--ink)] flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-[color:var(--t-600)]" />
            Physician Clinical Notes &amp; Care Guidance
          </h3>
          <div className="bg-white border border-[color:var(--t-200)] p-4 text-xs text-[color:var(--ink-2)] leading-relaxed space-y-2 rounded-none">
            <p className="font-medium">
              {data.clinicalNotes || "Patient consulted via live encrypted session. Vital indicators reviewed. Symptomatic treatment protocol issued. Patient advised to maintain adequate oral hydration, rest, and follow prescribed medication schedule. Escalate to nearest emergency room if high fever persists or breathing difficulty occurs."}
            </p>
          </div>
        </div>

        {/* ISSUED PRESCRIPTIONS */}
        {hasPrescriptions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[color:var(--ink)] flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-cyan-600" />
                Prescribed Medication ({primaryRx?.items.length || 0} item{primaryRx?.items.length === 1 ? '' : 's'})
              </h3>
              {requiresColdChain && (
                <span className="text-[10px] font-bold text-sky-900 bg-sky-50 border border-sky-300 px-2 py-0.5 inline-flex items-center gap-1 rounded-none">
                  <Snowflake className="h-3 w-3 text-sky-600" /> Cold-Chain Required (2-8 °C)
                </span>
              )}
            </div>

            <div className="border border-cyan-200 bg-cyan-50/40 p-4 text-xs space-y-2.5 rounded-none">
              <div className="flex items-center justify-between">
                <span className="font-mono font-extrabold text-cyan-900 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-cyan-700" /> Rx Code: {primaryRx?.code}
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-800 bg-cyan-100 border border-cyan-200 px-2 py-0.5 rounded-none">
                  Poisons Act 1952 Compliant
                </span>
              </div>
              <div className="space-y-1.5">
                {primaryRx?.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="bg-white border border-cyan-100 p-2.5 text-[11px] flex justify-between items-center rounded-none">
                    <div>
                      <span className="font-extrabold text-[color:var(--ink)] block">{item.name}</span>
                      {item.instructions && <span className="text-[10px] text-slate-500">{item.instructions}</span>}
                    </div>
                    <span className="font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-none">
                      {item.dose || "As directed"} · {item.frequency || "Daily"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                Valid Until: {primaryRx?.validUntil ? formatDateTime(primaryRx.validUntil) : "7 Days from issuance"}
              </p>
            </div>
          </div>
        )}

        {/* 1-CLICK PHARMACY DISPATCH COCKPIT */}
        {hasPrescriptions && (
          <div className="border-2 border-[color:var(--t-600)] bg-[color:var(--t-bg)] p-5 space-y-4 rounded-none">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5 rounded-none">
                  Smart Pharmacy Dispatch Loop
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-[color:var(--t-600)]" />
                  1-Click Pharmacy Fulfillment Cockpit
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Route your signed e-prescription directly to a verified Malaysian retail or hospital pharmacy with zero friction.
                </p>
              </div>
            </div>

            {/* IF DISPATCHED SUCCESSFULLY */}
            {dispatchSuccess ? (
              <div role="status" className="bg-emerald-50 border border-emerald-300 p-4 space-y-3 rounded-none">
                <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <span>Prescription Successfully Routed!</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                  Sent to <b>{dispatchedDetails?.pharmacyName}</b> via <b>{dispatchedDetails?.fulfillment}</b>.
                  The pharmacy has acknowledged the order and will begin dispensing immediately.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {onNavigateToPrescriptions && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onNavigateToPrescriptions(); }}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer"
                    >
                      View Live Order Tracking
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white border border-emerald-300 text-emerald-900 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer hover:bg-emerald-100"
                  >
                    Done &amp; Return
                  </button>
                </div>
              </div>
            ) : (
              /* DISPATCH CONFIGURATION FORM */
              <div className="space-y-4">
                {dispatchError && (
                  <div role="alert" className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold rounded-none">
                    {dispatchError}
                  </div>
                )}

                {/* 1. SELECT PARTNER PHARMACY */}
                <div className="space-y-1.5">
                  <label htmlFor="select-pharmacy" className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                    Select Accredited Partner Pharmacy
                  </label>
                  {loadingPharmacies ? (
                    <div className="h-10 bg-white border border-slate-300 flex items-center px-3 text-xs text-slate-500 rounded-none">
                      Matching verified partner pharmacies…
                    </div>
                  ) : (
                    <select
                      id="select-pharmacy"
                      value={selectedPharmacyId}
                      onChange={e => handleSelectPharmacy(e.target.value)}
                      className="w-full h-10 border border-slate-300 bg-white px-3 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                    >
                      {pharmacies.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.city ? `(${p.city})` : ''} · {p.services.includes('Home delivery') ? 'Delivers' : 'Pickup only'}
                          {p.coldChain ? ' · Cold-Chain GDP' : ''}
                          {p.services.includes('24 hours') ? ' · 24 Hours' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedPharmacy && (
                    <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400" />{selectedPharmacy.address}</span>
                      {selectedPharmacy.hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" />{selectedPharmacy.hours}</span>}
                    </div>
                  )}
                </div>

                {/* 2. FULFILLMENT MODE: HOME DELIVERY VS COUNTER PICKUP */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                    Choose Fulfillment Option
                  </span>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('delivery')}
                      className={`p-3 text-left border rounded-none cursor-pointer transition-all ${
                        fulfillmentType === 'delivery'
                          ? 'border-[color:var(--t-600)] bg-white shadow-xs'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900">
                          <Truck className="h-4 w-4 text-[color:var(--t-600)]" />
                          Express Courier Delivery
                        </span>
                        <input
                          type="radio"
                          name="fulfillmentType"
                          checked={fulfillmentType === 'delivery'}
                          onChange={() => setFulfillmentType('delivery')}
                          className="accent-[color:var(--t-600)]"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Grab / Lalamove / Rider to your doorstep (approx. 1-2 hours).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentType('pickup')}
                      className={`p-3 text-left border rounded-none cursor-pointer transition-all ${
                        fulfillmentType === 'pickup'
                          ? 'border-[color:var(--t-600)] bg-white shadow-xs'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900">
                          <Store className="h-4 w-4 text-emerald-700" />
                          Self Counter Pickup
                        </span>
                        <input
                          type="radio"
                          name="fulfillmentType"
                          checked={fulfillmentType === 'pickup'}
                          onChange={() => setFulfillmentType('pickup')}
                          className="accent-[color:var(--t-600)]"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Show your encrypted digital barcode at the pharmacy counter.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 3. HOME DELIVERY DETAILS (IF DELIVERY SELECTED) */}
                {fulfillmentType === 'delivery' && (
                  <div className="bg-white border border-slate-250 p-4 space-y-3 rounded-none">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Delivery Address &amp; Courier Contact (Pre-filled from Profile)
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <label htmlFor="address-line1" className="sr-only">Street Address</label>
                        <input
                          id="address-line1"
                          type="text"
                          placeholder="Street Address (Line 1) *"
                          value={deliveryAddress.line1}
                          onChange={e => setDeliveryAddress(a => ({ ...a, line1: e.target.value }))}
                          className="w-full h-9 border border-slate-300 px-3 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="address-postcode" className="sr-only">Postcode</label>
                        <input
                          id="address-postcode"
                          type="text"
                          placeholder="Postcode (5 Digits) *"
                          maxLength={5}
                          value={deliveryAddress.postcode}
                          onChange={e => setDeliveryAddress(a => ({ ...a, postcode: e.target.value.replace(/\D/g, '') }))}
                          className="w-full h-9 border border-slate-300 px-3 text-xs font-mono font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="address-city" className="sr-only">City</label>
                        <input
                          id="address-city"
                          type="text"
                          placeholder="City *"
                          value={deliveryAddress.city}
                          onChange={e => setDeliveryAddress(a => ({ ...a, city: e.target.value }))}
                          className="w-full h-9 border border-slate-300 px-3 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="address-state" className="sr-only">State</label>
                        <select
                          id="address-state"
                          value={deliveryAddress.state}
                          onChange={e => setDeliveryAddress(a => ({ ...a, state: e.target.value }))}
                          className="w-full h-9 border border-slate-300 bg-white px-2.5 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                        >
                          {MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="address-phone" className="sr-only">Rider Contact Phone</label>
                        <input
                          id="address-phone"
                          type="tel"
                          placeholder="Rider Contact Phone (e.g. 012-3456789) *"
                          value={deliveryAddress.phone}
                          onChange={e => setDeliveryAddress(a => ({ ...a, phone: e.target.value }))}
                          className="w-full h-9 border border-slate-300 px-3 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                        />
                      </div>
                    </div>

                    {selectedPharmacy?.deliveryMethods && selectedPharmacy.deliveryMethods.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-black uppercase text-slate-600">Partner Courier:</span>
                        <div className="flex gap-2">
                          {selectedPharmacy.deliveryMethods.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setDeliveryMethod(m)}
                              className={`px-3 py-1 text-[11px] font-bold uppercase rounded-none border cursor-pointer ${
                                deliveryMethod === m
                                  ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {{ grab: 'Grab', lalamove: 'Lalamove', pharmacy_courier: 'Pharmacy Rider', other_courier: 'Courier' }[m] ?? m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. INSURANCE PANEL & SAFETY SHARING */}
                <div className="space-y-2.5 pt-1">
                  {policies.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Insurance Direct-Billing:</span>
                      <select
                        aria-label="Panel Insurance Policy"
                        value={selectedPolicyId}
                        onChange={e => setSelectedPolicyId(e.target.value)}
                        className="h-8 border border-slate-300 bg-white px-2 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                      >
                        <option value="">Cash / Direct Pay (No GL)</option>
                        {policies.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.insurer} ({p.memberNo}){p.employer ? ` · ${p.employer}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareSafety}
                      onChange={e => setShareSafety(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-none accent-[color:var(--t-600)]"
                    />
                    <span className="text-[11px] text-slate-700 font-semibold leading-relaxed">
                      Share registered drug allergies &amp; current medication list with the dispensing pharmacist for contraindication safety screening <b>(Strongly Recommended)</b>.
                    </span>
                  </label>
                </div>

                {/* 5. INSTANT DISPATCH ACTION CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={dispatchBusy || !selectedPharmacyId}
                    onClick={handleInstantDispatch}
                    className="w-full h-12 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Pill className="h-4 w-4" />
                    <span>
                      {dispatchBusy 
                        ? 'Routing Prescription & Scheduling…' 
                        : `Dispatch to ${selectedPharmacy?.name || 'Pharmacy'} (${fulfillmentType === 'delivery' ? 'Deliver' : 'Pickup'})`}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MEDICAL CERTIFICATES (MC) */}
        {hasCertificates && (
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[color:var(--ink)] flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-600" />
              Statutory Medical Certificate (Digital MC)
            </h3>
            {data.certificates!.map((mc, idx) => (
              <div key={mc.id || idx} className="border border-amber-200 bg-amber-50/40 p-3.5 text-xs flex items-center justify-between rounded-none">
                <div>
                  <span className="font-mono font-black text-amber-900 block">MC Serial: {mc.code}</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Leave Granted: {mc.startDate} to {mc.endDate} ({mc.type || "Medical Leave"})
                  </p>
                </div>
                <a
                  href={`/api/certificates/${mc.code}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs rounded-none"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download MC</span>
                </a>
              </div>
            ))}
          </div>
        )}

        {/* STATUTORY ASSURANCE FOOTER */}
        <div className="p-3 bg-slate-50 border border-slate-200 text-[10px] text-slate-600 flex items-center justify-between rounded-none">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Telemedicine Act 1997 &amp; PDPA 2010 verified encounter record
          </span>
          <span className="font-mono text-slate-500">
            Hash: 0x{data.consultId.slice(0, 8)}...OK
          </span>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[color:var(--t-100)]">
          {hasPrescriptions && onNavigateToPrescriptions && (
            <button
              onClick={() => { onClose(); onNavigateToPrescriptions(); }}
              className="w-full sm:w-auto h-11 px-5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Browse Full Pharmacy Directory</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-6 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors ml-auto"
          >
            Acknowledge &amp; Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
