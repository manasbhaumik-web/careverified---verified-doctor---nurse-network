import React, { useCallback, useEffect, useState } from 'react';
import {
  PackagePlus, Search, Tag, Building2, Check, Clock, ShieldCheck,
  AlertCircle, ChevronRight, X, Calendar, Phone, Mail, Globe, MapPin,
  Sparkles, Gift, Filter, ArrowRight, Copy, CheckCircle2, FileText,
  BadgeCheck, HeartPulse
} from 'lucide-react';
import DashboardHeader, { bannerPrimaryBtn } from './DashboardHeader';

export interface MedicalPackage {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_city: string;
  facility_state: string;
  licence_no?: string;
  mhtc_member?: number;
  code: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  priceMyr: number;
  originalPriceMyr: number | null;
  target_audience: 'all' | 'local' | 'international';
  fastingRequired: boolean;
  inclusions: string[];
  exclusions?: string;
  preparation_instructions?: string;
  image_url?: string;
  status: 'published' | 'draft' | 'archived';
  featured: boolean;
  created_at: string;
}

export interface MedicalPromotion {
  id: string;
  facility_id: string;
  facility_name?: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discountValueMyr?: number | null;
  package_id?: string | null;
  package_title?: string;
  badge_text?: string;
  valid_from: string;
  valid_until: string;
  terms?: string;
  status: 'active' | 'paused' | 'expired';
}

export interface FacilityDirectoryItem {
  id: string;
  name: string;
  kind: string;
  city: string;
  state: string;
  address: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  mhtcMember: boolean;
  licenceNo: string;
  licenceExpiry: string;
  isLicenceValid: boolean;
  coverImage: string;
  specialties: string[];
  equipment: string[];
  amenities: string[];
  accreditations: Array<{ body: string; number: string; validUntil: string }>;
  packagesCount: number;
  activePromotionsCount: number;
}

const CATEGORIES = [
  'All',
  'Health Screening',
  'Cardiology',
  'Orthopaedics',
  'Maternity',
  'Fertility',
  'Oncology',
  'Ophthalmology',
  'Dental',
  'Surgery',
  'Aesthetics',
];

interface MedicalPackagesModuleProps {
  initialCategory?: string;
  onSelectFacility?: (facilityId: string) => void;
  onEnquirePackage?: (pkg: MedicalPackage) => void;
}

export default function MedicalPackagesModule({
  initialCategory = 'All',
  onSelectFacility,
  onEnquirePackage,
}: MedicalPackagesModuleProps) {
  const [activeTab, setActiveTab] = useState<'packages' | 'promotions' | 'facilities'>('packages');
  const [packages, setPackages] = useState<MedicalPackage[]>([]);
  const [promotions, setPromotions] = useState<MedicalPromotion[]>([]);
  const [facilities, setFacilities] = useState<FacilityDirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedAudience, setSelectedAudience] = useState<'all' | 'local' | 'international'>('all');

  // Detail Modal / Booking state
  const [selectedPackage, setSelectedPackage] = useState<MedicalPackage | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountMyr: number; title: string } | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Booking / Enquiry Form Modal state
  const [bookingModal, setBookingModal] = useState<MedicalPackage | null>(null);
  const [bookName, setBookName] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookFeedback, setBookFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load packages
  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
      if (selectedAudience && selectedAudience !== 'all') params.set('audience', selectedAudience);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/packages?${params.toString()}`);
      const data = await res.json();
      if (data.status === 'success') {
        setPackages(data.data);
      }
    } catch {
      setError('Unable to load medical packages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedAudience, searchQuery]);

  // Load promotions
  const loadPromotions = useCallback(async () => {
    try {
      const res = await fetch('/api/promotions?active_only=1');
      const data = await res.json();
      if (data.status === 'success') {
        setPromotions(data.data);
      }
    } catch {
      // silently ignore
    }
  }, []);

  // Load facilities directory
  const loadFacilities = useCallback(async () => {
    try {
      const res = await fetch('/api/facilities/directory');
      const data = await res.json();
      if (data.status === 'success') {
        setFacilities(data.data);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    loadPromotions();
    loadFacilities();
  }, [loadPromotions, loadFacilities]);

  // Handle promo code verification
  const handleApplyPromo = async (codeToVerify?: string) => {
    const code = (codeToVerify || promoCodeInput).trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a promotion code.');
      return;
    }
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await fetch('/api/promotions/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, packageId: selectedPackage?.id }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        let discount = 0;
        if (selectedPackage) {
          if (data.data.discountType === 'percentage') {
            discount = (selectedPackage.priceMyr * data.data.discountValue) / 100;
          } else {
            discount = data.data.discountValue;
          }
        }
        setAppliedPromo({
          code: data.data.code,
          discountMyr: discount,
          title: data.data.title,
        });
        setPromoSuccess(data.message || 'Promotion applied successfully!');
      } else {
        setPromoError(data.message || 'Invalid promotion code.');
      }
    } catch {
      setPromoError('Failed to verify promo code. Please check your connection.');
    }
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Submit booking / enquiry
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModal) return;
    setBookSubmitting(true);
    setBookFeedback(null);

    try {
      const summaryText = `[Package Booking] ${bookingModal.title} (${bookingModal.code}) - Indicative Price: RM ${bookingModal.priceMyr.toLocaleString()} MYR. Preferred Date: ${bookDate || 'Flexible'}. Notes: ${bookNotes || 'None'}`;
      const res = await fetch('/api/tourism/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: bookingModal.facility_id,
          specialty: bookingModal.category,
          summary: summaryText,
          homeCountry: selectedAudience === 'international' ? 'International Patient' : 'Malaysia',
          preferredFrom: bookDate || undefined,
          patientName: bookName,
          patientPhone: bookPhone,
          patientEmail: bookEmail,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setBookFeedback({
          type: 'success',
          message: 'Your booking enquiry has been submitted directly to the facility. Their admissions desk will contact you with formal confirmation.',
        });
        setTimeout(() => {
          setBookingModal(null);
          setBookFeedback(null);
          setBookName('');
          setBookPhone('');
          setBookEmail('');
          setBookNotes('');
        }, 3000);
      } else {
        setBookFeedback({
          type: 'error',
          message: data.message || 'Failed to submit booking enquiry. Please try again.',
        });
      }
    } catch {
      setBookFeedback({
        type: 'error',
        message: 'Network error. Please try again or contact the medical facility directly.',
      });
    } finally {
      setBookSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-0">
      {/* Module Header Banner */}
      <DashboardHeader
        fullWidth={true}
        eyebrow="Accredited Clinical Network"
        title="Medical Packages, Promotions & Facilities"
        description="Explore published medical screening packages, surgical procedures, and exclusive promotional campaigns across certified Act 586 hospitals & specialist clinics in Malaysia."
        tabs={[
          { id: 'packages', label: 'Medical Packages', icon: PackagePlus, count: packages.length },
          { id: 'promotions', label: 'Promotions & Offers', icon: Tag, count: promotions.length },
          { id: 'facilities', label: 'Facilities & Infrastructure', icon: Building2, count: facilities.length },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
        tabsLabel="Medical package modules"
      />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ------------------------------------------------------------------- */}
        {/* ACTIVE PROMOTIONS MARQUEE STRIP (Shown on all tabs) */}
        {/* ------------------------------------------------------------------- */}
        {promotions.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-300 p-4 rounded-none shadow-2xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-amber-600 text-white font-black text-xs rounded-none">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                    Active Healthcare Promotions & Seasonal Rebates
                    <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2">
                      {promotions.length} Available
                    </span>
                  </h4>
                  <p className="text-xs text-amber-900/90 mt-0.5">
                    Save on comprehensive health screenings, surgical procedures, and fertility assessments with official promotional codes.
                  </p>
                </div>
              </div>

              {/* Promo chips carousel */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {promotions.slice(0, 3).map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => {
                      copyPromoCode(pr.code);
                      setPromoCodeInput(pr.code);
                    }}
                    className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-400 text-slate-800 text-xs font-bold hover:bg-amber-100/50 cursor-pointer transition-colors shadow-2xs"
                    title="Click to copy promo code"
                  >
                    <Tag className="h-3.5 w-3.5 text-amber-700" />
                    <span className="font-mono font-extrabold text-[color:var(--t-700)]">{pr.code}</span>
                    <span className="text-[10px] text-emerald-700 font-extrabold uppercase px-1.5 py-0.2 bg-emerald-50 border border-emerald-300">
                      {pr.badge_text || (pr.discount_type === 'percentage' ? `${pr.discount_value}% OFF` : `RM ${pr.discountValueMyr} OFF`)}
                    </span>
                    {copiedCode === pr.code ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: MEDICAL PACKAGES EXPLORER */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            {/* Filter Control Bar */}
            <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-2xs space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search packages by procedure, health test, hospital, or city..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white rounded-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Target Audience Pill Filter */}
                <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 p-1 shrink-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-2 flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Audience:
                  </span>
                  {[
                    { id: 'all', label: 'All Patients' },
                    { id: 'local', label: 'Malaysian Residents' },
                    { id: 'international', label: 'Medical Tourism (MHTC)' },
                  ].map((aud) => (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setSelectedAudience(aud.id as any)}
                      className={`text-[11px] font-bold px-3 py-1 transition-all cursor-pointer rounded-none ${
                        selectedAudience === aud.id
                          ? 'bg-white text-[color:var(--t-700)] shadow-xs border border-[color:var(--t-200)]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Horizontal Scroll Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-slate-100 pt-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 mr-1">Category:</span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 text-xs font-bold px-3 py-1.5 transition-colors cursor-pointer rounded-none border ${
                      selectedCategory === cat
                        ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Packages Grid */}
            {loading ? (
              <div className="p-16 text-center text-slate-500 text-xs bg-white border border-slate-200">
                Loading published medical packages…
              </div>
            ) : packages.length === 0 ? (
              <div className="p-16 text-center bg-white border border-dashed border-slate-300 space-y-3">
                <PackagePlus className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No medical packages match your criteria</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try clearing your search query or selecting a different specialty category.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedAudience('all');
                  }}
                  className="mt-2 text-xs font-bold px-4 py-2 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="group bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-400)] transition-all duration-300 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Photo / Header Banner */}
                      <div className="relative aspect-16/9 overflow-hidden bg-slate-100">
                        <img
                          src={pkg.image_url || '/assets/clean_light_doctor_suite_full-C0TGKdC3.jpg'}
                          alt={pkg.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-slate-900/90 text-white border border-white/20 backdrop-blur-xs">
                            {pkg.code}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[color:var(--t-600)] text-white shadow-xs">
                            {pkg.category}
                          </span>
                        </div>
                        {pkg.target_audience === 'international' && (
                          <div className="absolute top-2.5 right-2.5">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-700/90 text-white border border-blue-400/50 backdrop-blur-xs">
                              MHTC Travel
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content Body */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Building2 className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                            {pkg.facility_name}
                          </span>
                          <span>{pkg.facility_city}</span>
                        </div>

                        <h3 className="font-extrabold text-base text-[color:var(--ink)] leading-snug group-hover:text-[color:var(--t-600)] transition-colors">
                          {pkg.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {pkg.description}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {pkg.duration}
                          </span>
                          {pkg.fastingRequired && (
                            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                              Fasting Required
                            </span>
                          )}
                        </div>

                        {/* Inclusions Highlights */}
                        <div className="pt-3 border-t border-slate-100 space-y-1.5">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            Includes ({pkg.inclusions.length} Clinical Items):
                          </div>
                          {pkg.inclusions.slice(0, 3).map((inc, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{inc}</span>
                            </div>
                          ))}
                          {pkg.inclusions.length > 3 && (
                            <div className="text-[11px] text-[color:var(--t-600)] font-semibold pt-0.5">
                              + {pkg.inclusions.length - 3} more included services & tests
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer / Pricing & Actions */}
                    <div className="p-5 pt-3 bg-slate-50 border-t border-[color:var(--t-100)] flex items-end justify-between gap-3">
                      <div>
                        {pkg.originalPriceMyr && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 line-through">
                              RM {pkg.originalPriceMyr.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.2">
                              Save {Math.round(((pkg.originalPriceMyr - pkg.priceMyr) / pkg.originalPriceMyr) * 100)}%
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-slate-500 uppercase">MYR</span>
                          <span className="text-xl font-extrabold text-[color:var(--ink)] tabular-nums">
                            {pkg.priceMyr.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setAppliedPromo(null);
                            setPromoError(null);
                            setPromoSuccess(null);
                          }}
                          className="px-3 py-2 text-xs font-bold border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingModal(pkg);
                            setBookFeedback(null);
                          }}
                          className="px-4 py-2 text-xs font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer shadow-xs"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: PROMOTIONS & OFFERS */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'promotions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="bg-white border-2 border-[color:var(--t-200)] hover:border-[color:var(--t-500)] p-6 shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300">
                        {promo.badge_text || (promo.discount_type === 'percentage' ? `${promo.discount_value}% Discount` : `RM ${promo.discountValueMyr} Rebate`)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Valid until {promo.valid_until}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-[color:var(--ink)] leading-snug">
                      {promo.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {promo.description}
                    </p>

                    {promo.package_title && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2.5 border border-slate-200">
                        <b>Applicable to:</b> {promo.package_title}
                      </div>
                    )}

                    {promo.terms && (
                      <p className="text-[11px] text-slate-400 italic">
                        *{promo.terms}
                      </p>
                    )}
                  </div>

                  {/* Promo Code Box */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="border border-dashed border-slate-400 bg-slate-50 px-3 py-2 flex items-center gap-2 flex-1">
                      <Tag className="h-4 w-4 text-[color:var(--t-600)]" />
                      <span className="font-mono font-black text-sm text-[color:var(--ink)] tracking-wider">
                        {promo.code}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyPromoCode(promo.code)}
                      className="px-4 py-2 text-xs font-extrabold border border-[color:var(--t-600)] text-[color:var(--t-700)] hover:bg-[color:var(--t-50)] cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedCode === promo.code ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Code
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: FACILITIES & INFRASTRUCTURE DIRECTORY */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'facilities' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {facilities.map((fac) => (
                <article
                  key={fac.id}
                  className="bg-white border border-[color:var(--t-200)] shadow-2xs flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Facility Header Image */}
                    <div className="relative aspect-16/7 bg-slate-100 overflow-hidden">
                      <img
                        src={fac.coverImage || '/assets/clinics_hospital_hero_bg-CAmCzOcG.jpg'}
                        alt={fac.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-slate-900/90 text-white backdrop-blur-xs">
                          {fac.kind.replace('_', ' ').toUpperCase()}
                        </span>
                        {fac.mhtcMember && (
                          <span className="text-[10px] font-black uppercase px-2 py-1 bg-sky-700/90 text-white backdrop-blur-xs">
                            MHTC Accredited
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="font-extrabold text-lg text-[color:var(--ink)] flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-[color:var(--t-600)]" />
                          {fac.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {fac.address}, {fac.city}, {fac.state}
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {fac.description}
                      </p>

                      {/* Licence & Accreditations Badge Row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {fac.isLicenceValid && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Act 586 Licensed ({fac.licenceNo || 'Verified'})
                          </span>
                        )}
                        {fac.accreditations.map((a, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase">
                            {a.body} ({a.number})
                          </span>
                        ))}
                      </div>

                      {/* Clinical Specialties */}
                      {fac.specialties.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            Specialist Clinical Services:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {fac.specialties.map((spec, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Advanced Diagnostic Equipment */}
                      {fac.equipment.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <HeartPulse className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                            Diagnostic Equipment & Infrastructure:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-700">
                            {fac.equipment.map((eq, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span className="truncate">{eq}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Patient Amenities */}
                      {fac.amenities.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            Patient Care Amenities & Services:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {fac.amenities.map((am, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200">
                                {am}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="p-6 pt-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      <span className="font-extrabold text-slate-800">{fac.packagesCount}</span> Packages Published
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('All');
                        setSearchQuery(fac.name);
                        setActiveTab('packages');
                      }}
                      className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 cursor-pointer flex items-center gap-1.5"
                    >
                      View Facility Packages
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* PACKAGE DETAIL DRAWER / MODAL */}
        {/* ------------------------------------------------------------------- */}
        {selectedPackage && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-300 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl my-auto">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 bg-slate-900 text-white">
                    {selectedPackage.code}
                  </span>
                  <span className="text-xs font-extrabold text-[color:var(--t-700)]">
                    {selectedPackage.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                <div>
                  <h2 className="text-xl font-extrabold text-[color:var(--ink)]">
                    {selectedPackage.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    {selectedPackage.facility_name} · {selectedPackage.facility_city}, {selectedPackage.facility_state}
                  </p>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedPackage.description}
                </p>

                {/* Duration & Fasting metadata */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Procedure Duration:</span>
                    <span className="font-semibold text-slate-800">{selectedPackage.duration}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Clinical Fasting:</span>
                    <span className={`font-semibold ${selectedPackage.fastingRequired ? 'text-amber-800' : 'text-slate-800'}`}>
                      {selectedPackage.fastingRequired ? 'Fasting Required (8–10 hours)' : 'No Fasting Required'}
                    </span>
                  </div>
                </div>

                {/* Inclusions List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Included Tests, Consultations & Services ({selectedPackage.inclusions.length} items):
                  </h4>
                  <div className="space-y-1.5 bg-slate-50 p-3 border border-slate-200">
                    {selectedPackage.inclusions.map((inc, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preparation Instructions */}
                {selectedPackage.preparation_instructions && (
                  <div className="p-3 bg-amber-50 border border-amber-200 space-y-1">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                      Preparation & Instructions Before Visit:
                    </div>
                    <p className="text-xs text-amber-900/90 leading-relaxed">
                      {selectedPackage.preparation_instructions}
                    </p>
                  </div>
                )}

                {/* Promo Code Applicator */}
                <div className="p-4 bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    Have a Promotion Code?
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      placeholder="e.g. CAREMERDEKA"
                      className="px-3 py-2 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-800 uppercase flex-1 focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyPromo()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                    >
                      Apply Code
                    </button>
                  </div>
                  {promoError && (
                    <div className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {promoError}
                    </div>
                  )}
                  {promoSuccess && (
                    <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {promoSuccess}
                    </div>
                  )}
                </div>

                {/* Final Price Breakdown */}
                <div className="p-4 bg-white border-2 border-[color:var(--t-600)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Published Package Price:</span>
                    <span className="font-semibold tabular-nums">RM {selectedPackage.priceMyr.toLocaleString()}</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                      <span>Promo Discount ({appliedPromo.code}):</span>
                      <span className="tabular-nums">- RM {appliedPromo.discountMyr.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                    <span className="font-extrabold text-sm text-slate-900">Total Payable:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold text-slate-500">MYR</span>
                      <span className="text-2xl font-black text-[color:var(--ink)] tabular-nums">
                        {(selectedPackage.priceMyr - (appliedPromo?.discountMyr || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  className="px-4 py-2.5 text-xs font-bold border border-slate-300 hover:bg-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pkg = selectedPackage;
                    setSelectedPackage(null);
                    setBookingModal(pkg);
                  }}
                  className={bannerPrimaryBtn}
                >
                  Proceed to Book Package
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* BOOKING / ENQUIRY MODAL */}
        {/* ------------------------------------------------------------------- */}
        {bookingModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-300 w-full max-w-lg shadow-xl my-auto">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-extrabold text-base text-[color:var(--ink)]">
                    Enquire / Book Package
                  </h3>
                  <p className="text-xs text-slate-500">{bookingModal.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                {bookFeedback && (
                  <div
                    className={`p-3 text-xs flex items-start gap-2 ${
                      bookFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-red-50 text-red-800 border border-red-300'
                    }`}
                  >
                    {bookFeedback.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    )}
                    <span>{bookFeedback.message}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Full Name (as in NRIC / Passport) *</label>
                  <input
                    type="text"
                    required
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    placeholder="e.g. Dr. Siti Aminah or John Tan"
                    className="w-full p-2 border border-slate-300 text-xs bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={bookPhone}
                      onChange={(e) => setBookPhone(e.target.value)}
                      placeholder="+60 12-345 6789"
                      className="w-full p-2 border border-slate-300 text-xs bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={bookEmail}
                      onChange={(e) => setBookEmail(e.target.value)}
                      placeholder="patient@example.com"
                      className="w-full p-2 border border-slate-300 text-xs bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Preferred Date of Visit</label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full p-2 border border-slate-300 text-xs bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Clinical Inquiries / Remarks</label>
                  <textarea
                    rows={3}
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    placeholder="Any symptoms, prior medical history, mobility needs, or questions regarding this package..."
                    className="w-full p-2 border border-slate-300 text-xs bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                  <span className="font-bold text-slate-700 block">Privacy & Act 586 Assurance:</span>
                  Your booking request is transmitted securely to {bookingModal.facility_name}'s verified admissions and scheduling department. No advance payment is charged until confirmed by hospital staff.
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBookingModal(null)}
                    className="px-4 py-2 text-xs font-bold border border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookSubmitting}
                    className={`${bannerPrimaryBtn} disabled:opacity-50`}
                  >
                    {bookSubmitting ? 'Submitting Enquiry…' : 'Confirm & Send Enquiry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
