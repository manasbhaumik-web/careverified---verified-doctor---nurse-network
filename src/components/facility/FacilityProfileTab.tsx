import React from 'react';
import {
  Building2,
  ShieldCheck,
  Stethoscope,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  HeartPulse,
  Check,
  Sparkles,
  DollarSign,
  Lock,
  FileText,
} from 'lucide-react';
import WorkspaceHeader from '../WorkspaceHeader';
import { BannerBadge } from '../DashboardHeader';
import { FacilityProfile } from './types';

export interface FacilityProfileTabProps {
  facility: FacilityProfile | null;
  equipmentList: string[];
  setEquipmentList: React.Dispatch<React.SetStateAction<string[]>>;
  newEquipmentInput: string;
  setNewEquipmentInput: React.Dispatch<React.SetStateAction<string>>;
  amenitiesList: string[];
  setAmenitiesList: React.Dispatch<React.SetStateAction<string[]>>;
  newAmenityInput: string;
  setNewAmenityInput: React.Dispatch<React.SetStateAction<string>>;
  billingPref: 'escrow' | 'invoice';
  setBillingPref: React.Dispatch<React.SetStateAction<'escrow' | 'invoice'>>;
  billingEmail: string;
  setBillingEmail: React.Dispatch<React.SetStateAction<string>>;
  sstNo: string;
  setSstNo: React.Dispatch<React.SetStateAction<string>>;
  handleSaveInfrastructure: () => void;
  infraSaving: boolean;
  handleSaveBillingSettings: () => void;
  billingSaving: boolean;
  setNotificationMsg: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; text: string } | null>>;
}

export const FacilityProfileTab: React.FC<FacilityProfileTabProps> = ({
  facility,
  equipmentList,
  setEquipmentList,
  newEquipmentInput,
  setNewEquipmentInput,
  amenitiesList,
  setAmenitiesList,
  newAmenityInput,
  setNewAmenityInput,
  billingPref,
  setBillingPref,
  billingEmail,
  setBillingEmail,
  sstNo,
  setSstNo,
  handleSaveInfrastructure,
  infraSaving,
  handleSaveBillingSettings,
  billingSaving,
  setNotificationMsg,
}) => {
  return (
          <div className="space-y-6">
            <WorkspaceHeader
              icon={Building2}
              eyebrow="Statutory Licensing · Act 586 Compliance"
              title="Facility Operating Profile & Infrastructure Capacity"
              description="Maintain official hospital licensing, MSQH/JCI accreditations, intensive care bed counts, and specialized operating theatre capacity."
              badges={<BannerBadge tone="success"><ShieldCheck className="h-3 w-3 inline mr-1 text-emerald-600" /> Act 586 Licensed</BannerBadge>}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Facility Identity & Licensing */}
              <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-black text-slate-900">
                    KKM Act 586 Statutory Licence
                  </h2>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold block">Facility Name</span>
                      <strong className="text-slate-900">{facility?.name || 'Healthcare Facility'}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold block">Operating Category</span>
                      <strong className="text-slate-900 uppercase">{facility?.kind || 'Medical Centre'}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold block">Statutory Licence No.</span>
                      <strong className="font-mono text-slate-900">{facility?.licenceNo || 'KKM/JKA/586-90412'}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold block">Licence Expiry</span>
                      <strong className="text-slate-900">{facility?.licenceExpiry || '2029-12-31'}</strong>
                    </div>
                  </div>

                  <p className="text-slate-500 leading-relaxed">
                    Registered under the Private Healthcare Facilities and Services Act 1998 (Act 586).
                    Authorised for inpatient specialist medicine, daycare surgery, outpatient consultations, and verified locum practitioner staffing.
                  </p>
                </div>

                {/* Accreditations */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    Accreditation Credentials
                  </span>
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 block">MSQH 6th Edition Hospital Accreditation</strong>
                        <span className="text-slate-500 text-xs">Malaysian Society for Quality in Health</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2xs font-black uppercase border border-emerald-300">
                        Valid
                      </span>
                    </div>
                    {facility?.mhtcMember && (
                      <div className="p-3 bg-blue-50/50 border border-blue-200 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-blue-900 block">MHTC Elite Healthcare Member</strong>
                          <span className="text-blue-700 text-xs">Malaysia Healthcare Travel Council</span>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-2xs font-black uppercase border border-blue-300">
                          Certified
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clinical Specialties & Contact */}
              <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Stethoscope className="h-5 w-5 text-[color:var(--t-600)]" />
                  <h2 className="text-base font-black text-slate-900">
                    Clinical Specialties & Network Contact
                  </h2>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    Offered Specialties
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(facility?.specialties || [
                      'Emergency Medicine', 'General Medicine', 'Cardiology',
                      'Orthopaedic Surgery', 'General Surgery', 'Paediatrics',
                      'Obstetrics & Gynaecology', 'Anaesthesiology', 'Intensive Care Unit (ICU)'
                    ]).map((sp, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 text-slate-800 text-2xs font-bold border border-slate-200"
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    Facility Address & Liaison
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{facility?.address || '1, Jalan Bukit Pantai, Bangsar, 59100 Kuala Lumpur'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{facility?.phone || '+60 3-2296 0888'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{facility?.email || 'hr.locum@pantai.com.my'}</span>
                    </div>
                    {facility?.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                        <a
                          href={facility.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[color:var(--t-700)] underline font-bold"
                        >
                          {facility.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Equipment & Infrastructure Management Card */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-[color:var(--t-600)]" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Diagnostic Equipment & Medical Infrastructure
                    </h3>
                    <p className="text-xs text-slate-500">
                      Showcase high-precision clinical equipment (CT, MRI, Cath Lab, Robotic Surgery) to referring clinicians & patients.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveInfrastructure}
                  disabled={infraSaving}
                  className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Check className="h-4 w-4 text-emerald-400" />
                  {infraSaving ? 'Saving…' : 'Save Infrastructure'}
                </button>
              </div>

              {/* Equipment list */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Active Clinical & Diagnostic Equipment:
                </label>
                <div className="flex flex-wrap gap-2">
                  {equipmentList.map((eq, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-slate-100 text-slate-800 text-2xs font-bold border border-slate-300 flex items-center gap-2"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{eq}</span>
                      <button
                        type="button"
                        onClick={() => setEquipmentList(equipmentList.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {equipmentList.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No equipment listed yet. Add items below.</span>
                  )}
                </div>

                {/* Add Equipment Input */}
                <div className="flex items-center gap-2 pt-1 max-w-md">
                  <input
                    type="text"
                    value={newEquipmentInput}
                    onChange={e => setNewEquipmentInput(e.target.value)}
                    placeholder="e.g. 3T High-Field MRI Scanner"
                    className="p-2 border border-slate-300 text-xs flex-1 bg-slate-50 focus:bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEquipmentInput.trim()) {
                        setEquipmentList([...equipmentList, newEquipmentInput.trim()]);
                        setNewEquipmentInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold cursor-pointer"
                  >
                    + Add Equipment
                  </button>
                </div>
              </div>

              {/* Patient Amenities list */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Patient Care Amenities & Specialized Services:
                </label>
                <div className="flex flex-wrap gap-2">
                  {amenitiesList.map((am, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-amber-50 text-amber-900 text-2xs font-bold border border-amber-300 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>{am}</span>
                      <button
                        type="button"
                        onClick={() => setAmenitiesList(amenitiesList.filter((_, idx) => idx !== i))}
                        className="text-amber-500 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {amenitiesList.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No amenities listed yet. Add items below.</span>
                  )}
                </div>

                {/* Add Amenity Input */}
                <div className="flex items-center gap-2 pt-1 max-w-md">
                  <input
                    type="text"
                    value={newAmenityInput}
                    onChange={e => setNewAmenityInput(e.target.value)}
                    placeholder="e.g. JAKIM Halal-Certified Dietary Kitchen"
                    className="p-2 border border-slate-300 text-xs flex-1 bg-slate-50 focus:bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAmenityInput.trim()) {
                        setAmenitiesList([...amenitiesList, newAmenityInput.trim()]);
                        setNewAmenityInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold cursor-pointer"
                  >
                    + Add Amenity
                  </button>
                </div>
              </div>
            </div>

            {/* Billing, Escrow & Invoicing Management Card */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[color:var(--t-600)]" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Settlement & Billing Protocol (Escrow vs. Corporate Invoicing)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure how clinical shifts and locum wages are settled between your facility, practitioners, and the platform.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBillingSettings}
                  disabled={billingSaving}
                  className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  <Check className="h-4 w-4" />
                  {billingSaving ? 'Saving…' : 'Save Billing Settings'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Mode Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Default Payment Settlement Mode:
                  </label>
                  
                  <div
                    onClick={() => setBillingPref('escrow')}
                    className={`p-4 border cursor-pointer transition-all ${
                      billingPref === 'escrow'
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <span>Upfront Escrow Deposit (Recommended for Clinics)</span>
                      </div>
                      <input
                        type="radio"
                        name="billingPref"
                        checked={billingPref === 'escrow'}
                        onChange={() => setBillingPref('escrow')}
                        className="mt-1"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Funds for accepted shifts (Wage + RM 40 platform fee) are pre-authorized upon application acceptance and held in escrow. Payout is released to the practitioner after verified timesheet completion. Zero bad debt.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      if (facility?.corporateCreditApproved) {
                        setBillingPref('invoice');
                      } else {
                        setNotificationMsg({
                          type: 'error',
                          text: 'Corporate Net-30 Invoicing requires a verified MOH private hospital licence and credit review.'
                        });
                      }
                    }}
                    className={`p-4 border cursor-pointer transition-all ${
                      billingPref === 'invoice'
                        ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span>Corporate Net-30 Invoicing (Tertiary Hospitals)</span>
                      </div>
                      <input
                        type="radio"
                        name="billingPref"
                        checked={billingPref === 'invoice'}
                        onChange={() => setBillingPref('invoice')}
                        disabled={!facility?.corporateCreditApproved}
                        className="mt-1"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      No upfront charges at booking. All completed shifts are consolidated onto a monthly corporate tax invoice payable via Corporate GIRO/PO within 30 days.
                    </p>
                    <div className="mt-2 text-xs flex items-center gap-2">
                      <span className="font-semibold text-purple-800">Status:</span>
                      {facility?.corporateCreditApproved ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">Approved (Limit: RM {facility.corporateCreditLimitMyr?.toLocaleString() || '50,000'})</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">Requires MOH Hospital Licence Review</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing Details & Tax Info */}
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Accounting & Tax Credentials:
                  </label>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Accounts Payable Billing Email</label>
                    <input
                      type="email"
                      value={billingEmail}
                      onChange={e => setBillingEmail(e.target.value)}
                      placeholder="finance.locum@hospital.com.my"
                      className="w-full p-2 border border-slate-300 text-xs focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">SST / Tax Registration Number</label>
                    <input
                      type="text"
                      value={sstNo}
                      onChange={e => setSstNo(e.target.value)}
                      placeholder="W10-2401-32000042"
                      className="w-full p-2 border border-slate-300 text-xs focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-black text-slate-800 uppercase tracking-wide">Regulatory & Compliance Policy:</div>
                    <p>• Medical practitioners (doctors/nurses) are <strong>never charged</strong> recruitment fees on this platform (Act 586 & MMC compliant).</p>
                    <p>• Platform fees (RM 40/shift) and clinical wages are exclusively invoiced or escrowed through the hiring healthcare facility.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
  );
};
