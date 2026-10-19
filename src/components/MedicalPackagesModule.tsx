import React, { useCallback, useEffect, useState } from 'react';
import {
  PackagePlus, Search, Tag, Building2, Check, Clock, ShieldCheck,
  AlertCircle, ChevronRight, X, Calendar, Phone, Mail, Globe, MapPin,
  Sparkles, Gift, Filter, ArrowRight, Copy, CheckCircle2, FileText,
  BadgeCheck, HeartPulse, CreditCard, Lock, Receipt, Download, Printer
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
  verified_facilitator?: number;
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
  verifiedFacilitator?: boolean;
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

export type PackageTabType = 'packages' | 'promotions' | 'facilities';

/** A package photo that never shows broken-image text: a missing file leaves a plain tinted block with the category on it. */
function PackageImage({ src, alt, category }: { src?: string | null; alt: string; category: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label={`${category} package`} className="w-full h-full flex items-center justify-center bg-[color:var(--t-50)] text-[color:var(--t-700)]">
        <PackagePlus className="h-10 w-10 opacity-60" aria-hidden="true" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-cover" />;
}

type PackageSort = 'featured' | 'price-asc' | 'price-desc' | 'saving';

interface MedicalPackagesModuleProps {
  initialCategory?: string;
  onSelectFacility?: (facilityId: string) => void;
  onEnquirePackage?: (pkg: MedicalPackage) => void;
  embedded?: boolean;
  activeTab?: PackageTabType;
  onTabChange?: (tab: PackageTabType) => void;
}

export default function MedicalPackagesModule({
  initialCategory = 'All',
  onSelectFacility,
  onEnquirePackage,
  embedded = false,
  activeTab: controlledActiveTab,
  onTabChange: setControlledActiveTab,
}: MedicalPackagesModuleProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<PackageTabType>('packages');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = (tab: PackageTabType) => {
    if (setControlledActiveTab) setControlledActiveTab(tab);
    setInternalActiveTab(tab);
  };
  const [packages, setPackages] = useState<MedicalPackage[]>([]);
  const [promotions, setPromotions] = useState<MedicalPromotion[]>([]);
  const [facilities, setFacilities] = useState<FacilityDirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedAudience, setSelectedAudience] = useState<'all' | 'local' | 'international'>('all');
  const [sortBy, setSortBy] = useState<PackageSort>('featured');

  // Detail Modal / Booking state
  const [selectedPackage, setSelectedPackage] = useState<MedicalPackage | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountMyr: number; title: string } | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Booking / Enquiry Form Modal state
  const [bookingModal, setBookingModal] = useState<MedicalPackage | null>(null);
  const [bookingMode, setBookingMode] = useState<'deposit' | 'enquiry'>('deposit');
  const [bookName, setBookName] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookCountry, setBookCountry] = useState('Malaysia');
  const [bookDate, setBookDate] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookFeedback, setBookFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [depositReceipt, setDepositReceipt] = useState<{
    orderId: string;
    depositPaymentRef: string;
    packageTitle: string;
    packageCode: string;
    patientName: string;
    totalPriceMyr: number;
    depositAmountMyr: number;
    remainingPayableMyr: number;
    preferredDate?: string;
    hospitalConfirmationStatus: string;
  } | null>(null);

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

  // Send a request for this package to the hospital. No payment is taken here: the hospital confirms and says how any deposit is paid.
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModal) return;
    setBookSubmitting(true);
    setBookFeedback(null);
    try {
      const res = await fetch(`/api/packages/${bookingModal.id}/reserve-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: bookName,
          patientPhone: bookPhone,
          patientEmail: bookEmail,
          patientCountry: bookCountry,
          preferredDate: bookDate || undefined,
          promoCode: appliedPromo?.code || undefined,
          notes: bookNotes,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDepositReceipt(data.data);
      } else {
        setBookFeedback({ type: 'error', message: data.message || 'The request could not be sent. Please check your details and try again.' });
      }
    } catch {
      setBookFeedback({ type: 'error', message: 'Network error. Please try again, or contact the hospital directly.' });
    } finally {
      setBookSubmitting(false);
    }
  };

  // Sorted view of the list the server returned
  const savingPct = (p: MedicalPackage) => (p.originalPriceMyr ? (p.originalPriceMyr - p.priceMyr) / p.originalPriceMyr : 0);
  const visiblePackages = sortBy === 'featured' ? packages : [...packages].sort((x, y) =>
    sortBy === 'price-asc' ? x.priceMyr - y.priceMyr : sortBy === 'price-desc' ? y.priceMyr - x.priceMyr : savingPct(y) - savingPct(x));

  return (
    <div className={embedded ? "w-full space-y-4" : "w-full space-y-0"}>
      {/* Module Header Banner */}
      {!embedded && (
        <DashboardHeader
          fullWidth={true}
          eyebrow="Partner hospitals"
          title="Medical packages"
          description="Health screening and treatment packages from partner hospitals. Prices are set by each hospital and may change. Requesting a package does not charge you."
          tabs={[
            { id: 'packages', label: 'Medical Packages', icon: PackagePlus, count: packages.length },
            { id: 'promotions', label: 'Offers', icon: Tag, count: promotions.length },
            { id: 'facilities', label: 'Hospitals', icon: Building2, count: facilities.length },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
          tabsLabel="Medical package modules"
        />
      )}

      <div className={embedded ? "space-y-6 pt-2" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>

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
                    Offers from partner hospitals
                    <span className="text-xs font-mono font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2">
                      {promotions.length} Available
                    </span>
                  </h4>
                  <p className="text-xs text-amber-900/90 mt-0.5">
                    Tap a code to copy it, then paste it under Details to see your price.
                  </p>
                </div>
              </div>

              {/* Promo chips carousel */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {promotions.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => {
                      copyPromoCode(pr.code);
                      setPromoCodeInput(pr.code);
                    }}
                    className="flex items-center gap-2 px-3 min-h-[44px] bg-white border border-amber-400 text-slate-800 text-xs font-bold hover:bg-amber-100/50 cursor-pointer transition-colors shadow-2xs"
                    title="Click to copy promo code"
                  >
                    <Tag className="h-3.5 w-3.5 text-amber-700" />
                    <span className="font-mono font-extrabold text-[color:var(--t-700)]">{pr.code}</span>
                    <span className="text-xs text-emerald-700 font-extrabold uppercase px-1.5 py-0.2 bg-emerald-50 border border-emerald-300">
                      {pr.badge_text || (pr.discount_type === 'percentage' ? `${pr.discount_value}% OFF` : `RM ${pr.discountValueMyr} OFF`)}
                    </span>
                    {copiedCode === pr.code ? (
                      <span className="flex items-center gap-1 text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Copied</span>
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-slate-600" aria-label="Copy code" />
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
                    className="w-full pl-10 pr-4 min-h-[44px] bg-slate-50 border border-slate-300 text-sm text-slate-800 font-medium focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white rounded-none"
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
                <div className="flex flex-wrap items-center gap-1.5 border border-slate-200 bg-slate-50 p-1 max-w-full lg:shrink-0">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-2 flex items-center gap-1">
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
                      className={`text-xs font-bold px-3 min-h-[44px] transition-all cursor-pointer rounded-none ${
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
                <span className="text-xs font-bold uppercase text-slate-400 shrink-0 mr-1">Category:</span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 text-xs font-bold px-3 min-h-[44px] transition-colors cursor-pointer rounded-none border ${
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
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p role="status" className="text-sm font-bold text-slate-800">
                    {packages.length} {packages.length === 1 ? 'package' : 'packages'}
                  </p>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    Sort by
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as PackageSort)}
                      className="border border-slate-300 bg-white px-3 min-h-[44px] text-sm font-medium focus:outline-none focus:border-[color:var(--t-600)]"
                    >
                      <option value="featured">Recommended</option>
                      <option value="price-asc">Price: low to high</option>
                      <option value="price-desc">Price: high to low</option>
                      <option value="saving">Biggest saving</option>
                    </select>
                  </label>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visiblePackages.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="group bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-400)] transition-colors shadow-2xs flex flex-col overflow-hidden"
                  >
                    <div className="relative aspect-21/9 overflow-hidden bg-[color:var(--t-50)]">
                      <PackageImage src={pkg.image_url} alt={pkg.title} category={pkg.category} />
                      <span className="absolute top-2.5 left-2.5 text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-[color:var(--t-600)] text-white shadow-xs">
                        {pkg.category}
                      </span>
                    </div>

                    <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                      <div>
                        <h3 className="font-extrabold text-base text-[color:var(--ink)] leading-snug">
                          {pkg.title}
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-700">
                          <span className="flex items-center gap-1 font-semibold">
                            <Building2 className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
                            {pkg.facility_name}, {pkg.facility_city}
                          </span>
                          {Boolean(pkg.verified_facilitator) && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-800">
                              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified facilitator
                            </span>
                          )}
                          {Boolean(pkg.mhtc_member) && <span className="font-semibold text-sky-800">MHTC member</span>}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-2xl font-extrabold text-[color:var(--ink)] tabular-nums">RM {pkg.priceMyr.toLocaleString()}</span>
                        {pkg.originalPriceMyr ? (
                          <>
                            <span className="text-xs text-slate-700 line-through">RM {pkg.originalPriceMyr.toLocaleString()}</span>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5">
                              Save {Math.round(savingPct(pkg) * 100)}%
                            </span>
                          </>
                        ) : null}
                      </div>

                      <p className="text-xs text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" /> {pkg.duration}</span>
                        {pkg.fastingRequired && <span className="font-bold text-amber-900">Fasting required</span>}
                      </p>

                      <p className="text-sm text-slate-700 line-clamp-2">{pkg.description}</p>

                      <ul className="space-y-1 pt-2.5 mt-auto border-t border-slate-100">
                        {pkg.inclusions.slice(0, 2).map((inc, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-800">
                            <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                            <span className="line-clamp-1">{inc}</span>
                          </li>
                        ))}
                        {pkg.inclusions.length > 2 && (
                          <li className="text-xs font-semibold text-[color:var(--t-700)]">+ {pkg.inclusions.length - 2} more in Details</li>
                        )}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-[color:var(--t-100)] space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setAppliedPromo(null);
                            setPromoError(null);
                            setPromoSuccess(null);
                          }}
                          className="flex-1 min-h-[44px] px-3 text-sm font-bold border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingModal(pkg);
                            setBookingMode('deposit');
                            setDepositReceipt(null);
                            setBookFeedback(null);
                          }}
                          className="flex-1 min-h-[44px] px-4 text-sm font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer shadow-xs"
                        >
                          Request this package
                        </button>
                      </div>
                      <p className="text-xs text-slate-700">No payment is taken. The hospital confirms and tells you how any deposit is paid.</p>
                    </div>
                  </article>
                ))}
              </div>
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
                      <span className="text-xs font-mono text-slate-500">
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
                      <p className="text-xs text-slate-400 italic">
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
                        src={fac.coverImage || '/assets/clinics_hospital_hero_bg.jpg'}
                        alt={fac.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase px-2.5 py-1 bg-slate-900/90 text-white backdrop-blur-xs">
                          {fac.kind.replace('_', ' ').toUpperCase()}
                        </span>
                        {fac.mhtcMember && (
                          <span className="text-xs font-black uppercase px-2.5 py-1 bg-sky-800/95 text-white border border-sky-400/60 backdrop-blur-xs flex items-center gap-1">
                            🇲🇾 MHTC Member Hospital
                          </span>
                        )}
                        {Boolean(fac.verifiedFacilitator) && (
                          <span className="text-xs font-black uppercase px-2.5 py-1 bg-emerald-800/95 text-white border border-emerald-400/60 backdrop-blur-xs flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Verified Facilitator Partner
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
                        {Boolean(fac.verifiedFacilitator) && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black uppercase flex items-center gap-1">
                            <BadgeCheck className="h-3 w-3 text-emerald-600" />
                            Verified facilitator
                          </span>
                        )}
                        {fac.mhtcMember && (
                          <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-300 text-xs font-black uppercase flex items-center gap-1">
                            🇲🇾 MHTC Affiliated
                          </span>
                        )}
                        {fac.isLicenceValid && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 text-xs font-black uppercase flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-slate-600" />
                            Licensed hospital{fac.licenceNo ? ` (${fac.licenceNo})` : ''}
                          </span>
                        )}
                        {fac.accreditations.map((a, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold uppercase">
                            {a.body} ({a.number})
                          </span>
                        ))}
                      </div>

                      {/* Clinical Specialties */}
                      {fac.specialties.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
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
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
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
                          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                            Patient Care Amenities & Services:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {fac.amenities.map((am, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200">
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
                  <span className="text-xs font-mono font-black uppercase px-2 py-0.5 bg-slate-900 text-white">
                    {selectedPackage.code}
                  </span>
                  <span className="text-xs font-extrabold text-[color:var(--t-700)]">
                    {selectedPackage.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  aria-label="Close"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer"
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
                    <span className="text-xs font-bold uppercase text-slate-400 block">Procedure Duration:</span>
                    <span className="font-semibold text-slate-800">{selectedPackage.duration}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 block">Clinical Fasting:</span>
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
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
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
                      className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer shadow-xs"
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
                      <span className="text-xs font-bold text-slate-700">RM</span>
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
                  Request this package
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
            <div className="bg-white border border-slate-300 w-full max-w-xl shadow-xl my-auto">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black uppercase px-2 py-0.5 bg-slate-900 text-white">
                      {bookingModal.code}
                    </span>
                    <span className="text-xs font-extrabold text-[color:var(--t-700)]">
                      {bookingModal.facility_name}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-[color:var(--ink)] mt-1">
                    {depositReceipt ? 'Request received' : 'Request this package'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBookingModal(null);
                    setDepositReceipt(null);
                  }}
                  aria-label="Close"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {depositReceipt ? (
                <div className="p-6 space-y-5">
                  <div role="status" className="p-4 bg-sky-50 border border-sky-300 flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-sky-800 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-base text-sky-950">Your request has been sent. No payment has been taken.</h4>
                      <p className="text-sm text-sky-950 leading-relaxed">
                        {bookingModal.facility_name} will check availability and contact you on <strong className="font-mono">{bookEmail}</strong> or {bookPhone}. They will also tell you if a deposit is needed and how to pay it.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border-2 border-dashed border-slate-300 space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-700 tracking-wider">Request reference</div>
                        <div className="text-lg font-mono font-black text-[color:var(--t-700)] tracking-wide">{depositReceipt.depositPaymentRef}</div>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold uppercase">Waiting for the hospital</span>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs text-slate-700 font-bold uppercase">Patient</dt><dd className="font-bold text-slate-900">{depositReceipt.patientName}</dd></div>
                      <div><dt className="text-xs text-slate-700 font-bold uppercase">Hospital</dt><dd className="font-bold text-slate-900">{bookingModal.facility_name}</dd></div>
                      <div><dt className="text-xs text-slate-700 font-bold uppercase">Package</dt><dd className="font-bold text-slate-900">{depositReceipt.packageTitle}</dd></div>
                      <div><dt className="text-xs text-slate-700 font-bold uppercase">Preferred date</dt><dd className="font-bold text-slate-900">{depositReceipt.preferredDate || 'Flexible'}</dd></div>
                    </dl>

                    <div className="p-3 bg-white border border-slate-200 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between text-slate-800"><span>Package price</span><span className="font-bold tabular-nums">RM {depositReceipt.totalPriceMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex items-center justify-between text-slate-800"><span>Deposit the hospital may ask for (10%)</span><span className="tabular-nums">RM {depositReceipt.depositAmountMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex items-center justify-between text-slate-800"><span>Balance after the deposit</span><span className="tabular-nums">RM {depositReceipt.remainingPayableMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></div>
                    </div>

                    <p className="text-xs text-slate-700 leading-normal">
                      Quote this reference when the hospital contacts you. Your request does not guarantee a slot until the hospital confirms it. The price is the one the hospital published and may change.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button type="button" onClick={() => window.print()} className="min-h-[44px] px-4 text-sm font-bold border border-slate-300 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      Print summary
                    </button>
                    <button type="button" onClick={() => { setBookingModal(null); setDepositReceipt(null); }} className={`${bannerPrimaryBtn} min-h-[44px]`}>
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                  <p className="text-sm text-slate-800">
                    Send your details to {bookingModal.facility_name}. They check availability and contact you. <strong>No payment is taken here.</strong>
                  </p>

                  {bookFeedback && (
                    <div role="alert" className="p-3 text-sm flex items-start gap-2 bg-red-50 text-red-900 border border-red-300">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-700 mt-0.5" aria-hidden="true" />
                      <span>{bookFeedback.message}</span>
                    </div>
                  )}

                  <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-slate-800">Package price</span><span className="font-semibold tabular-nums">RM {bookingModal.priceMyr.toLocaleString()}</span></div>
                    {appliedPromo && (
                      <div className="flex items-center justify-between text-emerald-800 font-bold"><span>Offer ({appliedPromo.code})</span><span className="tabular-nums">- RM {appliedPromo.discountMyr.toLocaleString()}</span></div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-slate-800">Deposit the hospital may ask for (10%)</span>
                      <span className="font-bold tabular-nums">RM {Math.max(50, Math.round((bookingModal.priceMyr - (appliedPromo?.discountMyr || 0)) * 0.1)).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pkg-name" className="text-sm font-bold text-slate-800 block">Full name (as in passport or NRIC) *</label>
                    <input id="pkg-name" type="text" required value={bookName} onChange={(e) => setBookName(e.target.value)} placeholder="e.g. Siti Sarah binti Ahmad" className="w-full px-3 min-h-[44px] border border-slate-300 text-sm bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="pkg-phone" className="text-sm font-bold text-slate-800 block">Mobile phone (WhatsApp) *</label>
                      <input id="pkg-phone" type="tel" required value={bookPhone} onChange={(e) => setBookPhone(e.target.value)} placeholder="+60 12-345 6789" className="w-full px-3 min-h-[44px] border border-slate-300 text-sm bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="pkg-email" className="text-sm font-bold text-slate-800 block">Email *</label>
                      <input id="pkg-email" type="email" required value={bookEmail} onChange={(e) => setBookEmail(e.target.value)} placeholder="you@example.com" className="w-full px-3 min-h-[44px] border border-slate-300 text-sm bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="pkg-country" className="text-sm font-bold text-slate-800 block">Country of residence</label>
                      <select id="pkg-country" value={bookCountry} onChange={(e) => setBookCountry(e.target.value)} className="w-full px-3 min-h-[44px] border border-slate-300 text-sm bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]">
                        <option value="Malaysia">Malaysia</option>
                        <option value="Indonesia">Indonesia</option>
                        <option value="Singapore">Singapore</option>
                        <option value="China">China</option>
                        <option value="Australia">Australia</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="pkg-date" className="text-sm font-bold text-slate-800 block">Preferred date</label>
                      <input id="pkg-date" type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="w-full px-3 min-h-[44px] border border-slate-300 text-sm bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="pkg-notes" className="text-sm font-bold text-slate-800 block">Anything the hospital should know (optional)</label>
                    <textarea id="pkg-notes" rows={2} value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} placeholder="Health conditions, mobility needs, dietary needs…" className="w-full px-3 py-2 border border-slate-300 text-sm bg-white rounded-none focus:outline-none focus:border-[color:var(--t-600)]" />
                  </div>

                  <p className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    Your details go to {bookingModal.facility_name}'s admissions desk and MedCred. They are used only to arrange this package.
                  </p>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button type="button" onClick={() => setBookingModal(null)} className="min-h-[44px] px-4 text-sm font-bold border border-slate-300 hover:bg-slate-50 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={bookSubmitting} className={`${bannerPrimaryBtn} min-h-[44px] disabled:opacity-50`}>
                      {bookSubmitting ? 'Sending…' : 'Send request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
