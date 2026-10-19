import React from 'react';
import { 
  Activity, Video, Heart, Calendar, FolderHeart, Pill, ShieldCheck, 
  ArrowRight, Clock, CheckCircle2, ChevronRight, User, AlertCircle, 
  Sparkles, MessageSquare, PhoneCall, HeartPulse, RefreshCw, Layers, Check,
  Plane, BookOpen, LifeBuoy, Search, X, Menu, Bell
} from 'lucide-react';
import { navigate } from '../nav';

export default function HeaderColorSamples() {
  const [selectedOption, setSelectedOption] = React.useState<number>(2);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 space-y-8 font-sans">
      <div className="max-w-7xl mx-auto bg-white p-6 border border-slate-300 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[color:var(--t-600)] bg-[color:var(--t-50)] px-2.5 py-1 border border-[color:var(--t-200)]">
              Interactive Design Samples
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              User Dashboard Header: Lighter Shades Exploration
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Previewing 4 lighter, calmer shades derived directly from the application theme and landing page palette.
            </p>
          </div>
          <button 
            onClick={() => navigate('/dashboard-preview')}
            className="text-xs font-bold px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard Preview
          </button>
        </div>
      </div>

      {/* SAMPLE 1 */}
      <section className="max-w-7xl mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 bg-white px-2 py-0.5 border border-slate-300">
            Sample 1: Clinical High-Key White & Cyan Hairline
          </span>
          <span className="text-xs font-mono text-slate-500">Pure White bg-white + Cyan-600 accent</span>
        </div>
        <div className="w-full bg-white text-slate-900 border-t-4 border-t-[color:var(--t-600)] border-b border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)] flex items-center justify-center font-black text-xl shrink-0">
                AR
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">Ahmad Bin Razak</h2>
                  <span className="text-xs font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
                    EHR Verified Patient
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Good afternoon &bull; Next Visit: <strong class="text-slate-800">Dr. Tan Wei Lun (Cardiology)</strong>, Tomorrow 10:30 AM &bull; <span className="font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] px-1.5 py-0.5 border border-[color:var(--t-200)]">BP: 122/80 mmHg</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-stretch bg-slate-50 border border-slate-200 h-10 text-xs">
                <div className="px-3 flex flex-col justify-center border-r border-slate-200"><span className="font-black text-slate-900">2</span><span className="text-xs uppercase font-bold text-slate-500">Upcoming</span></div>
                <div className="px-3 flex flex-col justify-center border-r border-slate-200"><span className="font-black text-slate-900">3</span><span className="text-xs uppercase font-bold text-slate-500">Active Rx</span></div>
                <div className="px-3 flex flex-col justify-center"><span className="font-black text-slate-900">RM 250</span><span className="text-xs uppercase font-bold text-slate-500">Care Team</span></div>
              </div>
              <button className="h-10 px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black shadow-xs cursor-pointer">
                On-Call Doctor Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SAMPLE 2 */}
      <section className="max-w-7xl mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[color:var(--t-800)] bg-[color:var(--t-100)] px-2 py-0.5 border border-[color:var(--t-300)]">
            Sample 2: Soft Ice-Cyan Morning Glow (--t-50 / #ECFEFF)
          </span>
          <span className="text-xs font-mono text-slate-500">Lightest tint of the application theme color + Cyan-200 border</span>
        </div>
        <div className="w-full bg-[color:var(--t-50)] text-slate-900 border-b border-[color:var(--t-200)] p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white text-[color:var(--t-600)] border border-[color:var(--t-200)] flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
                AR
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-[color:var(--ink)]">Ahmad Bin Razak</h2>
                  <span className="text-xs font-black uppercase px-2 py-0.5 bg-white text-[color:var(--t-700)] border border-[color:var(--t-200)] shadow-2xs">
                    EHR Verified Patient
                  </span>
                </div>
                <p className="text-xs text-[color:var(--ink-2)] mt-1 font-medium">
                  Good afternoon &bull; Next Visit: <strong className="text-[color:var(--t-700)]">Dr. Tan Wei Lun (Cardiology)</strong>, Tomorrow 10:30 AM &bull; <span className="font-mono font-bold text-[color:var(--t-700)] bg-white px-1.5 py-0.5 border border-[color:var(--t-200)]">BP: 122/80 mmHg</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-stretch bg-white border border-[color:var(--t-200)] h-10 text-xs shadow-2xs">
                <div className="px-3 flex flex-col justify-center border-r border-[color:var(--t-100)]"><span className="font-black text-[color:var(--ink)]">2</span><span className="text-xs uppercase font-bold text-[color:var(--t-600)]">Upcoming</span></div>
                <div className="px-3 flex flex-col justify-center border-r border-[color:var(--t-100)]"><span className="font-black text-[color:var(--ink)]">3</span><span className="text-xs uppercase font-bold text-[color:var(--t-600)]">Active Rx</span></div>
                <div className="px-3 flex flex-col justify-center"><span className="font-black text-[color:var(--ink)]">RM 250</span><span className="text-xs uppercase font-bold text-[color:var(--t-600)]">Care Team</span></div>
              </div>
              <button className="h-10 px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black shadow-xs cursor-pointer">
                On-Call Doctor Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SAMPLE 3 */}
      <section className="max-w-7xl mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[color:var(--t-800)] bg-[color:var(--t-200)] px-2 py-0.5 border border-[color:var(--t-400)]">
            Sample 3: Mid-Tone Aqua Wash (--t-100 / #CFFAFE)
          </span>
          <span className="text-xs font-mono text-slate-500">Medium-light wash with vibrant cyan border</span>
        </div>
        <div className="w-full bg-[color:var(--t-100)] text-slate-900 border-b border-[color:var(--t-300)] p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white text-[color:var(--t-600)] border border-[color:var(--t-300)] flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
                AR
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-[color:var(--ink)]">Ahmad Bin Razak</h2>
                  <span className="text-xs font-black uppercase px-2 py-0.5 bg-white text-[color:var(--t-700)] border border-[color:var(--t-300)] shadow-2xs">
                    EHR Verified Patient
                  </span>
                </div>
                <p className="text-xs text-[color:var(--ink-2)] mt-1 font-medium">
                  Good afternoon &bull; Next Visit: <strong className="text-[color:var(--t-700)]">Dr. Tan Wei Lun (Cardiology)</strong>, Tomorrow 10:30 AM &bull; <span className="font-mono font-bold text-[color:var(--t-700)] bg-white px-1.5 py-0.5 border border-[color:var(--t-300)]">BP: 122/80 mmHg</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-stretch bg-white border border-[color:var(--t-300)] h-10 text-xs shadow-2xs">
                <div className="px-3 flex flex-col justify-center border-r border-[color:var(--t-200)]"><span className="font-black text-[color:var(--ink)]">2</span><span className="text-xs uppercase font-bold text-[color:var(--t-600)]">Upcoming</span></div>
                <div className="px-3 flex flex-col justify-center border-r border-[color:var(--t-200)]"><span className="font-black text-[color:var(--ink)]">3</span><span className="text-xs uppercase font-bold text-[color:var(--t-600)]">Active Rx</span></div>
                <div className="px-3 flex flex-col justify-center"><span className="font-black text-[color:var(--ink)]">RM 250</span><span className="text-xs uppercase font-bold text-[color:var(--t-600)]">Care Team</span></div>
              </div>
              <button className="h-10 px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black shadow-xs cursor-pointer">
                On-Call Doctor Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SAMPLE 4 */}
      <section className="max-w-7xl mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 bg-white px-2 py-0.5 border border-slate-300">
            Sample 4: Dual-Tone Air (--t-bg / #F2FDFF Landing Page Canvas)
          </span>
          <span className="text-xs font-mono text-slate-500">Landing Page body background (--t-bg / #F2FDFF)</span>
        </div>
        <div className="w-full bg-[color:var(--t-bg)] text-slate-900 border-b border-[color:var(--t-200)] p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white text-[color:var(--t-600)] border border-[color:var(--t-200)] flex items-center justify-center font-black text-xl shrink-0 shadow-2xs">
                AR
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">Ahmad Bin Razak</h2>
                  <span className="text-xs font-black uppercase px-2 py-0.5 bg-white text-[color:var(--t-600)] border border-[color:var(--t-200)]">
                    EHR Verified Patient
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Good afternoon &bull; Next Visit: <strong className="text-slate-800">Dr. Tan Wei Lun (Cardiology)</strong>, Tomorrow 10:30 AM &bull; <span className="font-mono font-bold text-[color:var(--t-700)] bg-white px-1.5 py-0.5 border border-[color:var(--t-200)]">BP: 122/80 mmHg</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-stretch bg-white border border-[color:var(--t-200)] h-10 text-xs shadow-2xs">
                <div className="px-3 flex flex-col justify-center border-r border-[color:var(--t-100)]"><span className="font-black text-slate-800">2</span><span className="text-xs uppercase font-bold text-slate-500">Upcoming</span></div>
                <div className="px-3 flex flex-col justify-center border-r border-[color:var(--t-100)]"><span className="font-black text-slate-800">3</span><span className="text-xs uppercase font-bold text-slate-500">Active Rx</span></div>
                <div className="px-3 flex flex-col justify-center"><span className="font-black text-slate-800">RM 250</span><span className="text-xs uppercase font-bold text-slate-500">Care Team</span></div>
              </div>
              <button className="h-10 px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black shadow-xs cursor-pointer">
                On-Call Doctor Now
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
