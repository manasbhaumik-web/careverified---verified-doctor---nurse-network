import type React from 'react';
import {
  Activity,
  BookOpen,
  Building2,
  Calendar,
  CreditCard,
  FolderHeart,
  Globe,
  Heart,
  MessageSquare,
  PackagePlus,
  Pill,
  PlusCircle,
  Puzzle,
  Search,
  ShieldCheck,
  Stethoscope,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { ADMIN_SUB_ROLES, AdminSubRole, AppPackage } from '../types';

export type SessionRole = 'patient' | 'practitioner' | 'admin' | 'pharmacy' | 'facility';

export interface NavItemDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  isExtension?: boolean;
}

export interface RoleModuleDef extends NavItemDef {
  shortLabel: string;
  aliases: string[];
  adminGroup?: 'registry' | 'ops' | 'facilities' | 'growth';
  packageGate?: string;
}

export const ROLE_MODULES: Record<SessionRole, RoleModuleDef[]> = {
  patient: [
    {
      id: 'patient_care',
      name: 'My Care',
      shortLabel: 'My Care',
      icon: Heart,
      aliases: ['patient_care', 'patient_dashboard', 'appointments', 'consult', 'messages', 'saved'],
    },
    {
      id: 'patient_records',
      name: 'Health Records',
      shortLabel: 'Records',
      icon: FolderHeart,
      aliases: ['patient_records', 'records', 'prescriptions', 'certs', 'labs'],
    },
    {
      id: 'patient_discovery',
      name: 'Find Care',
      shortLabel: 'Directory',
      icon: Search,
      aliases: ['patient_discovery', 'registry', 'nurses', 'pharmacies', 'articles'],
    },
    {
      id: 'patient_services',
      name: 'Packages & Quotes',
      shortLabel: 'Services',
      icon: PackagePlus,
      aliases: ['patient_services', 'packages', 'assistance', 'tourism'],
    },
  ],
  practitioner: [
    {
      id: 'onboard',
      name: 'Patient Care',
      shortLabel: 'Clinical',
      icon: Stethoscope,
      aliases: ['onboard'],
      packageGate: 'onboard',
    },
    {
      id: 'recruitment',
      name: 'Shifts & Locums',
      shortLabel: 'Shifts',
      icon: Calendar,
      aliases: ['recruitment'],
      packageGate: 'recruitment',
    },
    {
      id: 'practice_compliance',
      name: 'Licensing & CPD',
      shortLabel: 'Practice',
      icon: ShieldCheck,
      aliases: ['practice_compliance'],
      packageGate: 'onboard',
    },
    {
      id: 'performance_profile',
      name: 'Earnings & Profile',
      shortLabel: 'Profile',
      icon: Wallet,
      aliases: ['performance_profile'],
      packageGate: 'onboard',
    },
    {
      id: 'articles',
      name: 'Medical Library',
      shortLabel: 'Library',
      icon: BookOpen,
      aliases: ['articles'],
      packageGate: 'articles',
    },
  ],
  facility: [
    {
      id: 'facility_staffing',
      name: 'Staffing & Shifts',
      shortLabel: 'Staffing',
      icon: Calendar,
      aliases: ['facility_staffing', 'facility_workspace', 'shifts', 'locums'],
    },
    {
      id: 'facility_care',
      name: 'Referrals & Packages',
      shortLabel: 'Referrals',
      icon: PackagePlus,
      aliases: ['facility_care', 'cases'],
    },
    {
      id: 'facility_profile',
      name: 'Facility Profile',
      shortLabel: 'Profile',
      icon: Building2,
      aliases: ['facility_profile', 'profile'],
    },
  ],
  pharmacy: [
    {
      id: 'pharmacy_dispensing',
      name: 'Dispensing',
      shortLabel: 'Dispensing',
      icon: Pill,
      aliases: ['pharmacy_dispensing', 'pharmacy_workspace', 'inbox', 'activity'],
    },
    {
      id: 'pharmacy_operations',
      name: 'Operations & Team',
      shortLabel: 'Operations',
      icon: Store,
      aliases: ['pharmacy_operations', 'reports', 'team'],
    },
  ],
  admin: [
    {
      id: 'admin_registry',
      name: 'Licensing & Registry',
      shortLabel: 'Registry',
      icon: ShieldCheck,
      aliases: ['admin_registry', 'admin', 'approvals', 'trust'],
      adminGroup: 'registry',
    },
    {
      id: 'admin_ops',
      name: 'Operations & Quality',
      shortLabel: 'Operations',
      icon: Activity,
      aliases: ['admin_ops', 'ops', 'quality', 'packages'],
      adminGroup: 'ops',
    },
    {
      id: 'admin_facilities',
      name: 'Facilities & Shifts',
      shortLabel: 'Facilities',
      icon: Building2,
      aliases: ['admin_facilities', 'facilities'],
      adminGroup: 'facilities',
    },
    {
      id: 'admin_growth',
      name: 'Global Care & Content',
      shortLabel: 'Growth',
      icon: Globe,
      aliases: ['admin_growth', 'tourism_desk', 'literature', 'seo'],
      adminGroup: 'growth',
    },
  ],
};

export const MOBILE_PRIORITY: Record<SessionRole, string[]> = {
  patient: ['patient_care', 'patient_records', 'patient_services', 'patient_discovery'],
  practitioner: ['onboard', 'recruitment', 'practice_compliance', 'performance_profile'],
  pharmacy: ['pharmacy_dispensing', 'pharmacy_operations'],
  facility: ['facility_staffing', 'facility_care', 'facility_profile'],
  admin: ['admin_registry', 'admin_ops', 'admin_facilities', 'admin_growth'],
};

export const SHORT_LABEL: Record<string, string> = {
  patient_care: 'My Care',
  patient_records: 'Records',
  patient_services: 'Services',
  patient_discovery: 'Directory',
  patient_dashboard: 'Home',
  consult: 'Consult',
  packages: 'Packages',
  assistance: 'Assistance',
  pharmacies: 'Pharmacy',
  messages: 'Mailbox',
  registry: 'Doctors',
  oncall: 'On Call',
  earnings: 'Earnings',
  onboard: 'Clinical',
  practice_compliance: 'Practice',
  performance_profile: 'Profile',
  recruitment: 'Shifts',
  admin: 'Admin',
  tourism_desk: 'Global Care',
  pharmacy_workspace: 'Workspace',
  facility_workspace: 'Facility',
  help: 'Help',
  articles: 'Library',
  tourism: 'Global Care',
  quality: 'Quality',
  seo: 'SEO',
  facility_staffing: 'Staffing',
  facility_care: 'Referrals',
  facility_profile: 'Profile',
  pharmacy_dispensing: 'Dispensing',
  pharmacy_operations: 'Operations',
  admin_registry: 'Registry',
  admin_ops: 'Operations',
  admin_facilities: 'Facilities',
  admin_growth: 'Growth',
};

export const STANDARD_MODULE_IDS = new Set([
  'patient_dashboard', 'patient_care', 'patient_records', 'patient_services', 'patient_discovery',
  'registry', 'nurses', 'recruitment', 'articles', 'onboard', 'practice_compliance',
  'performance_profile', 'messages', 'seo', 'admin', 'admin_registry', 'admin_ops',
  'admin_facilities', 'admin_growth', 'consult', 'oncall', 'earnings', 'quality', 'help',
  'facility_workspace', 'facility_staffing', 'facility_care', 'facility_profile',
  'pharmacy_workspace', 'pharmacy_dispensing', 'pharmacy_operations',
  'records', 'prescriptions', 'certs', 'labs', 'saved', 'pharmacies',
  'packages', 'assistance', 'tourism', 'tourism_desk', 'profile',
]);

function resolveExtensionIcon(iconName?: string) {
  switch (iconName) {
    case 'Activity': return Activity;
    case 'CreditCard': return CreditCard;
    case 'TrendingUp': return TrendingUp;
    case 'Heart': return Heart;
    case 'Search': return Search;
    case 'Calendar': return Calendar;
    case 'BookOpen': return BookOpen;
    case 'PlusCircle': return PlusCircle;
    case 'MessageSquare': return MessageSquare;
    case 'Globe': return Globe;
    default: return Puzzle;
  }
}

export function buildNavItems(
  role: SessionRole,
  opts: {
    adminSubRole: AdminSubRole;
    isPackageEnabled: (id: string) => boolean;
    packages: AppPackage[];
  }
): NavItemDef[] {
  const allowedAdmin = ADMIN_SUB_ROLES[opts.adminSubRole]?.allowedGroups || ['registry', 'ops', 'facilities', 'growth'];

  const base = (ROLE_MODULES[role] || [])
    .filter((mod) => {
      if (mod.packageGate && !opts.isPackageEnabled(mod.packageGate)) return false;
      if (role === 'admin' && mod.adminGroup && !allowedAdmin.includes(mod.adminGroup)) return false;
      return true;
    })
    .map(({ id, name, icon }) => ({ id, name, icon }));

  if (role === 'pharmacy' || role === 'facility') return base;

  const customPackages = opts.packages.filter(
    (p) => !(p as any).facility_id && !STANDARD_MODULE_IDS.has(p.id) && p.isEnabled
  );
  for (const p of customPackages) {
    base.push({
      id: p.id,
      name: p.name,
      icon: resolveExtensionIcon(p.icon),
      isExtension: true,
    } as NavItemDef);
  }
  return base;
}

export function isNavItemActive(itemId: string, currentView: string): boolean {
  if (currentView === itemId) return true;
  for (const roleList of Object.values(ROLE_MODULES)) {
    const found = roleList.find((m) => m.id === itemId);
    if (found) return found.aliases.includes(currentView);
  }
  return false;
}

export function getPatientGroup(view: string): 'care' | 'records' | 'services' | 'discovery' {
  if (['patient_records', 'records', 'prescriptions', 'certs', 'labs'].includes(view)) return 'records';
  if (['patient_services', 'packages', 'assistance', 'tourism'].includes(view)) return 'services';
  if (['patient_discovery', 'registry', 'nurses', 'pharmacies', 'articles'].includes(view)) return 'discovery';
  return 'care';
}

export function getPatientTab(view: string): any {
  if (
    [
      'appointments', 'consult', 'messages', 'saved', 'records', 'prescriptions',
      'certs', 'labs', 'packages', 'assistance', 'tourism', 'registry',
      'nurses', 'pharmacies', 'articles',
    ].includes(view)
  ) {
    return view;
  }
  return undefined;
}

export function getFacilityGroup(view: string): 'staffing' | 'care' | 'profile' {
  if (['facility_care', 'cases'].includes(view)) return 'care';
  if (['facility_profile', 'profile'].includes(view)) return 'profile';
  return 'staffing';
}

export function getPharmacyGroup(view: string): 'dispensing' | 'operations' {
  if (['pharmacy_operations', 'reports', 'team', 'profile'].includes(view)) return 'operations';
  return 'dispensing';
}

export function getAdminGroup(view: string): 'registry' | 'ops' | 'facilities' | 'growth' {
  if (['admin_ops', 'ops', 'quality', 'packages'].includes(view)) return 'ops';
  if (['admin_facilities', 'facilities', 'shifts'].includes(view)) return 'facilities';
  if (['admin_growth', 'tourism_desk', 'literature', 'seo'].includes(view)) return 'growth';
  return 'registry';
}
