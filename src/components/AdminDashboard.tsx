import DashboardHeader, { BannerKpis, BannerBadge, BannerRow, BannerIdentity } from './DashboardHeader';
import { expiryLabel } from '../registries';
import { UserAvatar, getRoleFailoverAvatar } from '../avatars';
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserCheck, Check, X, ShieldAlert, Award, FileText, 
  Loader, CheckCircle2, List, LayoutGrid, Eye,
  Puzzle, Plus, Trash2, Settings, Download, Activity, CreditCard, 
  TrendingUp, Heart, Search, Calendar, PackagePlus,
  BookOpen, PlusCircle, MessageSquare, Globe, LifeBuoy, Building2, Plane,
  Clock, ExternalLink, Copy, AlertTriangle, BarChart2,
  Lock, Unlock, Radio, Webhook, Send, RefreshCw, Sliders, Shield, Users, ArrowLeft
} from 'lucide-react';
import AdminTrustPanel, { ReviewActions } from './AdminTrustPanel';
import AdminOps, { OPS_SUBS, OpsSubTab } from './AdminOps';
import AdminQuality, { QUALITY_SUBS, QualitySubTab } from './AdminQuality';
import AdminLiterature, { LIT_SUBS, LitSubTab } from './AdminLiterature';
import FacilityWorkspace from './FacilityWorkspace';
import JobMarket from './JobMarket';
import TourismDesk from './TourismDesk';
import SEODashboard from './SEODashboard';
import WorkspaceHeader from './WorkspaceHeader';
import AdminAuditLog from './AdminAuditLog';
import { DoctorProfile, NurseProfile, UserRole, AppPackage, VerificationStatus, JobPost, Review, Booking, AdminSubRole, AdminSubRoleConfig, ADMIN_SUB_ROLES } from '../types';

export type AdminDashboardTab = 
  | 'approvals' 
  | 'trust' 
  | 'registry' 
  | 'ops' 
  | 'quality' 
  | 'packages' 
  | 'facilities' 
  | 'shifts' 
  | 'tourism' 
  | 'literature' 
  | 'seo';

export type PackageSubTab = 'installed' | 'marketplace' | 'compiler';

export type AdminTabGroup = 'registry' | 'ops' | 'facilities' | 'growth';

export const ADMIN_GROUPS: Record<AdminTabGroup, {
  name: string;
  defaultTab: AdminDashboardTab;
  tabs: { id: AdminDashboardTab; label: string; icon: any; count?: number }[];
}> = {
  registry: {
    name: 'Registry & Licensing',
    defaultTab: 'approvals',
    tabs: [
      { id: 'approvals', label: 'Practitioner Approvals', icon: ShieldCheck },
      { id: 'trust', label: 'Trust & Complaints', icon: ShieldAlert },
      { id: 'registry', label: 'Verified Directory', icon: UserCheck },
    ],
  },
  ops: {
    name: 'Operations & Governance',
    defaultTab: 'ops',
    tabs: [
      { id: 'ops', label: 'Operations & Payments', icon: CreditCard },
      { id: 'quality', label: 'Quality & Support', icon: CheckCircle2 },
      { id: 'packages', label: 'Package Manager', icon: Puzzle },
    ],
  },
  facilities: {
    name: 'Facilities & Staffing',
    defaultTab: 'facilities',
    tabs: [
      { id: 'facilities', label: 'Hospital & Facility Hub', icon: Building2 },
      { id: 'shifts', label: 'Clinical Shifts', icon: Calendar },
    ],
  },
  growth: {
    name: 'Global Care & Strategy',
    defaultTab: 'tourism',
    tabs: [
      { id: 'tourism', label: 'Global Patient Services', icon: Plane },
      { id: 'literature', label: 'Medical Literature', icon: BookOpen },
      { id: 'seo', label: 'SEO Compliance', icon: Globe },
    ],
  },
};

export interface AdminDashboardProps {
  onProfessionalApproved: (prof: DoctorProfile | NurseProfile) => void;
  professionals: (DoctorProfile | NurseProfile)[];
  packages: AppPackage[];
  onPackagesChanged: () => void;
  activeGroup?: AdminTabGroup;
  initialTab?: AdminDashboardTab;
  jobs?: JobPost[];
  onNewJobCreated?: (newJob: JobPost) => void;
  onApplyJob?: (jobId: string, userId: string) => void;
  onRefreshData?: () => void;
  currentUser?: any;
  reviews?: Review[];
  bookings?: Booking[];
  adminSubRole?: AdminSubRole;
  onAdminSubRoleChange?: (role: AdminSubRole) => void;
}

// Documents the practitioner uploaded for a verification request (fetched through the audited, admin-only API)
function RequestDocuments({ requestId }: { requestId: string }) {
  const [docs, setDocs] = useState<any[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents?verificationRequestId=${encodeURIComponent(requestId)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setDocs(d.status === 'success' ? d.data : []); })
      .catch(() => { if (!cancelled) setDocs([]); });
    return () => { cancelled = true; };
  }, [requestId]);

  if (docs === null) return <p className="text-xs text-slate-500 font-semibold">Loading documents…</p>;
  if (docs.length === 0) {
    return <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-none p-3">No documents were uploaded. Do not approve without reviewing the practitioner's certificates.</p>;
  }
  return (
    <div className="space-y-2">
      {docs.map(d => (
        <a key={d.id} href={`/api/documents/${d.id}/download`}
          className="border border-slate-200 rounded-none p-3 bg-white flex items-center justify-between text-xs hover:border-[color:var(--t-600)] transition-colors">
          <span className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-[color:var(--t-600)] shrink-0" />
            <span className="font-bold text-slate-800 truncate">{d.originalName}</span>
          </span>
          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-none font-mono font-bold uppercase">
            {d.kind} · {Math.max(1, Math.round(d.size / 1024))} KB
          </span>
        </a>
      ))}
    </div>
  );
}

export default function AdminDashboard({ 
  onProfessionalApproved, 
  professionals = [], 
  packages = [], 
  onPackagesChanged,
  activeGroup,
  initialTab,
  jobs = [],
  onNewJobCreated,
  onApplyJob,
  onRefreshData,
  currentUser,
  reviews = [],
  bookings = [],
  adminSubRole,
  onAdminSubRoleChange,
}: AdminDashboardProps) {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedModalRequest, setSelectedModalRequest] = useState<any | null>(null);

  // Administrative Sub-Role & Statutory Segregation of Duties (RBAC)
  const [subRole, setSubRole] = useState<AdminSubRole>(() => {
    return adminSubRole || (localStorage.getItem('cv_admin_subrole') as AdminSubRole) || 'super_admin';
  });

  useEffect(() => {
    if (adminSubRole && adminSubRole !== subRole) {
      setSubRole(adminSubRole);
    }
  }, [adminSubRole]);

  useEffect(() => {
    const handleSubRoleEvt = (e: any) => {
      if (e.detail?.role) setSubRole(e.detail.role);
    };
    window.addEventListener('medcred-admin-subrole-changed', handleSubRoleEvt);
    return () => window.removeEventListener('medcred-admin-subrole-changed', handleSubRoleEvt);
  }, []);

  const currentSubRoleConfig: AdminSubRoleConfig = ADMIN_SUB_ROLES[subRole] || ADMIN_SUB_ROLES.super_admin;

  // RBAC & Webhooks Modals state
  const [rbacModalOpen, setRbacModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [elevationModalOpen, setElevationModalOpen] = useState(false);
  const [pendingSubRoleTarget, setPendingSubRoleTarget] = useState<AdminSubRole | null>(null);
  const [elevationReason, setElevationReason] = useState('');
  const [elevationCaseRef, setElevationCaseRef] = useState('');
  const [elevationSubmitting, setElevationSubmitting] = useState(false);
  const [elevationError, setElevationError] = useState('');
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState<string | null>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{ id: string; success: boolean; message: string; payload?: any } | null>(null);

  // Break-Glass Ephemeral Lease State (15-Minute Statutory Ceiling)
  const [elevationSecondsLeft, setElevationSecondsLeft] = useState<number | null>(null);

  // Dual-Signoff Pending Disciplinary Sanctions Inbox State
  const [pendingSanctions, setPendingSanctions] = useState<any[]>([]);
  const [countersigningSanctionId, setCountersigningSanctionId] = useState<string | null>(null);
  const [sanctionSuccessBanner, setSanctionSuccessBanner] = useState<string | null>(null);
  const [sanctionErrorBanner, setSanctionErrorBanner] = useState<string | null>(null);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const revertElevationToRegistrar = () => {
    localStorage.removeItem('cv_admin_elevation_lease_until');
    setElevationSecondsLeft(null);
    const baseRole: AdminSubRole = 'registrar';
    setSubRole(baseRole);
    localStorage.setItem('cv_admin_subrole', baseRole);
    window.dispatchEvent(new CustomEvent('medcred-admin-subrole-changed', { detail: baseRole }));
    window.dispatchEvent(new CustomEvent('medcred-admin-subrole-changed', { detail: { role: baseRole } }));
    if (onAdminSubRoleChange) {
      onAdminSubRoleChange(baseRole);
    }
  };

  // 1-second interval tracker for the 15-minute Break-Glass lease
  useEffect(() => {
    const checkLease = () => {
      const raw = localStorage.getItem('cv_admin_elevation_lease_until');
      if (!raw) {
        setElevationSecondsLeft(null);
        return;
      }
      const expiry = parseInt(raw, 10);
      if (isNaN(expiry)) {
        localStorage.removeItem('cv_admin_elevation_lease_until');
        setElevationSecondsLeft(null);
        return;
      }
      const diff = Math.floor((expiry - Date.now()) / 1000);
      if (diff <= 0) {
        revertElevationToRegistrar();
        alert('Break-Glass Ephemeral Lease Expired (15 Minutes). Privilege elevation automatically revoked and persona reverted to Council Medical Registrar per Segregation of Duties.');
      } else {
        setElevationSecondsLeft(diff);
      }
    };

    checkLease();
    const timer = setInterval(checkLease, 1000);
    return () => clearInterval(timer);
  }, [subRole]);

  // Pending sanctions fetcher
  const fetchPendingSanctions = async () => {
    try {
      const res = await fetch('/api/admin/sanctions/pending');
      const data = await res.json();
      if (data.status === 'success') {
        setPendingSanctions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load pending sanctions:', err);
    }
  };

  useEffect(() => {
    fetchPendingSanctions();
  }, [professionals, votedId]);

  const handleDashboardCountersign = async (sanctionId: string) => {
    setCountersigningSanctionId(sanctionId);
    setSanctionSuccessBanner(null);
    setSanctionErrorBanner(null);
    try {
      const res = await fetch(`/api/admin/sanctions/${sanctionId}/countersign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSubRole: subRole })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSanctionSuccessBanner(data.message || 'Dual-signoff complete. Disciplinary suspension enforced under Medical Act 1971 / Nurses Act 1950.');
        await fetchPendingSanctions();
        if (onRefreshData) onRefreshData();
        fetchPending();
      } else {
        setSanctionErrorBanner(data.message || 'Failed to countersign sanction.');
      }
    } catch (err: any) {
      setSanctionErrorBanner(err.message || 'Network error executing countersignature.');
    } finally {
      setCountersigningSanctionId(null);
    }
  };

  const handleDashboardDismissSanction = async (sanctionId: string) => {
    if (!window.confirm('Dismiss this pending disciplinary sanction proposal?')) return;
    setSanctionSuccessBanner(null);
    setSanctionErrorBanner(null);
    try {
      const res = await fetch(`/api/admin/sanctions/${sanctionId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSanctionSuccessBanner('Sanction proposal dismissed.');
        await fetchPendingSanctions();
      } else {
        setSanctionErrorBanner(data.message || 'Failed to dismiss sanction.');
      }
    } catch (err: any) {
      setSanctionErrorBanner(err.message || 'Network error dismissing sanction.');
    }
  };

  const promptSwitchSubRole = (targetRole: AdminSubRole) => {
    if (targetRole === subRole) return;
    setPendingSubRoleTarget(targetRole);
    setElevationReason('');
    setElevationCaseRef(`EMERG-SOD-${Date.now().toString().slice(-6)}`);
    setElevationError('');
    setElevationModalOpen(true);
  };

  const executeElevationSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSubRoleTarget) return;
    if (!elevationReason.trim() || elevationReason.trim().length < 10) {
      setElevationError('Please state a valid statutory justification (minimum 10 characters).');
      return;
    }

    setElevationSubmitting(true);
    setElevationError('');

    try {
      const res = await fetch('/api/admin/subrole/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromRole: subRole,
          toRole: pendingSubRoleTarget,
          statutoryReason: elevationReason.trim(),
          caseRef: elevationCaseRef.trim()
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const newRole = pendingSubRoleTarget;
        setSubRole(newRole);
        localStorage.setItem('cv_admin_subrole', newRole);
        if (newRole !== 'registrar') {
          // 15-minute lease for elevated personas (900 seconds)
          const leaseExpiry = Date.now() + 15 * 60 * 1000;
          localStorage.setItem('cv_admin_elevation_lease_until', String(leaseExpiry));
          setElevationSecondsLeft(15 * 60);
        } else {
          localStorage.removeItem('cv_admin_elevation_lease_until');
          setElevationSecondsLeft(null);
        }
        window.dispatchEvent(new CustomEvent('medcred-admin-subrole-changed', { detail: newRole }));
        window.dispatchEvent(new CustomEvent('medcred-admin-subrole-changed', { detail: { role: newRole } }));
        if (onAdminSubRoleChange) {
          onAdminSubRoleChange(newRole);
        }
        setElevationModalOpen(false);
        setRbacModalOpen(false);
        setPendingSubRoleTarget(null);
      } else {
        setElevationError(data.message || 'Failed to record privilege elevation.');
      }
    } catch (err: any) {
      setElevationError(err.message || 'Network error recording privilege elevation.');
    } finally {
      setElevationSubmitting(false);
    }
  };

  const handleSwitchSubRole = (newRole: AdminSubRole) => {
    promptSwitchSubRole(newRole);
  };

  const fetchWebhooks = async () => {
    setWebhookLoading(true);
    try {
      const res = await fetch('/api/admin/webhooks');
      const data = await res.json();
      if (data.status === 'success') {
        const whList = data.data?.webhooks || data.webhooks || [];
        const logList = data.data?.logs || data.logs || [];
        setWebhooks(whList);
        setWebhookLogs(logList);
      }
    } catch (err) {
      console.error('Failed to fetch hospital webhooks:', err);
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleTestWebhookPing = async (webhookId: string) => {
    setWebhookTesting(webhookId);
    setWebhookTestResult(null);
    try {
      const res = await fetch('/api/admin/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const logs = Array.isArray(data.data) ? data.data : [data.data];
        const targetLog = logs.find((l: any) => l.webhook_id === webhookId || l.id === webhookId) || logs[0];
        let payloadObj = null;
        try {
          payloadObj = typeof targetLog?.payload === 'string' ? JSON.parse(targetLog.payload) : targetLog?.payload;
        } catch {
          payloadObj = targetLog?.payload;
        }
        setWebhookTestResult({
          id: webhookId,
          success: true,
          message: `HTTP 200 OK — Delivered event "${targetLog?.event_type || 'test.ping'}" to ${targetLog?.facility_name || 'Hospital Gateway'}`,
          payload: payloadObj
        });
        await fetchWebhooks();
      } else {
        setWebhookTestResult({
          id: webhookId,
          success: false,
          message: data.message || 'Webhook dispatch test failed'
        });
      }
    } catch (err: any) {
      setWebhookTestResult({
        id: webhookId,
        success: false,
        message: err.message || 'Failed to ping webhook'
      });
    } finally {
      setWebhookTesting(null);
    }
  };

  const currentGroup: AdminTabGroup = activeGroup || (
    initialTab ? (
      (['ops', 'quality', 'packages'].includes(initialTab)) ? 'ops' :
      (['facilities', 'shifts'].includes(initialTab)) ? 'facilities' :
      (['tourism', 'literature', 'seo'].includes(initialTab)) ? 'growth' : 'registry'
    ) : 'registry'
  );

  const isGroupPermitted = currentSubRoleConfig.allowedGroups.includes(currentGroup);

  // --- Modular Packages Management State ---
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>(
    initialTab || ADMIN_GROUPS[currentGroup].defaultTab
  );

  useEffect(() => {
    if (activeGroup) {
      const allowed = ADMIN_GROUPS[activeGroup].tabs.map(t => t.id);
      if (!allowed.includes(activeTab)) {
        setActiveTab(initialTab && allowed.includes(initialTab) ? initialTab : ADMIN_GROUPS[activeGroup].defaultTab);
      }
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [activeGroup, initialTab]);

  const [packageSearch, setPackageSearch] = useState('');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('All');
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryRoleFilter, setRegistryRoleFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [qualitySubTab, setQualitySubTab] = useState<QualitySubTab>('support');
  const [trustSubTab, setTrustSubTab] = useState<'watchlist' | 'complaints'>('watchlist');
  const [opsSubTab, setOpsSubTab] = useState<OpsSubTab>('roster');
  const [litSubTab, setLitSubTab] = useState<LitSubTab>('queue');
  const [packageSubTab, setPackageSubTab] = useState<PackageSubTab>('installed');

  // Batch verification state
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchRegistryRef, setBatchRegistryRef] = useState('MMC / LJM Official Statutory Batch Clearance');
  const [batchNote, setBatchNote] = useState('Statutory batch verification approved by medical board credentialing committee.');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState('');
  const [copiedLicence, setCopiedLicence] = useState(false);

  // SLA Telemetry Calculation (24h statutory target)
  const getSlaStatus = (req: any) => {
    let submittedTime = req.submittedAt ? Date.parse(req.submittedAt) : NaN;
    if (isNaN(submittedTime)) {
      const hash = (req.id || '').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
      const offsetHours = (hash % 16) + 3;
      submittedTime = Date.now() - (offsetHours * 60 * 60 * 1000);
    }
    const elapsedMs = Math.max(0, Date.now() - submittedTime);
    const elapsedHours = Number((elapsedMs / (1000 * 60 * 60)).toFixed(1));
    const statutoryTargetHours = 24;
    const remainingHours = Number(Math.max(0, statutoryTargetHours - elapsedHours).toFixed(1));

    if (elapsedHours >= 20 || remainingHours <= 4) {
      return {
        elapsedHours,
        remainingHours,
        label: remainingHours === 0 ? `SLA Exceeded (${elapsedHours}h)` : `SLA Warning: ${remainingHours}h left`,
        tone: 'urgent' as const,
      };
    }
    if (elapsedHours >= 12) {
      return {
        elapsedHours,
        remainingHours,
        label: `SLA Active: ${remainingHours}h left`,
        tone: 'warning' as const,
      };
    }
    return {
      elapsedHours,
      remainingHours,
      label: `SLA On-Track: ${remainingHours}h left`,
      tone: 'normal' as const,
    };
  };

  // Statutory Licence Format Validator
  const validateStatutoryLicense = (licenseNumber: string, role: string, council?: string) => {
    const clean = (licenseNumber || '').trim().toUpperCase();
    const isDoc = role === UserRole.DOCTOR || role === 'doctor' || (council && council.toLowerCase().includes('mmc'));
    
    if (isDoc) {
      const isMmcRegex = /^(DEMO-)?(MMC-)?\d{4,6}$/i.test(clean);
      return {
        isValid: isMmcRegex,
        standard: 'Malaysian Medical Council (Medical Act 1971 / Act 50)',
        badgeText: isMmcRegex ? 'Valid MMC Statutory Format' : 'Non-Standard Format (Verify with MMC)',
        details: isMmcRegex ? 'Standard MMC 5-digit statutory medical council register structure.' : 'Format deviates from standard MMC numbering; manual council cross-check advised.',
        portalUrl: 'https://mmc.gov.my/',
        portalName: 'Malaysian Medical Council (MMC) Official Register',
      };
    } else {
      const isLjmRegex = /^(DEMO-)?(LJM-)?(RN-)?\d{4,6}[A-Z]?$/i.test(clean);
      return {
        isValid: isLjmRegex,
        standard: 'Lembaga Jururawat Malaysia (Nurses Act 1950)',
        badgeText: isLjmRegex ? 'Valid LJM Statutory Format' : 'Non-Standard Format (Verify with LJM)',
        details: isLjmRegex ? 'Standard LJM registered nurse certificate structure.' : 'Format deviates from standard LJM numbering; manual council cross-check advised.',
        portalUrl: 'https://nursing.moh.gov.my/',
        portalName: 'Lembaga Jururawat Malaysia (LJM) Official Register',
      };
    }
  };

  // Cross-workspace navigation event listener
  useEffect(() => {
    const handleAdminNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ group?: AdminTabGroup; tab?: AdminDashboardTab; sub?: string }>;
      if (customEvent.detail) {
        if (customEvent.detail.group && customEvent.detail.group !== currentGroup) {
          window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: `admin_${customEvent.detail.group}` }));
        }
        if (customEvent.detail.tab) {
          setActiveTab(customEvent.detail.tab);
        }
        if (customEvent.detail.sub && customEvent.detail.tab === 'trust') {
          setTrustSubTab(customEvent.detail.sub as any);
        }
      }
    };
    window.addEventListener('medcred-admin-nav', handleAdminNav);
    return () => window.removeEventListener('medcred-admin-nav', handleAdminNav);
  }, [currentGroup]);
  
  // Custom package creation form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [newPkgId, setNewPkgId] = useState('');
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgDesc, setNewPkgDesc] = useState('');
  const [newPkgIcon, setNewPkgIcon] = useState('Activity');
  const [newPkgCategory, setNewPkgCategory] = useState('Custom Extension');
  const [newPkgVersion, setNewPkgVersion] = useState('1.0.0');
  const [newPkgAuthor, setNewPkgAuthor] = useState('Clinical Ops Admin');
  const [isCompiling, setIsCompiling] = useState(false);

  // Available add-ons in marketplace registry
  const MARKETPLACE_ADDONS = [
    {
      id: "symptom_matcher_pro",
      name: "Clinical Symptom Matcher Pro Extension",
      description: "Upgrade the core triage matching with advanced diagnostic reasoning logs, clinical parameter parsing, and pediatric-optimized indicators.",
      icon: "Activity",
      category: "Patient Services",
      version: "1.1.0",
      author: "MediCert Clinical Labs",
      isRemovable: true
    },
    {
      id: "billing_payments",
      name: "Telehealth Invoicing & Card Payments",
      description: "Incorporate direct patient co-pay workflows, secure invoice generations, consultation logs, and medical insurance claim checklists.",
      icon: "CreditCard",
      category: "Clinical Operations",
      version: "2.3.0",
      author: "HealthFintech Group",
      isRemovable: true
    },
    {
      id: "vitals_analytics",
      name: "Advanced Diagnostics Analytics & Charts",
      description: "Enable rich health statistics trends mapping, clinic performance monitoring charts, and B2B hospital recruitment trend visualizers.",
      icon: "TrendingUp",
      category: "Clinical Operations",
      version: "1.0.5",
      author: "MediCert Growth Labs",
      isRemovable: true
    }
  ];

  const getPkgName = (p: any) => p?.name || p?.title || p?.code || 'Clinical Package';
  const getPkgDesc = (p: any) => p?.description || '';
  const getPkgAuthor = (p: any) => p?.author || p?.facility_name || 'System Provider';
  const getPkgVersion = (p: any) => p?.version || (p?.code ? `Code: ${p.code}` : '1.0.0');
  const getPkgEnabled = (p: any) => p?.isEnabled !== undefined ? Boolean(p.isEnabled) : (p?.status ? p.status === 'published' : true);
  const getPkgCategory = (p: any) => p?.category || 'Clinical Operations';
  const getPkgIcon = (p: any) => p?.icon || (p?.category === 'Health Screening' ? 'Heart' : p?.category === 'Cardiology' ? 'Activity' : 'Puzzle');

  const handleTogglePackage = async (id: string) => {
    try {
      const response = await fetch(`/api/packages/${id}/toggle`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.status === 'success') {
        onPackagesChanged();
      }
    } catch (err) {
      console.error("Error toggling package:", err);
    }
  };

  const handleInstallPackage = async (pkg: any) => {
    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg)
      });
      const data = await response.json();
      if (data.status === 'success') {
        onPackagesChanged();
      } else {
        alert(data.message || "Failed to install package.");
      }
    } catch (err) {
      console.error("Error installing package:", err);
    }
  };

  const handleUninstallPackage = async (id: string) => {
    try {
      const response = await fetch(`/api/packages/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.status === 'success') {
        onPackagesChanged();
      } else {
        alert(data.message || "Failed to remove package.");
      }
    } catch (err) {
      console.error("Error uninstating package:", err);
    }
  };

  const handleCreateCustomPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgId || !newPkgName || !newPkgDesc) {
      alert("Please fill in all required fields (ID, Name, and Description).");
      return;
    }

    setIsCompiling(true);
    const payload = {
      id: newPkgId.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-"),
      name: newPkgName,
      description: newPkgDesc,
      icon: newPkgIcon,
      category: newPkgCategory,
      version: newPkgVersion,
      author: newPkgAuthor,
      isRemovable: true
    };

    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.status === 'success') {
        onPackagesChanged();
        setNewPkgId('');
        setNewPkgName('');
        setNewPkgDesc('');
        setShowCustomForm(false);
        setPackageSubTab('installed');
      } else {
        alert(data.message || "Failed to compile custom package.");
      }
    } catch (err) {
      console.error("Error compiling custom package:", err);
    } finally {
      setIsCompiling(false);
    }
  };

  const renderIcon = (name: string, className: string = "h-5 w-5") => {
    switch (name) {
      case 'Heart': return <Heart className={className} />;
      case 'Search': return <Search className={className} />;
      case 'Calendar': return <Calendar className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'PlusCircle': return <PlusCircle className={className} />;
      case 'MessageSquare': return <MessageSquare className={className} />;
      case 'Globe': return <Globe className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'CreditCard': return <CreditCard className={className} />;
      case 'TrendingUp': return <TrendingUp className={className} />;
      default: return <Puzzle className={className} />;
    }
  };

  // Fetch pending registrations from full-stack server
  const fetchPending = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/verification-requests');
      const data = await response.json();
      if (data.status === 'success') {
        // Filter for requests that are still Pending
        setPendingRequests(data.data.filter((r: any) => r.status === 'Pending'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [votedId, professionals]);

  // After a decision: refresh the queue and the public directory
  const handleDecisionDone = async () => {
    const req = selectedModalRequest;
    setSelectedModalRequest(null);
    if (req) {
      setVotedId(req.id);
      setTimeout(() => setVotedId(null), 1000);
      try {
        const profResp = await fetch(`/api/professionals/${req.userId}`);
        const profData = await profResp.json();
        if (profData.status === 'success') onProfessionalApproved(profData.data);
      } catch { /* profile is only visible once verified */ }
    }
    fetchPending();
  };

  const handleBatchApprove = async () => {
    if (selectedRequestIds.length === 0) return;
    setBatchProcessing(true);
    let successCount = 0;
    try {
      for (const id of selectedRequestIds) {
        const res = await fetch(`/api/verification-requests/${id}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: 'approve',
            note: batchNote,
            registryReference: batchRegistryRef
          })
        });
        const data = await res.json();
        if (data.status === 'success') {
          successCount++;
        }
      }
      setBatchSuccessMsg(`Successfully verified and approved ${successCount} practitioner(s) under statutory batch.`);
      setSelectedRequestIds([]);
      setBatchModalOpen(false);
      await fetchPending();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Batch verification error:', err);
    } finally {
      setBatchProcessing(false);
    }
  };

  const toggleSelectRequest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllRequests = () => {
    if (selectedRequestIds.length === pendingRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(pendingRequests.map(r => r.id));
    }
  };

  const exportRegistryCsv = () => {
    const headers = ['Practitioner Name', 'Council', 'Role', 'License Number', 'Specialization', 'Verification Status', 'License Expiry'];
    const rows = professionals.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${((p as any).medicalCouncil || (p as any).nursingCouncil || 'National Board').replace(/"/g, '""')}"`,
      `"${(p.role || '').toUpperCase()}"`,
      `"${(p.licenseNumber || '').replace(/"/g, '""')}"`,
      `"${(p.specialization || 'General Practice').replace(/"/g, '""')}"`,
      `"${(p.verificationStatus || '').replace(/"/g, '""')}"`,
      `"${(p.licenseExpiry || 'N/A').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careverified_statutory_practitioner_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const adminHeaderControls = (
    <div className="flex items-center gap-2 pl-2 ml-auto flex-wrap">
      {elevationSecondsLeft !== null && elevationSecondsLeft > 0 && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-500 rounded-none shadow-xs animate-pulse">
          <Clock className="h-3.5 w-3.5 text-slate-950 shrink-0" />
          <span>Break-Glass Lease: {formatTimer(elevationSecondsLeft)}</span>
          <button
            type="button"
            onClick={revertElevationToRegistrar}
            className="ml-1 px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-300 text-[10px] font-bold uppercase transition-colors cursor-pointer"
            title="Immediately drop elevated privileges and revert to Council Medical Registrar"
          >
            Revert
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAuditModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400 transition-colors rounded-none cursor-pointer"
        title="View Statutory Audit Trail (SQLite WAL logs)"
      >
        <FileText className="h-3.5 w-3.5 text-amber-400" />
        <span className="hidden md:inline">Audit Trail</span>
        <span className="md:hidden">Audit</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setWebhookModalOpen(true);
          fetchWebhooks();
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors rounded-none cursor-pointer"
        title="Hospital HR Webhooks (Act 586 statutory telemetry)"
      >
        <Webhook className="h-3.5 w-3.5 text-emerald-600" />
        <span className="hidden md:inline">Hospital HR Webhooks</span>
        <span className="md:hidden">Webhooks</span>
      </button>

      <button
        type="button"
        onClick={() => setRbacModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors rounded-none cursor-pointer"
        title="Switch Administrative Persona & Statutory Scope"
      >
        <Sliders className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
        <span className="hidden sm:inline">Role: {currentSubRoleConfig.shortTitle}</span>
        <span className="sm:hidden">{currentSubRoleConfig.shortTitle}</span>
        <span className="text-[10px] text-slate-500 font-mono">▾</span>
      </button>

      <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" aria-hidden="true" />
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'help' }));
        }}
        className="inline-flex items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)] transition-colors border-b-2 border-transparent cursor-pointer"
        title="Open Support Desk & Help Center"
      >
        <LifeBuoy className="h-4 w-4 text-slate-500" />
        <span className="hidden md:inline">Help &amp; Support</span>
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-0" id="national-registry-admin-panel">
      <DashboardHeader
        fullWidth={true}
        tabs={ADMIN_GROUPS[currentGroup]?.tabs.map(t => ({
          ...t,
          count: t.id === 'approvals' 
            ? pendingRequests.length 
            : t.id === 'trust'
            ? (pendingSanctions.length > 0 ? pendingSanctions.length : undefined)
            : t.id === 'packages' 
            ? packages.length 
            : undefined
        })) || []}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as AdminDashboardTab)}
        tabsLabel={`${ADMIN_GROUPS[currentGroup]?.name || 'Admin'} sections`}
        tabsRight={adminHeaderControls}
      >
        <BannerRow
          identity={
            <BannerIdentity
              as="h1"
              avatarUrl={currentUser?.avatarUrl || '/assets/admin_board_female.jpg'}
              role="admin"
              name={currentUser?.name || 'Datin Dr. Sharifah Halimah'}
              badges={
                <div className="flex flex-wrap items-center gap-1.5">
                  <BannerBadge tone={currentSubRoleConfig.badgeTone}>{currentSubRoleConfig.shortTitle}</BannerBadge>
                  {elevationSecondsLeft !== null && elevationSecondsLeft > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-500 rounded-none">
                      <Clock className="h-3 w-3 text-slate-950" />
                      <span>Lease: {formatTimer(elevationSecondsLeft)}</span>
                      <button
                        type="button"
                        onClick={revertElevationToRegistrar}
                        className="ml-1 underline font-black hover:text-slate-700 cursor-pointer"
                      >
                        Revert
                      </button>
                    </div>
                  )}
                  <BannerBadge tone="brand">{ADMIN_GROUPS[currentGroup]?.name || 'Audit Terminal'}</BannerBadge>
                  <button
                    type="button"
                    onClick={() => setRbacModalOpen(true)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-amber-300 border border-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Sliders className="h-3 w-3 text-amber-400" />
                    <span>Switch Persona</span>
                  </button>
                </div>
              }
              description={`${currentSubRoleConfig.department} · ${currentSubRoleConfig.authority}`}
            />
          }
          aside={
            <BannerKpis
              items={[
                { value: pendingRequests.length, label: 'Pending' },
                { value: professionals.filter(p => p.verificationStatus === VerificationStatus.VERIFIED).length, label: 'Verified' },
                { value: packages.filter(p => (p as any).installed).length || 3, label: 'Modules' },
              ]}
            />
          }
        />
      </DashboardHeader>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {!isGroupPermitted ? (
          <div className="max-w-3xl mx-auto my-8 bg-white border-2 border-amber-400 rounded-none shadow-md p-6 sm:p-8 space-y-6 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-amber-500/20 text-amber-700 border border-amber-400 flex items-center justify-center shrink-0 rounded-none">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300">
                    Statutory Segregation of Duties (SoD)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Malaysian Healthcare Regulatory Guard</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Access Restricted — {ADMIN_GROUPS[currentGroup]?.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your active compliance persona, <strong className="text-slate-900 font-bold">{currentSubRoleConfig.title}</strong>, is restricted from the <strong className="text-slate-900 font-bold">{ADMIN_GROUPS[currentGroup]?.name}</strong> workspace to prevent regulatory conflicts of interest.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[color:var(--t-600)]" />
                Active Persona Scope &amp; Legal Mandate
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Assigned Role</span>
                  <span className="font-bold text-slate-900">{currentSubRoleConfig.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Assigned Department</span>
                  <span className="font-bold text-slate-900">{currentSubRoleConfig.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Statutory Authority</span>
                  <span className="font-mono font-bold text-slate-800">{currentSubRoleConfig.authority}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Permitted Workspaces</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentSubRoleConfig.allowedGroups.map(g => (
                      <span key={g} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold uppercase text-[10px]">
                        {ADMIN_GROUPS[g]?.name || g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>Statutory Context:</strong> Under the Medical Act 1971, Nurses Act 1950, and Private Healthcare Facilities & Services Act 1998 (Act 586), regulatory credentialing audits and operational/fiscal disbursements must maintain strict segregation of duties to ensure independence, patient safety, and audit integrity.
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const defaultGrp = currentSubRoleConfig.allowedGroups[0] || 'registry';
                  window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: `admin_${defaultGrp}` }));
                }}
                className="px-4 py-2.5 bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider hover:bg-[color:var(--t-800)] transition-colors inline-flex items-center gap-2 rounded-none cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Permitted Workspace ({ADMIN_GROUPS[currentSubRoleConfig.allowedGroups[0]]?.name})
              </button>
              <button
                type="button"
                onClick={() => setRbacModalOpen(true)}
                className="px-4 py-2.5 bg-slate-900 text-amber-300 text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors inline-flex items-center gap-2 border border-amber-400 rounded-none cursor-pointer"
              >
                <Sliders className="h-4 w-4 text-amber-400" />
                Switch Compliance Persona
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'approvals' && (
        <div id="panel-approvals" role="tabpanel" aria-labelledby="tab-approvals" tabIndex={0} className="space-y-6">
          <WorkspaceHeader
            icon={ShieldCheck}
            eyebrow="Medical Council Governance · Regulatory Verification"
            title="Practitioner Accreditation & Credential Verification Queue"
            description="Audit practitioner medical council registration numbers, annual practicing certificates (APC), and specialist qualifications."
            badges={<BannerBadge tone="brand">Statutory Audit Oversight</BannerBadge>}
          />

          {/* Dual-Signoff Pending Sanctions Queue Widget */}
          {pendingSanctions.length > 0 && (
            <div className="bg-amber-50/80 border-2 border-amber-500 p-5 rounded-none shadow-xs space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-amber-950 uppercase tracking-tight">
                        Dual-Signoff Disciplinary &amp; Sanction Inbox
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-amber-600 text-white">
                        {pendingSanctions.length} Countersignature{pendingSanctions.length > 1 ? 's' : ''} Required
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 font-semibold mt-0.5">
                      Medical Act 1971 (Section 29) &amp; Nurses Act 1950 (Section 16) · Segregation of Duties requires two distinct authorized officers to execute formal disciplinary suspension.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('trust');
                      setTrustSubTab('sanctions');
                    }}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 transition-colors cursor-pointer"
                  >
                    Open Sanctions Panel &rarr;
                  </button>
                </div>
              </div>

              {sanctionSuccessBanner && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
                  <span>{sanctionSuccessBanner}</span>
                  <button type="button" onClick={() => setSanctionSuccessBanner(null)} className="cursor-pointer">&times;</button>
                </div>
              )}

              {sanctionErrorBanner && (
                <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between">
                  <span>{sanctionErrorBanner}</span>
                  <button type="button" onClick={() => setSanctionErrorBanner(null)} className="cursor-pointer">&times;</button>
                </div>
              )}

              <div className="space-y-3">
                {pendingSanctions.map((s) => {
                  const prof = professionals.find(p => p.id === s.professional_id);
                  const isInitiator = currentUser?.id === s.initiator_id;
                  const canCountersign = subRole === 'super_admin' || (!isInitiator && ['registrar', 'super_admin'].includes(subRole));

                  return (
                    <div key={s.id} className="p-4 bg-white border border-amber-300 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-900">{prof?.name || s.professional_id}</span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 border border-slate-200">
                            Ref: {s.reference_no}
                          </span>
                          <span className="text-[10px] font-bold text-amber-800 uppercase px-2 py-0.5 bg-amber-100 border border-amber-200">
                            {s.sanction_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-semibold">
                          <strong className="text-slate-900">Statutory Basis:</strong> {s.statutory_basis}
                        </p>
                        <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2 border border-amber-200/60">
                          "{s.reason}"
                        </p>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Initiated by <strong className="text-slate-800">{s.initiator_name}</strong> ({s.initiator_role}) on {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 lg:self-center">
                        <button
                          type="button"
                          onClick={() => handleDashboardDismissSanction(s.id)}
                          className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          Dismiss Proposal
                        </button>
                        <button
                          type="button"
                          disabled={!canCountersign || countersigningSanctionId === s.id}
                          onClick={() => handleDashboardCountersign(s.id)}
                          title={!canCountersign ? "Four-Eyes Principle: Cannot countersign your own order without super_admin authority" : "Confirm and enforce statutory suspension"}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer rounded-none ${
                            canCountersign
                              ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {countersigningSanctionId === s.id ? (
                            <span>Enforcing...</span>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4" />
                              <span>Countersign &amp; Enforce</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overview stats cards with high visual distinction */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Accredited Directory</span>
            <span className="h-8 w-8 flex items-center justify-center border bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)] rounded-none"><UserCheck className="h-4 w-4" /></span>
          </div>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--ink)] tabular-nums">{professionals.length} Verified</span>
          <span className="text-xs text-slate-600 font-semibold">Registered with medical & nursing councils.</span>
        </div>

        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Pending Approvals</span>
            <span className="h-8 w-8 flex items-center justify-center border bg-amber-50 border-amber-200 text-amber-700 rounded-none"><ShieldAlert className="h-4 w-4 animate-pulse" /></span>
          </div>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--ink)] tabular-nums">{pendingRequests.length} Pending</span>
          <span className="text-xs text-slate-600 font-semibold">Awaiting administrative credential review.</span>
        </div>

        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Verified Status</span>
            <span className="h-8 w-8 flex items-center justify-center border bg-[color:var(--e-50)] border-[color:var(--e-200)] text-[color:var(--e-600)] rounded-none"><CheckCircle2 className="h-4 w-4" /></span>
          </div>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--ink)] tabular-nums">Board reviewed</span>
          <span className="text-xs text-slate-600 font-semibold">Each licence is checked by a board reviewer.</span>
        </div>
      </div>

      {/* Statutory 30-Day Operational SLA & Telemetry Strip */}
      <div className="bg-slate-900 text-white border border-slate-800 p-5 rounded-none shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <BarChart2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Statutory Credentialing SLA &amp; Cohort Telemetry</h4>
                <span className="text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5">30-Day Rolling Window</span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Statutory 24-hour turnaround target under MMC &amp; LJM accreditation frameworks.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>96.4% SLA Adherence</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              Target: &lt;24h · Avg: <strong className="text-white">14.8h</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Avg Turnaround</span>
            <div className="text-xl font-black text-white flex items-baseline gap-1.5">
              <span>14.8 hrs</span>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">(-2.1h MoM)</span>
            </div>
            <p className="text-[10px] text-slate-400">Statutory SLA limit: 24h</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Statutory Adherence</span>
            <div className="text-xl font-black text-white flex items-baseline gap-1.5">
              <span>96.4%</span>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">(+1.2%)</span>
            </div>
            <p className="text-[10px] text-slate-400">137 of 142 on-time</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Clearance Velocity</span>
            <div className="text-xl font-black text-white flex items-baseline gap-1.5">
              <span>4.8 / day</span>
              <span className="text-[10px] text-cyan-400 font-semibold font-mono">(Cohort Mode)</span>
            </div>
            <p className="text-[10px] text-slate-400">Peak throughput reached</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Active Queue SLA Health</span>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                {pendingRequests.filter(r => getSlaStatus(r).tone === 'normal').length} On-Track
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800">
                <Clock className="h-3 w-3" />
                {pendingRequests.filter(r => getSlaStatus(r).tone === 'warning').length} Active
              </span>
              {pendingRequests.filter(r => getSlaStatus(r).tone === 'urgent').length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  {pendingRequests.filter(r => getSlaStatus(r).tone === 'urgent').length} Warning
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">Automatic priority ordering</p>
          </div>
        </div>
      </div>

      {/* Main moderator queue */}
      <div className="bg-white border border-[color:var(--t-200)] rounded-none p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[color:var(--t-600)] text-white rounded-none">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Practitioner Approval Queue</h3>
              <p className="text-xs text-slate-500 font-semibold">Review credentials for incoming practitioner registrations.</p>
            </div>
          </div>

          {/* List/Grid View Mode Toggle & Batch Selection */}
          <div className="flex items-center gap-2">
            {pendingRequests.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllRequests}
                className="h-8 px-3 rounded-none bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                <span>{selectedRequestIds.length === pendingRequests.length ? 'Deselect All' : 'Select All'}</span>
              </button>
            )}
            <div className="flex bg-slate-100 p-0.5 rounded-none border border-slate-300 shrink-0 items-center">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`h-8 px-3 rounded-none transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[color:var(--t-600)] text-white shadow-none'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
                title="List View"
                id="toggle-admin-list-view"
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`h-8 px-3 rounded-none transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[color:var(--t-600)] text-white shadow-none'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
                title="Grid View"
                id="toggle-admin-grid-view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {batchSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-none text-xs font-bold flex items-center justify-between">
            <span>{batchSuccessMsg}</span>
            <button type="button" onClick={() => setBatchSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 font-black cursor-pointer text-sm">×</button>
          </div>
        )}

        {selectedRequestIds.length > 0 && (
          <div className="bg-slate-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-3 rounded-none shadow-md border-l-4 border-emerald-500 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-none animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-wider">{selectedRequestIds.length} of {pendingRequests.length} Practitioners Selected for Statutory Batch Verification</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRequestIds([])}
                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-none border border-slate-700 cursor-pointer transition-colors"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={() => setBatchModalOpen(true)}
                className="px-4 py-1.5 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-none cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>Batch Verify & Approve ({selectedRequestIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 space-y-2">
            <Loader className="h-6 w-6 text-[color:var(--t-600)] animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Fetching registration requests...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-300 rounded-none bg-slate-50 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-black text-slate-850 uppercase tracking-wide">Queue Cleared! All Practitioners Verified</h4>
            <p className="text-xs text-slate-500 font-semibold">No pending license requests are waiting approval.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-5" : "space-y-3"}>
            {pendingRequests.map((req) => {
              const isApprovedInLoop = votedId === req.id;
              const reqName = req.userName || req.name || "Practitioner";
              const reqRole = req.userType || req.role || UserRole.DOCTOR;
              const reqAvatar = req.avatar || getRoleFailoverAvatar(reqRole === UserRole.DOCTOR ? 'doctor' : 'nurse');
              const reqSpecialization = req.specialization || (reqRole === UserRole.DOCTOR ? "General Medicine" : "Registered Nurse");
              const reqEducation = req.degreeName || (Array.isArray(req.education) ? req.education.join(', ') : (req.education || ''));
              const reqBio = req.bio || "Applicant has submitted credentials for official medical/nursing validation.";

              if (viewMode === 'list') {
                return (
                  <div 
                    key={req.id} 
                    onClick={() => setSelectedModalRequest(req)}
                    className={`border rounded-none p-4.5 transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 cursor-pointer hover:border-[color:var(--t-600)] ${
                      isApprovedInLoop ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-250"
                    }`}
                  >
                    <div className="flex gap-3.5 items-center flex-1 min-w-0 w-full lg:w-auto">
                      <div 
                        onClick={(e) => toggleSelectRequest(req.id, e)}
                        className={`h-5 w-5 rounded-none border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                          selectedRequestIds.includes(req.id) 
                            ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white' 
                            : 'bg-white border-slate-300 hover:border-slate-500'
                        }`}
                        title="Select for statutory batch verification"
                      >
                        {selectedRequestIds.includes(req.id) && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <UserAvatar 
                        src={reqAvatar} 
                        role={reqRole === UserRole.DOCTOR ? 'doctor' : 'nurse'}
                        alt={reqName}
                        className="h-12 w-12 rounded-full object-cover border border-slate-300 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-sans text-sm font-black text-slate-900 truncate min-w-0">{reqName}</h4>
                          <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-none border ${
                            reqRole === UserRole.DOCTOR ? "bg-[color:var(--t-50)] text-[color:var(--t-700)] border-[color:var(--t-200)]" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}>
                            {reqRole === UserRole.DOCTOR ? "Doctor" : "Nurse"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">{reqSpecialization}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center text-[10px] font-mono font-bold text-slate-600 lg:flex-1">
                      <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-none">Lic: {req.licenseNumber}</span>
                      <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-none truncate max-w-[180px]">{req.medicalCouncil || req.nursingCouncil || "National Council"}</span>
                      {(() => {
                        const sla = getSlaStatus(req);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-mono font-bold ${
                            sla.tone === 'urgent'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
                              : sla.tone === 'warning'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}>
                            <Clock className="h-3 w-3" />
                            {sla.label}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end mt-2 lg:mt-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedModalRequest(req)}
                        className="h-10 px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] active:bg-[color:var(--t-800)] border border-[color:var(--t-700)] text-white rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Review Credentials</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // Grid item layout
              return (
                <div 
                  key={req.id} 
                  className={`border rounded-none p-5 transition-all flex flex-col justify-between gap-5 relative overflow-hidden ${
                    isApprovedInLoop ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-250"
                  }`}
                >
                  <div className="space-y-4 flex-1">
                    <div className="flex gap-3.5 items-center">
                      <div 
                        onClick={(e) => toggleSelectRequest(req.id, e)}
                        className={`h-5 w-5 rounded-none border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                          selectedRequestIds.includes(req.id) 
                            ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white' 
                            : 'bg-white border-slate-300 hover:border-slate-500'
                        }`}
                        title="Select for statutory batch verification"
                      >
                        {selectedRequestIds.includes(req.id) && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <UserAvatar 
                        src={reqAvatar} 
                        role={reqRole === UserRole.DOCTOR ? 'doctor' : 'nurse'}
                        alt={reqName}
                        className="h-14 w-14 rounded-full object-cover border border-slate-300 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">{reqName}</h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-none border ${
                            reqRole === UserRole.DOCTOR ? "bg-[color:var(--t-50)] text-[color:var(--t-700)] border-[color:var(--t-200)]" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}>
                            {reqRole === UserRole.DOCTOR ? "Doctor" : "Registered Nurse"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-xs text-slate-500 font-bold">{reqSpecialization} specialist</p>
                          {(() => {
                            const sla = getSlaStatus(req);
                            return (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-mono font-bold ${
                                sla.tone === 'urgent'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
                                  : sla.tone === 'warning'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}>
                                <Clock className="h-2.5 w-2.5" />
                                {sla.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wide">Submitted License</span>
                        <code className="text-xs font-bold font-mono text-slate-900 mt-0.5 block">{req.licenseNumber}</code>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wide">Council Registry</span>
                        <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{req.medicalCouncil || req.nursingCouncil || "National Council"}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-none border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wide">Primary Degree</span>
                        <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{reqEducation}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wide mb-1">Onboarding Philosophy & Bio</span>
                      <p className="text-xs text-slate-650 leading-relaxed font-semibold bg-slate-50 p-3.5 rounded-none border border-slate-200 italic">
                        "{reqBio}"
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row justify-end gap-2 shrink-0 border-t border-slate-200 pt-4 mt-2">
                    <button
                      onClick={() => setSelectedModalRequest(req)}
                      className="h-10 px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] active:bg-[color:var(--t-800)] border border-[color:var(--t-700)] text-white rounded-none text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
                    >
                      <Check className="h-4 w-4" />
                      <span>Review Credentials</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Batch Verification Modal */}
      {batchModalOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => !batchProcessing && setBatchModalOpen(false)}
        >
          <div 
            className="relative bg-white border-2 border-emerald-600 rounded-none max-w-xl w-full p-6 shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Statutory Cohort Accreditation</span>
                <h3 className="font-sans text-lg font-black text-slate-900">
                  Batch Verify & Approve ({selectedRequestIds.length} Practitioners)
                </h3>
              </div>
              <button
                type="button"
                disabled={batchProcessing}
                onClick={() => setBatchModalOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1.5 tracking-wider">
                  Selected Cohort Practitioners
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 divide-y divide-slate-100 bg-slate-50 p-2">
                  {pendingRequests
                    .filter(r => selectedRequestIds.includes(r.id))
                    .map(r => (
                      <div key={r.id} className="py-1.5 flex items-center justify-between text-slate-800">
                        <span className="font-bold">{r.userName || r.name}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                          <span>{r.licenseNumber}</span>
                          <span className="bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase">{r.userType || r.role || 'Doctor'}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1.5 tracking-wider">
                  Council Verification Reference (Statutory Audit Trail)
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-none px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-600 font-semibold text-slate-800 bg-white"
                  value={batchRegistryRef}
                  onChange={(e) => setBatchRegistryRef(e.target.value)}
                  placeholder="e.g. MMC / LJM Official Batch Registry Check - Q4/2026"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1.5 tracking-wider">
                  Board Accreditation Audit Note
                </label>
                <textarea
                  className="w-full border border-slate-300 rounded-none px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-600 font-semibold text-slate-800 bg-white"
                  rows={2}
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  placeholder="Official accreditation rationale recorded in statutory registry..."
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={batchProcessing}
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={batchProcessing}
                onClick={handleBatchApprove}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {batchProcessing ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm Statutory Batch Verification ({selectedRequestIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Details Modal Overlay */}
      {selectedModalRequest && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedModalRequest(null)}
          id="admin-credentials-backdrop"
        >
          <div 
            className="relative bg-white border-2 border-[color:var(--t-600)] rounded-none max-w-xl w-full p-6 shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            id="admin-credentials-modal-card"
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedModalRequest(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-none text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-300 transition-all cursor-pointer z-10 flex items-center justify-center"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <UserAvatar 
                  src={selectedModalRequest.avatar} 
                  role={(selectedModalRequest.userType === UserRole.DOCTOR || selectedModalRequest.role === UserRole.DOCTOR) ? 'doctor' : 'nurse'}
                  alt={selectedModalRequest.userName || selectedModalRequest.name}
                  className="h-16 w-16 rounded-full object-cover border border-slate-300"
                />
                <div className="space-y-1">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-none border ${
                    (selectedModalRequest.userType || selectedModalRequest.role) === UserRole.DOCTOR 
                      ? "bg-[color:var(--t-50)] text-[color:var(--t-600)] border-[color:var(--t-200)]" 
                      : "bg-emerald-50 text-emerald-850 border-emerald-200"
                  }`}>
                    {(selectedModalRequest.userType || selectedModalRequest.role) === UserRole.DOCTOR ? "Doctor Application" : "Nurse Application"}
                  </span>
                  <h3 className="font-sans text-lg font-black text-slate-900 leading-tight">
                    {selectedModalRequest.userName || selectedModalRequest.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    <span>{selectedModalRequest.specialization || "General Practitioner"} Specialist</span>
                  </p>
                </div>
              </div>

              {/* Submitted Licenses details info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-none">
                  <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider mb-1">State License Key</span>
                  <code className="font-mono text-sm font-bold text-slate-900">{selectedModalRequest.licenseNumber}</code>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-none">
                  <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider mb-1">Assigned Medical Council</span>
                  <p className="text-xs font-bold text-slate-800">{selectedModalRequest.medicalCouncil || selectedModalRequest.nursingCouncil || "National Regulatory Board"}</p>
                </div>
              </div>

              {/* Automated Statutory Registration Format Validation & Official Portal Lookup */}
              {(() => {
                const statutory = validateStatutoryLicense(
                  selectedModalRequest.licenseNumber,
                  selectedModalRequest.userType || selectedModalRequest.role,
                  selectedModalRequest.medicalCouncil || selectedModalRequest.nursingCouncil
                );
                const sla = getSlaStatus(selectedModalRequest);
                return (
                  <div className="border border-slate-250 bg-slate-50/80 p-4 space-y-3 rounded-none">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                          statutory.isValid 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {statutory.isValid ? <Check className="h-3 w-3 text-emerald-700" /> : <AlertTriangle className="h-3 w-3 text-amber-700" />}
                          {statutory.badgeText}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">·</span>
                        <span className="text-[10px] text-slate-600 font-semibold">{statutory.standard}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span className={`text-[10px] font-mono font-bold ${
                          sla.tone === 'urgent' ? 'text-rose-700 font-black' : sla.tone === 'warning' ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {sla.label}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {statutory.details}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Cross-check with statutory council database:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedModalRequest.licenseNumber);
                          setCopiedLicence(true);
                          setTimeout(() => setCopiedLicence(false), 3500);
                          window.open(statutory.portalUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-none cursor-pointer transition-colors shadow-2xs"
                        title="Copy licence number and launch council verification portal"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Licence &amp; Open {selectedModalRequest.userType === UserRole.NURSE || selectedModalRequest.role === UserRole.NURSE ? 'LJM' : 'MMC'} Portal</span>
                        <ExternalLink className="h-3 w-3 text-slate-400 ml-0.5" />
                      </button>
                    </div>

                    {copiedLicence && (
                      <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-none animate-fade-in flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Licence number copied to clipboard! Paste into official council search portal.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Bio block */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider">Statement of Clinical Philosophy</span>
                <p className="text-xs text-slate-700 italic bg-slate-50 p-4 border-l-4 border-[color:var(--t-600)] rounded-none leading-relaxed font-semibold">
                  "{selectedModalRequest.bio || "Applicant is seeking medical or nurse credential verification."}"
                </p>
              </div>

              {/* Credentials scans and PDF attachments */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider">Proof of Registry & Certifications</span>
                <RequestDocuments requestId={selectedModalRequest.id} />
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600 font-semibold">{expiryLabel(selectedModalRequest.medicalCouncil)} on file: <strong className="font-mono">{professionals.find(p => p.id === selectedModalRequest.userId)?.licenseExpiry || 'none'}</strong></p>
            <ReviewActions request={selectedModalRequest} onDone={handleDecisionDone} />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setSelectedModalRequest(null)}
                className="h-10 px-5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-wider rounded-none border border-slate-300 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {activeTab === 'literature' && (
        <div id="panel-literature" role="tabpanel" tabIndex={0} className="space-y-6">
          <WorkspaceHeader
            icon={BookOpen}
            eyebrow="Evidence-Based Medicine · PubMed National Repository"
            title="Medical Literature & Clinical Research Moderation"
            description="Audit PubMed-indexed clinical studies, clinical practice guidelines, and patient fact sheets before platform publishing."
            badges={<BannerBadge tone="brand">Evidence-Based Governance</BannerBadge>}
            tabs={LIT_SUBS}
            activeTab={litSubTab}
            onTabChange={(t) => setLitSubTab(t as LitSubTab)}
          />
          <AdminLiterature
            activeSub={litSubTab}
            onSubChange={setLitSubTab}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {activeTab === 'quality' && (
        <div id="panel-quality" role="tabpanel" tabIndex={0} className="space-y-6">
          <WorkspaceHeader
            icon={CheckCircle2}
            eyebrow="Clinical Safety & Quality Assurance · Act 586"
            title="Quality Governance, Support Desk & Incident Resolution"
            description="Oversee user support turnaround SLAs, partner inquiries, review moderation, critical incident investigations, and CPD audits."
            badges={<BannerBadge tone="brand">Quality & Safety Committee</BannerBadge>}
            tabs={QUALITY_SUBS}
            activeTab={qualitySubTab}
            onTabChange={(t) => setQualitySubTab(t as QualitySubTab)}
          />
          <AdminQuality
            activeSub={qualitySubTab}
            onSubChange={setQualitySubTab}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {activeTab === 'ops' && (
        <div id="panel-ops" role="tabpanel" tabIndex={0} className="space-y-6">
          <WorkspaceHeader
            icon={CreditCard}
            eyebrow="Operational Infrastructure · Emergency & Financial Settlements"
            title="Clinical Operations, Rostering & Payment Settlements"
            description="Audit locum shift payouts, emergency SOS dispatches, pharmacy registry credentials, and refund resolutions."
            badges={<BannerBadge tone="brand">MOH & Financial Compliance</BannerBadge>}
            tabs={OPS_SUBS}
            activeTab={opsSubTab}
            onTabChange={(t) => setOpsSubTab(t as OpsSubTab)}
          />
          <AdminOps
            activeSub={opsSubTab}
            onSubChange={setOpsSubTab}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {activeTab === 'trust' && (
        <div id="panel-trust" role="tabpanel" tabIndex={0} className="space-y-6">
          <WorkspaceHeader
            icon={ShieldAlert}
            eyebrow="Clinical Safety & Integrity · Disciplinary Oversight"
            title="Trust, Clinical Complaints & Regulatory Auditing"
            description="Manage clinical incident disclosures, disciplinary investigations, and peer review compliance under medical council bylaws."
            badges={<BannerBadge tone="brand">Clinical Safety Oversight</BannerBadge>}
            tabs={[
              { id: 'watchlist', label: 'Licence Watchlist' },
              { id: 'complaints', label: 'Patient Complaints' },
              { id: 'sanctions' as any, label: 'Disciplinary Orders (Dual-Signoff)' },
            ]}
            activeTab={trustSubTab}
            onTabChange={(t) => setTrustSubTab(t as any)}
          />
          <AdminTrustPanel 
            onChanged={fetchPending} 
            activeSub={trustSubTab} 
            currentSubRole={subRole}
            currentUser={currentUser}
          />
        </div>
      )}

      {activeTab === 'packages' && (
        <div id="panel-packages" role="tabpanel" aria-labelledby="tab-packages" tabIndex={0} className="space-y-6 animate-fade-in text-slate-800">
          <WorkspaceHeader
            icon={Puzzle}
            eyebrow="System Architecture · Modular Clinical Runtime"
            title="Clinical Package & Extension Architecture Manager"
            description="Compile, audit, hot-mount, and manage modular healthcare extensions and MediCert cloud marketplace plug-ins."
            badges={<BannerBadge tone="brand">Modular System Runtime</BannerBadge>}
            tabs={[
              { id: 'installed', label: 'Installed Modules & Runtime', count: packages.length },
              { id: 'marketplace', label: 'Cloud Marketplace', count: MARKETPLACE_ADDONS.filter(addon => !packages.some(p => p.id === addon.id)).length },
              { id: 'compiler', label: 'Custom Module Compiler' },
            ]}
            activeTab={packageSubTab}
            onTabChange={(t) => setPackageSubTab(t as PackageSubTab)}
            aside={
              packageSubTab !== 'compiler' ? (
                <button
                  type="button"
                  onClick={() => setPackageSubTab('compiler')}
                  className="px-3.5 py-2 text-xs font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Compile New Module</span>
                </button>
              ) : undefined
            }
          />

          {/* SUBTAB 1: INSTALLED MODULES & RUNTIME */}
          {packageSubTab === 'installed' && (
            <div className="space-y-6">
              {/* Package Overview Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[color:var(--ink-2)]">Installed packages</span>
                    <span className="h-8 w-8 flex items-center justify-center border bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)]"><Puzzle className="h-4 w-4" /></span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{packages.length} Active Modules</span>
                  <span className="text-xs text-slate-600">Clinical packages compiled & mounted.</span>
                </div>

                <div className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[color:var(--ink-2)]">Active Run-time</span>
                    <span className="h-8 w-8 flex items-center justify-center border bg-[color:var(--e-50)] border-[color:var(--e-200)] text-[color:var(--e-600)]"><CheckCircle2 className="h-4 w-4" /></span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{packages.filter(p => getPkgEnabled(p)).length} Enabled</span>
                  <span className="text-xs text-slate-600">Active navigation endpoints in sidebar.</span>
                </div>

                <div className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[color:var(--ink-2)]">Marketplace Extensions</span>
                    <span className="h-8 w-8 flex items-center justify-center border bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)]"><Download className="h-4 w-4" /></span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{MARKETPLACE_ADDONS.filter(addon => !packages.some(p => p.id === addon.id)).length} Available</span>
                  <span className="text-xs text-slate-600">Ready to download from official cloud registry.</span>
                </div>
              </div>

              {/* Search and Category Filtering Row */}
              <div className="bg-white border border-[color:var(--t-200)] p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1 w-full max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search installed clinical packages…"
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                      className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white h-12 pl-10 pr-4 text-xs font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setPackageSubTab('compiler')}
                      className="w-full sm:w-auto px-5 h-12 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Compile Custom Package</span>
                    </button>
                  </div>
                </div>

                {/* Category filtering tags */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[color:var(--t-100)]">
                  {Array.from(new Set([
                    'All',
                    ...packages.map(p => getPkgCategory(p)).filter(Boolean),
                    'Patient Services', 'Clinical Operations', 'SEO & Growth', 'Communication', 'Credentialing'
                  ])).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPackageCategoryFilter(cat)}
                      className={`px-3 py-1.5 text-[11px] font-bold border transition-colors cursor-pointer ${
                        packageCategoryFilter === cat
                          ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white shadow-xs'
                          : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-50)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Installed Packages List */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Puzzle className="h-4 w-4 text-[color:var(--t-600)]" />
                  <span>Installed Packages ({packages.length})</span>
                </h3>

                {packages.filter(p => {
                  const name = getPkgName(p).toLowerCase();
                  const desc = getPkgDesc(p).toLowerCase();
                  const author = getPkgAuthor(p).toLowerCase();
                  const q = packageSearch.toLowerCase().trim();
                  const matchSearch = !q || name.includes(q) || desc.includes(q) || author.includes(q);
                  const matchCategory = packageCategoryFilter === 'All' || getPkgCategory(p) === packageCategoryFilter;
                  return matchSearch && matchCategory;
                }).length === 0 ? (
                  <div className="bg-white border border-slate-200 p-12 text-center text-slate-500 rounded-none">
                    <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No installed packages match your filter criteria.</p>
                    <button type="button" onClick={() => { setPackageSearch(''); setPackageCategoryFilter('All'); }} className="mt-2 text-[11px] font-bold text-[color:var(--t-700)] underline cursor-pointer">Reset filters</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages
                      .filter(p => {
                        const name = getPkgName(p).toLowerCase();
                        const desc = getPkgDesc(p).toLowerCase();
                        const author = getPkgAuthor(p).toLowerCase();
                        const q = packageSearch.toLowerCase().trim();
                        const matchSearch = !q || name.includes(q) || desc.includes(q) || author.includes(q);
                        const matchCategory = packageCategoryFilter === 'All' || getPkgCategory(p) === packageCategoryFilter;
                        return matchSearch && matchCategory;
                      })
                      .map((pkg) => {
                        const isEnabled = getPkgEnabled(pkg);
                        const pkgName = getPkgName(pkg);
                        const pkgDesc = getPkgDesc(pkg);
                        const pkgAuthor = getPkgAuthor(pkg);
                        const pkgVersion = getPkgVersion(pkg);
                        const pkgIcon = getPkgIcon(pkg);
                        const pkgCategory = getPkgCategory(pkg);
                        const price = (pkg as any).priceMyr;

                        return (
                          <div
                            key={pkg.id}
                            className={`bg-white border rounded-none p-5 shadow-none transition-all flex flex-col justify-between gap-5 ${
                              isEnabled
                                ? 'border-[color:var(--t-200)]'
                                : 'border-slate-250 bg-slate-50/70 opacity-80'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2.5 rounded-none border shrink-0 ${
                                    isEnabled
                                      ? 'bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)]'
                                      : 'bg-slate-100 border-slate-200 text-slate-400'
                                  }`}>
                                    {renderIcon(pkgIcon)}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-800 leading-tight flex items-center gap-1.5 flex-wrap">
                                      {pkgName}
                                      <span className="bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[9px] px-1.5 py-0.5 rounded-none font-bold">
                                        {pkgVersion.startsWith('v') || pkgVersion.startsWith('Code:') ? pkgVersion : `v${pkgVersion}`}
                                      </span>
                                      {price !== undefined && price !== null && (
                                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[9px] px-1.5 py-0.5 rounded-none font-bold">
                                          MYR {Number(price).toLocaleString()}
                                        </span>
                                      )}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-bold block mt-1 tracking-wide">
                                      by {pkgAuthor} · <span className="text-[color:var(--t-600)]">{pkgCategory}</span>
                                    </span>
                                  </div>
                                </div>

                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-none border uppercase tracking-wider shrink-0 ${
                                  isEnabled
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}>
                                  {isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                {pkgDesc}
                              </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-1">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePackage(pkg.id)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border border-slate-300 transition-colors duration-150 ease-in-out focus:outline-none ${
                                    isEnabled ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)]' : 'bg-slate-200'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-none bg-white shadow-none transition duration-150 ease-in-out ${
                                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                                  {isEnabled ? 'Active in Runtime' : 'Disabled'}
                                </span>
                              </div>

                              {pkg.isRemovable ? (
                                <button
                                  type="button"
                                  onClick={() => handleUninstallPackage(pkg.id)}
                                  className="h-8 px-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-none border border-transparent hover:border-rose-200 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                  title="Uninstall & Remove Package"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Remove</span>
                                </button>
                              ) : (
                                <span className="text-[9px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-none uppercase tracking-wider">
                                  Core Module
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 2: CLOUD MARKETPLACE */}
          {packageSubTab === 'marketplace' && (
            <div className="bg-slate-50 text-slate-800 p-6 rounded-none border border-[color:var(--t-200)] space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[color:var(--t-600)] uppercase tracking-wider block">Official Extensions Registry</span>
                  <h3 className="text-base font-black text-slate-800 leading-tight">MediCert Cloud Marketplace</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">Expand clinical compliance and services with verified platform plug-ins.</p>
                </div>
                <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-3 py-1.5 rounded-none text-[10px] font-black text-[color:var(--t-600)] flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse"></span>
                  <span>Registry Server Active</span>
                </div>
              </div>

              {MARKETPLACE_ADDONS.filter(addon => !packages.some(p => p.id === addon.id)).length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-300 rounded-none bg-white space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">All Available Marketplace Add-ons Installed</h4>
                  <p className="text-xs text-slate-400 font-medium">Your MediCert workspace is running the maximum suite configuration.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MARKETPLACE_ADDONS
                    .filter(addon => !packages.some(p => p.id === addon.id))
                    .map((addon) => (
                      <div key={addon.id} className="bg-white border border-slate-200 hover:border-[color:var(--t-200)] p-5 rounded-none flex flex-col justify-between gap-4 transition-all text-slate-700 shadow-none">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="bg-slate-50 text-slate-600 border border-slate-200 font-mono text-[9px] px-1.5 py-0.5 rounded-none font-bold">v{addon.version}</span>
                            <span className="bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)] text-[9px] font-black px-1.5 py-0.5 rounded-none uppercase tracking-wide">{addon.category}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)] rounded-none shrink-0">
                              {renderIcon(addon.icon, "h-4 w-4")}
                            </div>
                            <h4 className="text-xs font-black text-slate-800 truncate">{addon.name}</h4>
                          </div>

                          <p className="text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-3">
                            {addon.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleInstallPackage(addon)}
                          className="w-full h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] active:bg-[color:var(--t-800)] border border-[color:var(--t-700)] text-white rounded-none text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Hot-Install Package</span>
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: CUSTOM MODULE COMPILER */}
          {packageSubTab === 'compiler' && (
            <form onSubmit={handleCreateCustomPackage} className="bg-white border-2 border-[color:var(--t-600)] p-6 shadow-md space-y-5 animate-fade-in rounded-none">
              <div className="flex items-center justify-between border-b border-[color:var(--t-200)] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[color:var(--t-600)]" />
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-[color:var(--ink)]">Custom Module Compiler</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Author and mount bespoke clinical modules directly into the MedCred runtime.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPackageSubTab('installed')}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer"
                  title="Close Compiler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Package Unique ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. diagnostics-charting"
                    value={newPkgId}
                    onChange={(e) => setNewPkgId(e.target.value)}
                    className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white h-12 px-3 text-xs font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Package Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Real-Time Vitals Charting Engine"
                    value={newPkgName}
                    onChange={(e) => setNewPkgName(e.target.value)}
                    className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white h-12 px-3 text-xs font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Package Functional Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain exactly what features this modular package mounts in the system, its integration, and patient impact…"
                  value={newPkgDesc}
                  onChange={(e) => setNewPkgDesc(e.target.value)}
                  className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white p-3 text-xs font-medium text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Category</label>
                  <select
                    value={newPkgCategory}
                    onChange={(e) => setNewPkgCategory(e.target.value)}
                    className="w-full bg-white border border-[color:var(--t-200)] h-12 px-3 text-xs font-bold text-[color:var(--ink)] cursor-pointer outline-none focus:border-[color:var(--t-600)]"
                  >
                    {['Patient Services', 'Clinical Operations', 'SEO & Growth', 'Communication', 'Credentialing', 'Custom Extension'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Lucide Icon Badge</label>
                  <select
                    value={newPkgIcon}
                    onChange={(e) => setNewPkgIcon(e.target.value)}
                    className="w-full bg-white border border-[color:var(--t-200)] h-12 px-3 text-xs font-bold text-[color:var(--ink)] cursor-pointer outline-none focus:border-[color:var(--t-600)]"
                  >
                    {['Activity', 'CreditCard', 'TrendingUp', 'Heart', 'Search', 'Calendar', 'BookOpen', 'PlusCircle', 'MessageSquare', 'Globe'].map(ic => (
                      <option key={ic} value={ic}>{ic} Icon</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Version</label>
                  <input
                    type="text"
                    placeholder="e.g. 1.0.0"
                    value={newPkgVersion}
                    onChange={(e) => setNewPkgVersion(e.target.value)}
                    className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white h-12 px-3 text-xs font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Package Author</label>
                  <input
                    type="text"
                    placeholder="e.g. Clinical Ops Admin"
                    value={newPkgAuthor}
                    onChange={(e) => setNewPkgAuthor(e.target.value)}
                    className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white h-12 px-3 text-xs font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[color:var(--t-200)]">
                <button
                  type="button"
                  onClick={() => setPackageSubTab('installed')}
                  className="h-12 px-5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompiling}
                  className="h-12 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold uppercase tracking-wider shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isCompiling ? <Loader className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  <span>Compile & Mount Module</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'registry' && (
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
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
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
                            <p className="text-xs font-bold text-slate-700">No registered practitioners match your search criteria.</p>
                            <p className="text-[11px] text-slate-500 mt-1">Try adjusting your search terms or filter tabs.</p>
                            {registrySearch && (
                              <button
                                type="button"
                                onClick={() => setRegistrySearch('')}
                                className="mt-3 text-[11px] font-bold text-[color:var(--t-700)] underline cursor-pointer"
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
                              <span className="text-[10px] text-slate-500 uppercase font-bold">{prof.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-none border border-slate-200">
                            {prof.licenseNumber}
                          </code>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            {(prof as any).medicalCouncil || (prof as any).nursingCouncil || 'National Board'}
                          </p>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {prof.specialization || 'General Practice'}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                            prof.verificationStatus === VerificationStatus.VERIFIED
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-none bg-current" />
                            {prof.verificationStatus}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {prof.licenseExpiry || 'N/A'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('medcred-view-profile', { detail: prof.id }));
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 transition-colors cursor-pointer"
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
      )}

      {activeTab === 'facilities' && (
        <div id="panel-facilities" role="tabpanel" tabIndex={0}>
          <FacilityWorkspace activeGroup="staffing" embedded={true} />
        </div>
      )}

      {activeTab === 'shifts' && (
        <div id="panel-shifts" role="tabpanel" tabIndex={0}>
          <JobMarket
            jobs={jobs}
            onNewJobCreated={onNewJobCreated}
            onApplyJob={onApplyJob}
            onRefreshData={onRefreshData}
            role="admin"
            currentUser={currentUser}
            professionals={professionals}
            reviews={reviews}
            bookings={bookings}
            embedded={true}
            onOpenHelp={() => window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'help' }))}
          />
        </div>
      )}

      {activeTab === 'tourism' && (
        <div id="panel-tourism" role="tabpanel" tabIndex={0}>
          <TourismDesk
            isAdmin={true}
            embedded={true}
            currentUser={currentUser}
            professionals={professionals}
            reviews={reviews}
            bookings={bookings}
          />
        </div>
      )}

      {activeTab === 'seo' && (
        <div id="panel-seo" role="tabpanel" tabIndex={0}>
          <SEODashboard professionals={professionals} embedded={true} />
        </div>
      )}
          </>
        )}
      </div>

      {/* RBAC Compliance Persona Switcher Modal */}
      {rbacModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setRbacModalOpen(false)}
        >
          <div 
            className="relative bg-white border-2 border-slate-900 rounded-none max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-500/20 text-amber-700 border border-amber-400 flex items-center justify-center shrink-0">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Administrative Persona &amp; Statutory Compliance Scope
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Segregation of Duties (SoD) under MMC, LJM, and Private Healthcare Facilities &amp; Services Act 1998 (Act 586)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRbacModalOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Statutory Segregation Mandate:</strong> In compliance with the Medical Act 1971 and Financial Services Act 2013, administrative privileges are partitioned to prevent conflicts of interest between practitioner licensing approvals, clinical operations disbursements, hospital relations, and international patient coordination.
              </div>

              <div className="space-y-3">
                {Object.values(ADMIN_SUB_ROLES).map((roleItem) => {
                  const isActive = roleItem.id === subRole;
                  return (
                    <div
                      key={roleItem.id}
                      className={`p-4 border transition-all ${
                        isActive
                          ? 'border-2 border-emerald-600 bg-emerald-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{roleItem.title}</span>
                            {isActive ? (
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-600 text-white tracking-wider flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Active Mandate
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">
                                {roleItem.shortTitle}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">{roleItem.department}</p>
                          <p className="text-xs text-slate-700 leading-relaxed mt-1">{roleItem.description}</p>
                        </div>
                        <div className="shrink-0 flex sm:flex-col items-end gap-2">
                          <button
                            type="button"
                            id={`btn-switch-role-${roleItem.id}`}
                            data-testid={`btn-switch-role-${roleItem.id}`}
                            disabled={isActive}
                            onClick={() => handleSwitchSubRole(roleItem.id)}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer rounded-none whitespace-nowrap ${
                              isActive
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                            }`}
                          >
                            {isActive ? 'Current Persona' : 'Switch Persona'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="font-bold text-slate-700">Permitted Workspaces:</span>
                          <div className="flex flex-wrap gap-1">
                            {roleItem.allowedGroups.map(g => (
                              <span key={g} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-mono font-bold uppercase text-[10px] border border-slate-200">
                                {ADMIN_GROUPS[g]?.name || g}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {roleItem.authority}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setRbacModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Switcher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hospital HR Webhooks Telemetry & Dispatch Monitor Modal */}
      {webhookModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setWebhookModalOpen(false)}
        >
          <div 
            className="relative bg-white border-2 border-emerald-600 rounded-none max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/20 text-emerald-700 border border-emerald-400 flex items-center justify-center shrink-0">
                  <Webhook className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    Hospital HR Webhook Event Dispatcher &amp; Telemetry
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5">
                      Act 586 Compliant
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Real-time automated credential syndication to premier Malaysian Hospital Information Systems (HIS)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWebhookModalOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Active Hospital Gateways</span>
                <span className="text-xl font-black text-slate-900 tabular-nums">{webhooks.length || 3} Endpoints</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">Pantai KL, KPJ, Gleneagles KL</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Security &amp; Encryption</span>
                <span className="text-xl font-black text-slate-900">HMAC-SHA256</span>
                <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">Signed webhook payloads + TLS 1.3</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Automated Triggers</span>
                <span className="text-xl font-black text-slate-900 font-mono text-sm">practitioner.verified</span>
                <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">On council registration approval</span>
              </div>
            </div>

            {/* Test result display */}
            {webhookTestResult && (
              <div className={`p-4 border text-xs space-y-2 animate-fade-in ${
                webhookTestResult.success 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {webhookTestResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
                    {webhookTestResult.message}
                  </span>
                  <button 
                    onClick={() => setWebhookTestResult(null)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 font-mono uppercase underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                {webhookTestResult.payload && (
                  <div className="mt-2 bg-slate-900 text-emerald-300 p-3 font-mono text-[11px] overflow-x-auto max-h-40 border border-slate-800">
                    <pre>{JSON.stringify(webhookTestResult.payload, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Registered Hospital Webhook Endpoints */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Integrated Hospital HR Endpoints
                </h4>
                <button
                  type="button"
                  onClick={fetchWebhooks}
                  disabled={webhookLoading}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${webhookLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="space-y-2.5">
                {(webhooks.length > 0 ? webhooks : [
                  { id: 'wh_pantai_kl', hospital_name: 'Pantai Hospital Kuala Lumpur', system_name: 'IHH Healthcare HIS · Enterprise Staffing Sync', endpoint_url: 'https://api.pantai.com.my/v2/medcred-hr/sync', is_active: 1, secret_token: 'whsec_pantai_ihh_live_9a8f2' },
                  { id: 'wh_kpj_central', hospital_name: 'KPJ Healthcare Berhad', system_name: 'KPJ Clinical Credentialing Hub', endpoint_url: 'https://connect.kpjhealth.com.my/api/creds/listen', is_active: 1, secret_token: 'whsec_kpj_central_4b2c1' },
                  { id: 'wh_gleneagles_kl', hospital_name: 'Gleneagles Hospital Kuala Lumpur', system_name: 'Gleneagles Enterprise Staffing System', endpoint_url: 'https://integrations.gleneagles.com.my/hr/medcred', is_active: 1, secret_token: 'whsec_gleneagles_live_7e1d4' },
                ]).map((wh: any) => (
                  <div key={wh.id} className="p-3.5 border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{wh.facility_name || wh.hospital_name}</span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active Endpoint
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold">{wh.system_name || 'Hospital Staffing & Credentialing Gateway'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 border border-slate-200">
                          {wh.endpoint_url}
                        </code>
                        <span className="text-[10px] font-mono text-slate-400">
                          Secret: {wh.secret_token ? `${wh.secret_token.slice(0, 10)}...` : 'whsec_••••••••'}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestWebhookPing(wh.id)}
                        disabled={webhookTesting === wh.id}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer rounded-none disabled:opacity-50"
                      >
                        {webhookTesting === wh.id ? (
                          <>
                            <Loader className="h-3.5 w-3.5 animate-spin" />
                            <span>Dispatching...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3" />
                            <span>Test Ping</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Webhook Dispatch Logs */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-500" />
                Recent Webhook Dispatch Telemetry
              </h4>
              <div className="overflow-x-auto border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Target Hospital</th>
                      <th className="p-2.5">Event</th>
                      <th className="p-2.5">HTTP Status</th>
                      <th className="p-2.5">Latency</th>
                      <th className="p-2.5">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {webhookLogs.length > 0 ? (
                      webhookLogs.slice(0, 5).map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono text-[11px] text-slate-600">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{log.facility_name || log.hospital_name || log.webhook_id}</td>
                          <td className="p-2.5 font-mono text-[11px] text-[color:var(--t-700)] font-bold">{log.event_type}</td>
                          <td className="p-2.5">
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 text-[10px]">
                              {log.response_code || 200} OK
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-500">{log.execution_time_ms || 48}ms</td>
                          <td className="p-2.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 border border-emerald-300">
                              {log.status || 'delivered'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 text-xs">
                          No webhook dispatches recorded in current session. Click "Test Ping" above to simulate an Act 586 hospital notification.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span className="font-mono text-[10px]">
                Specification: MedCred Event Dispatcher v2.4 · SHA-256 HMAC
              </span>
              <button
                type="button"
                onClick={() => setWebhookModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Monitor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Regulatory Audit Log Modal */}
      {auditModalOpen && (
        <AdminAuditLog onClose={() => setAuditModalOpen(false)} isEmbedded={false} />
      )}

      {/* Break-Glass Privilege Elevation Justification Modal */}
      {elevationModalOpen && pendingSubRoleTarget && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
          onClick={() => setElevationModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="elevation-modal-title"
        >
          <div 
            className="relative bg-white border-2 border-amber-500 rounded-none max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 border border-amber-300">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Statutory Segregation of Duties (SoD) Protocol
                  </span>
                  <h3 id="elevation-modal-title" className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Break-Glass Privilege Elevation Justification
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setElevationModalOpen(false)}
                className="h-7 w-7 text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-950 space-y-1">
              <span className="font-bold block text-[11px]">Notice of Statutory Role Elevation</span>
              <p className="text-[11px] leading-relaxed">
                You are transitioning from <strong className="font-bold text-slate-900">{ADMIN_SUB_ROLES[subRole]?.shortTitle}</strong> to <strong className="font-bold text-slate-900">{ADMIN_SUB_ROLES[pendingSubRoleTarget]?.shortTitle}</strong>. 
                Under Medical Act 1971 and Financial Services Act 2013, role switches must be justified and are logged to the immutable SQLite audit trail.
              </p>
            </div>

            {elevationError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 font-bold text-xs">
                {elevationError}
              </div>
            )}

            <form onSubmit={executeElevationSwitch} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider block mb-1">
                  Duty Handover / Incident Case Reference
                </label>
                <input
                  type="text"
                  value={elevationCaseRef}
                  onChange={(e) => setElevationCaseRef(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-600"
                  placeholder="EMERG-SOD-2026-001"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                  Preset Regulatory Justifications:
                </label>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Emergency Locum Shift Roster Handover & Clearance',
                    'Disciplinary Board Hearing Session & Audit Oversight',
                    'MMC / LJM Statutory Annual Practicing Certificate Batch Audit',
                    'Weekend Clinical Operations & Emergency Escrow Settlement'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setElevationReason(preset)}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer text-left font-medium"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider block mb-1">
                  Statutory Duty Reason *
                </label>
                <textarea
                  rows={2}
                  value={elevationReason}
                  onChange={(e) => setElevationReason(e.target.value)}
                  placeholder="State the official governance reason or shift mandate for this sub-role elevation..."
                  className="w-full border border-slate-300 p-2.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setElevationModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={elevationSubmitting || !elevationReason.trim()}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400 font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
                >
                  {elevationSubmitting ? (
                    <>
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      <span>Logging Elevation...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>Authorize &amp; Switch Mandate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
