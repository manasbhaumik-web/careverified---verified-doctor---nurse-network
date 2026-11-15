import { CustomSelect } from '../../shared/ui/CustomSelect';
import React, { useMemo, useState } from 'react';
import {
  FileSignature, X, ShieldCheck, Loader, Ambulance, MapPin, CheckCircle2, Calendar, Clock, Check,
  ClipboardList, Search
} from 'lucide-react';
import { formatMoney, useTr } from '../../locale';
import { DoctorProfile, NurseProfile, Booking, OnCallDispatch } from '../../types';
import ClinicalWorkspace from '../ClinicalWorkspace';

interface PractitionerBookingsTabProps {
  matchedProfile: DoctorProfile | NurseProfile;
  isDoc?: boolean;
  myBookings: Booking[];
  dispatches: OnCallDispatch[];
  selectedBookingForPrescribe: Booking | null;
  onStartPrescription: (booking: Booking) => void;
  onCancelPrescription: () => void;
  prescribeDiagnosis: string;
  setPrescribeDiagnosis: (value: string) => void;
  prescribeMeds: string;
  setPrescribeMeds: (value: string) => void;
  prescribeInstructions: string;
  setPrescribeInstructions: (value: string) => void;
  issuingPrescription: boolean;
  onSubmitPrescription: (e: React.FormEvent) => void;
  onUpdateDispatchStatus: (dispatchId: string, nextStatus: 'En-Route' | 'Arrived' | 'Completed') => void;
}

export default function PractitionerBookingsTab({
  matchedProfile,
  isDoc = true,
  myBookings,
  dispatches,
  selectedBookingForPrescribe,
  onStartPrescription,
  onCancelPrescription,
  prescribeDiagnosis,
  setPrescribeDiagnosis,
  prescribeMeds,
  setPrescribeMeds,
  prescribeInstructions,
  setPrescribeInstructions,
  issuingPrescription,
  onSubmitPrescription,
  onUpdateDispatchStatus
}: PractitionerBookingsTabProps) {
  const tx = useTr();
  const activeDispatches = dispatches.filter(d => d.dispatchStatus !== 'Completed');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Upcoming' | 'Completed'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return myBookings.filter(b =>
      (statusFilter === 'all' || b.status === statusFilter) &&
      (q === '' || b.patientName.toLowerCase().includes(q) || b.patientId.toLowerCase().includes(q) || (b.symptoms || '').toLowerCase().includes(q))
    );
  }, [myBookings, statusFilter, query]);

  const activeBooking = useMemo(() => {
    if (selectedBookingForPrescribe) return selectedBookingForPrescribe;
    if (selectedId) {
      const m = filteredBookings.find(b => b.id === selectedId);
      if (m) return m;
    }
    return filteredBookings[0] ?? null;
  }, [selectedBookingForPrescribe, selectedId, filteredBookings]);

  // Nurse Care Log Form States
  const [nursingProcedure, setNursingProcedure] = useState('Sterile Wound Dressing (Stage II)');
  const [nursingBp, setNursingBp] = useState('120/80');
  const [nursingHr, setNursingHr] = useState('76');
  const [nursingSpo2, setNursingSpo2] = useState('98');
  const [nursingTemp, setNursingTemp] = useState('36.8');
  const [nursingNotes, setNursingNotes] = useState('Wound clean with healthy granulation margins. Aseptic dressing change completed. Patient alert, comfortable, and stable.');
  const [savingNurseLog, setSavingNurseLog] = useState(false);

  const handleNurseCareLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForPrescribe) return;
    setSavingNurseLog(true);
    setTimeout(() => {
      selectedBookingForPrescribe.nursingCareLog = {
        procedurePerformed: nursingProcedure,
        vitals: {
          bloodPressure: nursingBp,
          heartRate: nursingHr,
          spO2: nursingSpo2,
          temperature: nursingTemp,
        },
        clinicalNotes: nursingNotes,
        completedAt: new Date().toISOString(),
        digitalSignature: `LJM-RN-SIG-${Date.now().toString(36).toUpperCase()}`
      };
      selectedBookingForPrescribe.status = 'Completed';
      setSavingNurseLog(false);
      onCancelPrescription();
    }, 500);
  };

  return (
    <div id="panel-bookings" role="tabpanel" aria-labelledby="tab-bookings" tabIndex={0} className="space-y-4 animate-fade-in">
      {/* Compact Emergency Dispatch Strip / Active Urgent Board */}
      {activeDispatches.length === 0 ? (
        <div className="app-card rounded-none px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <Ambulance className="h-4 w-4 text-[color:var(--t-600)] shrink-0" />
            <span className="font-bold text-[color:var(--ink)]">{tx('On-Call Emergency Radar')}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{tx('No urgent dispatches pending nearby')}</span>
          </div>
          <span className="app-badge badge-success">{tx('Live Radar Active')}</span>
        </div>
      ) : (
        <div className="app-card rounded-none border-rose-300 p-4 space-y-3">
          <div className="border-b border-rose-200 pb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <Ambulance className="h-4 w-4 text-rose-600" />
              {tx('Urgent On-Call Emergency Center')} ({activeDispatches.length})
            </h3>
            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-2xs font-bold px-2 py-0.5 rounded-none uppercase tracking-wider animate-pulse">{tx('Live Radar Active')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeDispatches.map(dispatch => {
              const isClaimedByMe = dispatch.doctorId === matchedProfile.id;
              const isClaimedByOthers = dispatch.doctorId !== 'auto' && !isClaimedByMe;

              return (
                <div key={dispatch.id} className={`border p-4 rounded-none space-y-3 transition-colors ${
                  isClaimedByMe ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)]/50' : 'border-rose-200 bg-white'
                }`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="bg-red-50 text-red-700 border border-red-200 text-2xs font-black px-1.5 py-0.5 rounded-none uppercase tracking-wider">{tx('CRITICAL ALERT')}</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{dispatch.patientName}</h4>
                      <p className="text-xs text-slate-400">{(dispatch as any).timestamp}</p>
                    </div>
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded-none ${
                      dispatch.dispatchStatus === 'Pending Dispatch' ? 'bg-amber-100 text-amber-800' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'
                    }`}>
                      {dispatch.dispatchStatus}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 border border-[color:var(--t-100)] space-y-1">
                    <p><strong className="text-slate-800">{tx('Urgent Complaint:')}</strong> {(dispatch as any).reason}</p>
                    <p><strong className="text-slate-800">{tx('Dispatch Location:')}</strong> {(dispatch as any).address}</p>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-rose-600">
                      {(dispatch as any).fee != null ? `${tx('Compensation:')} ${formatMoney((dispatch as any).fee)}` : tx('Standard Emergency Tariff')}
                    </span>
                    {dispatch.etaMinutes ? <span className="text-xs text-slate-400 tabular-nums font-bold">ETA: {dispatch.etaMinutes} mins</span> : null}
                  </div>
                  <div className="pt-2 border-t border-[color:var(--t-100)]">
                    {dispatch.dispatchStatus === 'Pending Dispatch' && (
                      <button onClick={() => onUpdateDispatchStatus(dispatch.id, 'En-Route')} className="btn btn-sm btn-danger whitespace-nowrap w-full">
                        <Ambulance className="h-4 w-4" /><span>{tx('CLAIM EMERGENCY TRANSIT')}</span>
                      </button>
                    )}
                    {dispatch.dispatchStatus === 'En-Route' && isClaimedByMe && (
                      <button onClick={() => onUpdateDispatchStatus(dispatch.id, 'Arrived')} className="btn btn-sm btn-primary whitespace-nowrap w-full">
                        <MapPin className="h-4 w-4" /><span>{tx('MARK ARRIVED AT PATIENT')}</span>
                      </button>
                    )}
                    {dispatch.dispatchStatus === 'Arrived' && isClaimedByMe && (
                      <button onClick={() => onUpdateDispatchStatus(dispatch.id, 'Completed')} className="btn btn-sm btn-primary whitespace-nowrap w-full">
                        <CheckCircle2 className="h-4 w-4" /><span>{tx('COMPLETE CRITICAL CARE DISPATCH')}</span>
                      </button>
                    )}
                    {isClaimedByOthers && (
                      <span className="text-xs text-slate-400 font-bold block text-center italic py-1">{tx('Claimed by another nearby professional')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact Command Bar for Consultations */}
      <div className="app-card rounded-none p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 border border-[color:var(--t-200)] rounded-none bg-[color:var(--t-bg)] px-3 h-10 flex-1 min-w-[220px] max-w-md focus-within:border-[color:var(--t-600)] focus-within:bg-white transition-colors">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tx('Search patient name, ID, or symptoms...')}
            className="flex-1 min-w-0 bg-transparent text-xs text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 placeholder-slate-400 font-medium"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'Upcoming', 'Completed'] as const).map(st => {
            const count = st === 'all' ? myBookings.length : myBookings.filter(b => b.status === st).length;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-none text-xs font-bold border transition-colors ${
                  statusFilter === st
                    ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]'
                    : 'bg-white text-slate-700 border-[color:var(--t-200)] hover:border-[color:var(--t-600)]'
                }`}
              >
                {st === 'all' ? tx('All') : tx(st)} ({count})
              </button>
            );
          })}
          <span className="text-2xs font-bold text-[color:var(--t-700)] tabular-nums bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2.5 py-1 rounded-none ml-1">
            {filteredBookings.length} {filteredBookings.length === 1 ? tx('patient') : tx('patients')}
          </span>
        </div>
      </div>

      {/* Master-Detail Split-Pane Consultation Workstation */}
      {filteredBookings.length === 0 ? (
        <div className="app-card rounded-none p-12 text-center space-y-2">
          <Clock className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">{myBookings.length === 0 ? tx('No Appointments Booked Yet') : tx('No matching consultations')}</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {myBookings.length === 0
              ? tx('When patients register on your public clinical page, their details, symptoms, and scheduling block will compile here.')
              : tx('Try adjusting your search query or status filter.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT PANE: Compact Patient Schedule Queue */}
          <div className="lg:col-span-5 app-card rounded-none p-0 overflow-hidden">
            <div className="bg-[#F4FDFF] border-b border-[color:var(--t-100)] px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--t-700)] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {isDoc ? tx('Patient Consultation Queue') : tx('Home Nursing Schedule')}
              </span>
              <span className="app-badge badge-brand">{filteredBookings.length}</span>
            </div>
            <div className="divide-y divide-[color:var(--t-100)] max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredBookings.map(booking => {
                const isSelected = activeBooking?.id === booking.id;
                const isUpcoming = booking.status === 'Upcoming';
                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => {
                      if (selectedBookingForPrescribe && selectedBookingForPrescribe.id !== booking.id) onCancelPrescription();
                      setSelectedId(booking.id);
                    }}
                    className={`w-full text-left p-3.5 transition-colors block border-l-4 ${
                      isSelected ? 'bg-[color:var(--t-50)]/70 border-l-[color:var(--t-600)]' : 'bg-white hover:bg-[#F4FDFF] border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-500 tabular-nums">{booking.date} · {booking.timeSlot}</span>
                      <span className={`app-badge ${isUpcoming ? 'badge-brand' : 'badge-success'}`}>{booking.status}</span>
                    </div>
                    <div className="text-sm font-bold text-[color:var(--ink)] truncate">{booking.patientName}</div>
                    {booking.symptoms && (
                      <p className="text-xs text-slate-600 truncate mt-0.5">"{booking.symptoms}"</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-[color:var(--t-100)] flex items-center justify-between text-xs text-slate-500">
                      <span>{booking.mode}</span>
                      <span className="font-bold text-[color:var(--ink)] tabular-nums">RM {booking.fee}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: Live Consultation Inspector & Inline Prescribing */}
          <div className="lg:col-span-7">
            {activeBooking && (
              selectedBookingForPrescribe && selectedBookingForPrescribe.id === activeBooking.id ? (
                <div className="app-card rounded-none p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-[color:var(--t-200)] pb-3">
                    <div className="flex items-center gap-2">
                      {isDoc ? (
                        <>
                          <FileSignature className="h-5 w-5 text-[color:var(--t-600)]" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{tx('Issue Doctor-Signed E-Prescription')}</h4>
                            <p className="text-xs text-slate-500">{tx('Clinical consultation sign-off & digital prescription')}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <ClipboardList className="h-5 w-5 text-emerald-600" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{tx('Clinical Nursing Care & Procedure Log')}</h4>
                            <p className="text-xs text-slate-500">{tx('Record patient vitals and nursing procedure')}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button type="button" onClick={onCancelPrescription} className="p-1 hover:bg-[color:var(--t-100)] rounded-none cursor-pointer text-[color:var(--t-600)]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {isDoc ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#F4FDFF] p-3 border border-[color:var(--t-200)]">
                          <span className="text-xs text-slate-400 font-bold block uppercase">{tx('Patient')}</span>
                          <strong className="text-slate-900 text-xs font-bold">{selectedBookingForPrescribe.patientName}</strong>
                          <p className="text-slate-500 tabular-nums mt-0.5">ID: {selectedBookingForPrescribe.patientId}</p>
                        </div>
                        <div className="bg-[#F4FDFF] p-3 border border-[color:var(--t-200)]">
                          <span className="text-xs text-slate-400 font-bold block uppercase">{tx('Consultation Mode')}</span>
                          <strong className="text-slate-900 font-bold">{selectedBookingForPrescribe.mode}</strong>
                          <p className="text-slate-500 tabular-nums mt-0.5">{selectedBookingForPrescribe.date} · {selectedBookingForPrescribe.timeSlot}</p>
                        </div>
                      </div>
                      {selectedBookingForPrescribe.symptoms && (
                        <div className="app-info-box text-xs">
                          <span className="font-bold text-slate-700">{tx('Stated Symptoms:')}</span> "{selectedBookingForPrescribe.symptoms}"
                        </div>
                      )}
                      <ClinicalWorkspace kind="booking" refId={selectedBookingForPrescribe.id} />
                    </div>
                  ) : (
                    <form onSubmit={handleNurseCareLogSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#F4FDFF] p-3 border border-[color:var(--t-200)]">
                          <span className="text-xs text-slate-400 font-bold block uppercase">{tx('Patient')}</span>
                          <strong className="text-slate-900 text-xs font-bold">{selectedBookingForPrescribe.patientName}</strong>
                        </div>
                        <div className="bg-[#F4FDFF] p-3 border border-[color:var(--t-200)]">
                          <span className="text-xs text-slate-400 font-bold block uppercase">{tx('Nursing Duty Mode')}</span>
                          <strong className="text-slate-900 font-bold">{selectedBookingForPrescribe.mode}</strong>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="form-label">{tx('Clinical Nursing Procedure Performed')}</label>
                        <CustomSelect value={nursingProcedure} onChange={(e) => setNursingProcedure(e.target.value)} className="form-select text-xs">
                          <option value="Sterile Wound Dressing (Stage II)">Sterile Wound Dressing (Stage II)</option>
                          <option value="Post-Operative Suture & Drain Care">Post-Operative Suture &amp; Drain Care</option>
                          <option value="IV Cannulation & Infusion Therapy">IV Cannulation &amp; Infusion Therapy</option>
                          <option value="Foley Catheterization & Maintenance">Foley Catheterization &amp; Maintenance</option>
                          <option value="Geriatric Mobility & Fall Prevention Care">Geriatric Mobility &amp; Fall Prevention Care</option>
                        </CustomSelect>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="text-2xs font-bold text-slate-600 block mb-1">BP (mmHg)</label>
                          <input type="text" value={nursingBp} onChange={e => setNursingBp(e.target.value)} className="form-input text-xs tabular-nums" />
                        </div>
                        <div>
                          <label className="text-2xs font-bold text-slate-600 block mb-1">HR (bpm)</label>
                          <input type="text" value={nursingHr} onChange={e => setNursingHr(e.target.value)} className="form-input text-xs tabular-nums" />
                        </div>
                        <div>
                          <label className="text-2xs font-bold text-slate-600 block mb-1">SpO2 (%)</label>
                          <input type="text" value={nursingSpo2} onChange={e => setNursingSpo2(e.target.value)} className="form-input text-xs tabular-nums" />
                        </div>
                        <div>
                          <label className="text-2xs font-bold text-slate-600 block mb-1">Temp (°C)</label>
                          <input type="text" value={nursingTemp} onChange={e => setNursingTemp(e.target.value)} className="form-input text-xs tabular-nums" />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">{tx('Clinical Nursing Notes')}</label>
                        <textarea rows={3} value={nursingNotes} onChange={e => setNursingNotes(e.target.value)} className="form-textarea text-xs" required />
                      </div>
                      <div className="flex justify-end gap-2.5 pt-2 border-t border-[color:var(--t-100)]">
                        <button type="button" onClick={onCancelPrescription} className="btn btn-sm btn-secondary">{tx('Cancel')}</button>
                        <button type="submit" disabled={savingNurseLog} className="btn btn-sm btn-primary">
                          {savingNurseLog ? <><Loader className="h-3.5 w-3.5 animate-spin" /><span>{tx('Saving...')}</span></> : <><CheckCircle2 className="h-3.5 w-3.5" /><span>{tx('Certify & Sign Nursing Log')}</span></>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="app-card rounded-none p-0 overflow-hidden">
                  <div className="p-5 border-b border-[color:var(--t-200)] bg-[#F4FDFF] flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border border-[color:var(--t-200)] flex items-center justify-center font-bold text-[color:var(--t-700)] text-sm">
                        {activeBooking.patientName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[color:var(--ink)]">{activeBooking.patientName}</h3>
                          <span className={`app-badge ${activeBooking.status === 'Upcoming' ? 'badge-brand' : 'badge-success'}`}>{activeBooking.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 tabular-nums mt-0.5">Ref: {activeBooking.patientId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">{isDoc ? tx('Consultation Fee') : tx('Nursing Fee')}</span>
                      <span className="text-base font-bold text-[color:var(--ink)] tabular-nums">RM {activeBooking.fee}</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-[color:var(--t-bg)] p-3 border border-[color:var(--t-200)]">
                        <span className="text-xs text-slate-400 font-bold block uppercase">{tx('Date & Slot')}</span>
                        <span className="text-[color:var(--ink)] font-bold tabular-nums">{activeBooking.date} · {activeBooking.timeSlot}</span>
                      </div>
                      <div className="bg-[color:var(--t-bg)] p-3 border border-[color:var(--t-200)]">
                        <span className="text-xs text-slate-400 font-bold block uppercase">{tx('Consultation Mode')}</span>
                        <span className="text-[color:var(--ink)] font-bold">{activeBooking.mode}</span>
                      </div>
                    </div>

                    {activeBooking.symptoms && (
                      <div className="app-info-box text-xs">
                        <strong className="text-[color:var(--ink)]">{tx('Patient Complaint:')}</strong> "{activeBooking.symptoms}"
                      </div>
                    )}

                    {activeBooking.prescription && (
                      <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[#065F46] font-bold uppercase tracking-wider">
                          <Check className="h-4 w-4" />
                          {tx('Issued Doctor E-Prescription')}
                        </div>
                        <p><strong className="text-slate-800">{tx('Diagnosis:')}</strong> {activeBooking.prescription.diagnosis}</p>
                        <p><strong className="text-slate-800">{tx('Medicines:')}</strong> {activeBooking.prescription.medicines}</p>
                        <p><strong className="text-slate-800">{tx('Instructions:')}</strong> {activeBooking.prescription.instructions}</p>
                      </div>
                    )}

                    {activeBooking.nursingCareLog && (
                      <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 text-xs space-y-2">
                        <div className="flex items-center justify-between text-[#065F46] font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5"><Check className="h-4 w-4" />{tx('Completed Nursing Care Log')}</span>
                          <span className="app-badge badge-success">{tx('LJM Certified')}</span>
                        </div>
                        <p><strong className="text-slate-800">{tx('Procedure:')}</strong> {activeBooking.nursingCareLog.procedurePerformed}</p>
                        {activeBooking.nursingCareLog.vitals && (
                          <div className="flex flex-wrap gap-2 text-xs tabular-nums">
                            <span className="bg-white px-2 py-0.5 border border-[#A7F3D0] font-bold">BP: {activeBooking.nursingCareLog.vitals.bloodPressure || 'N/A'}</span>
                            <span className="bg-white px-2 py-0.5 border border-[#A7F3D0] font-bold">HR: {activeBooking.nursingCareLog.vitals.heartRate ? `${activeBooking.nursingCareLog.vitals.heartRate} bpm` : 'N/A'}</span>
                            <span className="bg-white px-2 py-0.5 border border-[#A7F3D0] font-bold">SpO2: {activeBooking.nursingCareLog.vitals.spO2 ? `${activeBooking.nursingCareLog.vitals.spO2}%` : 'N/A'}</span>
                            <span className="bg-white px-2 py-0.5 border border-[#A7F3D0] font-bold">Temp: {activeBooking.nursingCareLog.vitals.temperature ? `${activeBooking.nursingCareLog.vitals.temperature} °C` : 'N/A'}</span>
                          </div>
                        )}
                        <p className="text-slate-600"><strong className="text-slate-800">{tx('Notes:')}</strong> {activeBooking.nursingCareLog.clinicalNotes}</p>
                      </div>
                    )}
                  </div>

                  {activeBooking.status === 'Upcoming' && (
                    <div className="p-4 bg-[#F4FDFF] border-t border-[color:var(--t-200)] flex justify-end">
                      <button onClick={() => onStartPrescription(activeBooking)} className="btn btn-sm btn-primary">
                        {isDoc ? (
                          <><FileSignature className="h-3.5 w-3.5" /><span>{tx('Diagnose & Prescribe')}</span></>
                        ) : (
                          <><ClipboardList className="h-3.5 w-3.5" /><span>{tx('Record Nursing Care Log')}</span></>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
