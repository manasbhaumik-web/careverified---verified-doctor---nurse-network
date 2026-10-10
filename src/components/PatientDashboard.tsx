import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Calendar, Clock, FolderHeart, Heart, Video } from 'lucide-react';
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
}

type Tab = 'appointments' | 'records' | 'saved';

const readSaved = (): string[] => {
  try { return JSON.parse(localStorage.getItem('saved_practitioners') || '[]'); } catch { return []; }
};

export default function PatientDashboard({
  bookings, setBookings, professionals, onSelectProfessional, onNavigateToMessages, onConsultNow, onOpenArticle,
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

      {msg && <p role="status" className="text-sm font-semibold bg-slate-900 text-white px-4 py-2.5">{msg} <button className="underline ml-3 text-xs cursor-pointer" onClick={() => setMsg(null)}>Dismiss</button></p>}

      {activeTab === 'appointments' && (
        <div id="panel-appointments" role="tabpanel" aria-labelledby="tab-appointments" tabIndex={0} className="space-y-5">
          {reading.length > 0 && (
            <section className={card} aria-label="Recommended reading">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-[color:var(--t-600)]" /> Recommended by your doctors</h2>
              <ul className="divide-y divide-slate-100">
                {reading.slice(0, 5).map(r => (
                  <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{r.title} {!r.seen && <span className="ml-1 text-[10px] font-extrabold uppercase bg-[color:var(--t-600)] text-white px-1.5 py-0.5 align-middle">New</span>}</p>
                      <p className="text-xs text-slate-600">From {r.doctor}{r.note ? `: “${r.note}”` : ''}</p>
                    </div>
                    <button onClick={() => { fetch(`/api/me/recommended-reading/${r.id}/seen`, { method: 'POST' }).catch(() => {}); onOpenArticle(r.articleId); }}
                      className="border border-slate-200 text-xs font-bold px-4 py-2 cursor-pointer">Read</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={card}>
            <h2 className="text-base font-bold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-[color:var(--t-600)]" /> Upcoming appointments</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing booked. Find a verified doctor under “Doctors &amp; Nurses”, or use “Consult a doctor now”.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map(b => (
                  <li key={b.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <button onClick={() => onSelectProfessional(b.professionalId)} className="text-sm font-bold hover:underline cursor-pointer text-left">{b.professionalName}</button>
                      <p className="text-xs text-slate-600">{b.date} · {b.timeSlot} · {b.mode} · RM {b.fee.toFixed(2)}</p>
                      {b.paymentStatus === 'Pending' && <p className="text-xs font-bold text-amber-700">Awaiting payment. The slot is held for a short time.</p>}
                    </div>
                    <div className="flex gap-2">
                      {b.paymentStatus === 'Pending' && <button onClick={() => setPaying(b)} className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-4 py-2 cursor-pointer">Pay now</button>}
                      <button onClick={onNavigateToMessages} className="border border-slate-200 text-xs font-bold px-3 py-2 cursor-pointer">Message</button>
                      <button onClick={() => cancel(b)} className="border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 cursor-pointer">Cancel</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-500 mt-3">Cancelling at least a day ahead is refunded in full. Scheduled video visits are arranged with your doctor by message; use “Consult a doctor now” for an instant video or chat.</p>
          </section>

          {past.length > 0 && (
            <section className={card}>
              <h2 className="text-base font-bold mb-3">Past appointments</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {past.map(b => (
                  <li key={b.id} className="py-2 flex justify-between gap-3"><span>{b.professionalName} · {b.date}</span><span className="font-bold text-slate-600">{b.status}{b.paymentStatus === 'Refunded' ? ' (refunded)' : ''}</span></li>
                ))}
              </ul>
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
