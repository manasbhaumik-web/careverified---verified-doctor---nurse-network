import React from 'react';
import {
  UserCheck,
  Search,
  Download,
} from 'lucide-react';
import WorkspaceHeader from './WorkspaceHeader';
import { BannerBadge } from './DashboardHeader';
import { UserAvatar } from '../avatars';
import { Professional, UserRole, VerificationStatus } from '../types';

export interface AdminRegistryTabProps {
  professionals: Professional[];
  registryRoleFilter: 'all' | 'doctor' | 'nurse';
  setRegistryRoleFilter: React.Dispatch<React.SetStateAction<'all' | 'doctor' | 'nurse'>>;
  registrySearch: string;
  setRegistrySearch: React.Dispatch<React.SetStateAction<string>>;
  exportRegistryCsv: () => void;
}

export const AdminRegistryTab: React.FC<AdminRegistryTabProps> = ({
  professionals,
  registryRoleFilter,
  setRegistryRoleFilter,
  registrySearch,
  setRegistrySearch,
  exportRegistryCsv,
}) => {
  return (
        <div id="panel-registry" role="tabpanel" tabIndex={0} className="space-y-6">
          <WorkspaceHeader
            icon={UserCheck}
            eyebrow="Medical Council of Malaysia · Official Registry"
            title="MMC, LJM & MDC Registered Practitioner Directory"
            description="Official registry of doctors, registered nurses, and clinical specialists credentialed under statutory healthcare councils."
            badges={<BannerBadge tone="success">Active Council Register</BannerBadge>}
            tabs={[
              { id: 'all', label: 'All Registered', count: professionals.length },
              { id: 'doctor', label: 'Doctors (MMC)', count: professionals.filter(p => p.role === UserRole.DOCTOR).length },
              { id: 'nurse', label: 'Nurses (LJM)', count: professionals.filter(p => p.role === UserRole.NURSE).length },
            ]}
            activeTab={registryRoleFilter}
            onTabChange={(t) => setRegistryRoleFilter(t as any)}
          />
          <div className="bg-white border border-[color:var(--t-200)] p-6 space-y-4">

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                  placeholder="Search by name, license number, council or specialization..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-[color:var(--t-600)] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={exportRegistryCsv}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm cursor-pointer whitespace-nowrap transition-colors rounded-none"
                title="Download official compliance registry as CSV"
              >
                <Download className="h-4 w-4 text-slate-500" />
                Export Statutory Register (CSV)
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs">
                    <th className="p-3">Practitioner</th>
                    <th className="p-3">Council &amp; Licence</th>
                    <th className="p-3">Specialization</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Licence Expiry</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {(() => {
                    const filtered = professionals.filter(p => {
                      if (registryRoleFilter !== 'all' && p.role !== (registryRoleFilter === 'doctor' ? UserRole.DOCTOR : UserRole.NURSE)) return false;
                      if (!registrySearch) return true;
                      const s = registrySearch.toLowerCase().trim();
                      return (
                        (p.name && p.name.toLowerCase().includes(s)) ||
                        (p.licenseNumber && p.licenseNumber.toLowerCase().includes(s)) ||
                        (p.specialization && p.specialization.toLowerCase().includes(s)) ||
                        ((p as any).medicalCouncil && (p as any).medicalCouncil.toLowerCase().includes(s))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-500 bg-slate-50/50">
                            <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-700">No registered practitioners match your search criteria.</p>
                            <p className="text-xs text-slate-500 mt-1">Try adjusting your search terms or filter tabs.</p>
                            {registrySearch && (
                              <button
                                type="button"
                                onClick={() => setRegistrySearch('')}
                                className="mt-3 text-xs font-bold text-[color:var(--t-700)] underline cursor-pointer"
                              >
                                Clear search query
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(prof => (
                      <tr key={prof.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar src={prof.avatar} role={prof.role === UserRole.DOCTOR ? 'doctor' : 'nurse'} alt={prof.name} className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900">{prof.name}</p>
                              <span className="text-xs text-slate-500 uppercase font-bold">{prof.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-none border border-slate-200">
                            {prof.licenseNumber}
                          </code>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            {(prof as any).medicalCouncil || (prof as any).nursingCouncil || 'National Board'}
                          </p>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {prof.specialization || 'General Practice'}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-black uppercase tracking-wider border ${
                            prof.verificationStatus === VerificationStatus.VERIFIED
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-none bg-current" />
                            {prof.verificationStatus}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-600">
                          {prof.licenseExpiry || 'N/A'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('medcred-view-profile', { detail: prof.id }));
                            }}
                            className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 transition-colors cursor-pointer"
                          >
                            Profile
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
  );
};

export default AdminRegistryTab;
