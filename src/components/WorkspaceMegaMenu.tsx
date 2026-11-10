import React from 'react';
import { 
  Heart, FolderHeart, PackagePlus, Search, Stethoscope, Calendar, 
  ShieldCheck, TrendingUp, BookOpen, Building2, Pill, Store, CreditCard, 
  Video, MessageSquare, Clock, AlertCircle, CheckCircle2, ChevronRight, 
  Star, UserCheck, HeartHandshake, Truck, Inbox, Activity, Users, 
  FileText, Shield, GraduationCap, Plane, Sparkles, ArrowRight, PhoneCall,
  Microscope, Check
} from 'lucide-react';
import { useTr } from '../i18n';

export interface MegaMenuItem {
  id: string;
  targetView?: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTone?: 'brand' | 'success' | 'urgent' | 'neutral';
}

export interface MegaMenuSection {
  navId: string;
  role: string;
  title: string;
  tagline: string;
  items: MegaMenuItem[];
  sideCard?: {
    badge: string;
    title: string;
    desc: string;
    actionLabel: string;
    targetId: string;
    icon?: React.ComponentType<{ className?: string }>;
  };
}

export const WORKSPACE_MEGAMENUS: Record<string, MegaMenuSection> = {
  // =========================================================================
  // PATIENT WORKSPACE SECTIONS
  // =========================================================================
  'patient:patient_care': {
    navId: 'patient_care',
    role: 'patient',
    title: 'My Care & Consultations',
    tagline: 'Live Telehealth, In-Clinic Visits & Specialist Care Team',
    items: [
      {
        id: 'appointments',
        label: 'Appointments & Visits',
        desc: 'Review upcoming teleconsultations, hospital clinic bookings & check-in QR',
        icon: Calendar,
        badge: '1 Next',
        badgeTone: 'brand'
      },
      {
        id: 'consult',
        label: 'Consult Now (Live Triage)',
        desc: 'Direct connection with on-call MMC licensed medical officers in under 3 mins',
        icon: Video,
        badge: 'Live 24/7',
        badgeTone: 'success'
      },
      {
        id: 'messages',
        label: 'Care Mailbox',
        desc: 'Encrypted clinical messaging, post-consult instructions & triage threads',
        icon: MessageSquare,
        badge: '2 New',
        badgeTone: 'urgent'
      },
      {
        id: 'saved',
        label: 'Care Team & Specialists',
        desc: 'Your preferred practitioners, family physicians & personal nurses',
        icon: Heart,
        badge: 'Verified',
        badgeTone: 'neutral'
      }
    ],
    sideCard: {
      badge: 'MMC Telehealth Verified',
      title: 'Need Urgent Doctor Triage?',
      desc: 'Connect with an on-call licensed medical officer immediately under MMC Telemedicine Conduct.',
      actionLabel: 'Launch Instant Video Consult →',
      targetId: 'consult',
      icon: Video
    }
  },

  'patient:patient_records': {
    navId: 'patient_records',
    role: 'patient',
    title: 'Health Records (EHR) & Diagnostics',
    tagline: 'Encrypted Clinical Vault, Prescriptions, Sick Leave & Lab Results',
    items: [
      {
        id: 'records',
        label: 'Health Records Summary (EHR)',
        desc: 'Encrypted personal medical history, vital biometric telemetry & allergies',
        icon: FolderHeart,
        badge: 'Encrypted',
        badgeTone: 'brand'
      },
      {
        id: 'prescriptions',
        label: 'Active Prescriptions & Refills',
        desc: 'Digital e-Prescriptions, dosage pill clock & 1-click pharmacy dispatch',
        icon: Pill,
        badge: 'Refill Due',
        badgeTone: 'urgent'
      },
      {
        id: 'certs',
        label: 'Medical Certificates (MC)',
        desc: 'MOH statutory digital sick leave certificates with tamper-evident QR verification',
        icon: FileText,
        badge: 'Valid',
        badgeTone: 'success'
      },
      {
        id: 'labs',
        label: 'Diagnostic Lab & Radiology',
        desc: 'Standardized blood tests, pathology panels & hospital imaging reports',
        icon: Microscope,
        badge: 'New Results',
        badgeTone: 'brand'
      }
    ],
    sideCard: {
      badge: 'Statutory Poisons Act',
      title: 'Cold-Chain e-Rx Refill',
      desc: 'Active digital prescriptions can be dispatched directly to your nearest licensed pharmacy.',
      actionLabel: 'Manage All Prescriptions →',
      targetId: 'prescriptions',
      icon: Pill
    }
  },

  'patient:patient_services': {
    navId: 'patient_services',
    role: 'patient',
    title: 'Packages, Assistance & Medical Tourism',
    tagline: 'Fixed-Price Hospital Bundles, Financial Aid & International Concierge',
    items: [
      {
        id: 'packages',
        label: 'Surgical & Wellness Packages',
        desc: 'Transparent fixed-price cardiac, maternity, health screening & orthopaedic bundles',
        icon: PackagePlus,
        badge: 'Bundled Deals',
        badgeTone: 'brand'
      },
      {
        id: 'assistance',
        label: 'Financial Assistance & GL',
        desc: 'Hospital guarantee letters (GL), zakat/NGO subsidies & crowdfunding assistance',
        icon: ShieldCheck,
        badge: '24/7 Desk',
        badgeTone: 'success'
      },
      {
        id: 'tourism',
        label: 'Medical Tourism Concierge',
        desc: 'MHTC accredited healthcare travel, airport transfers, hotels & companion visas',
        icon: Plane,
        badge: 'MHTC Accredited',
        badgeTone: 'neutral'
      }
    ],
    sideCard: {
      badge: 'National Wellness Campaign',
      title: 'Pink October 50% Subsidy',
      desc: 'MOH-subsidized mammogram screenings & executive wellness vouchers available now.',
      actionLabel: 'Explore Care Packages →',
      targetId: 'packages',
      icon: PackagePlus
    }
  },

  'patient:patient_discovery': {
    navId: 'patient_discovery',
    role: 'patient',
    title: 'Verified Medical Network & Discovery',
    tagline: 'Directory of Council-Registered Doctors, Nurses, Pharmacies & Guides',
    items: [
      {
        id: 'registry',
        label: 'Verified Doctors Directory',
        desc: 'Search 3,800+ specialists by hospital, consultation fees & verified MMC licences',
        icon: UserCheck,
        badge: 'MMC Verified',
        badgeTone: 'brand'
      },
      {
        id: 'nurses',
        label: 'Home & Private Nurse Care',
        desc: 'LJM registered nurses for post-operative recovery, wound dressing & eldercare',
        icon: HeartHandshake,
        badge: 'LJM Certified',
        badgeTone: 'success'
      },
      {
        id: 'pharmacies',
        label: 'Type A Licensed Dispensaries',
        desc: 'Find 450+ accredited pharmacies with 2°C–8°C cold-chain home delivery',
        icon: Store,
        badge: 'Cold-Chain',
        badgeTone: 'neutral'
      },
      {
        id: 'articles',
        label: 'Clinical Health Library',
        desc: 'Evidence-based clinical guides on chronic diseases, medications & wellness',
        icon: BookOpen,
        badge: 'MOH Reviewed',
        badgeTone: 'neutral'
      }
    ],
    sideCard: {
      badge: 'Act 586 Licensed',
      title: 'Official Healthcare Directory',
      desc: 'Every listed practitioner holds active council registration and valid practice certification.',
      actionLabel: 'Search Specialist Directory →',
      targetId: 'registry',
      icon: UserCheck
    }
  },

  // =========================================================================
  // PRACTITIONER (DOCTOR) WORKSPACE SECTIONS
  // =========================================================================
  'practitioner:onboard': {
    navId: 'onboard',
    role: 'practitioner',
    title: 'Clinical Care & Outpatient Suite',
    tagline: 'Outpatient Triage, Encrypted Teleconsultation & e-Prescription Pad',
    items: [
      {
        id: 'onboard',
        label: 'Outpatient Clinical Queue',
        desc: 'Real-time patient waiting room, triage severity scoring & consult call queue',
        icon: Stethoscope,
        badge: '4 Live',
        badgeTone: 'brand'
      },
      {
        id: 'consult',
        label: 'Teleconsultation Room',
        desc: 'Secure WebRTC encrypted video consult room with live clinical note-taking',
        icon: Video,
        badge: 'MMC Telehealth',
        badgeTone: 'success'
      },
      {
        id: 'prescriptions',
        label: 'Digital e-Prescribing Pad',
        desc: 'Issue statutory Poisons Act compliant prescriptions with digital doctor signature',
        icon: Pill,
        badge: 'MOH e-Rx',
        badgeTone: 'neutral'
      },
      {
        id: 'records',
        label: 'Patient Health Vault',
        desc: 'Review encrypted EHR, past consultations, allergies & lab diagnostic results',
        icon: FolderHeart,
        badge: 'PDPA Safe',
        badgeTone: 'neutral'
      }
    ],
    sideCard: {
      badge: 'Act 586 Compliance',
      title: 'MMC Telemedicine Code',
      desc: 'Standardized outpatient consult workflows under MMC Code of Professional Conduct.',
      actionLabel: 'Open Outpatient Queue →',
      targetId: 'onboard',
      icon: Stethoscope
    }
  },

  'practitioner:recruitment': {
    navId: 'recruitment',
    role: 'practitioner',
    title: 'Clinical Shifts & Locum Marketplace',
    tagline: 'Private Hospital Rosters, Clinic Locums & Critical Care Shifts',
    items: [
      {
        id: 'recruitment',
        label: 'Open Hospital Locum Shifts',
        desc: 'Browse Gleneagles, Sunway & KPJ shifts with transparent hourly locum rates',
        icon: Calendar,
        badge: '9 Open Shifts',
        badgeTone: 'brand'
      },
      {
        id: 'recruitment',
        label: 'Urgent OT / ICU Calls',
        desc: 'High-priority critical care surgical and anaesthetic coverage shifts',
        icon: AlertCircle,
        badge: 'Premium Rates',
        badgeTone: 'urgent'
      }
    ],
    sideCard: {
      badge: 'Fast-Track Escrow',
      title: 'Instant Shift Payouts',
      desc: 'Shift remuneration is escrow-held and settled directly via FPX within 24 hours of sign-off.',
      actionLabel: 'Browse Available Shifts →',
      targetId: 'recruitment',
      icon: Calendar
    }
  },

  'practitioner:practice_compliance': {
    navId: 'practice_compliance',
    role: 'practitioner',
    title: 'Practice Credentials & Statutory Compliance',
    tagline: 'MMC Registration, Annual Practicing Certificate & Medical Indemnity',
    items: [
      {
        id: 'practice_compliance',
        label: 'Annual Practicing Certificate (APC)',
        desc: 'MOH MMC / LJM certificate validation, validity dates and renewal reminders',
        icon: ShieldCheck,
        badge: 'Valid 2026',
        badgeTone: 'success'
      },
      {
        id: 'practice_compliance',
        label: 'Medical Indemnity Coverage',
        desc: 'Medical Protection Society (MPS) / Medefence professional indemnity verification',
        icon: Shield,
        badge: 'Active Cover',
        badgeTone: 'brand'
      },
      {
        id: 'practice_compliance',
        label: 'MMA CPD / CME Points',
        desc: 'Continuous Medical Education points tracking and accredited webinar certificates',
        icon: GraduationCap,
        badge: '28 / 20 CPD',
        badgeTone: 'neutral'
      }
    ],
    sideCard: {
      badge: 'Verified Council Registry',
      title: 'Credential Verification',
      desc: 'Your credentials are synchronized with the Malaysian Medical Council statutory portal.',
      actionLabel: 'Inspect Compliance Vault →',
      targetId: 'practice_compliance',
      icon: ShieldCheck
    }
  },

  'practitioner:performance_profile': {
    navId: 'performance_profile',
    role: 'practitioner',
    title: 'Performance Analytics & Public Profile',
    tagline: 'Consultation Volumes, Clinical Ratings & Remuneration Records',
    items: [
      {
        id: 'performance_profile',
        label: 'Clinical Practice Analytics',
        desc: 'Consultation trends, patient return rates, wait times and diagnostic logs',
        icon: TrendingUp,
        badge: 'Updated Today',
        badgeTone: 'brand'
      },
      {
        id: 'performance_profile',
        label: 'Verified Patient Reviews',
        desc: 'Council-verified feedback, star ratings and patient gratitude notes',
        icon: Star,
        badge: '4.9 ★ Rating',
        badgeTone: 'success'
      },
      {
        id: 'performance_profile',
        label: 'Clinical Earnings & Settlements',
        desc: 'Consultation fees, locum disbursements and statutory tax withholding receipts',
        icon: CreditCard,
        badge: 'FPX Direct',
        badgeTone: 'neutral'
      }
    ],
    sideCard: {
      badge: 'Public Directory',
      title: 'Your Public Doctor Profile',
      desc: 'Patients find and book teleconsultations based on your verified credentials and reviews.',
      actionLabel: 'View Public Profile →',
      targetId: 'performance_profile',
      icon: TrendingUp
    }
  },

  // =========================================================================
  // PHARMACY WORKSPACE SECTIONS
  // =========================================================================
  'pharmacy:pharmacy_dispensing': {
    navId: 'pharmacy_dispensing',
    role: 'pharmacy',
    title: 'Prescription Dispensing & Cold-Chain',
    tagline: 'Verified e-Rx Queue, Group B/C Poisons & Courier Dispatch',
    items: [
      {
        id: 'pharmacy_dispensing',
        label: 'Prescription Dispensing Queue',
        desc: 'Incoming verified digital doctor prescriptions awaiting pharmacotherapy review',
        icon: Inbox,
        badge: '8 Pending',
        badgeTone: 'brand'
      },
      {
        id: 'pharmacy_dispensing',
        label: 'Cold-Chain 2°C–8°C Logistics',
        desc: 'Temperature-monitored courier dispatch with tamper seals and delivery tracking',
        icon: Truck,
        badge: '2 In Transit',
        badgeTone: 'success'
      }
    ],
    sideCard: {
      badge: 'Poisons Act 1952',
      title: 'Digital Dispensing Register',
      desc: 'Every dispensed prescription is logged automatically in compliance with MOH pharmacy statutory audits.',
      actionLabel: 'Open Dispensing Station →',
      targetId: 'pharmacy_dispensing',
      icon: Pill
    }
  },

  'pharmacy:pharmacy_operations': {
    navId: 'pharmacy_operations',
    role: 'pharmacy',
    title: 'Dispensary Operations & Drug Inventory',
    tagline: 'Dangerous Drugs Logbook, Batch Stock & Pharmacist Roster',
    items: [
      {
        id: 'pharmacy_operations',
        label: 'Statutory Poisons Book',
        desc: 'MOH statutory inspection registers for controlled substances and poison sales',
        icon: FileText,
        badge: 'MOH Audit Ready',
        badgeTone: 'success'
      },
      {
        id: 'pharmacy_operations',
        label: 'Drug Stock & Cold Storage',
        desc: 'Inventory levels, batch tracking, expiry alerts and automated reordering',
        icon: Store,
        badge: '98% In Stock',
        badgeTone: 'neutral'
      }
    ],
    sideCard: {
      badge: 'Accredited Dispensary',
      title: 'Pharmacist-on-Duty',
      desc: 'Ensure active Type A licensed pharmacist is signed in during all dispensing operational hours.',
      actionLabel: 'Manage Operations →',
      targetId: 'pharmacy_operations',
      icon: Store
    }
  },

  // =========================================================================
  // FACILITY WORKSPACE SECTIONS
  // =========================================================================
  'facility:facility_staffing': {
    navId: 'facility_staffing',
    role: 'facility',
    title: 'Hospital Clinical Staffing & Shifts',
    tagline: 'Locum Doctors, Private Nurses & Department Duty Rosters',
    items: [
      {
        id: 'facility_staffing',
        label: 'Job Postings & Shift Vacancies',
        desc: 'Create and broadcast locum doctor and private nurse requirements across departments',
        icon: Calendar,
        badge: '6 Active Vacancies',
        badgeTone: 'brand'
      },
      {
        id: 'facility_staffing',
        label: 'Credentialed Practitioner Network',
        desc: 'Pre-vetted pool of licensed medical specialists and scrub nurses ready for duty',
        icon: Users,
        badge: 'Vetted',
        badgeTone: 'success'
      }
    ],
    sideCard: {
      badge: 'PHFMC Act 1998',
      title: 'Verified Clinical Staffing',
      desc: 'All applicants pass automated APC and indemnity verification before reporting for hospital duty.',
      actionLabel: 'Post New Hospital Shift →',
      targetId: 'facility_staffing',
      icon: Calendar
    }
  },

  'facility:facility_care': {
    navId: 'facility_care',
    role: 'facility',
    title: 'Patient Referrals & Hospital Packages',
    tagline: 'Inpatient Admissions, Specialist Referrals & Care Bundles',
    items: [
      {
        id: 'facility_care',
        label: 'Inpatient Admissions & Referrals',
        desc: 'Manage clinical transfers, incoming specialist referrals and guarantee letter authorizations',
        icon: FolderHeart,
        badge: '12 Active Cases',
        badgeTone: 'brand'
      },
      {
        id: 'facility_care',
        label: 'Hospital Packages & Surgery Quotas',
        desc: 'Published maternity, cardiovascular screening and orthopaedic treatment packages',
        icon: PackagePlus,
        badge: 'Published',
        badgeTone: 'neutral'
      }
    ],
    sideCard: {
      badge: 'Hospital Operations',
      title: 'Admissions Desk',
      desc: 'Coordinate bed reservations and specialist consultant assignments for incoming referrals.',
      actionLabel: 'View Active Referrals →',
      targetId: 'facility_care',
      icon: FolderHeart
    }
  },

  'facility:facility_profile': {
    navId: 'facility_profile',
    role: 'facility',
    title: 'Facility Infrastructure & Licensing',
    tagline: 'Ward Census, Bed Availability & MOH Private Facility Licence',
    items: [
      {
        id: 'facility_profile',
        label: 'Ward Census & Bed Occupancy',
        desc: 'Real-time bed census across general wards, HDU, CCU and emergency resuscitation bays',
        icon: Building2,
        badge: '88% Occupancy',
        badgeTone: 'urgent'
      },
      {
        id: 'facility_profile',
        label: 'PHFMC Licensing & Fire Safety',
        desc: 'Private Healthcare Facilities and Services Act compliance certificates and audits',
        icon: ShieldCheck,
        badge: 'Certified',
        badgeTone: 'success'
      }
    ],
    sideCard: {
      badge: 'Operations Control',
      title: 'Real-Time Bed Census',
      desc: 'Monitor acute care bed turnarounds and operating theatre schedules across all clinical units.',
      actionLabel: 'Inspect Facility Census →',
      targetId: 'facility_profile',
      icon: Building2
    }
  }
};

export interface WorkspaceMegaMenuProps {
  activeNavId: string | null;
  currentRole: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectSubItem: (navId: string, subItemId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function WorkspaceMegaMenu({
  activeNavId,
  currentRole,
  isOpen,
  onClose,
  onSelectSubItem,
  onMouseEnter,
  onMouseLeave,
}: WorkspaceMegaMenuProps) {
  const tx = useTr();

  if (!isOpen || !activeNavId) return null;

  // Key lookup: role:navId
  const menuKey = `${currentRole}:${activeNavId}`;
  const section = WORKSPACE_MEGAMENUS[menuKey];

  if (!section) return null;

  const getBadgeStyle = (tone?: 'brand' | 'success' | 'urgent' | 'neutral') => {
    switch (tone) {
      case 'success':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'urgent':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'brand':
        return 'bg-[color:var(--t-50)] text-[color:var(--t-800)] border-[color:var(--t-200)]';
      case 'neutral':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      role="menu"
      aria-label={tx('{title} Megamenu', { title: section.title })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 right-0 z-50 bg-white border-b-2 border-b-[color:var(--t-600)] shadow-[0_20px_35px_-5px_rgba(0,0,0,0.2),0_10px_15px_-5px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Megamenu Header Row */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-[color:var(--t-100)] gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] text-2xs font-extrabold uppercase tracking-widest font-mono">
              <Sparkles className="h-3 w-3 text-[color:var(--t-600)]" />
              {tx('Workspace Navigation Megamenu')}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-slate-600">
              {tx(section.tagline)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xs font-mono font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-800 px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer select-none"
          >
            {tx('Close (Esc)')}
          </button>
        </div>

        {/* Megamenu Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Grid: Sub-items corresponding to Banner Nav Menu items */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${section.sideCard ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSubItem(section.navId, item.id);
                    onClose();
                  }}
                  className="group flex items-start gap-3.5 p-3.5 text-left bg-white hover:bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all cursor-pointer shadow-2xs select-none relative"
                >
                  {/* Left Icon Container */}
                  <div className="w-10 h-10 shrink-0 bg-[color:var(--t-50)] group-hover:bg-[color:var(--t-600)] border border-[color:var(--t-200)] group-hover:border-[color:var(--t-700)] text-[color:var(--t-700)] group-hover:text-white flex items-center justify-center transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Text Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-display font-black text-sm text-[color:var(--ink)] group-hover:text-[color:var(--t-700)] transition-colors">
                        {tx(item.label)}
                      </span>
                      {item.badge && (
                        <span className={`text-2xs font-mono font-extrabold px-1.5 py-0.5 border ${getBadgeStyle(item.badgeTone)} shrink-0`}>
                          {tx(item.badge)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed group-hover:text-slate-700 transition-colors line-clamp-2">
                      {tx(item.desc)}
                    </p>
                  </div>

                  {/* Subtle Right Hover Indicator */}
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
                </button>
              );
            })}
          </div>

          {/* Right Column: Clinical Fast-Track / Highlight Card */}
          {section.sideCard && (
            <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-gradient-to-br from-[color:var(--t-50)] to-white border border-[color:var(--t-200)] relative overflow-hidden shadow-2xs">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-600)] text-white text-2xs font-extrabold uppercase tracking-wider font-mono">
                    <ShieldCheck className="h-3 w-3" />
                    {tx(section.sideCard.badge)}
                  </span>
                </div>
                <h4 className="font-display font-black text-base text-[color:var(--ink)] mb-1.5">
                  {tx(section.sideCard.title)}
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                  {tx(section.sideCard.desc)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectSubItem(section.navId, section.sideCard!.targetId);
                  onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs group"
              >
                <span>{tx(section.sideCard.actionLabel)}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
