import DashboardHeader from './DashboardHeader';
import { expiryLabel } from '../registries';
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserCheck, Check, X, ShieldAlert, Award, FileText, 
  Loader, CheckCircle2, List, LayoutGrid, Eye,
  Puzzle, Plus, Trash2, Settings, Download, Activity, CreditCard, 
  TrendingUp, Heart, Search, Calendar, 
  BookOpen, PlusCircle, MessageSquare, Globe
} from 'lucide-react';
import AdminTrustPanel, { ReviewActions } from './AdminTrustPanel';
import AdminOps from './AdminOps';
import AdminQuality from './AdminQuality';
import AdminLiterature from './AdminLiterature';
import { DoctorProfile, NurseProfile, UserRole, AppPackage, VerificationStatus } from '../types';

interface AdminDashboardProps {
  onProfessionalApproved: (prof: DoctorProfile | NurseProfile) => void;
  professionals: (DoctorProfile | NurseProfile)[];
  packages: AppPackage[];
  onPackagesChanged: () => void;
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

export default function AdminDashboard({ onProfessionalApproved, professionals, packages, onPackagesChanged }: AdminDashboardProps) {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedModalRequest, setSelectedModalRequest] = useState<any | null>(null);

  // --- Modular Packages Management State ---
  const [activeTab, setActiveTab] = useState<'approvals' | 'trust' | 'ops' | 'quality' | 'literature' | 'packages'>('approvals');
  const [packageSearch, setPackageSearch] = useState('');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('All');
  
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

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6" id="national-registry-admin-panel">
      {/* Standard dashboard header with attached tabs */}
      <DashboardHeader
        eyebrow="National Medical Registry Audit Terminal"
        title="Registry Administrative Control Desk"
        description="Practitioner licence review, trust and complaints, operations, quality and support, and modular extension management."
        actions={
        <div className="grid grid-cols-3 gap-3 bg-white p-3 border border-[color:var(--t-200)] rounded-none text-center min-w-[300px]">
          <div>
            <span className="font-mono text-xl font-black text-[color:var(--t-600)] block leading-tight">{pendingRequests.length}</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Pending</span>
          </div>
          <div className="border-x border-slate-200">
            <span className="font-mono text-xl font-black text-[color:var(--t-600)] block leading-tight">{professionals.filter(p => p.verificationStatus === VerificationStatus.VERIFIED).length}</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Verified</span>
          </div>
          <div>
            <span className="font-mono text-xl font-black text-[color:var(--t-600)] block leading-tight">{packages.filter(p => (p as any).installed).length || 3}</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Modules</span>
          </div>
        </div>
        }
        tabs={[
          { id: 'approvals' as const, label: 'Practitioner Approvals', icon: ShieldCheck, count: pendingRequests.length },
          { id: 'trust' as const, label: 'Trust & Complaints', icon: ShieldAlert },
          { id: 'ops' as const, label: 'Operations & Payments', icon: Activity },
          { id: 'quality' as const, label: 'Quality & Support', icon: CheckCircle2 },
          { id: 'literature' as const, label: 'Medical Literature', icon: BookOpen },
          { id: 'packages' as const, label: 'Package Manager', icon: Puzzle, count: packages.length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabsLabel="Admin panel sections"
      />

      {activeTab === 'approvals' && (
        <div id="panel-approvals" role="tabpanel" aria-labelledby="tab-approvals" tabIndex={0} className="space-y-6">
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

          {/* List/Grid View Mode Toggle */}
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
              const reqAvatar = req.avatar || (req.userType === UserRole.DOCTOR || req.role === UserRole.DOCTOR ? "/assets/malaysian_female_doctor.jpg" : "/assets/malaysian_female_nurse.jpg");
              const reqName = req.userName || req.name || "Practitioner";
              const reqRole = req.userType || req.role || UserRole.DOCTOR;
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
                    <div className="flex gap-4 items-center flex-1 min-w-0 w-full lg:w-auto">
                      <img 
                        src={reqAvatar} 
                        alt={reqName}
                        className="h-12 w-12 rounded-none object-cover border border-slate-300 shrink-0"
                        referrerPolicy="no-referrer"
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
                    </div>

                    <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end mt-2 lg:mt-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedModalRequest(req)}
                        className="h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-none border border-slate-300 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModalRequest(req)}
                        className="h-10 px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--dark)] active:bg-slate-900 text-white rounded-none text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Review</span>
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
                    <div className="flex gap-4 items-center">
                      <img 
                        src={reqAvatar} 
                        alt={reqName}
                        className="h-14 w-14 rounded-none object-cover border border-slate-300 shrink-0"
                        referrerPolicy="no-referrer"
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
                        <p className="text-xs text-slate-500 mt-1 font-bold">{reqSpecialization} specialist</p>
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
                      className="h-10 px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--dark)] active:bg-slate-900 text-white rounded-none text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
                    >
                      <Check className="h-4 w-4" />
                      <span>Review Application</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verification Details Modal Overlay */}
      {selectedModalRequest && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedModalRequest(null)}
          id="admin-credentials-backdrop"
        >
          <div 
            className="relative bg-white border-2 border-[color:var(--t-600)] rounded-none max-w-xl w-full p-6 shadow-2xl flex flex-col justify-between overflow-hidden"
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
                <img 
                  src={selectedModalRequest.avatar || (selectedModalRequest.userType === UserRole.DOCTOR || selectedModalRequest.role === UserRole.DOCTOR ? "/assets/malaysian_female_doctor.jpg" : "/assets/malaysian_female_nurse.jpg")} 
                  alt={selectedModalRequest.userName || selectedModalRequest.name}
                  className="h-16 w-16 rounded-none object-cover border border-slate-300"
                  referrerPolicy="no-referrer"
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
        <div id="panel-literature" role="tabpanel" tabIndex={0}>
          <AdminLiterature />
        </div>
      )}

      {activeTab === 'quality' && (
        <div id="panel-quality" role="tabpanel" tabIndex={0}>
          <AdminQuality />
        </div>
      )}

      {activeTab === 'ops' && (
        <div id="panel-ops" role="tabpanel" tabIndex={0}>
          <AdminOps />
        </div>
      )}

      {activeTab === 'trust' && (
        <div id="panel-trust" role="tabpanel" tabIndex={0}>
          <AdminTrustPanel onChanged={fetchPending} />
        </div>
      )}

      {activeTab === 'packages' && (
        <div id="panel-packages" role="tabpanel" aria-labelledby="tab-packages" tabIndex={0} className="space-y-8 animate-fade-in text-slate-800">
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
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{packages.filter(p => p.isEnabled).length} Enabled</span>
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

          {/* Search, Filter, and Custom Form Toggle Row */}
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
                  onClick={() => setShowCustomForm(!showCustomForm)}
                  className="w-full sm:w-auto px-5 h-12 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Compile Custom Package</span>
                </button>
              </div>
            </div>

            {/* Category filtering tags */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[color:var(--t-100)]">
              {['All', 'Patient Services', 'Clinical Operations', 'SEO & Growth', 'Communication', 'Credentialing', 'Custom Extension'].map((cat) => (
                <button
                  key={cat}
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

          {/* Custom Package Form */}
          {showCustomForm && (
            <form onSubmit={handleCreateCustomPackage} className="bg-white border-2 border-[color:var(--t-600)] p-6 shadow-md space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[color:var(--t-200)] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[color:var(--t-600)]" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[color:var(--ink)]">Custom Package Compiler</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Package Unique ID *</label>
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
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Package Name *</label>
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
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Package Functional Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain exactly what features this modular package mounts in the system, its integration, and patient impact…"
                  value={newPkgDesc}
                  onChange={(e) => setNewPkgDesc(e.target.value)}
                  className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white p-3 text-xs font-medium text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Category</label>
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
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Lucide Icon Badge</label>
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
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Version</label>
                  <input
                    type="text"
                    placeholder="e.g. 1.0.0"
                    value={newPkgVersion}
                    onChange={(e) => setNewPkgVersion(e.target.value)}
                    className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:bg-white h-12 px-3 text-xs font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Package Author</label>
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
                  onClick={() => setShowCustomForm(false)}
                  className="h-12 px-5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompiling}
                  className="h-12 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isCompiling ? <Loader className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  <span>Compile & Hot-Install Package</span>
                </button>
              </div>
            </form>
          )}

          {/* Installed Packages List */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Puzzle className="h-4 w-4 text-[color:var(--t-600)]" />
              <span>Installed Packages ({packages.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages
                .filter(p => {
                  const matchSearch = p.name.toLowerCase().includes(packageSearch.toLowerCase()) || p.description.toLowerCase().includes(packageSearch.toLowerCase());
                  const matchCategory = packageCategoryFilter === 'All' || p.category === packageCategoryFilter;
                  return matchSearch && matchCategory;
                })
                .map((pkg) => {
                  return (
                    <div
                      key={pkg.id}
                      className={`bg-white border rounded-none p-5 shadow-none transition-all flex flex-col justify-between gap-5 ${
                        pkg.isEnabled
                          ? 'border-[color:var(--t-200)]'
                          : 'border-slate-250 bg-slate-50/70 opacity-80'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-none border shrink-0 ${
                              pkg.isEnabled
                                ? 'bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)]'
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}>
                              {renderIcon(pkg.icon)}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-800 leading-tight flex items-center gap-1.5 flex-wrap">
                                {pkg.name}
                                <span className="bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[9px] px-1.5 py-0.5 rounded-none font-bold">v{pkg.version}</span>
                              </h4>
                              <span className="text-[10px] text-slate-400 font-bold block mt-1 tracking-wide">by {pkg.author}</span>
                            </div>
                          </div>

                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-none border uppercase tracking-wider shrink-0 ${
                            pkg.isEnabled
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}>
                            {pkg.isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                          {pkg.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-1">
                        <div className="flex items-center gap-2">
                          {/* Toggle switch (Crisp industrial rectangle) */}
                          <button
                            type="button"
                            onClick={() => handleTogglePackage(pkg.id)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border border-slate-300 transition-colors duration-150 ease-in-out focus:outline-none ${
                              pkg.isEnabled ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)]' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-none bg-white shadow-none transition duration-150 ease-in-out ${
                                pkg.isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                            {pkg.isEnabled ? 'Active in Runtime' : 'Disabled'}
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
          </div>

          {/* Cloud Registry Marketplace */}
          <div className="bg-slate-50 text-slate-800 p-6 rounded-none border border-[color:var(--t-200)] space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-[color:var(--t-600)] uppercase tracking-wider block">Official Extensions Registry</span>
                <h3 className="text-base font-black text-slate-800 leading-tight">MediCert Cloud Marketplace</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">Expand clinical compliance and services with plug-ins.</p>
              </div>
              <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-3 py-1.5 rounded-none text-[10px] font-black text-[color:var(--t-600)] flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse"></span>
                <span>Registry Server Active</span>
              </div>
            </div>

            {MARKETPLACE_ADDONS.filter(addon => !packages.some(p => p.id === addon.id)).length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-300 rounded-none bg-white">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">All Available Marketplace Add-ons Installed</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Your MediCert workspace is running the maximum suite configuration.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MARKETPLACE_ADDONS
                  .filter(addon => !packages.some(p => p.id === addon.id))
                  .map((addon) => (
                    <div key={addon.id} className="bg-white border border-slate-200 hover:border-[color:var(--t-200)] p-4.5 rounded-none flex flex-col justify-between gap-4 transition-all text-slate-700 shadow-none">
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
                        className="w-full h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--dark)] active:bg-slate-900 text-white rounded-none text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Hot-Install Package</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
