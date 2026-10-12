import React, { useCallback, useEffect, useState } from 'react';
import { 
  BookOpen, Calendar, Clock, FolderHeart, Heart, Video, 
  CheckCircle2, Search, MessageSquare, ShieldCheck, ArrowRight, User
} from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking } from '../types';
import DashboardHeader, { BannerRow, BannerIdentity, BannerBadge, BannerKpis, bannerPrimaryBtn, bannerSecondaryBtn } from './DashboardHeader';
import PatientRecords from './PatientRecords';
import SavedTab from './patient/SavedTab';
import PaymentDialog from './PaymentDialog';

interface PatientDashboardProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  professionals: (DoctorProfile | NurseProfile)[];
  onSelectProfessional: (id: string) => void;
  onNavigateToMessages: () => void;
  onConsultNow: () => void;
  /** Opens the Medical Library on a specific article. */
  onOpenArticle: (articleId: string) => void;
  /** Navigates to the practitioner directory to find/book a doctor */
  onFindDoctors?: () => void;
}

type Tab = 'appointments' | 'records' | 'saved';

const readSaved = (): string[] => {
  try { return JSON.parse(localStorage.getItem('saved_practitioners') || '[]'); } catch { return []; }
};

export default function PatientDashboard({
  bookings, setBookings, professionals, onSelectProfessional, onNavigateToMessages, onConsultNow, onOpenArticle, onFindDoctors,
}: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appointments');
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  const [summary, setSummary] = useState<{ activeRx: number; bp: any | null } | null>(null);
  const [paying, setPaying] = useState<Booking | null>(null);
  const [reading, setReading] = useState<{ id: string; articleId: string; title: string; doctor: string; note: string | null; seen: boolean }[]>([]);
  useEffect(() => {
    fetch('/api/me/recommended-reading').then(r => r.json()).then(d => d.status === 'success' && setReading(d.data)).catch(() => {});
  }, []);
  const [msg, setMsg] = useState<string | null>(null);

  const userName = (() => {
    try { const u = JSON.parse(localStorage.getItem('medi_user') || 'null'); if (u?.name) return u.name as string; } catch { /* ignore */ }
    return 'there';
  })();
  const userAvatar = (() => {
    try { const u = JSON.parse(localStorage.getItem('medi_user') || 'null'); if (u?.avatarUrl) return u.avatarUrl as string; } catch { /* ignore */ }
    return null;
  })();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const loadSummary = useCallback(async () => {
    const d = await fetch('/api/records/me').then(r => r.json()).catch(() => null);
    if (d?.status !== 'success') return;
    setSummary({
      activeRx: d.data.prescriptions.filter((p: any) => p.status === 'active').length,
      bp: d.data.vitals.find((v: any) => v.kind === 'bp') ?? null,
    });
  }, []);
  useEffect(() => { loadSummary(); }, [loadSummary, activeTab]);

  const upcoming = bookings.filter(b => b.status === 'Upcoming');
  const past = bookings.filter(b => b.status !== 'Upcoming');
  const careTeam = Array.from(new Set(bookings.filter(b => b.paymentStatus === 'Paid').map(b => b.professionalId)))
    .map(id => professionals.find(p => p.id === id)).filter(Boolean) as (DoctorProfile | NurseProfile)[];

  const cancel = async (b: Booking) => {
    if (!window.confirm('Cancel this appointment?')) return;
    const d = await fetch(`/api/bookings/${b.id}/cancel`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (d?.status === 'success') {
      setBookings(prev => prev.map(x => (x.id === b.id ? d.data : x)));
      setMsg(d.message);
    } else setMsg(d?.message || 'Could not cancel.');
  };

  const removeSaved = (id: string) => {
    const next = savedIds.filter(x => x !== id);
    setSavedIds(next);
    try { localStorage.setItem('saved_practitioners', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<any>; count?: number }[] = [
    { id: 'appointments', label: 'Appointments', icon: Calendar, count: upcoming.length },
    { id: 'records', label: 'Health Record', icon: FolderHeart },
    { id: 'saved', label: 'Saved Doctors', icon: Heart, count: savedIds.length },
  ];

  const card = 'bg-white border border-[color:var(--t-200)] shadow-xs p-5';
  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-5" id="patient-dashboard-root">
      <DashboardHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabsLabel="Member hub sections"
      >
        <BannerRow
          identity={
            <BannerIdentity
              name={userName}
              avatarUrl={userAvatar}
              badges={<BannerBadge>Member Account</BannerBadge>}
              meta={
                <>
                  <span className="font-extrabold text-slate-900">{greeting}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span>{upcoming[0] ? `Next visit: ${upcoming[0].professionalName}, ${upcoming[0].date}` : 'No visits scheduled'}</span>
                  {summary?.bp && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span className={summary.bp.flag?.level === 'urgent' ? 'text-rose-700 font-bold' : ''}>
                        BP {summary.bp.value1}/{summary.bp.value2} mmHg
                      </span>
                    </>
                  )}
                </>
              }
            />
          }
          aside={
            <>
              <BannerKpis items={[
                { value: upcoming.length, label: 'Upcoming' },
                { value: summary?.activeRx ?? '–', label: 'Prescriptions' },
                { value: careTeam.length, label: 'Care team' },
              ]} />
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button type="button" onClick={onConsultNow} className={bannerPrimaryBtn}>
                  <Video className="h-4 w-4" />
                  <span>Consult a doctor now</span>
                </button>
                <button type="button" onClick={() => setActiveTab('records')} className={bannerSecondaryBtn}>
                  <FolderHeart className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>Health Record</span>
                </button>
              </div>
            </>
          }
        />
      </DashboardHeader>

      {msg && (
        <div
          role="status"
          className="bg-[color:var(--t-50)] border-l-4 border-l-[color:var(--t-600)] border-t border-r border-b border-[color:var(--t-200)] text-[color:var(--ink)] p-4 flex items-center justify-between gap-3 shadow-xs animate-fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4.5 w-4.5 text-[color:var(--t-600)] shrink-0" />
            <span className="text-xs sm:text-sm font-bold leading-snug">{msg}</span>
          </div>
          <button
            type="button"
            className="text-xs font-bold text-[color:var(--t-600)] hover:text-white hover:bg-[color:var(--t-600)] px-3 py-1 bg-white border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer shrink-0"
            onClick={() => setMsg(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div id="panel-appointments" role="tabpanel" aria-labelledby="tab-appointments" tabIndex={0} className="space-y-5">
          {reading.length > 0 && (
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Recommended reading">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display font-black text-base text-[color:var(--ink)] leading-tight">
                    Doctor Recommended Clinical Articles
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Peer-reviewed clinical guidance prescribed for your health record
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[color:var(--t-100)]">
                {reading.slice(0, 5).map(r => (
                  <div key={r.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3 group">
                    <div className="min-w-0 max-w-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display font-extrabold text-sm text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors">
                          {r.title}
                        </h4>
                        {!r.seen && (
                          <span className="text-[10px] font-mono font-bold uppercase bg-[color:var(--t-600)] text-white px-2 py-0.5 shadow-2xs">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                        <span className="text-slate-500">Prescribed by</span>
                        <strong className="text-[color:var(--ink)]">{r.doctor}</strong>
                        {r.note && (
                          <span className="italic text-slate-500 before:content-['·_']">
                            “{r.note}”
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        fetch(`/api/me/recommended-reading/${r.id}/seen`, { method: 'POST' }).catch(() => {});
                        onOpenArticle(r.articleId);
                      }}
                      className="min-h-[38px] px-4 bg-white hover:bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] hover:text-[color:var(--t-800)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3.5 border-b border-[color:var(--t-100)]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                    Upcoming Consultations
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Confirmed visits and telehealth appointments
                  </p>
                </div>
              </div>

              {upcoming.length > 0 && onFindDoctors && (
                <button
                  type="button"
                  onClick={onFindDoctors}
                  className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" /> Book Another
                </button>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center bg-[color:var(--t-50)]/40 border border-dashed border-[color:var(--t-200)] my-1">
                <div className="w-14 h-14 bg-white border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center mb-3.5 shadow-2xs">
                  <Calendar className="h-6 w-6 text-[color:var(--t-600)]" />
                </div>
                <h3 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] mb-1">
                  No Scheduled Consultations
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md font-medium leading-relaxed mb-6">
                  You currently have no visits scheduled. Connect immediately with an on-call triage doctor or browse council-verified medical doctors &amp; nurses.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onConsultNow}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer"
                  >
                    <Video className="h-4 w-4" />
                    <span>Consult a Doctor Now</span>
                  </button>
                  {onFindDoctors && (
                    <button
                      type="button"
                      onClick={onFindDoctors}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] border border-[color:var(--t-200)] text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      <Search className="h-4 w-4 text-[color:var(--t-600)]" />
                      <span>Browse Verified Practitioners</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {upcoming.map(b => {
                  const prof = professionals.find(p => p.id === b.professionalId);
                  const isPending = b.paymentStatus === 'Pending';
                  return (
                    <div
                      key={b.id}
                      className="group bg-white p-4 sm:p-5 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                    >
                      {/* Left: Professional info & appointment timing */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center text-[color:var(--t-600)] overflow-hidden shadow-2xs">
                          {prof?.avatar ? (
                            <img src={prof.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-[color:var(--t-600)]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectProfessional(b.professionalId)}
                              className="font-display font-black text-sm sm:text-base text-[color:var(--ink)] hover:text-[color:var(--t-600)] text-left transition-colors cursor-pointer"
                            >
                              {b.professionalName}
                            </button>
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Council Verified
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600 font-medium">
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                              <Calendar className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> {b.date}
                            </span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="inline-flex items-center gap-1.5 font-mono">
                              <Clock className="h-3.5 w-3.5 text-slate-400" /> {b.timeSlot}
                            </span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="inline-flex items-center gap-1.5">
                              <Video className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> {b.mode}
                            </span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="font-mono font-bold text-[color:var(--t-700)]">
                              RM {b.fee.toFixed(2)}
                            </span>
                          </div>

                          {isPending && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Awaiting Payment · Slot held temporarily
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions with Strict Hierarchy */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-[color:var(--t-100)] shrink-0">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => setPaying(b)}
                            className="min-h-[40px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Pay RM {b.fee.toFixed(2)}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={onNavigateToMessages}
                            className="min-h-[40px] px-4 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                            <span>Message Doctor</span>
                          </button>
                        )}

                        {!isPending && (
                          <button
                            type="button"
                            onClick={() => onSelectProfessional(b.professionalId)}
                            className="min-h-[40px] px-3.5 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-600)] text-xs font-bold border border-[color:var(--t-200)] transition-all cursor-pointer"
                          >
                            View Details
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => cancel(b)}
                          className="min-h-[40px] px-3 text-xs font-semibold text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Cancel appointment"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Cancellations &gt;24h in advance are 100% refunded to the original payment method.</span>
              <span className="font-bold text-[color:var(--t-600)] hidden sm:inline">Statutory SLA Compliant</span>
            </div>
          </section>

          {past.length > 0 && (
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                <h2 className="font-display font-black text-base text-[color:var(--ink)]">
                  Consultation History
                </h2>
                <span className="text-[11px] font-mono font-bold text-slate-500">
                  {past.length} Completed Records
                </span>
              </div>

              <div className="divide-y divide-[color:var(--t-100)]">
                {past.map(b => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-[color:var(--ink)] block sm:inline">{b.professionalName}</span>
                      <span className="text-slate-400 hidden sm:inline"> · </span>
                      <span className="text-slate-600 font-medium font-mono">{b.date} ({b.timeSlot})</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold bg-[color:var(--t-50)] text-slate-700 border border-[color:var(--t-200)] shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {b.status}{b.paymentStatus === 'Refunded' ? ' (Refunded)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'records' && (
        <div id="panel-records" role="tabpanel" aria-labelledby="tab-records" tabIndex={0}>
          <PatientRecords />
        </div>
      )}

      {activeTab === 'saved' && (
        <div id="panel-saved" role="tabpanel" aria-labelledby="tab-saved" tabIndex={0}>
          <SavedTab
            savedProfessionals={professionals.filter(p => savedIds.includes(p.id))}
            onRemoveSaved={removeSaved}
            onNavigateToMessages={onNavigateToMessages}
            onSelectProfessional={onSelectProfessional}
            onVerifyCredentials={p => onSelectProfessional(p.id)}
          />
        </div>
      )}

      {paying && (
        <PaymentDialog kind="booking" refId={paying.id} description={`Appointment with ${paying.professionalName} on ${paying.date}, ${paying.timeSlot}`}
          onCancel={() => setPaying(null)}
          onPaid={() => { setBookings(prev => prev.map(x => (x.id === paying.id ? { ...x, paymentStatus: 'Paid' as const } : x))); setPaying(null); }} />
      )}
    </div>
  );
}
