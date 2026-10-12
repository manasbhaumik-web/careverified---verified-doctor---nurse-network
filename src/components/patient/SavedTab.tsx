import React from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, Trash2, Stethoscope, MapPin, Star, ShieldCheck, MessageSquare, CalendarRange, CheckCircle2, Search
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
    <div className="space-y-6" id="patient-saved-tab-root">
      {/* Header Panel */}
      <div className="border-b border-[color:var(--t-200)] pb-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2.5 py-1 mb-2 shadow-2xs">
          Clinical Network Directory
        </span>
        <h3 className="font-display font-black text-xl text-[color:var(--ink)] tracking-tight flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
          Saved Clinical Specialists
        </h3>
        <p className="text-xs text-slate-600 font-medium mt-1">
          Recall trusted providers instantly for immediate chat, streamlined scheduling, or registry checks.
        </p>
      </div>

      {savedProfessionals.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-dashed border-[color:var(--t-200)] py-16 px-6 text-center space-y-4 shadow-xs max-w-xl mx-auto"
        >
          <div className="h-14 w-14 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center mx-auto text-[color:var(--t-600)] shadow-2xs">
            <Heart className="h-6 w-6 text-[color:var(--t-600)]" />
          </div>
          <div className="space-y-2">
            <h4 className="font-display font-black text-base text-[color:var(--ink)] tracking-tight">Your bookmarks directory is empty</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto font-medium">
              Bookmark licensed clinicians or registered specialists in the practice search registry to organize your medical care network.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 min-h-[42px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer"
              >
                <Search className="h-4 w-4" />
                Explore Practitioner Registry
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {savedProfessionals.map((p) => {
            const isDoc = p.role === UserRole.DOCTOR;
            return (
              <motion.div 
                variants={itemVariants}
                key={p.id} 
                className="group relative bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-5 shadow-xs transition-all duration-300 flex flex-col justify-between space-y-4 hover:shadow-md"
              >
                <div className="space-y-4 pt-1">
                  {/* Avatar and name banner */}
                  <div className="flex gap-3.5 items-start justify-between">
                    <div className="flex gap-3.5 items-center min-w-0">
                      <div className="relative shrink-0">
                        <img 
                          src={p.avatar} 
                          alt={p.name} 
                          className="h-13 w-13 rounded-full object-cover border border-[color:var(--t-200)] shadow-2xs group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 border border-white rounded-full h-3 w-3 shadow-2xs" />
                      </div>
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)] mb-1">
                          {isDoc ? "Verified Doctor" : "Clinical Nurse"}
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                        </span>
                        <h4 className="font-display font-black text-sm text-[color:var(--ink)] leading-snug group-hover:text-[color:var(--t-600)] transition-colors truncate">{p.name}</h4>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => onRemoveSaved(p.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all cursor-pointer bg-white shrink-0"
                      title="Remove bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Specialty and clinical baseline */}
                  <div className="space-y-2 text-xs text-slate-600 font-medium bg-[color:var(--t-50)]/50 p-3.5 border border-[color:var(--t-200)]">
                    <div className="flex items-center gap-2 text-[color:var(--ink)] font-bold">
                      <span className="bg-white p-1 border border-[color:var(--t-200)] shadow-2xs"><Stethoscope className="h-3.5 w-3.5 text-[color:var(--t-600)]" /></span>
                      <span className="truncate">{p.specialization}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="bg-white p-1 border border-[color:var(--t-200)] shadow-2xs"><MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)]" /></span>
                      <span className="truncate">{p.city} &bull; {p.practiceAddress.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[color:var(--t-100)] pt-2.5 mt-2 flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        <span className="text-[color:var(--ink)] font-bold">{p.rating}</span>
                        <span className="text-slate-400 font-medium text-[11px]">({p.reviewCount})</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[color:var(--t-700)] bg-white border border-[color:var(--t-200)] px-2 py-0.5 shadow-2xs">
                        RM {p.fee}/consult
                      </span>
                    </div>
                  </div>
                </div>

                {/* Practical actions footer */}
                <div className="border-t border-[color:var(--t-100)] pt-3.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onNavigateToMessages}
                      className="min-h-[38px] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                      <span>Message</span>
                    </button>
                    <button
                      onClick={() => onSelectProfessional(p.id)}
                      className="min-h-[38px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-[color:var(--t-700)]"
                    >
                      <CalendarRange className="h-3.5 w-3.5" />
                      <span>Book Slot</span>
                    </button>
                  </div>
                  <button
                    onClick={() => onVerifyCredentials(p)}
                    className="w-full min-h-[36px] bg-[color:var(--t-50)] border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--t-600)] text-[11px] font-bold py-1.5 px-3 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Verify Board Credentials</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
