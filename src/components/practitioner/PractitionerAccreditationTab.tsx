import React from 'react';
import { Award, CheckCircle2, Loader, AlertCircle, MapPin, DollarSign } from 'lucide-react';
import { DoctorProfile, NurseProfile } from '../../types';

interface PractitionerAccreditationTabProps {
  matchedProfile: DoctorProfile | NurseProfile;
  isVerified: boolean;
  isPending: boolean;
  isDoc: boolean;
}

export default function PractitionerAccreditationTab({
  matchedProfile,
  isVerified,
  isPending,
  isDoc
}: PractitionerAccreditationTabProps) {
  return (
    <div id="panel-accreditation" role="tabpanel" aria-labelledby="tab-accreditation" tabIndex={0} className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Certificate of Accreditation Widget */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-3xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="h-4.5 w-4.5 text-blue-600" />
            National Network Accreditation
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">Official credential status verified with governmental boards.</p>
        </div>

        {isVerified ? (
          <div className="border border-emerald-100 rounded-xl p-6 bg-emerald-50/20 space-y-4">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900">MMC/LJM Status: Active & In Good Standing</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Your professional practice certificate matches active licensing records inside the state database. No compliance alerts are pending on your record.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-100/50 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Registry Authority</span>
                <span className="font-extrabold text-slate-800 mt-0.5 block">{(matchedProfile as any).medicalCouncil || (matchedProfile as any).nursingCouncil || "National Council"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">License Key Number</span>
                <code className="font-mono font-bold text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded text-[11px] mt-0.5 inline-block">{matchedProfile.licenseNumber}</code>
              </div>
            </div>
          </div>
        ) : isPending ? (
          <div className="border border-amber-100 rounded-xl p-6 bg-amber-50/20 space-y-4">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-600 shrink-0">
                <Loader className="h-6 w-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900">Board Credential Auditing In Progress</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Our administrative registry team is cross-referencing your certificate files with government registers. This typically completes within 12-24 hours.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-rose-100 rounded-xl p-6 bg-rose-50/20 space-y-4">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-600 shrink-0">
                <AlertCircle className="h-6 w-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900">Credential Audit Failed</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Your registered license parameters could not be validated by government lookup services. Please verify your profile fields or contact our medical desk support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verified Checklist Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-700">Completed Quality Checkmarks</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150/40 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-700">Identity Document check completed</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150/40 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-700">Clinical Diploma authenticated</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150/40 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-700">Malpractice Liability clearing active</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150/40 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-700">Professional Ethics code accepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Availability & Practice Scope Sidebar */}
      <div className="space-y-6">
        {/* Practice Directory Snap */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-3xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Practice Parameters</h4>
          </div>
          <div className="space-y-3 text-xs font-semibold text-slate-600">
            <p className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800 font-extrabold block">Location:</strong>
                {matchedProfile.practiceAddress}, {matchedProfile.city}
              </span>
            </p>
            <p className="flex items-start gap-2.5">
              <DollarSign className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800 font-extrabold block">Base Co-Pay Fee:</strong>
                {isDoc ? `RM ${matchedProfile.fee} per consult` : `RM ${matchedProfile.fee} per hour`}
              </span>
            </p>
          </div>
        </div>

        {/* Consultation Scheduling Schedule */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-3xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Availability Matrix</h4>
          </div>
          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Clinical Days</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {matchedProfile.availability.days.map(d => (
                  <span key={d} className="bg-blue-50 text-blue-800 border border-blue-100/60 font-bold text-[10px] px-2 py-0.5 rounded-md">{d}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Scheduling Blocks</span>
              <div className="flex flex-col gap-1 mt-1.5 font-mono text-[11px] text-slate-600">
                {matchedProfile.availability.slots.map(s => (
                  <div key={s} className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">{s}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
