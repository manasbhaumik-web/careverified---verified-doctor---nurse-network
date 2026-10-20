import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Trash2, Stethoscope, MapPin, Star, ShieldCheck, MessageSquare, CalendarRange, CheckCircle2, AlertTriangle, Search, X, ArrowRight
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole, VerificationStatus } from '../../types';
import { formatMoney } from '../../locale';
import { requestConversationWith } from '../SecureMessenger';
import { FilterSelect } from '../DashboardHeader';
import { UserAvatar } from '../../avatars';

type Pro = DoctorProfile | NurseProfile;

interface SavedTabProps {
  /** Practitioners the patient has already booked and paid for: their care team. */
  careTeam?: Pro[];
  /** Practitioners the patient bookmarked to book later. */
  savedProfessionals: Pro[];
  /** Optional full list of verified practitioners for quick-adding to Care Team. */
  allProfessionals?: Pro[];
  onRemoveSaved: (id: string) => void;
  /** Puts a practitioner into saved list (Bookmark / Undo). */
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
    <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
      {isDoc ? 'MMC Verified' : 'LJM Verified'}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold uppercase px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300">
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
      Pending Verification
    </span>
  );
}

export default function SavedTab({
  careTeam = [],
  savedProfessionals,
  allProfessionals = [],
  onRemoveSaved,
  onRestoreSaved,
  onNavigateToMessages,
  onSelectProfessional,
  onVerifyCredentials,
  onFindProviders,
  hideHeader = false,
}: SavedTabProps) {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [city, setCity] = useState('all');
  const [sort, setSort] = useState<'rating' | 'experience' | 'fee_asc' | 'fee_desc'>('rating');

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

  const teamIds = useMemo(() => new Set(careTeam.map(p => p.id)), [careTeam]);
  const savedOnly = useMemo(() => savedProfessionals.filter(p => !teamIds.has(p.id)), [savedProfessionals, teamIds]);
  const combinedPool = useMemo(() => {
    const base = [...careTeam, ...savedOnly];
    return base.length > 0 ? base : allProfessionals;
  }, [careTeam, savedOnly, allProfessionals]);

  const specialties = useMemo(
    () => Array.from(new Set(combinedPool.map(p => p.specialization).filter(Boolean))).sort(),
    [combinedPool]
  );
  const cities = useMemo(
    () => Array.from(new Set(combinedPool.map(p => p.city).filter(Boolean))).sort(),
    [combinedPool]
  );

  const filterAndSort = (list: Pro[]) =>
    list
      .filter(p => {
        if (specialty !== 'all' && p.specialization !== specialty) return false;
        if (city !== 'all' && p.city !== city) return false;
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          const hay = `${p.name} ${p.specialization || ''} ${p.city || ''} ${p.practiceAddress || ''} ${p.licenseNumber || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'fee_asc') return (a.fee || 0) - (b.fee || 0);
        if (sort === 'fee_desc') return (b.fee || 0) - (a.fee || 0);
        if (sort === 'experience') return (b.experienceYears || 0) - (a.experienceYears || 0);
        return (b.rating || 0) - (a.rating || 0);
      });

  const filteredCareTeam = filterAndSort(careTeam);
  const filteredSaved = filterAndSort(savedOnly);
  const savedIdSet = useMemo(() => new Set(savedProfessionals.map(p => p.id)), [savedProfessionals]);
  const suggestedProviders = useMemo(
    () => filterAndSort(allProfessionals.filter(p => !teamIds.has(p.id) && !savedIdSet.has(p.id))).slice(0, 6),
    [allProfessionals, teamIds, savedIdSet, query, specialty, city, sort]
  );

  const hasFilters = Boolean(query.trim() || specialty !== 'all' || city !== 'all');
  const totalCareCount = careTeam.length + savedOnly.length;
  const shownCareCount = filteredCareTeam.length + filteredSaved.length;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } };

  return (
    <div className="space-y-5" id="patient-saved-tab-root">
      {!hideHeader && (
        <div className="border-b border-[color:var(--t-200)] pb-4">
          <h3 className="font-display font-black text-xl text-[color:var(--ink)] tracking-tight flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500" aria-hidden="true" />
            Your care team
          </h3>
          <p className="text-xs text-slate-600 font-medium mt-1">The doctors and nurses you have seen, and others you saved to book later.</p>
        </div>
      )}

      {/* Unified Single-Row h-11 Filter Control Bar */}
      <section aria-label="Filter care team" className="bg-white border border-[color:var(--t-200)] rounded-none p-4 shadow-2xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <label htmlFor="care-team-search" className="sr-only">Search care team</label>
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="care-team-search"
              type="text"
              placeholder="Search your care team or recommended specialists by name, specialty, or city…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Inline Dropdown Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <FilterSelect label="Specialty" value={specialty} onChange={setSpecialty}>
              <option value="all">All Specialties ({specialties.length})</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </FilterSelect>

            <FilterSelect label="City" value={city} onChange={setCity}>
              <option value="all">All Cities ({cities.length})</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </FilterSelect>

            <FilterSelect label="Sort by" value={sort} onChange={v => setSort(v as any)}>
              <option value="rating">Highest Rated</option>
              <option value="experience">Most Experienced</option>
              <option value="fee_asc">Fee: Low to High</option>
              <option value="fee_desc">Fee: High to Low</option>
            </FilterSelect>
          </div>
        </div>

        {/* Active Filter Summary & Result Counter Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[color:var(--t-100)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 tabular-nums" aria-live="polite">
              {totalCareCount > 0 ? (
                <>Showing <strong className="font-black text-[color:var(--ink)]">{shownCareCount}</strong> of {totalCareCount} care team provider{totalCareCount === 1 ? '' : 's'}</>
              ) : (
                <>0 saved providers · Showing <strong className="font-black text-[color:var(--ink)]">{suggestedProviders.length}</strong> recommended practitioner{suggestedProviders.length === 1 ? '' : 's'}</>
              )}
            </span>
            {specialty !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                Specialty: {specialty}
                <button type="button" onClick={() => setSpecialty('all')} className="hover:text-slate-900 cursor-pointer" aria-label="Remove specialty filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {city !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                City: {city}
                <button type="button" onClick={() => setCity('all')} className="hover:text-slate-900 cursor-pointer" aria-label="Remove city filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSpecialty('all'); setCity('all'); }}
              className="text-xs font-bold text-[color:var(--t-700)] hover:text-[color:var(--dark)] underline underline-offset-2 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* 1. Doctors and nurses the patient has already seen */}
      {filteredCareTeam.length > 0 && (
        <section aria-labelledby="care-team-seen" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="care-team-seen" className="font-display font-black text-base text-[color:var(--ink)]">Doctors &amp; Nurses You Have Seen</h3>
              <p className="text-xs text-slate-600">Book a follow-up consultation or send a direct clinical message.</p>
            </div>
            <span className="text-2xs font-mono font-bold uppercase px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
              {filteredCareTeam.length} Seen
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCareTeam.map(p => (
              <article key={p.id} className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-4 shadow-2xs flex flex-col justify-between gap-3">
                <div className="flex gap-3 items-start min-w-0">
                  <UserAvatar src={p.avatar} role={p.role === UserRole.DOCTOR ? 'doctor' : 'nurse'} alt={p.name} className="h-12 w-12 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Standing p={p} />
                      {p.rating > 0 && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 text-2xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" /> {p.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-extrabold text-sm text-[color:var(--ink)] leading-snug truncate mt-1">{p.name}</h4>
                    <p className="text-xs text-[color:var(--t-700)] font-bold truncate">{p.specialization}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-[color:var(--t-100)] mt-auto">
                  <button
                    type="button"
                    onClick={() => message(p.id)}
                    className="h-9 bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
                    <span>Message</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectProfessional(p.id)}
                    className="h-9 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[color:var(--t-700)]"
                  >
                    <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Book Again</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {undo && (
        <div role="status" className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white text-xs font-semibold pl-4 pr-1 min-h-[48px] flex items-center gap-3 shadow-lg max-w-[calc(100vw-2rem)]">
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

      {/* 2. Bookmarked / Saved for later */}
      <section aria-labelledby="care-team-saved" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 id="care-team-saved" className="font-display font-black text-base text-[color:var(--ink)]">Saved for Later</h3>
            <p className="text-xs text-slate-600">Practitioners you bookmarked for future consultations or home care.</p>
          </div>
          <span className="text-2xs font-mono font-bold uppercase px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
            {filteredSaved.length} Saved
          </span>
        </div>

        {filteredSaved.length === 0 ? (
          <div className="w-full bg-white border border-[color:var(--t-200)] p-8 text-center space-y-3 shadow-2xs">
            <div className="w-10 h-10 mx-auto bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center">
              <Heart className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-lg mx-auto">
              <p className="text-sm text-[color:var(--ink)] font-black uppercase tracking-wider">
                {careTeam.length === 0 ? 'Your saved care team list is currently empty' : 'No saved practitioners match your filter'}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {careTeam.length === 0
                  ? 'Doctors and nurses you book appear here automatically, or you can save recommended practitioners below to build your personal care team.'
                  : 'Save a doctor or nurse from the directory below and they will appear here for one-click booking.'}
              </p>
            </div>
            {onFindProviders && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onFindProviders}
                  className="inline-flex items-center gap-2 h-10 px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-2xs transition-all cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Browse Full Practitioner Directory</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSaved.map(p => {
              const canMessage = !!messageable && messageable.has(p.id);
              return (
                <motion.article
                  variants={itemVariants}
                  key={p.id}
                  className="group relative bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] p-4 shadow-2xs flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start justify-between">
                      <div className="flex gap-3 items-start min-w-0">
                        <UserAvatar src={p.avatar} role={p.role === UserRole.DOCTOR ? 'doctor' : 'nurse'} alt={p.name} className="h-12 w-12 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" />
                        <div className="min-w-0">
                          <Standing p={p} />
                          <h4 className="font-display font-extrabold text-sm text-[color:var(--ink)] leading-snug truncate mt-1">{p.name}</h4>
                          <p className="text-xs text-[color:var(--t-700)] font-bold truncate">{p.specialization}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        className="h-8 w-8 flex items-center justify-center hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-transparent hover:border-rose-200 transition-all cursor-pointer bg-white shrink-0"
                        title="Remove from saved"
                        aria-label={`Remove ${p.name} from saved`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[color:var(--t-100)] text-xs text-slate-600 space-y-1">
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" aria-hidden="true" />
                        <span className="truncate">{p.city}{p.practiceAddress ? ` • ${p.practiceAddress.split(',')[0]}` : ''}</span>
                      </p>
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2 py-0.5">
                          {p.experienceYears} yrs exp
                        </span>
                        <span className="text-2xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                          {formatMoney(p.fee)}/consult
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[color:var(--t-100)] pt-2.5 space-y-2 mt-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {canMessage ? (
                        <button
                          type="button"
                          onClick={() => message(p.id)}
                          className="h-9 bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
                          <span>Message</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onVerifyCredentials(p)}
                          className="h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--t-700)] text-xs font-bold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Credentials</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectProfessional(p.id)}
                        className="h-9 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[color:var(--t-700)]"
                      >
                        <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Book Visit</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* 3. Suggested Verified Practitioners to Quick-Save */}
      {suggestedProviders.length > 0 && (
        <section aria-labelledby="care-team-suggested" className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 id="care-team-suggested" className="font-display font-black text-base text-[color:var(--ink)]">
                Recommended Verified Practitioners
              </h3>
              <p className="text-xs text-slate-600">
                Save specialists or staff nurses to your personal care team for instant access and follow-up booking.
              </p>
            </div>
            <span className="text-2xs font-mono font-bold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
              MMC &amp; LJM Verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {suggestedProviders.map(prof => (
              <article key={prof.id} className="p-4 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all bg-white flex flex-col justify-between gap-3 shadow-2xs group">
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <UserAvatar src={prof.avatar} role={prof.role === UserRole.DOCTOR ? 'doctor' : 'nurse'} alt={prof.name} className="w-12 h-12 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => onSelectProfessional(prof.id)} className="font-display font-extrabold text-xs text-[color:var(--ink)] hover:text-[color:var(--t-600)] text-left truncate block cursor-pointer">
                          {prof.name}
                        </button>
                        {prof.rating > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-2xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" /> {prof.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[color:var(--t-700)] font-bold mt-0.5">{prof.specialization}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Standing p={prof} />
                        {prof.licenseNumber && (
                          <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5">
                            {prof.licenseNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[color:var(--t-100)] text-xs text-slate-600 space-y-1">
                    {(prof.practiceAddress || prof.city) && (
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
                        <span className="truncate">{prof.practiceAddress ? `${prof.practiceAddress}${prof.city && !prof.practiceAddress.includes(prof.city) ? `, ${prof.city}` : ''}` : prof.city}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2 py-0.5">
                        {prof.experienceYears} yrs exp
                      </span>
                      <span className="text-2xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                        RM {prof.fee}{prof.role === UserRole.NURSE ? ' / hr' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[color:var(--t-100)] grid grid-cols-2 gap-2 mt-auto">
                  {onRestoreSaved && (
                    <button
                      type="button"
                      onClick={() => onRestoreSaved(prof.id)}
                      className="h-9 px-3 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      <span>Save to Team</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectProfessional(prof.id)}
                    className="h-9 px-3 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Book Visit</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
