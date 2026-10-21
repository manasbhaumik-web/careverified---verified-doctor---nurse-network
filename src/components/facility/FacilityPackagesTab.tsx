import React, { useState } from 'react';
import {
  PackagePlus,
  Plus,
  Tag,
  Search,
  Clock,
  Check,
  Edit3,
  Trash2,
  CreditCard,
} from 'lucide-react';
import WorkspaceHeader from '../WorkspaceHeader';
import { BannerBadge } from '../DashboardHeader';
import { MedicalPackage, MedicalPromotion, PackageOrder } from './types';

export interface FacilityPackagesTabProps {
  packages: MedicalPackage[];
  promotions: MedicalPromotion[];
  orders: PackageOrder[];
  onOpenNewPackageModal: () => void;
  onOpenNewPromoModal: () => void;
  onEditPackage: (pkg: MedicalPackage) => void;
  onDeletePackage: (id: string) => void;
  onTogglePackageStatus: (pkg: MedicalPackage) => void;
  onEditPromo: (promo: MedicalPromotion) => void;
  onDeletePromo: (id: string) => void;
  onTogglePromoStatus: (promo: MedicalPromotion) => void;
  onConfirmPackageOrder: (orderId: string, status: 'confirmed' | 'completed') => void;
}

export const FacilityPackagesTab: React.FC<FacilityPackagesTabProps> = ({
  packages,
  promotions,
  orders,
  onOpenNewPackageModal,
  onOpenNewPromoModal,
  onEditPackage,
  onDeletePackage,
  onTogglePackageStatus,
  onEditPromo,
  onDeletePromo,
  onTogglePromoStatus,
  onConfirmPackageOrder,
}) => {
  const [packageSubTab, setPackageSubTab] = useState<'packages' | 'promotions' | 'orders'>('packages');
  const [packageSearch, setPackageSearch] = useState('');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('All');
  const [packageStatusFilter, setPackageStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');

  const handleTogglePackageStatus = onTogglePackageStatus;
  const handleEditPackage = onEditPackage;
  const handleDeletePackage = onDeletePackage;
  const handleTogglePromoStatus = onTogglePromoStatus;
  const handleEditPromo = onEditPromo;
  const handleDeletePromo = onDeletePromo;
  const handleConfirmPackageOrder = onConfirmPackageOrder;
  const packageOrders = orders;

  return (
          <div className="space-y-6">
            <WorkspaceHeader
              icon={PackagePlus}
              eyebrow="Direct Hospital Care · Public Directory"
              title="Medical Packages & Promotional Offers"
              description="Publish clinical health checkups, surgical packages, and seasonal promotional codes across the care network."
              badges={<BannerBadge tone="brand">MOH Approved</BannerBadge>}
              aside={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenNewPackageModal}
                    className="px-3.5 py-2 text-xs font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Publish Medical Package</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenNewPromoModal}
                    className="px-3.5 py-2 text-xs font-bold border border-slate-300 hover:bg-slate-50 text-slate-800 cursor-pointer flex items-center gap-1.5"
                  >
                    <Tag className="h-3.5 w-3.5 text-amber-600" />
                    <span>Create Promotion</span>
                  </button>
                </div>
              }
              tabs={[
                { id: 'packages', label: 'Medical Packages', count: packages.length },
                { id: 'promotions', label: 'Promotions & Campaign Codes', count: promotions.length },
                { id: 'orders', label: 'Package requests', count: packageOrders.length },
              ]}
              activeTab={packageSubTab}
              onTabChange={(t) => setPackageSubTab(t as any)}
            />

            {/* Sub-tab 1: Medical Packages */}
            {packageSubTab === 'packages' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-[color:var(--t-200)] p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={packageSearch}
                      onChange={e => setPackageSearch(e.target.value)}
                      placeholder="Search packages by title or code…"
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <select
                    value={packageCategoryFilter}
                    onChange={e => setPackageCategoryFilter(e.target.value)}
                    className="p-1.5 text-xs border border-slate-200 bg-white"
                  >
                    {['All', 'Health Screening', 'Cardiology', 'Orthopaedics', 'Maternity', 'Fertility', 'Oncology', 'Ophthalmology', 'Dental', 'Surgery', 'Aesthetics'].map(c => (
                      <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                    ))}
                  </select>

                  <select
                    value={packageStatusFilter}
                    onChange={e => setPackageStatusFilter(e.target.value as any)}
                    className="p-1.5 text-xs border border-slate-200 bg-white"
                  >
                    <option value="all">All Publishing Statuses</option>
                    <option value="published">Published (Live to Patients)</option>
                    <option value="draft">Draft / Unpublished</option>
                  </select>
                </div>

                {/* Package Cards Grid */}
                {packages.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-dashed border-slate-300 space-y-3">
                    <PackagePlus className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500">No medical packages created yet. Click "Publish Medical Package" to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {packages
                      .filter(pkg => {
                        if (packageStatusFilter !== 'all' && pkg.status !== packageStatusFilter) return false;
                        if (packageCategoryFilter !== 'All' && pkg.category !== packageCategoryFilter) return false;
                        if (packageSearch.trim()) {
                          const q = packageSearch.toLowerCase();
                          return pkg.title.toLowerCase().includes(q) || pkg.code.toLowerCase().includes(q) || pkg.category.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map(pkg => (
                        <div
                          key={pkg.id}
                          className="bg-white border border-[color:var(--t-200)] shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Header & Status */}
                            <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                              <img
                                src={pkg.image_url || '/assets/clean_light_doctor_suite_full.jpg'}
                                alt={pkg.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-2xs font-mono font-bold uppercase px-2 py-0.5 bg-slate-900/90 text-white">
                                  {pkg.code}
                                </span>
                                <span className="text-2xs font-bold uppercase px-2 py-0.5 bg-[color:var(--t-600)] text-white">
                                  {pkg.category}
                                </span>
                              </div>
                              <div className="absolute top-2.5 right-2.5">
                                <span className={`text-2xs font-black uppercase px-2 py-0.5 ${
                                  pkg.status === 'published'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-amber-400 text-amber-950'
                                }`}>
                                  {pkg.status}
                                </span>
                              </div>
                            </div>

                            <div className="p-4 space-y-2.5">
                              <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">
                                {pkg.title}
                              </h3>
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {pkg.description}
                              </p>

                              <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                                <span className="flex items-center gap-1 text-xs">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  {pkg.duration}
                                </span>
                                {pkg.fastingRequired && (
                                  <span className="text-2xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2">
                                    Fasting Required
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-600 border-t border-slate-100 pt-2 space-y-1">
                                <div className="text-xs font-bold uppercase text-slate-400">
                                  Includes ({pkg.inclusions.length} items):
                                </div>
                                {pkg.inclusions.slice(0, 2).map((inc, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
                                    <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{inc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Footer & Action Bar */}
                          <div className="p-4 pt-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              {pkg.originalPriceMyr && (
                                <span className="text-xs text-slate-400 line-through block">
                                  RM {pkg.originalPriceMyr.toLocaleString()}
                                </span>
                              )}
                              <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                                RM {pkg.priceMyr.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePackageStatus(pkg)}
                                className="px-2 py-1 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer"
                                title="Toggle Live / Draft"
                              >
                                {pkg.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditPackage(pkg)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer"
                                title="Edit Package"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePackage(pkg.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 border border-slate-200 bg-white hover:bg-rose-50 cursor-pointer"
                                title="Delete Package"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Promotions & Campaign Codes */}
            {packageSubTab === 'promotions' && (
              <div className="space-y-4">
                {promotions.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-dashed border-slate-300 space-y-3">
                    <Tag className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500">No active promotions. Click "Create Promotion" to set up a discount code or seasonal offer.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {promotions.map(pr => (
                      <div
                        key={pr.id}
                        className="bg-white border-2 border-amber-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-2xs font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300">
                              {pr.badge_text || (pr.discount_type === 'percentage' ? `${pr.discount_value}% OFF` : `RM ${pr.discountValueMyr} OFF`)}
                            </span>
                            <span className={`text-2xs font-black uppercase px-1.5 py-0.2 ${
                              pr.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {pr.status}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                            {pr.title}
                          </h3>

                          <p className="text-xs text-slate-600">
                            {pr.description}
                          </p>

                          <div className="text-xs text-slate-500 pt-1">
                            Valid: <span className="font-mono text-slate-700">{pr.valid_from}</span> to <span className="font-mono text-slate-700">{pr.valid_until}</span>
                          </div>
                        </div>

                        {/* Promo Code Box & Actions */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between bg-slate-50 p-2 border border-dashed border-slate-300">
                            <span className="font-mono font-black text-xs text-[color:var(--t-700)]">
                              {pr.code}
                            </span>
                            <span className="text-xs text-slate-400 uppercase font-bold">
                              {pr.discount_type === 'percentage' ? `${pr.discount_value}% Discount` : `RM ${pr.discountValueMyr || pr.discount_value / 100} Rebate`}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleTogglePromoStatus(pr)}
                              className="px-2.5 py-1 text-xs font-bold border border-slate-200 hover:bg-slate-50 cursor-pointer"
                            >
                              {pr.status === 'active' ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditPromo(pr)}
                              className="p-1 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePromo(pr.id)}
                              className="p-1 text-rose-600 hover:text-rose-800 border border-slate-200 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Package Orders & Deposit Reservations */}
            {packageSubTab === 'orders' && (
              <div className="space-y-4">
                {/* Orders Financial Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200">
                    <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Package requests</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {packageOrders.length}
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">Patients who asked for a package</span>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-mono font-bold uppercase text-emerald-700 block">Deposits to collect (10%)</span>
                    <div className="text-2xl font-black text-emerald-900 mt-1 tabular-nums">
                      RM {packageOrders.reduce((sum, o) => sum + (o.deposit_amount_myr || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-emerald-700 mt-0.5 block">Not paid online: you confirm and collect it</span>
                  </div>

                  <div className="p-4 bg-white border-2 border-slate-900">
                    <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Balance after the deposit</span>
                    <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                      RM {packageOrders.reduce((sum, o) => sum + (o.remaining_payable_myr || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">Collected by the hospital</span>
                  </div>

                  <div className="p-4 bg-sky-50 border border-sky-200">
                    <span className="text-xs font-mono font-bold uppercase text-sky-800 block">Deposit policy</span>
                    <div className="text-base font-black text-sky-950 mt-1">
                      10% on confirmation
                    </div>
                    <span className="text-xs text-sky-700 mt-0.5 block">You tell the patient how to pay</span>
                  </div>
                </div>

                {/* Orders Filter & Table */}
                <div className="bg-white border border-[color:var(--t-200)] p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[color:var(--t-600)]" />
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Package requests from patients
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-bold uppercase mr-1">Status:</span>
                      {['all', 'pending', 'confirmed', 'completed'].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOrderStatusFilter(st as any)}
                          className={`px-2.5 py-1 text-xs font-bold uppercase cursor-pointer ${
                            orderStatusFilter === st
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {packageOrders.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 space-y-2">
                      <CreditCard className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">No package reservation orders received yet.</p>
                      <p className="text-xs text-slate-500">
                        When local or international patients reserve your published packages and pay the 10% advance deposit, their booking vouchers will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-extrabold text-xs uppercase tracking-wider">
                            <th className="p-3">Patient & Country</th>
                            <th className="p-3">Package Title & Code</th>
                            <th className="p-3">Preferred Date</th>
                            <th className="p-3 text-right">Total (MYR)</th>
                            <th className="p-3 text-right">10% Deposit (MYR)</th>
                            <th className="p-3 text-right">Balance Due (MYR)</th>
                            <th className="p-3">Deposit Ref</th>
                            <th className="p-3">Admission Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {packageOrders
                            .filter(o => orderStatusFilter === 'all' || o.hospital_confirmation_status === orderStatusFilter)
                            .map(ord => (
                              <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3">
                                  <strong className="text-slate-900 block font-bold">{ord.patient_name}</strong>
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <span>{ord.patient_country}</span> · <span>{ord.patient_phone}</span>
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-800 line-clamp-1">{ord.package_title}</div>
                                  <code className="text-xs font-mono text-slate-500">{ord.package_code}</code>
                                </td>
                                <td className="p-3 font-mono text-slate-600 text-xs">
                                  {ord.preferred_date || 'Flexible'}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                  RM {ord.total_price_myr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono font-black text-emerald-800 tabular-nums">
                                  RM {ord.deposit_amount_myr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-slate-700 tabular-nums">
                                  RM {ord.remaining_payable_myr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3">
                                  <code className="font-mono text-xs font-black text-[color:var(--t-700)] bg-slate-100 px-1.5 py-0.5">
                                    {ord.deposit_payment_ref}
                                  </code>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 text-2xs font-black uppercase ${
                                    ord.hospital_confirmation_status === 'confirmed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : ord.hospital_confirmation_status === 'completed'
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}>
                                    {ord.hospital_confirmation_status}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {ord.hospital_confirmation_status === 'pending' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmPackageOrder(ord.id, 'confirmed')}
                                      className="px-2.5 py-1 text-xs font-bold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white cursor-pointer shadow-xs"
                                    >
                                      Confirm Slot
                                    </button>
                                  ) : ord.hospital_confirmation_status === 'confirmed' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmPackageOrder(ord.id, 'completed')}
                                      className="px-2.5 py-1 text-xs font-bold bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-700)] border border-[color:var(--t-200)] cursor-pointer"
                                    >
                                      Check In
                                    </button>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">Checked In</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
  );
};
