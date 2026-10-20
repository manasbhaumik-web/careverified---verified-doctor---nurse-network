import React from 'react';
import { Award, CheckCircle2, Loader, AlertCircle, MapPin, DollarSign, ShieldOff, Clock, ShieldCheck } from 'lucide-react';
import { DoctorProfile, NurseProfile, VerificationStatus } from '../../types';
import { formatMoney } from '../../locale';
import VerificationStatusCard from '../VerificationStatusCard';

interface PractitionerAccreditationTabProps {
  matchedProfile: DoctorProfile | NurseProfile;
  isVerified: boolean;
  isPending: boolean;
  isDoc: boolean;
  onRefreshData?: () => void;
}

export default function PractitionerAccreditationTab({
  matchedProfile,
  isVerified,
  isPending,
  isDoc,
  onRefreshData
}: PractitionerAccreditationTabProps) {
  const isSuspended = matchedProfile.verificationStatus === VerificationStatus.SUSPENDED || Boolean(matchedProfile.suspensionReason);
  const councilName = (matchedProfile as any).medicalCouncil || (matchedProfile as any).nursingCouncil || 'National Council';
  const cleanLocation = matchedProfile.practiceAddress
    ? `${matchedProfile.practiceAddress}${
        matchedProfile.city && !matchedProfile.practiceAddress.toLowerCase().includes(matchedProfile.city.toLowerCase())
          ? `, ${matchedProfile.city}`
          : ''
      }`
    : matchedProfile.city;

  return (
    <div id="panel-accreditation" role="tabpanel" aria-labelledby="tab-accreditation" tabIndex={0} className="space-y-6 animate-fade-in">
      <VerificationStatusCard onChanged={onRefreshData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Certificate of Accreditation Widget */}
        <div className="lg:col-span-2 bg-white border border-[color:var(--t-200)] rounded-none p-6 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--t-200)] pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-[color:var(--t-600)]" />
                National Network Accreditation
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Official credential status verified with governmental boards.</p>
            </div>
            <span className={`text-2xs font-mono font-black uppercase tracking-wider px-2.5 py-0.5 border ${
              isVerified
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isSuspended
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : isPending
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {isVerified ? 'Active Standing' : isSuspended ? 'Suspended by Board' : isPending ? 'Audit Pending' : 'Action Required'}
            </span>
          </div>

          {isVerified ? (
            <div className="border border-emerald-200 rounded-none p-5 bg-emerald-50/30 space-y-4">
              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-emerald-50 rounded-none border border-emerald-200 text-emerald-600 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-900">MMC/LJM Status: Active &amp; In Good Standing</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Your professional practice certificate matches active licensing records inside the state database. No compliance alerts are pending on your record.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 border-t border-emerald-200/60 text-xs">
                <div>
                  <span className="text-2xs text-slate-400 font-black uppercase tracking-wider block">Registry Authority</span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block">{councilName}</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 font-black uppercase tracking-wider block">License Key Number</span>
                  <code className="font-mono font-bold text-[color:var(--t-700)] bg-white border border-[color:var(--t-200)] px-2 py-0.5 rounded-none text-2xs mt-0.5 inline-block">{matchedProfile.licenseNumber}</code>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 font-black uppercase tracking-wider block">APC Valid Until</span>
                  <span className="font-mono font-extrabold text-emerald-800 mt-0.5 block">{matchedProfile.licenseExpiry || '2029-12-31'}</span>
                </div>
              </div>
            </div>
          ) : isSuspended ? (
            <div className="border border-rose-200 rounded-none p-5 bg-rose-50/30 space-y-4">
              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-rose-50 rounded-none border border-rose-200 text-rose-600 shrink-0">
                  <ShieldOff className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-900">Statutory Suspension Active — Public Listing Hidden</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {matchedProfile.suspensionReason
                      ? `Board sanction notice: ${matchedProfile.suspensionReason} Submit your renewed APC or compliance documentation above for reinstatement review.`
                      : 'Your practising profile is currently suspended pending medical board compliance review. Submit your renewal documentation above.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 border-t border-rose-200/60 text-xs">
                <div>
                  <span className="text-2xs text-slate-400 font-black uppercase tracking-wider block">Registry Authority</span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block">{councilName}</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 font-black uppercase tracking-wider block">License Key Number</span>
                  <code className="font-mono font-bold text-rose-800 bg-white border border-rose-200 px-2 py-0.5 rounded-none text-2xs mt-0.5 inline-block">{matchedProfile.licenseNumber}</code>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 font-black uppercase tracking-wider block">Recorded APC Expiry</span>
                  <span className="font-mono font-extrabold text-slate-800 mt-0.5 block">{matchedProfile.licenseExpiry || '—'}</span>
                </div>
              </div>
            </div>
          ) : isPending ? (
            <div className="border border-amber-200 rounded-none p-5 bg-amber-50/30 space-y-4">
              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-amber-50 rounded-none border border-amber-200 text-amber-600 shrink-0">
                  <Loader className="h-5 w-5 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-900">Board Credential Auditing In Progress</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Our administrative registry team is cross-referencing your certificate files with government registers. This typically completes within 12–24 hours.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-rose-200 rounded-none p-5 bg-rose-50/30 space-y-4">
              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-rose-50 rounded-none border border-rose-200 text-rose-600 shrink-0">
                  <AlertCircle className="h-5 w-5" />
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
            <h4 className="text-2xs font-black uppercase tracking-wider text-slate-500">Completed Quality Checkmarks</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700">Identity Document check completed</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700">Clinical Diploma authenticated</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700">Malpractice Liability clearing active</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700">Professional Ethics code accepted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Availability & Practice Scope Sidebar */}
        <div className="space-y-6">
          {/* Practice Directory Snap */}
          <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 shadow-2xs space-y-4">
            <div className="border-b border-[color:var(--t-200)] pb-2.5 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Practice Parameters</h4>
              <ShieldCheck className="h-4 w-4 text-[color:var(--t-600)]" />
            </div>
            <div className="space-y-3 text-xs font-semibold text-slate-600">
              <p className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-[color:var(--t-600)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-2xs text-slate-400 font-black uppercase tracking-wider block">Location</strong>
                  <span className="text-slate-800 font-bold">{cleanLocation}</span>
                </span>
              </p>
              <p className="flex items-start gap-2.5">
                <DollarSign className="h-4 w-4 text-[color:var(--t-600)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-2xs text-slate-400 font-black uppercase tracking-wider block">Base Co-Pay Fee</strong>
                  <span className="text-slate-800 font-bold font-mono">{isDoc ? `${formatMoney(matchedProfile.fee)} per consult` : `${formatMoney(matchedProfile.fee)} per hour`}</span>
                </span>
              </p>
              {matchedProfile.consultationModes?.length > 0 && (
                <div className="pt-2 border-t border-[color:var(--t-100)]">
                  <span className="text-2xs text-slate-400 font-black uppercase tracking-wider block mb-1.5">Consultation Channels</span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchedProfile.consultationModes.map(mode => (
                      <span key={mode} className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Consultation Scheduling Matrix */}
          <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 shadow-2xs space-y-4">
            <div className="border-b border-[color:var(--t-200)] pb-2.5 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Availability Matrix</h4>
              <Clock className="h-4 w-4 text-[color:var(--t-600)]" />
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-2xs text-slate-400 font-black block uppercase tracking-wider">Clinical Days</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {matchedProfile.availability.days.map(d => (
                    <span key={d} className="bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] font-bold text-2xs uppercase tracking-wider px-2.5 py-1 rounded-none">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-[color:var(--t-100)]">
                <span className="text-2xs text-slate-400 font-black block uppercase tracking-wider">Scheduling Blocks</span>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {matchedProfile.availability.slots.map(s => (
                    <div key={s} className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2.5 py-1.5 rounded-none font-mono font-bold text-2xs text-slate-700 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-[color:var(--t-600)] shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
