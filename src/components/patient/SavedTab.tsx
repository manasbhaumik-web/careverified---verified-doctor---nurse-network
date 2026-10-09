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
      <div className="border-b border-slate-100 pb-5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-[color:var(--t-600)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2.5 py-0.5 rounded-md mb-2">
          Clinical Network Directory
        </span>
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
          Saved Clinical Specialists
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Recall trusted providers instantly for immediate chat, streamlined scheduling, or registry checks.
        </p>
      </div>

      {savedProfessionals.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200/60 rounded-[32px] py-20 px-8 text-center space-y-5 shadow-sm max-w-2xl mx-auto"
        >
          <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <Heart className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-black text-slate-800 tracking-tight">Your bookmarks directory is empty</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
              Bookmark licensed clinicians or registered specialists in the practice search registry to organize your medical care network.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-rose-500/20"
              >
                <Search className="h-4 w-4" />
                Explore Registry
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {savedProfessionals.map((p) => {
            const isDoc = p.role === UserRole.DOCTOR;
            return (
              <motion.div 
                variants={itemVariants}
                key={p.id} 
                className="group relative bg-white border border-slate-200/80 hover:border-[color:var(--t-200)] rounded-[28px] p-6 shadow-sm transition-all duration-300 flex flex-col justify-between space-y-5 hover:shadow-lg overflow-hidden"
              >
                {/* Accent top border */}
                <div className={`absolute top-0 left-0 right-0 h-[4px] transition-colors duration-300 ${
                  isDoc ? 'bg-[color:var(--t-600)]/80' : 'bg-[color:var(--t-600)]/80'
                }`} />

                <div className="space-y-5 pt-1">
                  {/* Avatar and name banner */}
                  <div className="flex gap-4 items-start justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="relative">
                        <img 
                          src={p.avatar} 
                          alt={p.name} 
                          className={`h-14 w-14 rounded-full object-cover border-2 shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-300 ${isDoc ? 'border-[color:var(--t-200)]' : 'border-[color:var(--t-200)]'}`}
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white rounded-full h-3.5 w-3.5 shadow-sm" />
                      </div>
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          isDoc ? "bg-[color:var(--t-50)] text-[color:var(--t-600)] border-[color:var(--t-200)]" : "bg-[color:var(--t-50)] text-[color:var(--t-600)] border-[color:var(--t-200)]"
                        }`}>
                          {isDoc ? "Verified Doctor" : "Clinical Nurse"}
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        </span>
                        <h4 className="text-base font-black text-slate-900 leading-tight group-hover:text-[color:var(--t-600)] transition-colors">{p.name}</h4>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => onRemoveSaved(p.id)}
                      className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl transition-all cursor-pointer shadow-xs border border-transparent hover:border-rose-100 bg-white"
                      title="Remove bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Specialty and clinical baseline */}
                  <div className="space-y-2.5 text-xs text-slate-600 font-semibold bg-slate-50/80 group-hover:bg-[color:var(--t-50)] p-4 rounded-xl border border-slate-200/80 transition-colors duration-300">
                    <p className="flex items-center gap-2.5 text-slate-800 font-black">
                      <div className="bg-white p-1 rounded border border-slate-200 shadow-3xs"><Stethoscope className="h-3.5 w-3.5 text-[color:var(--t-600)]" /></div>
                      <span>{p.specialization}</span>
                    </p>
                    <p className="flex items-center gap-2.5 text-slate-500">
                      <div className="bg-white p-1 rounded border border-slate-200 shadow-3xs"><MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)]" /></div>
                      <span className="truncate">{p.city} &bull; {p.practiceAddress.split(',')[0]}</span>
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-200/80 pt-2.5 mt-2 flex-wrap gap-2">
                      <p className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        <span className="text-slate-800 font-black">{p.rating}</span>
                        <span className="text-slate-400 font-medium">({p.reviewCount} reviews)</span>
                      </p>
                      <span className="text-xs font-mono text-[color:var(--t-600)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5 rounded shadow-3xs">
                        RM {p.fee}/consult
                      </span>
                    </div>
                  </div>
                </div>

                {/* Practical actions footer */}
                <div className="border-t border-slate-100 pt-5 space-y-3 mt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={onNavigateToMessages}
                      className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-[11px] font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                      <span>Send Chat</span>
                    </button>
                    <button
                      onClick={() => onSelectProfessional(p.id)}
                      className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[11px] font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                    >
                      <CalendarRange className="h-3.5 w-3.5" />
                      <span>Book Slot</span>
                    </button>
                  </div>
                  <button
                    onClick={() => onVerifyCredentials(p)}
                    className="w-full bg-[color:var(--t-50)] border border-[color:var(--t-200)] hover:bg-[color:var(--t-600)] hover:text-white text-[color:var(--t-600)] text-[11px] font-black py-3 px-3 rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify Board License Credentials</span>
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
