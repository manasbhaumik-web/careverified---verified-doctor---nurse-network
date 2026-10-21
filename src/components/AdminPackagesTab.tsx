import React from 'react';
import {
  Puzzle,
  CheckCircle2,
  Download,
  Search,
  Trash2,
} from 'lucide-react';
import WorkspaceHeader from './WorkspaceHeader';
import { BannerBadge } from './DashboardHeader';

export interface AdminPackagesTabProps {
  packageSearch: string;
  setPackageSearch: React.Dispatch<React.SetStateAction<string>>;
  packageCategoryFilter: string;
  setPackageCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  packageSubTab: 'all' | 'installed' | 'available';
  adminPackages: any[];
  getPkgName: (pkg: any) => string;
  getPkgDesc: (pkg: any) => string;
  getPkgAuthor: (pkg: any) => string;
  getPkgVersion: (pkg: any) => string;
  getPkgEnabled: (pkg: any) => boolean;
  getPkgCategory: (pkg: any) => string;
  getPkgIcon: (pkg: any) => any;
  handleTogglePackage: (pkg: any) => void;
  handleUninstallPackage: (pkg: any) => void;
  renderIcon: (icon: any, className?: string) => React.ReactNode;
}

export const AdminPackagesTab: React.FC<AdminPackagesTabProps> = ({
  packageSearch,
  setPackageSearch,
  packageCategoryFilter,
  setPackageCategoryFilter,
  packageSubTab,
  adminPackages,
  getPkgName,
  getPkgDesc,
  getPkgAuthor,
  getPkgVersion,
  getPkgEnabled,
  getPkgCategory,
  getPkgIcon,
  handleTogglePackage,
  handleUninstallPackage,
  renderIcon,
}) => {
  return (
        <div id="panel-packages" role="tabpanel" aria-labelledby="tab-packages" tabIndex={0} className="space-y-6 animate-fade-in text-slate-800">
          <WorkspaceHeader
            icon={Puzzle}
            eyebrow="Partner hospitals · Patient catalogue"
            title="Medical packages"
            description="Health-screening and treatment packages from partner hospitals. Publishing a package lists it for patients under Services, Medical Packages. It does not add anything to the menu."
            badges={<BannerBadge tone="brand">Board control</BannerBadge>}
          />

          {/* SUBTAB 1: INSTALLED MODULES & RUNTIME */}
          {packageSubTab === 'installed' && (
            <div className="space-y-6">
              {/* Package Overview Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[color:var(--ink-2)]">Packages</span>
                    <span className="h-8 w-8 flex items-center justify-center border bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)]"><Puzzle className="h-4 w-4" /></span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{adminPackages.length} in total</span>
                  <span className="text-xs text-slate-600">Across all partner hospitals.</span>
                </div>

                <div className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[color:var(--ink-2)]">Published</span>
                    <span className="h-8 w-8 flex items-center justify-center border bg-[color:var(--e-50)] border-[color:var(--e-200)] text-[color:var(--e-600)]"><CheckCircle2 className="h-4 w-4" /></span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{adminPackages.filter(p => getPkgEnabled(p)).length} published</span>
                  <span className="text-xs text-slate-600">Visible to patients.</span>
                </div>

                <div className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[color:var(--ink-2)]">Drafts</span>
                    <span className="h-8 w-8 flex items-center justify-center border bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)]"><Download className="h-4 w-4" /></span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{adminPackages.filter(p => !getPkgEnabled(p)).length === 1 ? '1 draft' : `${adminPackages.filter(p => !getPkgEnabled(p)).length} drafts`}</span>
                  <span className="text-xs text-slate-600">Hidden from patients until published.</span>
                </div>
              </div>

              {/* Search and Category Filtering Row */}
              <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search packages or hospitals…"
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                      className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white h-11 pl-10 pr-4 text-xs font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] transition-colors"
                    />
                  </div>

                  {/* Category Dropdown List */}
                  <label className="flex items-center h-11 border border-[color:var(--t-200)] bg-white px-3 gap-2 shrink-0 focus-within:border-[color:var(--t-600)]">
                    <span className="text-2xs font-mono font-black uppercase tracking-wider text-slate-500 shrink-0">
                      Category:
                    </span>
                    <select
                      aria-label="Category"
                      value={packageCategoryFilter}
                      onChange={(e) => setPackageCategoryFilter(e.target.value)}
                      className="h-full bg-transparent text-xs font-bold text-[color:var(--ink)] pr-2 cursor-pointer focus:outline-none"
                    >
                      {Array.from(new Set([
                        'All',
                        ...adminPackages.map(p => getPkgCategory(p)).filter(Boolean),
                      ])).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat === 'All' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Installed Packages List */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Puzzle className="h-4 w-4 text-[color:var(--t-600)]" />
                  <span>Packages ({adminPackages.length})</span>
                </h3>

                {adminPackages.filter(p => {
                  const name = getPkgName(p).toLowerCase();
                  const desc = getPkgDesc(p).toLowerCase();
                  const author = getPkgAuthor(p).toLowerCase();
                  const q = packageSearch.toLowerCase().trim();
                  const matchSearch = !q || name.includes(q) || desc.includes(q) || author.includes(q);
                  const matchCategory = packageCategoryFilter === 'All' || getPkgCategory(p) === packageCategoryFilter;
                  return matchSearch && matchCategory;
                }).length === 0 ? (
                  <div className="bg-white border border-slate-200 p-12 text-center text-slate-500 rounded-none">
                    <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No packages match your search.</p>
                    <button type="button" onClick={() => { setPackageSearch(''); setPackageCategoryFilter('All'); }} className="mt-2 text-xs font-bold text-[color:var(--t-700)] underline cursor-pointer">Reset filters</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adminPackages
                      .filter(p => {
                        const name = getPkgName(p).toLowerCase();
                        const desc = getPkgDesc(p).toLowerCase();
                        const author = getPkgAuthor(p).toLowerCase();
                        const q = packageSearch.toLowerCase().trim();
                        const matchSearch = !q || name.includes(q) || desc.includes(q) || author.includes(q);
                        const matchCategory = packageCategoryFilter === 'All' || getPkgCategory(p) === packageCategoryFilter;
                        return matchSearch && matchCategory;
                      })
                      .map((pkg) => {
                        const isEnabled = getPkgEnabled(pkg);
                        const pkgName = getPkgName(pkg);
                        const pkgDesc = getPkgDesc(pkg);
                        const pkgAuthor = getPkgAuthor(pkg);
                        const pkgVersion = getPkgVersion(pkg);
                        const pkgIcon = getPkgIcon(pkg);
                        const pkgCategory = getPkgCategory(pkg);
                        const price = (pkg as any).priceMyr;

                        return (
                          <div
                            key={pkg.id}
                            className={`bg-white border rounded-none p-5 shadow-none transition-all flex flex-col justify-between gap-5 ${
                              isEnabled
                                ? 'border-[color:var(--t-200)]'
                                : 'border-slate-250 bg-slate-50/70 opacity-80'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2.5 rounded-none border shrink-0 ${
                                    isEnabled
                                      ? 'bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)]'
                                      : 'bg-slate-100 border-slate-200 text-slate-400'
                                  }`}>
                                    {renderIcon(pkgIcon)}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-800 leading-tight flex items-center gap-1.5 flex-wrap">
                                      {pkgName}
                                      <span className="bg-slate-100 border border-slate-200 text-slate-600 font-mono text-2xs px-1.5 py-0.5 rounded-none font-bold">
                                        {pkgVersion.startsWith('v') || pkgVersion.startsWith('Code:') ? pkgVersion : `v${pkgVersion}`}
                                      </span>
                                      {price !== undefined && price !== null && (
                                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-2xs px-1.5 py-0.5 rounded-none font-bold">
                                          MYR {Number(price).toLocaleString()}
                                        </span>
                                      )}
                                    </h4>
                                    <span className="text-xs text-slate-400 font-bold block mt-1 tracking-wide">
                                      by {pkgAuthor} · <span className="text-[color:var(--t-600)]">{pkgCategory}</span>
                                    </span>
                                  </div>
                                </div>

                                <span className={`text-2xs font-black px-2.5 py-1 rounded-none border uppercase tracking-wider shrink-0 ${
                                  isEnabled
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}>
                                  {isEnabled ? 'Published' : 'Draft'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                {pkgDesc}
                              </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-1">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePackage(pkg.id)}
                                  role="switch"
                                  aria-checked={isEnabled}
                                  aria-label={`${isEnabled ? 'Unpublish' : 'Publish'} ${pkgName}`}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border border-slate-300 transition-colors duration-150 ease-in-out focus:outline-none ${
                                    isEnabled ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)]' : 'bg-slate-200'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-none bg-white shadow-none transition duration-150 ease-in-out ${
                                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">
                                  {isEnabled ? 'Listed for patients' : 'Hidden from patients'}
                                </span>
                              </div>

                              {pkg.isRemovable ? (
                                <button
                                  type="button"
                                  onClick={() => { if (window.confirm(`Delete "${pkgName}"? Patients will no longer see it, and this cannot be undone.`)) handleUninstallPackage(pkg.id); }}
                                  className="h-8 px-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-none border border-transparent hover:border-rose-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                                  title="Delete this package"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Remove</span>
                                </button>
                              ) : (
                                <span className="text-2xs font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-none uppercase tracking-wider">
                                  Core Module
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
  );
};

export default AdminPackagesTab;
