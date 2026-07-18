import React from 'react';
import { 
  Heart, Trash2, Stethoscope, MapPin, Star, ShieldCheck, CheckCircle2, MessageSquare, CalendarRange 
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole } from '../../types';

interface SavedTabProps {
  savedProfessionals: (DoctorProfile | NurseProfile)[];
  onRemoveSaved: (id: string) => void;
  onNavigateToMessages: () => void;
  onSelectProfessional: (id: string) => void;
  onVerifyCredentials: (p: DoctorProfile | NurseProfile) => void;
}

export default function SavedTab({
  savedProfessionals,
  onRemoveSaved,
  onNavigateToMessages,
  onSelectProfessional,
  onVerifyCredentials
}: SavedTabProps) {
  return (
    <div className="space-y-6 animate-fade-in animate-duration-300" id="patient-saved-tab-root">
      {/* Header Panel */}
      <div className="border-b border-slate-100 pb-5">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#0d9488] bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-md mb-2">
          Clinical Network Directory
        </span>
        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
          Saved Clinical Specialists
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Recall trusted providers instantly for immediate chat, streamlined scheduling, or registry checks.
        </p>
      </div>

      {savedProfessionals.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-[28px] py-20 px-8 text-center space-y-5 shadow-sm max-w-2xl mx-auto">
          <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <Heart className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-black text-slate-800 tracking-tight">Your bookmarks directory is empty</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
              Bookmark licensed clinicians or registered specialists in the practice search registry to organize your medical care network.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedProfessionals.map((p) => {
            const isDoc = p.role === UserRole.DOCTOR;
            return (
              <div 
                key={p.id} 
                className="group bg-white border border-slate-200/90 hover:border-teal-500/30 rounded-[28px] p-6 shadow-sm transition-all duration-300 flex flex-col justify-between space-y-5 hover:shadow-[0_12px_24px_rgba(13,148,136,0.05)]"
              >
                <div className="space-y-4">
                  {/* Avatar and name banner */}
                  <div className="flex gap-4 items-start justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="relative">
                        <img 
                          src={p.avatar} 
                          alt={p.name} 
                          className="h-14 w-14 rounded-2xl object-cover border border-slate-150 shadow-xs shrink-0 group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white rounded-full h-3.5 w-3.5" />
                      </div>
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2.5 py-0.5 rounded-md border ${
                          isDoc ? "bg-teal-50/50 text-[#0d9488] border-teal-100/60" : "bg-indigo-50/50 text-indigo-700 border-indigo-100/60"
                        }`}>
                          {isDoc ? "Verified Medical Doctor" : "Registered Nurse Specialist"}
                        </span>
                        <h4 className="text-base font-black text-slate-900 leading-tight mt-0.5">{p.name}</h4>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => onRemoveSaved(p.id)}
                      className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                      title="Remove bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Specialty and clinical baseline */}
                  <div className="space-y-2 text-xs text-slate-600 font-semibold bg-slate-50/80 p-4 rounded-2xl border border-slate-150/50">
                    <p className="flex items-center gap-2 text-slate-800 font-black">
                      <Stethoscope className="h-4 w-4 text-[#0d9488] shrink-0" />
                      <span>{p.specialization}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-500">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{p.city} &bull; {p.practiceAddress.split(',')[0]}</span>
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1 flex-wrap gap-2">
                      <p className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        <span className="text-slate-800 font-black">{p.rating}</span>
                        <span className="text-slate-400 font-medium">({p.reviewCount} reviews)</span>
                      </p>
                      <span className="text-[10px] font-mono text-[#0d9488] bg-teal-50 px-2 py-0.5 rounded">
                        RM {p.fee}/consult
                      </span>
                    </div>
                  </div>
                </div>

                {/* Practical actions footer */}
                <div className="border-t border-slate-100 pt-4 space-y-3 mt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={onNavigateToMessages}
                      className="border border-slate-250 hover:bg-slate-50 text-slate-700 text-xs font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                      <span>Send Chat</span>
                    </button>
                    <button
                      onClick={() => onSelectProfessional(p.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CalendarRange className="h-3.5 w-3.5" />
                      <span>Book Slot</span>
                    </button>
                  </div>
                  <button
                    onClick={() => onVerifyCredentials(p)}
                    className="w-full bg-[#0d9488]/5 border border-[#0d9488]/25 hover:bg-[#0d9488]/10 text-[#0d9488] text-xs font-black py-3 px-3 rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#0d9488]" />
                    <span>Verify Board License Credentials</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

