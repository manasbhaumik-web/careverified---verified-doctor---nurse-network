import React from 'react';
import { Users, Search, Send } from 'lucide-react';
import WorkspaceHeader from '../WorkspaceHeader';
import { BannerBadge, DashboardTab } from '../DashboardHeader';
import { LocumProfile } from './types';

interface FacilityLocumsTabProps {
  embedded?: boolean;
  displayedTabs: DashboardTab[];
  tab: string;
  setTab: (tab: any) => void;
  locumSearch: string;
  setLocumSearch: (val: string) => void;
  locumRoleFilter: 'all' | 'doctor' | 'nurse';
  setLocumRoleFilter: (val: 'all' | 'doctor' | 'nurse') => void;
  filteredLocums: LocumProfile[];
  onInviteLocum: (locum: LocumProfile) => void;
}

export default function FacilityLocumsTab({
  embedded,
  displayedTabs,
  tab,
  setTab,
  locumSearch,
  setLocumSearch,
  locumRoleFilter,
  setLocumRoleFilter,
  filteredLocums,
  onInviteLocum,
}: FacilityLocumsTabProps) {
  return (
    <div className="space-y-4">
      <WorkspaceHeader
        icon={Users}
        eyebrow="Practitioner Directory · On-Demand Talent"
        title="Verified Doctor & Nurse Talent Network"
        description="Directly source and engage credentialed doctors and nurses with active APC registration for scheduled shifts and emergency relief."
        badges={<BannerBadge tone="brand">MMC / LJM Verified</BannerBadge>}
        tabs={embedded && displayedTabs.length > 1 ? displayedTabs : undefined}
        activeTab={tab}
        onTabChange={setTab}
      />
      <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search practitioners by doctor name, specialty, state, or city…"
            value={locumSearch}
            onChange={e => setLocumSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[color:var(--t-200)] text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Role:</span>
          <button
            type="button"
            onClick={() => setLocumRoleFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
              locumRoleFilter === 'all'
                ? 'bg-[color:var(--t-600)] text-white'
                : 'bg-white border border-[color:var(--t-200)] text-slate-700'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setLocumRoleFilter('doctor')}
            className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
              locumRoleFilter === 'doctor'
                ? 'bg-[color:var(--t-600)] text-white'
                : 'bg-white border border-[color:var(--t-200)] text-slate-700'
            }`}
          >
            Doctors
          </button>
          <button
            type="button"
            onClick={() => setLocumRoleFilter('nurse')}
            className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
              locumRoleFilter === 'nurse'
                ? 'bg-[color:var(--t-600)] text-white'
                : 'bg-white border border-[color:var(--t-200)] text-slate-700'
            }`}
          >
            Nurses
          </button>
        </div>
      </div>

      {filteredLocums.length === 0 ? (
        <div className="bg-white border border-[color:var(--t-200)] p-12 text-center text-xs text-slate-500">
          No verified medical practitioners found matching search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocums.map(loc => (
            <div
              key={loc.profileId}
              className="bg-white border border-[color:var(--t-200)] p-4 flex flex-col justify-between space-y-4 hover:border-[color:var(--t-400)] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900">{loc.name}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-2xs font-extrabold uppercase">
                        {loc.role}
                      </span>
                    </div>
                    <span className="text-xs text-[color:var(--t-700)] font-black block mt-0.5">
                      {loc.specialization}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2xs font-black uppercase tracking-wider border border-emerald-300 shrink-0">
                    APC Active
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  <div>Registry: <strong className="font-mono text-slate-800">{loc.registry || 'MMC Registered'}</strong></div>
                  <div>APC Expiry: <strong className="text-slate-800">{loc.apcValidUntil || '2029-12-31'}</strong></div>
                  <div>Available: <strong className="text-slate-800">{loc.states?.join(', ') || loc.city || 'Kuala Lumpur'}</strong></div>
                  {loc.minRate && (
                    <div className="text-xs font-black text-[color:var(--t-700)]">
                      Expected Rate: RM {loc.minRate} / {loc.ratePeriod || 'hour'}
                    </div>
                  )}
                </div>

                {loc.note && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2 border border-slate-100 italic">
                    "{loc.note}"
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onInviteLocum(loc)}
                className="w-full py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider border border-[color:var(--t-700)] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Invite to Shift
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
