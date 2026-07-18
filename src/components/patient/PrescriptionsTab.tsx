import React from 'react';
import { 
  FileText, FileSignature, CheckCircle2, Eye, ShieldCheck, HeartPulse, Sparkles, Calendar 
} from 'lucide-react';
import { Booking } from '../../types';

interface PrescriptionsTabProps {
  prescriptionBookings: Booking[];
  onViewPrescription: (booking: Booking) => void;
  onWritePrescription: () => void;
}

export default function PrescriptionsTab({
  prescriptionBookings,
  onViewPrescription,
  onWritePrescription
}: PrescriptionsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in animate-duration-300" id="patient-prescriptions-tab-root">
      {/* Header Area */}
      <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#0d9488] bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-md mb-2">
            Secure Pharmacotherapy
          </span>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0d9488]" />
            E-Prescriptions & Rx Plans
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Official digital medical certificates, pharmacotherapy records, and verified electronic scripts.
          </p>
        </div>
        <button
          onClick={onWritePrescription}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-5 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 duration-200 cursor-pointer shrink-0"
        >
          <FileSignature className="h-4 w-4" />
          <span>Write Prescription Draft</span>
        </button>
      </div>

      {prescriptionBookings.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-[28px] py-20 px-8 text-center space-y-5 shadow-sm max-w-2xl mx-auto">
          <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-black text-slate-800 tracking-tight">No active prescriptions</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
              Once our board-certified clinical practitioners issue official electronic scripts for you, they will appear here with dynamic verification stamps.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prescriptionBookings.map((b) => (
            <div 
              key={b.id} 
              className="group relative bg-white border border-slate-200/90 hover:border-teal-500/30 rounded-[28px] p-6 shadow-sm transition-all duration-300 flex flex-col justify-between space-y-5 overflow-hidden hover:shadow-[0_12px_24px_rgba(13,148,136,0.05)]"
            >
              {/* Rx background watermark styling */}
              <div className="absolute top-8 right-6 text-slate-50 text-7xl font-black select-none pointer-events-none group-hover:text-teal-50/50 transition-colors duration-300">
                Rx
              </div>

              <div className="space-y-4 relative z-10">
                {/* Issued practitioner card details */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">
                      Licensed Practitioner
                    </span>
                    <h4 className="text-base font-black text-slate-900 group-hover:text-[#0d9488] transition-colors duration-200">{b.professionalName}</h4>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1 shrink-0 shadow-2xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 
                    <span>Verified Registry Rx</span>
                  </span>
                </div>

                {/* Patient / Diagnosis Board */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs space-y-3">
                  <div className="flex justify-between items-center font-bold text-slate-400 text-[9px] uppercase tracking-wider">
                    <span>Clinical Diagnosis</span>
                    <span>Issued Date</span>
                  </div>
                  <div className="flex justify-between items-center font-black text-slate-800 text-[11px] gap-4">
                    <span className="truncate max-w-[180px] bg-white border border-slate-200/60 px-2.5 py-1 rounded-lg text-slate-800 shadow-3xs">{b.prescription?.diagnosis}</span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500 bg-white border border-slate-200/60 px-2 py-1 rounded-lg shadow-3xs flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {b.prescription?.issuedAt ? b.prescription.issuedAt.split('T')[0] : b.date}
                    </span>
                  </div>
                </div>

                {/* Prescribed Pharmacotherapy List */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Active Medical Plan & Dosage:</span>
                  <div className="text-xs font-semibold text-slate-700 bg-teal-50/20 border border-teal-100/50 p-3.5 rounded-2xl italic pl-4 border-l-4 border-l-[#0d9488]">
                    "{b.prescription?.medicines}"
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-4 relative z-10 mt-1">
                <span className="text-[10px] font-black text-slate-400 font-mono tracking-wider">RX REF ID: {b.id.substring(0, 8).toUpperCase()}</span>
                <button
                  onClick={() => onViewPrescription(b)}
                  className="bg-slate-50 hover:bg-teal-50 hover:text-[#0d9488] text-slate-700 text-xs font-black px-4 py-2.5 rounded-xl transition-all border border-slate-200/60 hover:border-teal-200 flex items-center gap-1.5 hover:scale-[1.01] cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Print Rx Slip</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

