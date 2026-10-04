import React, { useState } from 'react';
import {
  Search, MapPin, BadgeCheck, Stethoscope, Clock, ShieldCheck,
  HeartPulse, UserCheck, Star, LayoutGrid, List, Eye, X, Sparkles, Activity,
  Calendar, Check, SlidersHorizontal, ArrowRight, CheckCircle2, Shield
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

    return matchesSearch && matchesSpecialtyFilter && matchesRole && matchesCity && matchesFee;
  });

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

  return (
    <div className="space-y-6" id="search-hub-section">
      {/* Search Header Banner */}
      <div className="bg-white border border-[#FECDD3] rounded-none p-6 shadow-3xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#FECDD3] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3] text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-none inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#DC2626]" /> MMC &amp; LJM Council Verified
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-black uppercase px-2 py-0.5 rounded-none inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {filteredList.length} Active Practitioners
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Find Certified Doctors and Nurses
            </h2>
            <p className="text-xs text-slate-600 font-medium max-w-2xl">
              Search verified specialists, check active medical council licensing credentials, and book direct telehealth or in-clinic consultations.
            </p>
          </div>

          {/* View Mode & Map Toggle Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-none border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#DC2626] text-white shadow-3xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#DC2626] text-white shadow-3xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
            </div>

            <button
              onClick={() => setShowMap(!showMap)}
              className={`px-3.5 py-2 rounded-none text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                showMap
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white border-[#FECDD3] text-slate-700 hover:bg-[#FFF0F2]'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-[#DC2626]" />
              <span>{showMap ? "Hide Map" : "Clinic Map"}</span>
            </button>
          </div>
        </div>

        {/* Primary Filter Bar: Input Search, City, Role, and Fee slider */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search Input */}
          <div className="relative md:col-span-5">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by practitioner name, specialty, or treatment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-[#FFF0F2]/30 border border-[#FECDD3] rounded-none py-3 pl-10 pr-4 outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          {/* City Filter Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-[#FECDD3] rounded-none py-3 px-3.5 outline-none focus:border-[#DC2626] font-bold text-slate-700 cursor-pointer transition-all"
            >
              <option value="all">📍 All Cities (Malaysia)</option>
              <option value="Kuala Lumpur">Kuala Lumpur</option>
              <option value="Petaling Jaya">Petaling Jaya</option>
              <option value="Penang">Penang</option>
              <option value="Johor Bahru">Johor Bahru</option>
              <option value="Ampang">Ampang</option>
            </select>
          </div>

          {/* Role Filter Selector */}
          <div className="md:col-span-4">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-[#FECDD3] rounded-none py-3 px-3.5 outline-none focus:border-[#DC2626] font-bold text-slate-700 cursor-pointer transition-all"
            >
              <option value="all">👨‍⚕️ All Medical Professionals</option>
              <option value="doctor">Doctors Only (MD / MBBS)</option>
              <option value="nurse">Nurses Only (RN / ICU)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Fee Slider & Active Triage Badges */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-3 border-t border-[#FECDD3]/50 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="font-extrabold text-slate-600 flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#DC2626]" /> Max Fee:
            </span>
            <input
              type="range"
              min="30"
              max="500"
              step="10"
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value))}
              className="w-full sm:w-40 accent-[#DC2626] h-1.5 bg-slate-100 rounded-none appearance-none cursor-pointer"
            />
            <span className="font-mono font-black text-[#DC2626] bg-[#FFF0F2] border border-[#FECDD3] px-2.5 py-0.5 rounded-none text-xs">
              RM {maxFee}
            </span>
          </div>

          {selectedSpecialtyFilter && (
            <div className="bg-[#FFF0F2] border border-[#FECDD3] text-[#DC2626] text-[11px] font-black py-1 px-3 rounded-none flex items-center gap-2">
              <span>Filter: {selectedSpecialtyFilter}</span>
              <button
                onClick={onClearSpecialtyFilter}
                className="hover:text-black font-black text-xs cursor-pointer px-1"
                title="Clear Filter"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Specialty Category Rail */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-[#DC2626]" /> Specialty Categories
          </span>
          <span className="text-[9px] font-semibold text-slate-400">
            {specialties.length} Categories Available
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-[#FFF0F2]/70 border border-[#FECDD3] p-2 rounded-none">
          <button
            onClick={onClearSpecialtyFilter}
            className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
              selectedSpecialtyFilter === ''
                ? 'bg-[#DC2626] text-white border-[#B91C1C]'
                : 'bg-white text-slate-700 border-[#FECDD3] hover:bg-[#FFF0F2]'
            }`}
          >
            All Specialties
          </button>

          {specialties.map((spec) => {
            const IconComp = getSpecialtyIcon(spec);
            const isSelected = selectedSpecialtyFilter.toLowerCase() === spec.toLowerCase();
            return (
              <button
                key={spec}
                onClick={() => onSelectSpecialtyFilter(spec)}
                className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#DC2626] text-white border-[#B91C1C]'
                    : 'bg-white text-slate-700 border-[#FECDD3] hover:bg-[#FFF0F2]'
                }`}
              >
                <IconComp className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-[#DC2626]'}`} />
                <span>{spec}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results Directory Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${showMap ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
          {filteredList.length === 0 ? (
            <div className="bg-white border border-[#FECDD3] rounded-none p-12 text-center space-y-3 shadow-3xs">
              <Stethoscope className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No medical professionals match your search criteria</h4>
              <p className="text-xs text-slate-500 font-medium">Try broadening your budget limit, city selection, or specialty keywords.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRole('all');
                  setSelectedCity('all');
                  setMaxFee(500);
                  onClearSpecialtyFilter();
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-none cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredList.map((prof) => {
                const isDoc = prof.role === UserRole.DOCTOR;
                const rating = getRatingInfo(prof.id);

                return (
                  <div
                    key={prof.id}
                    onClick={() => onSelectProfessional(prof.id)}
                    className="bg-white border border-[#FECDD3] rounded-none p-5 shadow-3xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden space-y-4"
                  >
                    {/* Top Accent Stripe */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#DC2626]"></div>

                    {/* Role & Verification Badge Header */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-none">
                        {isDoc ? "Doctor (MD/MBBS)" : "Registered Nurse (RN)"}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-black px-2 py-0.5 rounded-none flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3 text-emerald-600" />
                        Verified
                      </span>
                    </div>

                    {/* Profile Avatar & Info */}
                    <div className="flex gap-4 items-start">
                      <div className="relative shrink-0">
                        <img
                          src={prof.avatar}
                          alt={prof.name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-[#FECDD3] shadow-3xs"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse"></span>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <h3 className="text-base font-black text-slate-900 group-hover:text-[#DC2626] transition-colors truncate">
                          {prof.name}
                        </h3>
                        <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Stethoscope className="h-3.5 w-3.5 text-[#DC2626] shrink-0" />
                          <span className="truncate">{prof.specialization}</span>
                        </p>
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{prof.city}</span>
                        </p>
                      </div>
                    </div>

                    {/* Bio Snippet */}
                    <p className="text-[11px] text-slate-600 leading-relaxed italic bg-[#FFF0F2]/30 border border-[#FECDD3]/50 p-2.5 rounded-none line-clamp-2">
                      "{prof.bio}"
                    </p>

                    {/* Licensing & Experience Boxes */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-slate-50 border border-slate-200 p-2 rounded-none">
                        <span className="text-[8px] font-black uppercase text-slate-400 block">Council Code</span>
                        <code className="font-mono text-[10px] font-bold text-slate-800">{prof.licenseNumber}</code>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2 rounded-none">
                        <span className="text-[8px] font-black uppercase text-slate-400 block">Experience</span>
                        <span className="text-[10px] font-black text-slate-800">{prof.experienceYears} Years</span>
                      </div>
                    </div>

                    {/* Card Footer: Rating, Fee & Action */}
                    <div className="border-t border-[#FECDD3] pt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-800">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span>{rating.display}</span>
                        <span className="text-slate-400 text-[10px]">({rating.count})</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 uppercase font-extrabold block leading-none">Consultation</span>
                        <span className="text-sm font-black font-mono text-[#DC2626]">
                          RM {prof.fee}
                          <span className="text-[9px] font-sans font-semibold text-slate-500">{isDoc ? "" : "/hr"}</span>
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModalProf(prof);
                        }}
                        className="p-2 bg-[#FFF0F2] hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-[#FECDD3] rounded-none transition-all cursor-pointer"
                        title="View Full Credentials"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-3">
              {filteredList.map((prof) => {
                const isDoc = prof.role === UserRole.DOCTOR;
                const rating = getRatingInfo(prof.id);

                return (
                  <div
                    key={prof.id}
                    onClick={() => onSelectProfessional(prof.id)}
                    className="bg-white border border-[#FECDD3] p-4 rounded-none shadow-3xs hover:border-[#DC2626] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={prof.avatar}
                        alt={prof.name}
                        className="h-14 w-14 rounded-full object-cover border border-[#FECDD3] shadow-3xs shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 group-hover:text-[#DC2626] transition-colors truncate">
                            {prof.name}
                          </h3>
                          <span className="bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3] text-[9px] font-bold uppercase px-2 py-0.5 rounded-none">
                            {isDoc ? "MD / MBBS" : "RN Nurse"}
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 border border-emerald-100 flex items-center gap-0.5">
                            <Check className="h-3 w-3 text-emerald-600" /> MMC Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-semibold flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5 text-[#DC2626]" /> {prof.specialization}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" /> {prof.city}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>{prof.experienceYears} Yrs Exp</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#FECDD3]">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Rate</span>
                        <span className="text-sm font-black font-mono text-[#DC2626]">
                          RM {prof.fee}
                          <span className="text-[9px] font-sans text-slate-500 font-semibold">{isDoc ? "" : "/hr"}</span>
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModalProf(prof);
                        }}
                        className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-none transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Credentials</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clinic Location Map (Toggleable) */}
        {showMap && (
          <div className="lg:col-span-4 bg-white border border-[#FECDD3] rounded-none p-4 shadow-3xs flex flex-col h-[500px] justify-between sticky top-20">
            <div className="space-y-1 mb-3">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#DC2626]" /> Clinic Geolocations
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold">Interactive clinic coordinates across Malaysia</p>
            </div>

            <div className="flex-1 bg-slate-100 border border-slate-200 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
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
                    <div className="bg-[#0F172A] text-white rounded-full p-1.5 border-2 border-white shadow-lg animate-bounce">
                      <Stethoscope className="h-3.5 w-3.5 text-[#DC2626]" />
                    </div>
                    <div className="absolute bottom-7 scale-0 group-hover:scale-100 transition-all bg-[#0F172A] text-white text-[9px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                      {prof.name}
                    </div>
                  </div>
                );
              })}

              <div className="absolute bottom-3 left-3 right-3 bg-white/95 p-2.5 border border-[#FECDD3] text-[10px] font-bold text-slate-700 shadow-sm">
                📍 Showing {filteredList.length} verified practice locations.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Practitioner Credentials Modal */}
      {selectedModalProf && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedModalProf(null)}
        >
          <div
            className="bg-white border-2 border-[#FECDD3] rounded-none max-w-lg w-full p-6 shadow-2xl space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedModalProf(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex gap-4 items-start">
              <img
                src={selectedModalProf.avatar}
                alt={selectedModalProf.name}
                className="h-20 w-20 rounded-full object-cover border-2 border-[#FECDD3] shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1 pr-6">
                <span className="bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-none inline-block">
                  {selectedModalProf.role === UserRole.DOCTOR ? "Medical Specialist (MD)" : "Clinical Registered Nurse"}
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  {selectedModalProf.name}
                </h3>
                <p className="text-xs font-bold text-[#DC2626] flex items-center gap-1">
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>{selectedModalProf.specialization}</span>
                </p>
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{selectedModalProf.city}, Malaysia</span>
                </p>
              </div>
            </div>

            {/* Verification Status Banner */}
            <div className="bg-[#FFF0F2] border border-[#FECDD3] p-3 rounded-none flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-[#DC2626]" /> Medical Council Verification:
              </span>
              <span className="bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-black uppercase rounded-none">
                VERIFIED ACTIVE
              </span>
            </div>

            {/* Bio Block */}
            <div className="text-xs text-slate-600 italic bg-slate-50 p-3 border-l-4 border-l-[#DC2626] rounded-none">
              "{selectedModalProf.bio}"
            </div>

            {/* License details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Registration Code</span>
                <code className="font-mono text-xs font-black text-slate-800">{selectedModalProf.licenseNumber}</code>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Clinical Experience</span>
                <span className="text-xs font-black text-slate-800">{selectedModalProf.experienceYears} Years</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-[#FECDD3] pt-4 flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Consultation Fee</span>
                <span className="text-base font-black font-mono text-[#DC2626]">
                  RM {selectedModalProf.fee}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedModalProf(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-none transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onSelectProfessional(selectedModalProf.id);
                    setSelectedModalProf(null);
                  }}
                  className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-none transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
                >
                  <span>Book Consultation</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
