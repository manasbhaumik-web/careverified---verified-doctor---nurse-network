import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock, FolderHeart, Heart, Pill, Stethoscope, Users, Video } from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking } from '../types';
import DashboardHeader from './DashboardHeader';
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
}

type Tab = 'appointments' | 'records' | 'saved';

const readSaved = (): string[] => {
  try { return JSON.parse(localStorage.getItem('saved_practitioners') || '[]'); } catch { return []; }
};

export default function PatientDashboard({
  bookings, setBookings, professionals, onSelectProfessional, onNavigateToMessages, onConsultNow,
}: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appointments');
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  const [summary, setSummary] = useState<{ activeRx: number; bp: any | null } | null>(null);
  const [paying, setPaying] = useState<Booking | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const userName = (() => {
    try { const u = JSON.parse(localStorage.getItem('medi_user') || 'null'); if (u?.name) return u.name as string; } catch { /* ignore */ }
    return 'there';
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
        eyebrow="Your health console"
        title={`${greeting}, ${userName}`}
        description="Your appointments, prescriptions and health record in one secure place."
        actions={
          <button onClick={onConsultNow} className="group pl-3 pr-5 py-2.5 min-h-[52px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white flex items-center gap-3 cursor-pointer shadow-sm hover:shadow-md transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--t-600)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-white/15"><Video className="h-5 w-5" /></span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide">Consult a doctor now</span>
              <span className="block text-xs font-normal text-white/80">Chat or video with an online doctor</span>
            </span>
          </button>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabsLabel="Patient hub sections"
      />

      <section aria-label="Summary" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button className={`${card} text-left cursor-pointer`} onClick={() => setActiveTab('appointments')}>
          <p className="text-[13px] font-semibold text-slate-600 flex items-center gap-2"><Calendar className="h-4 w-4 text-[color:var(--t-600)]" /> Upcoming visits</p>
          <p className="text-3xl font-bold tabular-nums mt-1">{upcoming.length}</p>
          <p className="text-xs text-slate-600">{upcoming[0] ? `Next: ${upcoming[0].professionalName}, ${upcoming[0].date}` : 'No visits scheduled'}</p>
        </button>
        <button className={`${card} text-left cursor-pointer`} onClick={() => setActiveTab('records')}>
          <p className="text-[13px] font-semibold text-slate-600 flex items-center gap-2"><Pill className="h-4 w-4 text-[color:var(--t-600)]" /> Active prescriptions</p>
          <p className="text-3xl font-bold tabular-nums mt-1">{summary?.activeRx ?? '–'}</p>
          <p className="text-xs text-slate-600">Signed e-prescriptions you can send to a pharmacy</p>
        </button>
        <button className={`${card} text-left cursor-pointer`} onClick={() => setActiveTab('records')}>
          <p className="text-[13px] font-semibold text-slate-600 flex items-center gap-2"><Stethoscope className="h-4 w-4 text-[color:var(--t-600)]" /> Latest blood pressure</p>
          <p className="text-3xl font-bold tabular-nums mt-1">{summary?.bp ? `${summary.bp.value1}/${summary.bp.value2}` : '–'}</p>
          <p className={`text-xs ${summary?.bp?.flag?.level === 'urgent' ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>{summary?.bp ? (summary.bp.flag?.text ?? 'mmHg') : 'No readings logged'}</p>
        </button>
        <div className={card}>
          <p className="text-[13px] font-semibold text-slate-600 flex items-center gap-2"><Users className="h-4 w-4 text-[color:var(--t-600)]" /> Your care team</p>
          <p className="text-3xl font-bold tabular-nums mt-1">{careTeam.length}</p>
          <p className="text-xs text-slate-600">{careTeam.length ? careTeam.map(p => p.name).slice(0, 2).join(', ') : 'Book a visit to build your care team'}</p>
        </div>
      </section>

      {msg && <p role="status" className="text-sm font-semibold bg-slate-900 text-white px-4 py-2.5">{msg} <button className="underline ml-3 text-xs cursor-pointer" onClick={() => setMsg(null)}>Dismiss</button></p>}

      {activeTab === 'appointments' && (
        <div id="panel-appointments" role="tabpanel" aria-labelledby="tab-appointments" tabIndex={0} className="space-y-5">
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
