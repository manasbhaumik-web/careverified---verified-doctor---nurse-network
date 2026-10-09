import React, { useState } from 'react';
import {
  Search, MapPin, BadgeCheck, Stethoscope, Clock, ShieldCheck,
  HeartPulse, UserCheck, Star, LayoutGrid, List, Eye, X, Sparkles, Activity,
  Calendar, Check, SlidersHorizontal, ArrowRight, CheckCircle2, Shield
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole, Review, ConsultationMode } from '../types';

interface SearchHubProps {
  professionals: (DoctorProfile | NurseProfile)[];
  reviews: Review[];
  onSelectProfessional: (id: string) => void;
  selectedSpecialtyFilter: string;
  onSelectSpecialtyFilter: (specialty: string) => void;
  onClearSpecialtyFilter: () => void;
}

export default function SearchHub({
  professionals,
  reviews,
  onSelectProfessional,
  selectedSpecialtyFilter,
  onSelectSpecialtyFilter,
  onClearSpecialtyFilter
}: SearchHubProps) {
  // Compute honest rating from real reviews
  const getRatingInfo = (professionalId: string) => {
    const profReviews = reviews.filter(r => r.professionalId === professionalId);
    if (profReviews.length === 0) return { display: 'New', count: 0 };
    const avg = (profReviews.reduce((sum, r) => sum + r.rating, 0) / profReviews.length).toFixed(1);
    return { display: avg, count: profReviews.length };
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | UserRole.DOCTOR | UserRole.NURSE>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [maxFee, setMaxFee] = useState<number>(500);
  const [showMap, setShowMap] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rating' | 'fee' | 'experience'>('rating');
  const [selectedModalProf, setSelectedModalProf] = useState<(DoctorProfile | NurseProfile) | null>(null);

  // Filter logic
  const filteredList = professionals.filter(p => {
    const matchesSearch = searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.bio.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialtyFilter = selectedSpecialtyFilter === '' ||
      p.specialization.toLowerCase().includes(selectedSpecialtyFilter.toLowerCase());

    const matchesRole = selectedRole === 'all' || p.role === selectedRole;
    const matchesCity = selectedCity === 'all' || p.city === selectedCity;
    const matchesFee = p.fee <= maxFee;
    const matchesMode = selectedModes.length === 0 || (p.consultationModes || []).some(m => selectedModes.includes(m));

    return matchesSearch && matchesSpecialtyFilter && matchesRole && matchesCity && matchesFee && matchesMode;
  }).sort((x, y) => {
    if (sortBy === 'fee') return x.fee - y.fee;
    if (sortBy === 'experience') return y.experienceYears - x.experienceYears;
    const rx = reviews.filter(r => r.professionalId === x.id);
    const ry = reviews.filter(r => r.professionalId === y.id);
    const ax = rx.length ? rx.reduce((t, r) => t + r.rating, 0) / rx.length : 0;
    const ay = ry.length ? ry.reduce((t, r) => t + r.rating, 0) / ry.length : 0;
    return ay - ax;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedRole('all');
    setSelectedCity('all');
    setMaxFee(500);
    setSelectedModes([]);
    onClearSpecialtyFilter();
  };
  const toggleMode = (m: string) =>
    setSelectedModes(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));

  const specialties = Array.from(new Set(professionals.map(p => p.specialization)));

  const getSpecialtyIcon = (specialty: string) => {
    const spec = specialty.toLowerCase();
    if (spec.includes('cardio')) return HeartPulse;
    if (spec.includes('pediat') || spec.includes('neonat')) return UserCheck;
    if (spec.includes('neuro')) return Activity;
    if (spec.includes('derm')) return Sparkles;
    if (spec.includes('icu') || spec.includes('critical') || spec.includes('emerg')) return Activity;
    if (spec.includes('geriat') || spec.includes('elder')) return Clock;
    return Stethoscope;
  };

  const labelCls = 'text-xs font-bold uppercase tracking-wider text-[color:var(--ink-2)]';
  const selectCls = 'w-full min-h-[46px] border border-[color:var(--t-200)] bg-white px-3 text-sm text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] cursor-pointer';

  const renderCard = (prof: DoctorProfile | NurseProfile) => {
    const isDoc = prof.role === UserRole.DOCTOR;
    const rating = getRatingInfo(prof.id);
    const council = isDoc ? 'MMC' : 'LJM';
    return (
      <article
        key={prof.id}
        className="bg-white border border-[color:var(--t-200)] shadow-xs hover:shadow-md hover:border-[color:var(--t-300)] transition-all p-5 flex flex-col gap-4"
      >
        <div className="flex gap-3.5 items-start">
          <div className="relative shrink-0">
            <img src={prof.avatar} alt="" className="h-[60px] w-[60px] rounded-full object-cover border border-[color:var(--t-200)]" referrerPolicy="no-referrer" />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-bold text-[color:var(--ink)] leading-snug">{prof.name}</h3>
            <p className="text-[13px] text-[color:var(--ink-2)] mt-0.5">{prof.specialization}</p>
            <p className="mt-1.5 flex items-center gap-1 text-[13px] text-[color:var(--ink-2)]">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <strong className="font-bold text-[color:var(--ink)]">{rating.display}</strong>
              <span className="text-slate-600">({rating.count} review{rating.count === 1 ? '' : 's'})</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[color:var(--e-800)] bg-[color:var(--e-50)] border border-[color:var(--e-200)] px-2 py-1">
            <Check className="h-3 w-3 text-[color:var(--e-600)]" /> {council} verified
          </span>
          <span className="text-[11px] font-semibold text-[color:var(--ink-2)] bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2 py-1">{prof.licenseNumber}</span>
          <span className="text-[11px] font-semibold text-[color:var(--ink-2)] bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2 py-1">{prof.experienceYears} yrs experience</span>
        </div>

        <div className="flex flex-col gap-2 text-[13px] text-[color:var(--ink-2)]">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500 shrink-0" /><span className="truncate">{prof.practiceAddress ? `${prof.practiceAddress}, ` : ''}{prof.city}</span></div>
          {prof.consultationModes?.length > 0 && (
            <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-slate-500 shrink-0" />{prof.consultationModes.join(' · ')}</div>
          )}
          {prof.languages?.length > 0 && (
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-slate-500 shrink-0" />{prof.languages.join(', ')}</div>
          )}
        </div>

        <div className="border-t border-[color:var(--t-100)] pt-3.5 flex items-center justify-between">
          <span className="text-xs text-slate-600">Consultation fee</span>
          <span className="text-lg font-bold text-[color:var(--ink)] tabular-nums">RM {prof.fee}<span className="text-xs font-medium text-slate-600">{isDoc ? '' : '/hr'}</span></span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-auto">
          <button
            type="button"
            onClick={() => setSelectedModalProf(prof)}
            className="min-h-[44px] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--ink)] text-[13px] font-semibold cursor-pointer"
          >
            View profile
          </button>
          <button
            type="button"
            onClick={() => onSelectProfessional(prof.id)}
            className="min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[13px] font-bold transition-colors cursor-pointer"
          >
            Book now
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6" id="search-hub-section">
      {/* Search row */}
      <section aria-label="Search" className="bg-white border border-[color:var(--t-200)] shadow-xs px-5 py-4 flex flex-wrap gap-3 items-center">
        <label htmlFor="directory-search" className="sr-only">Search practitioners</label>
        <div className="flex-[3_1_320px] flex items-center gap-2.5 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3.5 min-h-[48px] focus-within:border-[color:var(--t-600)]">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            id="directory-search"
            type="text"
            placeholder="Search by name, specialty or treatment"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder-slate-500"
          />
        </div>
        <label htmlFor="directory-sort" className="sr-only">Sort by</label>
        <select
          id="directory-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="flex-[1_1_200px] min-h-[48px] border border-[color:var(--t-200)] bg-white px-3 text-sm font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] cursor-pointer"
        >
          <option value="rating">Sort: Highest rated</option>
          <option value="fee">Sort: Lowest fee</option>
          <option value="experience">Sort: Most experience</option>
        </select>
      </section>

      <div className="flex flex-wrap gap-6 items-start">
        {/* Filters */}
        <aside aria-label="Filters" className="flex-[1_1_280px] max-w-full lg:max-w-[320px] min-w-0 bg-white border border-[color:var(--t-200)] shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[color:var(--ink)] flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[color:var(--t-600)]" /> Filters</h2>
            <button type="button" onClick={resetFilters} className="text-[13px] font-semibold text-[color:var(--e-700)] hover:text-[color:var(--e-800)] min-h-[44px] cursor-pointer">Clear all</button>
          </div>

          <fieldset className="space-y-2">
            <legend className={`${labelCls} mb-2`}>Practitioner type</legend>
            <div className="flex">
              {([['all', 'All'], [UserRole.DOCTOR, 'Doctors'], [UserRole.NURSE, 'Nurses']] as const).map(([val, label], i) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSelectedRole(val as any)}
                  aria-pressed={selectedRole === val}
                  className={`flex-1 min-h-[44px] text-[13px] border cursor-pointer transition-colors ${i > 0 ? 'border-l-0' : ''} ${
                    selectedRole === val
                      ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white font-bold'
                      : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] font-semibold hover:bg-[color:var(--t-100)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="directory-specialty" className={labelCls}>Specialty</label>
            <select
              id="directory-specialty"
              value={specialties.find(sp => sp.toLowerCase() === selectedSpecialtyFilter.toLowerCase()) || ''}
              onChange={(e) => (e.target.value ? onSelectSpecialtyFilter(e.target.value) : onClearSpecialtyFilter())}
              className={selectCls}
            >
              <option value="">All specialties</option>
              {specialties.map(sp => <option key={sp} value={sp}>{sp}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="directory-city" className={labelCls}>City</label>
            <select id="directory-city" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className={selectCls}>
              <option value="all">All cities</option>
              <option value="Kuala Lumpur">Kuala Lumpur</option>
              <option value="Petaling Jaya">Petaling Jaya</option>
              <option value="Penang">Penang</option>
              <option value="Johor Bahru">Johor Bahru</option>
              <option value="Ampang">Ampang</option>
            </select>
          </div>

          <fieldset className="space-y-1">
            <legend className={`${labelCls} mb-2`}>Consultation</legend>
            {Object.values(ConsultationMode).map(mode => (
              <label key={mode} className="flex items-center gap-2.5 min-h-[40px] text-sm text-[color:var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedModes.includes(mode)}
                  onChange={() => toggleMode(mode)}
                  className="h-[18px] w-[18px] accent-[color:var(--t-600)]"
                />
                {mode}
              </label>
            ))}
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="directory-fee" className={labelCls}>Maximum fee</label>
            <input
              id="directory-fee"
              type="range"
              min="30"
              max="500"
              step="10"
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value))}
              className="w-full accent-[color:var(--t-600)] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-600"><span>RM 30</span><span className="font-semibold text-[color:var(--ink)]">RM {maxFee}</span></div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-[999_1_640px] min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-bold text-[color:var(--ink)]">Verified practitioners</h2>
              <span className="text-[13px] text-slate-600">Showing {filteredList.length} result{filteredList.length === 1 ? '' : 's'}</span>
              {selectedSpecialtyFilter && (
                <span className="inline-flex items-center gap-2 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-xs font-semibold pl-3">
                  {selectedSpecialtyFilter}
                  <button type="button" onClick={onClearSpecialtyFilter} aria-label="Clear specialty filter" className="h-8 w-8 flex items-center justify-center hover:text-[#7F1D1D] cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-[color:var(--t-200)]">
                <button type="button" onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'}
                  className={`h-11 w-11 flex items-center justify-center cursor-pointer ${viewMode === 'grid' ? 'bg-[color:var(--t-50)] text-[color:var(--t-700)]' : 'bg-white text-slate-500 hover:bg-[color:var(--t-50)]'}`}>
                  <LayoutGrid className="h-[18px] w-[18px]" />
                </button>
                <button type="button" onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'}
                  className={`h-11 w-11 flex items-center justify-center border-l border-[color:var(--t-200)] cursor-pointer ${viewMode === 'list' ? 'bg-[color:var(--t-50)] text-[color:var(--t-700)]' : 'bg-white text-slate-500 hover:bg-[color:var(--t-50)]'}`}>
                  <List className="h-[18px] w-[18px]" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                aria-pressed={showMap}
                className={`min-h-[44px] px-4 border text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer ${showMap ? 'bg-[color:var(--t-50)] border-[color:var(--t-300)] text-[color:var(--t-700)]' : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-50)]'}`}
              >
                <MapPin className="h-4 w-4 text-[color:var(--t-600)]" /> {showMap ? 'Hide map' : 'Clinic map'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex-[999_1_480px] min-w-0">
              {filteredList.length === 0 ? (
                <div className="bg-white border border-[color:var(--t-200)] p-12 text-center space-y-3">
                  <Stethoscope className="h-10 w-10 text-[color:var(--t-200)] mx-auto" />
                  <h3 className="text-sm font-bold text-[color:var(--ink)]">No practitioners match your search</h3>
                  <p className="text-[13px] text-slate-600">Try broadening your budget limit, city or specialty.</p>
                  <button type="button" onClick={resetFilters} className="mt-1 min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[13px] font-bold cursor-pointer">Reset all filters</button>
                </div>
              ) : viewMode === 'grid' ? (
                <section aria-label="Practitioners" className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                  {filteredList.map(renderCard)}
                </section>
              ) : (
                <section aria-label="Practitioners" className="space-y-3">
                  {filteredList.map((prof) => {
                    const isDoc = prof.role === UserRole.DOCTOR;
                    const rating = getRatingInfo(prof.id);
                    return (
                      <article key={prof.id} className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-300)] shadow-xs p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <img src={prof.avatar} alt="" className="h-14 w-14 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" referrerPolicy="no-referrer" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[15px] font-bold text-[color:var(--ink)]">{prof.name}</h3>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[color:var(--e-800)] bg-[color:var(--e-50)] border border-[color:var(--e-200)] px-2 py-0.5"><Check className="h-3 w-3 text-[color:var(--e-600)]" />{isDoc ? 'MMC' : 'LJM'} verified</span>
                            </div>
                            <p className="text-[13px] text-[color:var(--ink-2)] mt-0.5">{prof.specialization} · {prof.city} · {prof.experienceYears} yrs · ★ {rating.display}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                          <span className="text-base font-bold text-[color:var(--ink)] tabular-nums">RM {prof.fee}{isDoc ? '' : '/hr'}</span>
                          <button type="button" onClick={() => setSelectedModalProf(prof)} className="min-h-[44px] px-4 bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--ink)] text-[13px] font-semibold cursor-pointer">View profile</button>
                          <button type="button" onClick={() => onSelectProfessional(prof.id)} className="min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[13px] font-bold cursor-pointer">Book now</button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </div>

            {showMap && (
              <aside aria-label="Clinic map" className="flex-[1_1_300px] max-w-full lg:max-w-[360px] bg-white border border-[color:var(--t-200)] shadow-xs p-4 flex flex-col h-[460px]">
                <h3 className="text-sm font-bold text-[color:var(--ink)] flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[color:var(--t-600)]" /> Clinic locations</h3>
                <p className="text-xs text-slate-600 mt-0.5 mb-3">Practice locations of the practitioners shown.</p>
                <div className="flex-1 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(var(--t-200)_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  {filteredList.slice(0, 5).map((prof, i) => {
                    const offsets = [
                      { top: '25%', left: '40%' }, { top: '45%', left: '65%' }, { top: '60%', left: '30%' },
                      { top: '75%', left: '55%' }, { top: '15%', left: '70%' }
                    ];
                    const pos = offsets[i % offsets.length];
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        style={{ top: pos.top, left: pos.left }}
                        onClick={() => setSelectedModalProf(prof)}
                        aria-label={`Show ${prof.name}`}
                        className="absolute group cursor-pointer z-10"
                      >
                        <span className="block bg-[color:var(--t-600)] text-white rounded-full p-1.5 border-2 border-white shadow-md"><Stethoscope className="h-3.5 w-3.5" /></span>
                        <span className="absolute bottom-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 group-focus:scale-100 transition-transform bg-[color:var(--dark)] text-white text-[11px] font-semibold px-2 py-1 whitespace-nowrap">{prof.name}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-[color:var(--ink-2)]">Showing {filteredList.length} verified practice locations.</p>
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* Practitioner credentials modal */}
      {selectedModalProf && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedModalProf(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedModalProf.name}
            className="bg-white border border-[color:var(--t-200)] max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] p-5 flex gap-4 items-start">
              <img src={selectedModalProf.avatar} alt="" className="h-16 w-16 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" referrerPolicy="no-referrer" />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-[color:var(--t-700)] bg-white border border-[color:var(--t-200)] px-2.5 py-0.5 inline-block">
                  {selectedModalProf.role === UserRole.DOCTOR ? 'Medical specialist (MD)' : 'Registered nurse'}
                </span>
                <h3 className="text-lg font-bold text-[color:var(--ink)] mt-1.5 leading-snug">{selectedModalProf.name}</h3>
                <p className="text-[13px] text-[color:var(--ink-2)]">{selectedModalProf.specialization} · {selectedModalProf.city}</p>
              </div>
              <button type="button" onClick={() => setSelectedModalProf(null)} aria-label="Close" className="h-11 w-11 flex items-center justify-center text-slate-600 hover:text-[color:var(--t-600)] cursor-pointer shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-[color:var(--e-50)] border border-[color:var(--e-200)] px-3.5 py-3 flex items-center justify-between text-[13px]">
                <span className="text-[color:var(--e-800)] font-semibold flex items-center gap-1.5"><Shield className="h-4 w-4 text-[color:var(--e-600)]" /> Medical council verification</span>
                <span className="text-[11px] font-bold text-white bg-[color:var(--e-600)] px-2.5 py-1">Verified active</span>
              </div>
              <p className="text-[13px] text-[color:var(--ink-2)] leading-relaxed bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3.5">{selectedModalProf.bio}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-[color:var(--t-200)] p-3">
                  <span className="text-xs text-slate-600 block">Registration code</span>
                  <span className="text-sm font-bold text-[color:var(--ink)]">{selectedModalProf.licenseNumber}</span>
                </div>
                <div className="border border-[color:var(--t-200)] p-3">
                  <span className="text-xs text-slate-600 block">Experience</span>
                  <span className="text-sm font-bold text-[color:var(--ink)]">{selectedModalProf.experienceYears} years</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--t-200)] p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-600 block">Consultation fee</span>
                <span className="text-lg font-bold text-[color:var(--ink)] tabular-nums">RM {selectedModalProf.fee}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedModalProf(null)} className="min-h-[44px] px-4 border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-100)] text-[color:var(--ink)] text-[13px] font-semibold cursor-pointer">Close</button>
                <button
                  type="button"
                  onClick={() => { onSelectProfessional(selectedModalProf.id); setSelectedModalProf(null); }}
                  className="min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[13px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  Book consultation <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
