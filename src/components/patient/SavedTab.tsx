import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Trash2, Stethoscope, MapPin, Star, ShieldCheck, MessageSquare, CalendarRange, CheckCircle2, AlertTriangle, Search
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole, VerificationStatus } from '../../types';
import { formatMoney } from '../../locale';
import { requestConversationWith } from '../SecureMessenger';

type Pro = DoctorProfile | NurseProfile;

interface SavedTabProps {
  /** Practitioners the patient has already booked and paid for: their care team. */
  careTeam?: Pro[];
  /** Practitioners the patient bookmarked to book later. */
  savedProfessionals: Pro[];
  onRemoveSaved: (id: string) => void;
  /** Puts a just-removed practitioner back (the Undo button). */
  onRestoreSaved?: (id: string) => void;
  onNavigateToMessages: () => void;
  onSelectProfessional: (id: string) => void;
  onVerifyCredentials: (p: Pro) => void;
  /** Opens the practitioner directory. */
  onFindProviders?: () => void;
  hideHeader?: boolean;
}

/** From the practitioner's record, never assumed: only a currently verified practitioner is called verified. */
function Standing({ p }: { p: Pro }) {
  const isDoc = p.role === UserRole.DOCTOR;
  const verified = p.verificationStatus === VerificationStatus.VERIFIED;
  return verified ? (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold uppercase px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] mb-1">
      {isDoc ? 'Verified doctor' : 'Verified nurse'}
      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold uppercase px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 mb-1">
      Not currently verified
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
    </span>
  );
}

export default function SavedTab({
  careTeam = [],
  savedProfessionals,
  onRemoveSaved,
  onRestoreSaved,
  onNavigateToMessages,
  onSelectProfessional,
  onVerifyCredentials,
  onFindProviders,
  hideHeader = false,
}: SavedTabProps) {
  // The server only lets you message practitioners you have booked or consulted: ask it, so a button never promises more
  const [messageable, setMessageable] = useState<Set<string> | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/chats/threads').then(r => r.json()).then(d => {
      if (live && d?.status === 'success') setMessageable(new Set((d.data as { id: string }[]).map(t => t.id)));
    }).catch(() => { /* leave the buttons conservative */ });
    return () => { live = false; };
  }, []);

  const message = (id: string) => { requestConversationWith(id); onNavigateToMessages(); };

  // Removing is instant but not final: for a few seconds the patient can put the person back
  const [undo, setUndo] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);
  const remove = (p: Pro) => { onRemoveSaved(p.id); if (onRestoreSaved) setUndo({ id: p.id, name: p.name }); };
  const teamIds = new Set(careTeam.map(p => p.id));
  // Someone already on the care team is shown once, in the care team
  const saved = savedProfessionals.filter(p => !teamIds.has(p.id));

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } };

  const findBtn = onFindProviders && (
    <button
      type="button"
      onClick={onFindProviders}
      className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-sm font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      Find a doctor or nurse
    </button>
  );

  const Photo = ({ p }: { p: Pro }) => (
    <img src={p.avatar} alt={p.name} className="h-13 w-13 rounded-full object-cover border border-[color:var(--t-200)] shadow-2xs shrink-0" referrerPolicy="no-referrer" />
  );

  return (
    <div className="space-y-8" id="patient-saved-tab-root">
      {!hideHeader && (
        <div className="border-b border-[color:var(--t-200)] pb-4">
          <h3 className="font-display font-black text-xl text-[color:var(--ink)] tracking-tight flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500" aria-hidden="true" />
            Your care team
          </h3>
          <p className="text-sm text-slate-600 font-medium mt-1">The doctors and nurses you have seen, and others you saved to book later.</p>
        </div>
      )}

      {/* The people already looking after you */}
      {careTeam.length > 0 && (
        <section aria-labelledby="care-team-seen">
          <h3 id="care-team-seen" className="font-display font-black text-base text-[color:var(--ink)] mb-1">Doctors and nurses you have seen</h3>
          <p className="text-sm text-slate-600 mb-4">Book a follow-up or send a message.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {careTeam.map(p => (
              <div key={p.id} className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-5 shadow-xs flex flex-col justify-between gap-4">
                <div className="flex gap-3.5 items-center min-w-0">
                  <Photo p={p} />
                  <div className="min-w-0">
                    <Standing p={p} />
                    <h4 className="font-display font-black text-sm text-[color:var(--ink)] leading-snug truncate">{p.name}</h4>
                    <p className="text-sm text-slate-600 truncate">{p.specialization}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => message(p.id)}
                    className="min-h-[44px] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-sm font-bold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4 text-[color:var(--t-600)]" aria-hidden="true" />
                    <span>Message</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectProfessional(p.id)}
                    className="min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-sm font-extrabold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[color:var(--t-700)]"
                  >
                    <CalendarRange className="h-4 w-4" aria-hidden="true" />
                    <span>Book again</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {undo && (
        <div role="status" className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white text-sm font-semibold pl-4 pr-1 min-h-[48px] flex items-center gap-3 shadow-lg max-w-[calc(100vw-2rem)]">
          <span className="truncate">Removed {undo.name} from saved.</span>
          <button
            type="button"
            onClick={() => { onRestoreSaved?.(undo.id); setUndo(null); }}
            className="min-h-[44px] px-4 font-extrabold underline cursor-pointer shrink-0"
          >
            Undo
          </button>
        </div>
      )}

      {/* Bookmarks for later */}
      <section aria-labelledby="care-team-saved">
        <h3 id="care-team-saved" className="font-display font-black text-base text-[color:var(--ink)] mb-1">Saved for later</h3>
        {saved.length === 0 ? (
          <div className="bg-white border border-dashed border-[color:var(--t-200)] py-10 px-6 text-center space-y-3 max-w-xl">
            <p className="text-sm text-[color:var(--ink)] font-bold">
              {careTeam.length === 0 ? 'Your care team is empty.' : 'Nobody saved yet.'}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {careTeam.length === 0
                ? 'Doctors and nurses you book appear here, and you can save others to book later.'
                : 'Save a doctor or nurse from the directory and they appear here for quick booking.'}
            </p>
            {findBtn}
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
            {saved.map(p => {
              const canMessage = !!messageable && messageable.has(p.id);
              return (
                <motion.div
                  variants={itemVariants}
                  key={p.id}
                  className="group relative bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4 pt-1">
                    <div className="flex gap-3.5 items-start justify-between">
                      <div className="flex gap-3.5 items-center min-w-0">
                        <Photo p={p} />
                        <div className="min-w-0">
                          <Standing p={p} />
                          <h4 className="font-display font-black text-sm text-[color:var(--ink)] leading-snug truncate">{p.name}</h4>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        className="h-11 w-11 flex items-center justify-center hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-transparent hover:border-rose-200 transition-all cursor-pointer bg-white shrink-0"
                        title="Remove from saved"
                        aria-label={`Remove ${p.name} from saved`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 font-medium bg-[color:var(--t-50)]/50 p-3.5 border border-[color:var(--t-200)]">
                      <div className="flex items-center gap-2 text-[color:var(--ink)] font-bold">
                        <span className="bg-white p-1 border border-[color:var(--t-200)] shadow-2xs"><Stethoscope className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" /></span>
                        <span className="truncate">{p.specialization}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-white p-1 border border-[color:var(--t-200)] shadow-2xs"><MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" /></span>
                        <span className="truncate">{p.city}{p.practiceAddress ? <> &bull; {p.practiceAddress.split(',')[0]}</> : null}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[color:var(--t-100)] pt-2.5 mt-2 flex-wrap gap-2">
                        {p.reviewCount > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" aria-hidden="true" />
                            <span className="text-[color:var(--ink)] font-bold">{p.rating}</span>
                            <span className="text-slate-600 font-medium text-xs">({p.reviewCount})</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-medium text-xs">No reviews yet</span>
                        )}
                        <span className="text-xs font-mono font-bold text-[color:var(--t-700)] bg-white border border-[color:var(--t-200)] px-2 py-0.5 shadow-2xs">
                          {formatMoney(p.fee)}/consult
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[color:var(--t-100)] pt-3.5 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {canMessage ? (
                        <button
                          type="button"
                          onClick={() => message(p.id)}
                          className="min-h-[44px] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-sm font-bold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4 text-[color:var(--t-600)]" aria-hidden="true" />
                          <span>Message</span>
                        </button>
                      ) : (
                        <p className="min-h-[44px] flex items-center text-xs text-slate-600 leading-snug px-1">You can message after your first booking.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectProfessional(p.id)}
                        className="min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-sm font-extrabold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[color:var(--t-700)]"
                      >
                        <CalendarRange className="h-4 w-4" aria-hidden="true" />
                        <span>Book a slot</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onVerifyCredentials(p)}
                      className="w-full min-h-[44px] bg-[color:var(--t-50)] border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--t-700)] text-xs font-bold py-1.5 px-3 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Check licence</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>
    </div>
  );
}
