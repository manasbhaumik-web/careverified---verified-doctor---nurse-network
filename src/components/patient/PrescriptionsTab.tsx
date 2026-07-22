import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, FileSignature, CheckCircle2, Eye, Calendar, ShieldCheck, Stethoscope, Download, RefreshCw
} from 'lucide-react';
import { Booking } from '../../types';

interface PrescriptionsTabProps {
  prescriptionBookings: Booking[];
  onViewPrescription: (booking: Booking) => void;
  onRequestRefill: () => void;
}

export default function PrescriptionsTab({
  prescriptionBookings,
  onViewPrescription,
  onRequestRefill
}: PrescriptionsTabProps) {

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6" id="patient-prescriptions-tab-root">
      {/* Header Area */}
      <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-teal-700 bg-teal-50 border border-teal-100/50 px-2.5 py-0.5 rounded-md mb-2">
            Secure Pharmacotherapy
          </span>
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            E-Prescriptions & Rx Plans
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Official digital medical certificates, pharmacotherapy records, and verified electronic scripts.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {}}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black px-4 py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={onRequestRefill}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-5 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 duration-200 cursor-pointer shrink-0"
          >
            <RefreshCw className="h-4 w-4 text-teal-400" />
            <span>Request Rx Refill</span>
          </button>
        </div>
      </div>

      {prescriptionBookings.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200/60 rounded-[32px] py-20 px-8 text-center space-y-5 shadow-sm max-w-2xl mx-auto"
        >
          <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-black text-slate-800 tracking-tight">No active prescriptions</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
              Once our board-certified clinical practitioners issue official electronic scripts for you, they will appear here with dynamic verification stamps.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-teal-500/20"
              >
                <Stethoscope className="h-4 w-4" />
                Book Consultation
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {prescriptionBookings.map((b) => (
            <motion.div 
              variants={itemVariants}
              key={b.id} 
              className="group relative bg-white border border-slate-200/80 hover:border-teal-500/40 rounded-[28px] p-6 shadow-sm transition-all duration-300 flex flex-col justify-between space-y-5 overflow-hidden hover:shadow-lg"
            >
              {/* Rx background watermark styling */}
              <div className="absolute top-8 right-6 text-slate-50 text-7xl font-black select-none pointer-events-none group-hover:text-teal-50/50 transition-colors duration-300">
                Rx
              </div>

              <div className="space-y-5 relative z-10">
                {/* Issued practitioner card details */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest block">
                      Licensed Practitioner
                    </span>
                    <h4 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors duration-200">{b.professionalName}</h4>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 text-[11px] font-black px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5 shrink-0 shadow-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 
                    <span>Verified Registry Rx</span>
                  </span>
                </div>

                {/* Patient / Diagnosis Board */}
                <div className="bg-slate-50/80 border border-slate-200/80 p-4 rounded-2xl text-xs space-y-3 group-hover:bg-teal-50/30 transition-colors duration-300">
                  <div className="flex justify-between items-center font-bold text-slate-400 text-[11px] uppercase tracking-wider">
                    <span>Clinical Diagnosis</span>
                    <span>Issued Date</span>
                  </div>
                  <div className="flex justify-between items-center font-black text-slate-800 text-[11px] gap-4">
                    <span className="truncate max-w-[180px] bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-slate-800 shadow-xs">
                      {b.prescription?.diagnosis}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-500 bg-white border border-slate-200/80 px-2 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-teal-600" />
                      {b.prescription?.issuedAt ? b.prescription.issuedAt.split('T')[0] : b.date}
                    </span>
                  </div>
                </div>

                {/* Prescribed Pharmacotherapy List */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-500 font-black uppercase tracking-widest block px-1">Active Medical Plan & Dosage:</span>
                  <div className="text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 p-4 rounded-2xl italic shadow-xs border-l-4 border-l-teal-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-50/50 via-transparent to-transparent opacity-50 pointer-events-none"></div>
                    <span className="relative z-10 block whitespace-pre-wrap leading-relaxed">"{b.prescription?.medicines}"</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-4 relative z-10 mt-2">
                <span className="text-xs font-black text-slate-400 font-mono tracking-wider bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  RX REF: {b.id.substring(0, 8).toUpperCase()}
                </span>
                <button
                  onClick={() => onViewPrescription(b)}
                  className="bg-white hover:bg-teal-600 text-slate-700 hover:text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all border border-slate-200 hover:border-teal-600 flex items-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Print Rx Slip</span>
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
