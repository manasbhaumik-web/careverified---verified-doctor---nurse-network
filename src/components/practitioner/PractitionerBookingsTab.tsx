import React from 'react';
import {
  FileSignature, X, ShieldCheck, Loader, Ambulance, MapPin, CheckCircle2, Calendar, Clock, Check
} from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking, OnCallDispatch } from '../../types';

interface PractitionerBookingsTabProps {
  matchedProfile: DoctorProfile | NurseProfile;
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
  const activeDispatches = dispatches.filter(d => d.dispatchStatus !== 'Completed');

  return (
    <div id="panel-bookings" role="tabpanel" aria-labelledby="tab-bookings" tabIndex={0} className="space-y-6 animate-fade-in">
      {/* E-Prescription Floating Form / Modal */}
      {selectedBookingForPrescribe && (
        <div className="bg-[color:var(--t-50)]/70 border-2 border-[color:var(--t-200)] rounded-none p-6 space-y-4 shadow-sm max-w-2xl mx-auto">
          <div className="flex justify-between items-center border-b border-[color:var(--t-200)] pb-3">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-[color:var(--t-600)]" />
              <h4 className="text-sm font-black text-slate-900">Issue Official Digitally Signed E-Prescription</h4>
            </div>
            <button
              type="button"
              onClick={onCancelPrescription}
              className="p-1 hover:bg-[color:var(--t-100)] rounded-none cursor-pointer text-[color:var(--t-600)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={onSubmitPrescription} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-3 rounded-none border border-[color:var(--t-200)]">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Patient Identity</span>
                <strong className="text-slate-800 text-sm font-extrabold">{selectedBookingForPrescribe.patientName}</strong>
                <p className="text-slate-500 font-semibold mt-0.5">ID Ref: {selectedBookingForPrescribe.patientId}</p>
              </div>
              <div className="bg-white p-3 rounded-none border border-[color:var(--t-200)]">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Consultation Mode</span>
                <strong className="text-slate-800 font-extrabold">{selectedBookingForPrescribe.mode}</strong>
                <p className="text-slate-500 font-semibold mt-0.5">Date: {selectedBookingForPrescribe.date} &bull; {selectedBookingForPrescribe.timeSlot}</p>
              </div>
            </div>

            {selectedBookingForPrescribe.symptoms && (
              <div className="bg-white p-3 rounded-none border border-[color:var(--t-200)]/50 text-xs text-slate-600">
                <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Stated Symptoms at Booking</span>
                "{selectedBookingForPrescribe.symptoms}"
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Diagnosis & Findings</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Upper Respiratory Tract Infection (URTI)"
                  value={prescribeDiagnosis}
                  onChange={(e) => setPrescribeDiagnosis(e.target.value)}
                  className="w-full text-xs border border-[color:var(--t-200)] rounded-none py-2 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-800 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prescribed Pharmacotherapy (Medicines & Dosage)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 1. Tab Paracetamol 500mg - 2 tabs QDS (PRN Fever)&#10;2. Syrup Diphenhydramine 10ml - TDS (Cough)"
                  value={prescribeMeds}
                  onChange={(e) => setPrescribeMeds(e.target.value)}
                  className="w-full text-xs border border-[color:var(--t-200)] rounded-none p-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-800 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specific Care & Lifestyle Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Plenty of oral fluids. Avoid cold food items. Strict rest for 3 days."
                  value={prescribeInstructions}
                  onChange={(e) => setPrescribeInstructions(e.target.value)}
                  className="w-full text-xs border border-[color:var(--t-200)] rounded-none py-2 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-800 bg-white"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-100 p-3 rounded-none border border-[color:var(--t-200)] flex gap-2.5 items-start">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                By signing this e-prescription, you certify that you have reviewed the patient's record, performed clinical validation, and your digital MMC/LJM registration credentials will be embedded into the PDF slip.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onCancelPrescription}
                className="border border-[color:var(--t-200)] text-slate-600 text-xs font-bold px-5 py-2 rounded-none hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={issuingPrescription}
                className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] disabled:bg-slate-300 text-white text-xs font-black px-6 py-2 rounded-none transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                {issuingPrescription ? (
                  <>
                    <Loader className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating Encrypted Prescription...</span>
                  </>
                ) : (
                  <>
                    <FileSignature className="h-3.5 w-3.5" />
                    <span>Generate & Sign E-Prescription</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Emergency Ambulance Dispatch Board */}
      <div className="bg-white border border-[color:var(--t-200)] rounded-none p-6 shadow-3xs space-y-4">
        <div className="border-b border-[color:var(--t-200)] pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
              <Ambulance className="h-4.5 w-4.5 text-rose-500 animate-bounce" />
              Urgent On-Call Emergency Center
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Claim active emergency dispatch tickets requested by high-risk patients nearby.</p>
          </div>
          <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider animate-pulse">Live Radar Active</span>
        </div>

        {activeDispatches.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 border border-dashed border-[color:var(--t-200)] rounded-none text-xs text-slate-500 space-y-2">
            <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="font-bold">No Urgent Emergency Dispatches Pending</p>
            <p className="text-[10px] text-slate-400 max-w-sm mx-auto">Standard municipal emergency channels are quiet. If an emergency is triggered by a nearby patient, it will instantly blink here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeDispatches.map(dispatch => {
              const isClaimedByMe = dispatch.doctorId === matchedProfile.id;
              const isClaimedByOthers = dispatch.doctorId !== 'auto' && !isClaimedByMe;

              return (
                <div key={dispatch.id} className={`border p-4.5 rounded-none space-y-3.5 transition-all relative ${
                  isClaimedByMe
                    ? 'border-[color:var(--t-200)] bg-[color:var(--t-50)]/50'
                    : 'border-[color:var(--t-200)] bg-white hover:border-slate-350'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="bg-red-50 text-red-700 border border-red-100 text-[8px] font-black px-1.5 py-0.5 rounded-none uppercase tracking-wider">CRITICAL ALERT</span>
                      <h4 className="text-sm font-black text-slate-900">{dispatch.patientName}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{(dispatch as any).timestamp}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none ${
                      dispatch.dispatchStatus === 'Pending Dispatch'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'
                    }`}>
                      {dispatch.dispatchStatus}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-none border border-[color:var(--t-200)] space-y-1">
                    <p><strong className="text-slate-800 font-bold">Urgent Complaint:</strong> {(dispatch as any).reason}</p>
                    <p><strong className="text-slate-800 font-bold">Dispatch Location:</strong> {(dispatch as any).address}</p>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-rose-600">Base Compensation: RM 250</span>
                    {dispatch.etaMinutes ? (
                      <span className="text-[10px] text-slate-400 font-mono font-bold">ETA: {dispatch.etaMinutes} mins</span>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t border-[color:var(--t-200)]">
                    {dispatch.dispatchStatus === 'Pending Dispatch' && (
                      <button
                        onClick={() => onUpdateDispatchStatus(dispatch.id, 'En-Route')}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black py-2 rounded-none transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Ambulance className="h-4 w-4" />
                        <span>CLAIM EMERGENCY TRANSIT</span>
                      </button>
                    )}

                    {dispatch.dispatchStatus === 'En-Route' && isClaimedByMe && (
                      <button
                        onClick={() => onUpdateDispatchStatus(dispatch.id, 'Arrived')}
                        className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[11px] font-black py-2 rounded-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MapPin className="h-4 w-4" />
                        <span>MARK ARRIVED AT PATIENT</span>
                      </button>
                    )}

                    {dispatch.dispatchStatus === 'Arrived' && isClaimedByMe && (
                      <button
                        onClick={() => onUpdateDispatchStatus(dispatch.id, 'Completed')}
                        className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[11px] font-black py-2 rounded-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>✅ COMPLETE CRITICAL CARE DISPATCH</span>
                      </button>
                    )}

                    {isClaimedByOthers && (
                      <span className="text-xs text-slate-400 font-bold block text-center italic py-1">Claimed by another nearby professional</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scheduled Clinical Consultations List */}
      <div className="bg-white border border-[color:var(--t-200)] rounded-none p-6 shadow-3xs space-y-4">
        <div className="border-b border-[color:var(--t-200)] pb-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-4.5 w-4.5 text-[color:var(--t-600)]" />
            Scheduled Consultations ({myBookings.length})
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Review appointments booked by patients and generate e-prescriptions upon consultation completion.</p>
        </div>

        {myBookings.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Clock className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Appointments Booked Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              When patients register on your public clinical page, their details, symptoms, and scheduling block will compile here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myBookings.map((booking) => {
              const isUpcoming = booking.status === 'Upcoming';

              return (
                <div key={booking.id} className="border border-[color:var(--t-200)] p-4 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:border-slate-300 transition-colors">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-slate-100 rounded-none flex items-center justify-center font-bold text-slate-700 text-xs">
                        {booking.patientName[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">{booking.patientName}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono">ID Ref: {booking.patientId}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 max-w-md bg-slate-50/50 p-2.5 rounded-none border border-[color:var(--t-200)]/50">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Date & Slot</span>
                        <span className="text-slate-800 font-extrabold">{booking.date}</span> &bull; <span className="font-mono text-slate-700 font-bold">{booking.timeSlot}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Consultation Mode</span>
                        <span className="text-slate-800 font-extrabold">{booking.mode}</span>
                      </div>
                    </div>

                    {booking.symptoms && (
                      <p className="text-xs text-slate-600">
                        <strong className="text-slate-800 font-bold">Patient Complaint:</strong> "{booking.symptoms}"
                      </p>
                    )}

                    {booking.prescription && (
                      <div className="bg-emerald-50/30 border border-emerald-150 p-3 rounded-none text-xs space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
                          <Check className="h-4 w-4 text-emerald-600" />
                          Issued E-Prescription
                        </div>
                        <p><strong className="text-slate-800 font-bold">Diagnosis:</strong> {booking.prescription.diagnosis}</p>
                        <p><strong className="text-slate-800 font-bold">Medicines:</strong> {booking.prescription.medicines}</p>
                        <p><strong className="text-slate-800 font-bold">Instructions:</strong> {booking.prescription.instructions}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start sm:items-end justify-between shrink-0 gap-3">
                    <div className="space-y-1 sm:text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Consultation Fee</span>
                      <span className="text-sm font-black text-slate-900">RM {booking.fee}</span>
                      <span className={`block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none text-center border mt-1 ${
                        isUpcoming
                          ? 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border-[color:var(--t-200)]'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    {isUpcoming && (
                      <button
                        onClick={() => onStartPrescription(booking)}
                        className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-[10px] font-black py-2 px-4 rounded-none transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                      >
                        <FileSignature className="h-3.5 w-3.5" />
                        <span>Diagnose & Prescribe</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
