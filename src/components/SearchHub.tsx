import React, { useState } from 'react';
import {
  Search, MapPin, BadgeCheck, Stethoscope, Clock, ShieldCheck,
  HeartPulse, UserCheck, Star, LayoutGrid, List, Eye, X, Sparkles, Activity
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole, Review } from '../types';

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
  // Compute an honest rating from real reviews — never fall back to seed data
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedModalProf, setSelectedModalProf] = useState<(DoctorProfile | NurseProfile) | null>(null);

  // Filter logic
  const filteredList = professionals.filter(p => {
    // 1. Search term
    const matchesSearch = searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.bio.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Specialty Filter from Clinical Matcher or Pill Rail
    const matchesSpecialtyFilter = selectedSpecialtyFilter === '' ||
      p.specialization.toLowerCase().includes(selectedSpecialtyFilter.toLowerCase());

    // 3. Role
    const matchesRole = selectedRole === 'all' || p.role === selectedRole;

    // 4. City
    const matchesCity = selectedCity === 'all' || p.city === selectedCity;

    // 5. Fee limit
    const matchesFee = p.fee <= maxFee;

    return matchesSearch && matchesSpecialtyFilter && matchesRole && matchesCity && matchesFee;
  });

  // Unique specialties for the pill rail reference
  const specialties = Array.from(new Set(professionals.map(p => p.specialization)));

  // Dynamic icon selector based on specialty names
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

  return (
    <div className="space-y-6" id="search-hub-section">
      {/* Quick Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
        {/* Search Bar & City Selector */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by practitioner name, specialty, or treatment keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>

          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-700 cursor-pointer transition-all"
            >
              <option value="all">📍 All Cities</option>
              <option value="Kuala Lumpur">Kuala Lumpur</option>
              <option value="Petaling Jaya">Petaling Jaya</option>
              <option value="Penang">Penang</option>
              <option value="Johor Bahru">Johor Bahru</option>
              <option value="Ampang">Ampang</option>
            </select>
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-700 cursor-pointer transition-all"
            >
              <option value="all">👨‍⚕️ Doctors & Nurses</option>
              <option value="doctor">Doctors (MD/MBBS)</option>
              <option value="nurse">Nurses (RN/ICU/GNM)</option>
            </select>
          </div>
        </div>

        {/* Advanced slider & state controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-slate-100 pt-4 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Budget Limit:</span>
            <input
              type="range"
              min="30"
              max="500"
              step="10"
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value))}
              className="w-full sm:w-48 accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-black text-blue-700 shrink-0 bg-blue-50/70 border border-blue-100/50 px-2.5 py-1 rounded-xl font-mono">RM {maxFee}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {selectedSpecialtyFilter && (
              <div className="bg-teal-50 border border-teal-200 text-[#c8102e] text-[10px] font-black py-1 px-2.5 rounded-xs flex items-center gap-2 animate-fade-in">
                <span>Triage: {selectedSpecialtyFilter}</span>
                <button
                  onClick={onClearSpecialtyFilter}
                  className="hover:text-red-600 font-black text-xs cursor-pointer p-0.5 rounded-xs hover:bg-teal-100/50"
                  title="Clear Specialty"
                >
                  &times;
                </button>
              </div>
            )}

            {/* List/Grid View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-3xs shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold cursor-pointer ${viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="List View"
                id="toggle-list-view"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold cursor-pointer ${viewMode === 'grid'
                    ? 'bg-white text-blue-700 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="Grid View"
                id="toggle-grid-view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            <button
              onClick={() => setShowMap(!showMap)}
              className="text-xs font-extrabold border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
            >
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              <span>{showMap ? "Hide Map" : "Show Map"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Category Pill Rail */}
      <div className="space-y-2 border-b border-slate-100 pb-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-blue-600" />
            Specialty Directory Categories
          </span>
          <span className="text-[9px] font-semibold text-slate-400 hidden sm:inline-block">
            Swipe left/right to browse &bull; {specialties.length + 1} categories
          </span>
        </div>
        <div role="tablist" aria-label="Specialty directory categories" className="flex flex-wrap gap-2 border border-[#FECDD3] rounded-xl bg-[#FFF0F2]/95 backdrop-blur-md p-1.5 shadow-xs">
          {/* "All Specialties" Pill */}
          <button
            onClick={onClearSpecialtyFilter}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${selectedSpecialtyFilter === ''
                ? 'text-[#DC2626] bg-white border-[#FECDD3] shadow-xs'
                : 'text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
              }`}
          >
            <LayoutGrid className={`h-3.5 w-3.5 ${selectedSpecialtyFilter === '' ? 'text-[#DC2626]' : 'text-slate-400'}`} />
            <span>All Specialties</span>
          </button>

          {/* Specialty Pills */}
          {specialties.map((spec) => {
            const IconComponent = getSpecialtyIcon(spec);
            const isSelected = selectedSpecialtyFilter.toLowerCase() === spec.toLowerCase();
            return (
              <button
                key={spec}
                onClick={() => onSelectSpecialtyFilter(spec)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${isSelected
                    ? 'text-[#DC2626] bg-white border-[#FECDD3] shadow-xs'
                    : 'text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
                  }`}
              >
                <IconComponent className={`h-3.5 w-3.5 ${isSelected ? 'text-[#DC2626]' : 'text-slate-400'}`} />
                <span>{spec}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main List/Grid Column */}
        <div className={`${showMap ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
          {filteredList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-3xs">
              <Stethoscope className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-750">No medical professionals match your filters</h4>
              <p className="text-xs text-slate-500">Try adjusting your budget, city selection, or query keywords.</p>
            </div>
          ) : viewMode === 'list' ? (
            /* Premium List View */
            <div className="space-y-4">
              {filteredList.map((prof) => {
                const isDoc = prof.role === UserRole.DOCTOR;
                return (
                  <div
                    key={prof.id}
                    onClick={() => setSelectedModalProf(prof)}
                    className="bg-white border border-slate-200 hover:border-blue-400 rounded-3xl p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer relative overflow-hidden group"
                  >
                    {/* Floating Accent Border on Hover */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5 ${isDoc ? 'bg-teal-500' : 'bg-indigo-500'
                      }`}></div>

                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Avatar */}
                      <img
                        src={prof.avatar}
                        alt={prof.name}
                        className="h-14 w-14 rounded-full object-cover border border-[#FECDD3] shadow-3xs shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-850 group-hover:text-blue-600 transition-colors truncate">
                            {prof.name}
                          </h4>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${isDoc
                              ? "bg-teal-50 text-teal-800 border-teal-100"
                              : "bg-indigo-50 text-indigo-800 border-indigo-100"
                            }`}>
                            {isDoc ? "Doctor (MD/MBBS)" : "Registered Nurse (RN)"}
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-xs border border-emerald-100 flex items-center gap-0.5 shadow-3xs">
                            <BadgeCheck className="h-3 w-3 text-emerald-600" />
                            Verified ✅
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {prof.specialization}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {prof.city}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {prof.experienceYears} Years Exp
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 italic truncate max-w-xl">
                          "{prof.bio}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span>{getRatingInfo(prof.id).display}</span>
                        <span className="text-slate-400 font-bold">({getRatingInfo(prof.id).count})</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Consultation Fee</span>
                        <span className="text-sm font-extrabold text-blue-800 font-mono">
                          RM {prof.fee}
                          <span className="text-[10px] font-semibold text-slate-500 font-sans">{isDoc ? "" : "/hr"}</span>
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModalProf(prof);
                        }}
                        className="text-xs font-extrabold bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3.5 rounded-xl border border-blue-200/60 shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                        id={`view-credentials-btn-${prof.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Credentials</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Cleaner, More Professional Practitioner Grid Layouts */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredList.map((prof) => {
                const isDoc = prof.role === UserRole.DOCTOR;
                return (
                  <div
                    key={prof.id}
                    onClick={() => onSelectProfessional(prof.id)}
                    className={`bg-white border border-slate-200 rounded-[24px] p-5 shadow-3xs hover:shadow-md hover:border-blue-400/80 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
                  >
                    {/* Visual top highlighting stripe per role */}
                    <div className={`absolute left-0 right-0 top-0 h-1.5 ${isDoc ? 'bg-teal-500/80' : 'bg-indigo-500/80'
                      }`}></div>

                    <div className="space-y-4">
                      {/* Top Header: Role indicator and Verified Status */}
                      <div className="flex justify-between items-center pt-1.5">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${isDoc
                            ? "bg-teal-50 text-teal-800 border-teal-100"
                            : "bg-indigo-50 text-indigo-800 border-indigo-100"
                          }`}>
                          {isDoc ? "Doctor" : "Registered Nurse"}
                        </span>

                        <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-xs border border-emerald-150 flex items-center gap-0.5 shadow-3xs">
                          <BadgeCheck className="h-3 w-3 text-emerald-500 fill-emerald-50" />
                          Verified
                        </span>
                      </div>

                      {/* Avatar, Name & Specialty info */}
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <img
                            src={prof.avatar}
                            alt={prof.name}
                            className="h-14 w-14 rounded-2xl object-cover border border-slate-100 shadow-3xs"
                            referrerPolicy="no-referrer"
                          />
                          <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isDoc ? 'bg-teal-500' : 'bg-indigo-500'
                            }`}></span>
                        </div>

                        <div className="space-y-1 min-w-0">
                          <h4 className="text-sm font-black text-slate-850 group-hover:text-blue-600 transition-colors truncate leading-tight">
                            {prof.name}
                          </h4>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold">
                            <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{prof.specialization}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{prof.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bio Quote box */}
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic bg-slate-50/50 border border-slate-150/40 p-3 rounded-xl">
                        "{prof.bio}"
                      </p>

                      {/* Credential metrics compartment boxes */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50/70 border border-slate-100 p-2 rounded-xl text-center">
                          <span className="text-[8px] text-slate-400 font-bold uppercase block tracking-wider">Registry Code</span>
                          <code className="text-[10px] font-mono font-black text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shadow-3xs inline-block mt-0.5">{prof.licenseNumber}</code>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 p-2 rounded-xl text-center flex flex-col justify-center">
                          <span className="text-[8px] text-slate-400 font-bold uppercase block tracking-wider">Experience</span>
                          <span className="text-[11px] font-black text-slate-800 mt-0.5">{prof.experienceYears} Years</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Details */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 text-xs gap-2">
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-250/50 px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span>{getRatingInfo(prof.id).display}</span>
                        <span className="text-amber-600/70">({getRatingInfo(prof.id).count})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModalProf(prof);
                          }}
                          className="text-[10px] font-extrabold text-blue-600 bg-blue-50/70 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-250/30 transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                          title="View Credentials Card"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Credentials</span>
                        </button>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Consultation Fee</span>
                          <span className="text-xs font-black text-blue-800 font-mono">
                            RM {prof.fee}
                            <span className="text-[9px] font-semibold text-slate-500 font-sans">{isDoc ? "" : "/hr"}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Map Column (Toggleable) */}
        {showMap && (
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-3xl p-4 shadow-3xs flex flex-col h-[520px] justify-between relative overflow-hidden sticky top-20">
            <div className="space-y-1 mb-4 z-10">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Clinic & Home Care Coordinates
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold">Active geolocations within KL, Selangor, Penang, and Johor</p>
            </div>

            {/* Custom Interactive Mock Map Grid */}
            <div className="flex-1 bg-slate-200/80 rounded-2xl border border-slate-300 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

              {/* Map road lines mock */}
              <div className="absolute top-1/3 left-0 right-0 h-1 bg-slate-300 transform -rotate-6 shadow-inner"></div>
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-300 transform rotate-12 shadow-inner"></div>
              <div className="absolute top-2/3 left-0 right-0 h-1 bg-slate-300 shadow-inner"></div>

              {/* Dynamic location pins from filtered results */}
              {filteredList.slice(0, 5).map((prof, i) => {
                const offsets = [
                  { top: "25%", left: "40%" },
                  { top: "45%", left: "65%" },
                  { top: "60%", left: "30%" },
                  { top: "75%", left: "55%" },
                  { top: "15%", left: "70%" }
                ];
                const pos = offsets[i % offsets.length];

                return (
                  <div
                    key={prof.id}
                    style={{ top: pos.top, left: pos.left }}
                    onClick={() => onSelectProfessional(prof.id)}
                    className="absolute cursor-pointer group flex flex-col items-center justify-center z-20"
                  >
                    <div className="bg-blue-700 text-white rounded-full p-1 border border-white shadow-lg animate-bounce hover:scale-110 transition-transform">
                      {prof.role === UserRole.DOCTOR ? (
                        <Stethoscope className="h-3 w-3 text-blue-300" />
                      ) : (
                        <HeartPulse className="h-3 w-3 text-slate-300" />
                      )}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-6 scale-0 group-hover:scale-100 transition-all bg-blue-700 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                      {prof.name}
                    </div>
                  </div>
                );
              })}

              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-md">
                <span className="text-[10px] font-extrabold text-slate-800 flex items-center gap-1 mb-1">
                  <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                  Showing {filteredList.length} verified listings
                </span>
                <p className="text-[9px] text-slate-500 font-semibold">Pins represent registered medical council practitioner clinic coordinates.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Card Lightbox / Modal Popup */}
      {selectedModalProf && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedModalProf(null)}
          id="credentials-modal-backdrop"
        >
          {/* Card Wrapper with responsive scaling */}
          <div
            className="relative max-w-md w-full scale-100 md:hover:scale-[1.01] transition-all duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* The precise, styled card matching user's image with a vibrant teal border */}
            <div
              className="bg-white border-[3px] border-teal-400 rounded-[28px] p-6 shadow-[0_20px_50px_rgba(13,148,136,0.18)] flex flex-col justify-between relative overflow-hidden"
              style={{ minHeight: '380px' }}
              id="credentials-modal-card"
            >
              {/* Floating Close Button in top corner */}
              <button
                onClick={() => setSelectedModalProf(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-10"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                {/* Header layout: Avatar, Name & Specialization, Verified Badge */}
                <div className="flex gap-4 pr-6">
                  {/* Avatar with rounded corners */}
                  <img
                    src={selectedModalProf.avatar}
                    alt={selectedModalProf.name}
                    className="h-20 w-20 rounded-2xl object-cover border border-slate-150 shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="space-y-1">
                    {/* Role badge */}
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${selectedModalProf.role === UserRole.DOCTOR
                        ? "bg-teal-50 text-teal-800 border-teal-200/60"
                        : "bg-indigo-50 text-indigo-800 border-indigo-200/60"
                      }`}>
                      {selectedModalProf.role === UserRole.DOCTOR ? "DOCTOR (MD/MBBS)" : "REGISTERED NURSE (RN)"}
                    </span>

                    {/* Name */}
                    <h3 className="text-lg font-black text-[#c8102e] leading-tight mt-1">
                      {selectedModalProf.name}
                    </h3>

                    {/* Specialty */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold mt-1">
                      <Stethoscope className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      <span>{selectedModalProf.specialization}</span>
                    </div>

                    {/* City */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{selectedModalProf.city}</span>
                    </div>
                  </div>
                </div>

                {/* Verified badge pill */}
                <div className="mt-4 flex justify-between items-center bg-teal-50/10 px-3.5 py-1.5 rounded-xl border border-teal-100/50">
                  <div className="text-[10px] font-bold text-slate-500">Registry Verification Status</div>
                  <div className="border border-emerald-500/80 text-emerald-600 bg-emerald-50/40 px-3 py-1 rounded-xs text-xs font-bold flex items-center gap-1 shadow-3xs">
                    <span>Verified</span>
                    <span className="text-emerald-500">☑</span>
                  </div>
                </div>

                {/* Quote / Bio Block */}
                <p className="text-[11px] text-slate-500 leading-relaxed italic border-l-2 border-slate-200 pl-3 mt-4">
                  "{selectedModalProf.bio}"
                </p>

                {/* License credentials details */}
                <div className="bg-slate-50/60 rounded-xl p-3.5 mt-4 space-y-2 border border-slate-150">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {selectedModalProf.role === UserRole.DOCTOR ? "MMC Registration:" : "LJM Nurse Registry:"}
                    </span>
                    <code className="font-mono font-bold text-[11px] text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-3xs">{selectedModalProf.licenseNumber}</code>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      Clinical Experience:
                    </span>
                    <span className="font-extrabold text-[11px] text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-3xs">{selectedModalProf.experienceYears} Years</span>
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
                <div className="flex items-center gap-1 font-extrabold text-slate-700 text-xs">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>{getRatingInfo(selectedModalProf.id).display}</span>
                  <span className="text-slate-400 font-semibold">({getRatingInfo(selectedModalProf.id).count})</span>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block font-extrabold uppercase tracking-wider leading-none">Consultation Fee</span>
                  <span className="text-sm font-extrabold text-teal-800 font-mono mt-1 block">
                    RM {selectedModalProf.fee}
                    <span className="text-[10px] font-semibold text-slate-500 font-sans">{selectedModalProf.role === UserRole.DOCTOR ? "" : "/hr"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Container Under Card */}
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedModalProf(null)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSelectProfessional(selectedModalProf.id);
                  setSelectedModalProf(null);
                }}
                className="px-5 py-2.5 bg-[#c8102e] hover:bg-[#a50f2a] text-white text-xs font-extrabold rounded-xl shadow-md shadow-teal-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Full Profile & Appointments</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
