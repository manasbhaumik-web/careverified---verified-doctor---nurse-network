import React from 'react';
import { 
  Calendar, Clock, MapPin, Video, Trash2, ShieldCheck, Heart, User, CheckCircle2 
} from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking, UserRole, ConsultationMode } from '../../types';

interface AppointmentsTabProps {
  upcomingBookings: Booking[];
  professionals: (DoctorProfile | NurseProfile)[];
  onCancelBooking: (id: string) => void;
  onStartVideoCall: (booking: Booking) => void;
}

export default function AppointmentsTab({
  upcomingBookings,
  professionals,
  onCancelBooking,
  onStartVideoCall
}: AppointmentsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in animate-duration-300" id="patient-appointments-tab-root">
      {/* Header section with modern pill title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#0d9488] bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-md mb-2">
            Secure Live Schedule
          </span>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#0d9488]" />
            Upcoming Consultations
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Verified clinical consultations backed by live medical council board license credentials.
          </p>
        </div>
      </div>

      {upcomingBookings.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-[28px] py-20 px-8 text-center space-y-5 shadow-sm max-w-2xl mx-auto">
          <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-black text-slate-800 tracking-tight">No upcoming consultations found</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
              You do not have any active appointments. Explore and book licensed clinical professionals in the search hub to begin.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingBookings.map((b) => {
            const matchedProf = professionals.find(p => p.id === b.professionalId);
            const isVideo = b.mode === ConsultationMode.VIDEO;
            
            return (
              <div 
                key={b.id} 
                className="group relative bg-white border border-slate-200/90 hover:border-teal-500/30 rounded-[28px] p-6 shadow-sm transition-all duration-300 flex flex-col justify-between space-y-6 overflow-hidden hover:shadow-[0_12px_24px_rgba(13,148,136,0.05)]"
              >
                {/* Visual Accent Bar */}
                <div className={`absolute top-0 left-0 right-0 h-[4px] transition-all duration-300 ${
                  isVideo ? 'bg-[#0d9488]' : 'bg-indigo-500'
                }`} />

                {/* Top Badge Indicators */}
                <div className="flex justify-between items-center">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider border ${
                    isVideo 
                      ? 'bg-teal-50/50 text-[#0d9488] border-teal-100' 
                      : 'bg-indigo-50/50 text-indigo-700 border-indigo-100'
                  }`}>
                    {isVideo ? '📹 Secure Video Telehealth' : '🏥 In-Clinic Visit'}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                    REF: {b.id.substring(0, 8)}
                  </span>
                </div>

                {/* Professional Details Section */}
                <div className="space-y-4">
                  <div className="flex gap-4 items-center">
                    <div className="relative">
                      {matchedProf?.avatar ? (
                        <img 
                          src={matchedProf.avatar} 
                          alt={b.professionalName} 
                          className={`h-14 w-14 rounded-2xl object-cover border-2 shadow-xs shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                            isVideo ? 'border-teal-100' : 'border-indigo-100'
                          }`}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-teal-50 text-[#0d9488] font-bold flex items-center justify-center text-lg border border-teal-100 shadow-xs shrink-0">
                          🩺
                        </div>
                      )}
                      
                      {/* Live flashing online ring for Telehealth */}
                      {isVideo && (
                        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">
                          {b.professionalRole === UserRole.DOCTOR ? 'Medical Specialist (MD)' : 'Clinical Specialist Nurse'}
                        </span>
                        <CheckCircle2 className="h-3 w-3 text-teal-600" />
                      </div>
                      <h4 className="text-base font-black text-slate-900 group-hover:text-[#0d9488] transition-colors duration-200">{b.professionalName}</h4>
                      {matchedProf && (
                        <p className="text-[10px] font-bold text-slate-400 font-mono">
                          REG: {matchedProf.licenseNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Consultation Timing grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700 bg-slate-50/60 border border-slate-100 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#0d9488] shrink-0" />
                      <div>
                        <span className="block text-[8px] text-slate-400 font-black uppercase tracking-widest">Date</span>
                        <span className="text-slate-800 font-black text-[11px]">{b.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#0d9488] shrink-0" />
                      <div>
                        <span className="block text-[8px] text-slate-400 font-black uppercase tracking-widest">Time Slot</span>
                        <span className="text-slate-800 font-black text-[11px]">{b.timeSlot}</span>
                      </div>
                    </div>
                  </div>

                  {/* Patient Symptom Brief */}
                  {b.symptoms && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-150 p-3.5 rounded-2xl">
                      <strong className="text-slate-700 block text-[9px] font-black uppercase tracking-wider mb-1">Stated Symptoms & Concerns:</strong>
                      <span className="italic font-medium text-slate-500">"{b.symptoms}"</span>
                    </div>
                  )}

                  {/* In-person Clinic Address Details */}
                  {!isVideo && matchedProf && (
                    <div className="text-[11px] text-slate-600 bg-indigo-50/10 border border-indigo-100/40 p-3.5 rounded-2xl space-y-1.5">
                      <span className="text-[9px] uppercase tracking-widest text-indigo-700 block font-black">Clinic Practice Address:</span>
                      <p className="flex items-start gap-1.5 text-slate-800 font-bold">
                        <MapPin className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span>{matchedProf.practiceAddress}, {matchedProf.city}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Consultation Actions */}
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3 mt-2">
                  <button
                    onClick={() => onCancelBooking(b.id)}
                    className="text-xs font-black text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    Cancel Appointment
                  </button>

                  {isVideo ? (
                    <button
                      onClick={() => onStartVideoCall(b)}
                      className="bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-black px-5 py-3 rounded-xl transition-all shadow-md shadow-teal-600/10 flex items-center gap-2 hover:scale-[1.01] active:scale-95 duration-200 cursor-pointer relative"
                    >
                      <Video className="h-4 w-4 shrink-0" />
                      <span>Join Secured Telehealth Room</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-indigo-800 bg-indigo-50 font-black uppercase border border-indigo-150 px-3 py-2 rounded-xl">
                      <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                      Outpatient Walk-In
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

