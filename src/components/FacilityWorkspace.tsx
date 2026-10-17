import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Calendar, Users, Award, ShieldCheck, CheckCircle2, XCircle, Clock, Plus,
  Search, Filter, AlertCircle, FileText, Send, Phone, Mail, MapPin, ExternalLink,
  RefreshCw, ChevronDown, ChevronUp, UserCheck, Stethoscope, AlertTriangle, Check,
  MessageSquare, FileCheck, Lock, DollarSign, Zap, Star, Download, ShieldAlert,
  CheckSquare, Square, Grid, AlertOctagon, UserCog, UserPlus, Trash2, CalendarDays, Eye
} from 'lucide-react';
import DashboardHeader, {
  BannerRow, BannerIdentity, BannerBadge, BannerKpis, DashboardTab, bannerPrimaryBtn
} from './DashboardHeader';

type Tab = 'shifts' | 'roster' | 'locums' | 'finance' | 'vault' | 'incidents' | 'team' | 'cases' | 'profile';

interface FacilityProfile {
  id: string;
  name: string;
  kind: string;
  city: string;
  state: string;
  address: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  licenceNo: string;
  licenceExpiry: string;
  licenceCheckedAt: string;
  licenceReference: string;
  isLicenceValid: boolean;
  accreditations: Array<{ body: string; number: string; validUntil: string; reference?: string }>;
  specialties: string[];
  services: Record<string, boolean>;
  mhtcMember: boolean;
  active: boolean;
}

interface FacilityStats {
  activeVacancies: number;
  pendingApplicants: number;
  acceptedLocums: number;
  patientCases: number;
}

interface Application {
  id: string;
  jobId: string;
  userId: string;
  applicantName: string;
  applicantRole: string;
  applicantLicense: string | null;
  applicantApcExpiry: string | null;
  applicantRate: number | null;
  specialization: string;
  experienceYears: number;
  rating: number;
  avatar: string;
  status: 'pending' | 'accepted' | 'declined';
  appliedAt: string;
  decisionAt: string | null;
  decisionBy: string | null;
  decisionNotes: string | null;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  scheduledHours?: number;
  actualHours?: number | null;
  timesheetStatus?: 'unstarted' | 'on_duty' | 'submitted' | 'approved' | 'disputed';
  supervisorNotes?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  totalPayoutMyr?: number | null;
}

interface FacilityJob {
  id: string;
  title: string;
  hospitalName: string;
  type: string;
  sector?: string;
  roleRequired?: 'doctor' | 'nurse' | 'any';
  specialtyRequired: string;
  salaryRange: string;
  location: string;
  city: string;
  status: 'Active' | 'Closed';
  postedAt: string;
  applicantsCount: number;
  applications: Application[];
  pendingCount: number;
  acceptedCount: number;
  requirements: string[];
  description: string;
  isUrgent?: boolean;
  surgeBonusMyr?: number;
  instantClaim?: boolean;
  urgentNote?: string;
}

interface LocumProfile {
  profileId: string;
  name: string;
  role: 'doctor' | 'nurse';
  specialization: string;
  languages: string[];
  city: string;
  states: string[];
  specialties: string[];
  minRate: number | null;
  ratePeriod: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  note: string | null;
  registry: string | null;
  registeredInMalaysia: boolean;
  apcValidUntil: string | null;
  apcStatus: 'valid' | 'expiring' | 'expired' | 'none';
  verified: boolean;
}

interface PatientCase {
  id: string;
  status: string;
  summary: string;
  patient: string;
  patientEmail?: string | null;
  country: string;
  specialty?: string;
  preferredFrom?: string;
  preferredTo?: string;
  needs?: Record<string, any>;
  quotesCount?: number;
  latestQuote?: {
    id: string;
    version: number;
    total: number;
    status: string;
    validUntil: string;
  } | null;
  updatedAt: string;
  createdAt?: string;
}

interface FacilityDocument {
  id: string;
  facilityId: string;
  docType: string;
  title: string;
  referenceNo: string | null;
  issuer: string | null;
  validFrom: string | null;
  validUntil: string | null;
  fileUrl: string | null;
  status: string;
  verifiedBy: string | null;
  createdAt: string;
}

interface FacilityMessage {
  id: string;
  jobId: string;
  applicantUserId: string;
  senderUserId: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
  mine: boolean;
}

interface PendingTimesheet {
  id: string;
  jobId: string;
  applicantUserId: string;
  applicantName: string;
  applicantRole: string;
  specialization?: string;
  licenseNumber?: string;
  hourlyRate: number;
  actualHours: number;
  totalPayoutMyr: number;
  supervisorNotes?: string;
  approvedAt: string;
  approvedBy?: string;
  timesheetStatus: string;
}

interface PayoutBatch {
  id: string;
  facilityId: string;
  batchReference: string;
  periodStart?: string;
  periodEnd?: string;
  totalAmountMyr: number;
  totalShifts: number;
  status: 'draft' | 'disbursed';
  bankName?: string;
  disbursedAt?: string;
  disbursedBy?: string;
  createdAt: string;
}

interface LocumEvaluation {
  id: string;
  facilityId: string;
  jobId: string;
  applicantUserId: string;
  applicantName: string;
  applicantRole: string;
  punctualityRating: number;
  clinicalSkillRating: number;
  documentationRating: number;
  teamworkRating: number;
  overallScore: number;
  notes?: string;
  isPreferred: boolean;
  isBlacklisted: boolean;
  incidentReported: boolean;
  incidentSummary?: string;
  evaluatedBy: string;
  createdAt: string;
}

interface FacilityTeamMember {
  id: string;
  facilityId: string;
  userId?: string | null;
  name: string;
  email: string;
  role: 'medical_director' | 'ward_supervisor' | 'hr_staffing' | 'finance_officer';
  department: string;
  status: string;
  invitedBy?: string;
  createdAt: string;
}

interface FacilityIncident {
  id: string;
  facilityId: string;
  jobId?: string | null;
  locumName: string;
  locumRole: string;
  incidentType: 'near_miss' | 'medication_error' | 'patient_fall' | 'protocol_deviation' | 'sentinel_event';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  department: string;
  incidentDate: string;
  description: string;
  immediateAction?: string;
  rootCauseAnalysis?: string;
  kkmNotified: boolean;
  kkmReferenceNo?: string;
  status: 'investigating' | 'capa_in_progress' | 'closed';
  reportedBy: string;
  createdAt: string;
}

export default function FacilityWorkspace() {
  const [tab, setTab] = useState<Tab>('shifts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facility, setFacility] = useState<FacilityProfile | null>(null);
  const [stats, setStats] = useState<FacilityStats>({
    activeVacancies: 0, pendingApplicants: 0, acceptedLocums: 0, patientCases: 0,
  });

  // Statutory Documents Vault state
  const [documents, setDocuments] = useState<FacilityDocument[]>([]);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('act586_licence');
  const [newDocRef, setNewDocRef] = useState('');
  const [newDocIssuer, setNewDocIssuer] = useState('Ministry of Health Malaysia (CKAPS)');
  const [newDocValidUntil, setNewDocValidUntil] = useState('2029-12-31');
  const [docSubmitting, setDocSubmitting] = useState(false);

  // Coordination Chat Modal state
  const [chatModal, setChatModal] = useState<{
    jobId: string;
    jobTitle: string;
    applicantUserId: string;
    applicantName: string;
    applicantRole: string;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<FacilityMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  // Shifts state
  const [jobs, setJobs] = useState<FacilityJob[]>([]);
  const [jobFilter, setJobFilter] = useState<'all' | 'pending' | 'active'>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    jobId: string;
    applicant: Application;
    action: 'accepted' | 'declined';
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Timesheet Modal state
  const [timesheetModal, setTimesheetModal] = useState<{
    jobId: string;
    jobTitle: string;
    applicant: Application;
  } | null>(null);
  const [timesheetHours, setTimesheetHours] = useState('8.0');
  const [timesheetNotes, setTimesheetNotes] = useState('Clinical shift completed. Hours verified against ward roster.');
  const [timesheetSubmitting, setTimesheetSubmitting] = useState(false);

  // New Job Modal state
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobRole, setNewJobRole] = useState<'doctor' | 'nurse' | 'any'>('doctor');
  const [newJobType, setNewJobType] = useState('Locum');
  const [newJobSpecialty, setNewJobSpecialty] = useState('');
  const [newJobSalaryMin, setNewJobSalaryMin] = useState('80');
  const [newJobSalaryMax, setNewJobSalaryMax] = useState('120');
  const [newJobSalaryPeriod, setNewJobSalaryPeriod] = useState('hour');
  const [newJobLocation, setNewJobLocation] = useState('Emergency Department / Main Wing');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSubmitting, setNewJobSubmitting] = useState(false);

  // Locums state
  const [locums, setLocums] = useState<LocumProfile[]>([]);
  const [locumSearch, setLocumSearch] = useState('');
  const [locumRoleFilter, setLocumRoleFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [inviteModal, setInviteModal] = useState<LocumProfile | null>(null);
  const [inviteMessage, setInviteMessage] = useState('Greetings. Pantai Medical Centre Bangsar would like to invite you for upcoming clinical locum coverage.');
  const [inviteJobId, setInviteJobId] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Cases state
  const [cases, setCases] = useState<PatientCase[]>([]);

  // Phase 4: Batch Financial Reconciliation state
  const [pendingTimesheets, setPendingTimesheets] = useState<PendingTimesheet[]>([]);
  const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>([]);
  const [selectedTimesheetIds, setSelectedTimesheetIds] = useState<string[]>([]);
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [batchBank, setBatchBank] = useState('Maybank Corporate (BizChannel DuitNow Bulk)');
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [lhdnModal, setLhdnModal] = useState<PayoutBatch | null>(null);

  // Phase 4: Emergency Surge Broadcast Modal state
  const [surgeModal, setSurgeModal] = useState<{
    jobId: string;
    jobTitle: string;
    baseRate: number;
  } | null>(null);
  const [surgeBonus, setSurgeBonus] = useState('25');
  const [surgeInstantClaim, setSurgeInstantClaim] = useState(true);
  const [surgeNote, setSurgeNote] = useState('Immediate clinical locum coverage required. KKM/MMC registered staff priority dispatch.');
  const [surgeSubmitting, setSurgeSubmitting] = useState(false);

  // Phase 4: Locum Performance & Clinical Governance Scorecard state
  const [evalModal, setEvalModal] = useState<{
    jobId: string;
    applicant: Application;
  } | null>(null);
  const [evalPunctuality, setEvalPunctuality] = useState(5);
  const [evalClinical, setEvalClinical] = useState(5);
  const [evalDoc, setEvalDoc] = useState(5);
  const [evalTeam, setEvalTeam] = useState(5);
  const [evalNotes, setEvalNotes] = useState('Demonstrated high clinical diligence and patient safety compliance.');
  const [evalPreferred, setEvalPreferred] = useState(true);
  const [evalBlacklist, setEvalBlacklist] = useState(false);
  const [evalIncident, setEvalIncident] = useState(false);
  const [evalIncidentNotes, setEvalIncidentNotes] = useState('');
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  const [evaluations, setEvaluations] = useState<LocumEvaluation[]>([]);

  // Phase 5: Multi-Ward Roster Matrix state
  const [rosterWardFilter, setRosterWardFilter] = useState<string>('all');
  const [rosterWeekOffset, setRosterWeekOffset] = useState<number>(0);

  // Phase 5: Multi-Staff RBAC Management state
  const [teamMembers, setTeamMembers] = useState<FacilityTeamMember[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'medical_director' | 'ward_supervisor' | 'hr_staffing' | 'finance_officer'>('ward_supervisor');
  const [newStaffDept, setNewStaffDept] = useState('Nursing Administration');
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Phase 5: Statutory Clinical Incident Governance state
  const [incidents, setIncidents] = useState<FacilityIncident[]>([]);
  const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);
  const [incidentType, setIncidentType] = useState<'near_miss' | 'medication_error' | 'patient_fall' | 'protocol_deviation' | 'sentinel_event'>('near_miss');
  const [incidentSeverity, setIncidentSeverity] = useState<'low' | 'moderate' | 'high' | 'critical'>('low');
  const [incidentDept, setIncidentDept] = useState('Emergency Department');
  const [incidentLocum, setIncidentLocum] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentAction, setIncidentAction] = useState('');
  const [incidentRca, setIncidentRca] = useState('');
  const [incidentKkmNotified, setIncidentKkmNotified] = useState(true);
  const [incidentKkmRef, setIncidentKkmRef] = useState('');
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [kkmReportModal, setKkmReportModal] = useState<FacilityIncident | null>(null);

  // Feedback banner
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFacilityData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facility/me');
      const data = await res.json();
      if (data.status === 'success') {
        setFacility(data.data.facility);
        setStats(data.data.stats);
      } else {
        setError(data.message || 'Unable to load facility profile');
      }

      const jobsRes = await fetch('/api/facility/jobs');
      const jobsData = await jobsRes.json();
      if (jobsData.status === 'success') {
        setJobs(jobsData.data);
        if (jobsData.data.length > 0 && !expandedJobId) {
          setExpandedJobId(jobsData.data[0].id);
        }
      }

      // Fetch locums
      const locRes = await fetch('/api/locums');
      const locData = await locRes.json();
      if (locData.status === 'success') {
        setLocums(locData.data);
      }

      // Fetch facility cases
      const casesRes = await fetch('/api/facility/cases');
      const casesData = await casesRes.json();
      if (casesData.status === 'success') {
        setCases(casesData.data);
      }

      // Fetch statutory documents vault
      const docsRes = await fetch('/api/facility/documents');
      const docsData = await docsRes.json();
      if (docsData.status === 'success') {
        setDocuments(docsData.data);
      }

      // Fetch financial payouts & timesheets (Phase 4)
      const payRes = await fetch('/api/facility/payouts');
      const payData = await payRes.json();
      if (payData.status === 'success') {
        setPendingTimesheets(payData.data.pendingTimesheets || []);
        setPayoutBatches(payData.data.batches || []);
      }

      // Fetch evaluations (Phase 4)
      const evRes = await fetch('/api/facility/evaluations');
      const evData = await evRes.json();
      if (evData.status === 'success') {
        setEvaluations(evData.data || []);
      }

      // Fetch team members (Phase 5)
      const teamRes = await fetch('/api/facility/team');
      const teamData = await teamRes.json();
      if (teamData.status === 'success') {
        setTeamMembers(teamData.data || []);
      }

      // Fetch incidents (Phase 5)
      const incRes = await fetch('/api/facility/incidents');
      const incData = await incRes.json();
      if (incData.status === 'success') {
        setIncidents(incData.data || []);
      }
    } catch {
      setError('Server communication error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [expandedJobId]);

  useEffect(() => {
    loadFacilityData();
  }, [loadFacilityData]);

  // Handle Accept or Decline Application
  const handleDecisionSubmit = async () => {
    if (!decisionModal) return;
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/facility/jobs/${decisionModal.jobId}/applicants/${decisionModal.applicant.userId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionModal.action,
          notes: decisionNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({
          type: 'success',
          text: decisionModal.action === 'accepted'
            ? `Application successfully accepted! ${decisionModal.applicant.applicantName} has been officially scheduled.`
            : `Application from ${decisionModal.applicant.applicantName} has been declined.`,
        });
        setDecisionModal(null);
        setDecisionNotes('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not process decision.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setActionSubmitting(false);
    }
  };

  // Handle Approve Timesheet
  const handleApproveTimesheet = async () => {
    if (!timesheetModal) return;
    setTimesheetSubmitting(true);
    try {
      const res = await fetch(`/api/facility/jobs/${timesheetModal.jobId}/applicants/${timesheetModal.applicant.userId}/timesheet/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualHours: Number(timesheetHours) || 8.0,
          supervisorNotes: timesheetNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setTimesheetModal(null);
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not approve timesheet.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setTimesheetSubmitting(false);
    }
  };

  // Handle Toggle Job Status (Close / Reopen / Fill)
  const handleUpdateJobStatus = async (jobId: string, nextStatus: 'Active' | 'Closed' | 'Filled' | 'Cancelled') => {
    try {
      const res = await fetch(`/api/facility/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Shift status successfully updated to "${nextStatus}".` });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not update shift status.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  // Handle Post New Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobSpecialty.trim()) {
      setNotificationMsg({ type: 'error', text: 'Please fill in all mandatory job fields.' });
      return;
    }
    setNewJobSubmitting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName: facility?.name || 'Medical Centre',
          title: newJobTitle.trim(),
          type: newJobType,
          sector: 'private',
          roleRequired: newJobRole,
          specialtyRequired: newJobSpecialty.trim(),
          salaryMin: Number(newJobSalaryMin) || null,
          salaryMax: Number(newJobSalaryMax) || null,
          salaryPeriod: newJobSalaryPeriod,
          location: newJobLocation.trim(),
          city: facility?.city || 'Kuala Lumpur',
          state: facility?.state || 'Kuala Lumpur',
          description: newJobDesc.trim() || `Licensed clinical facility seeking credentialed ${newJobRole} for shift roster.`,
          facilityId: facility?.id,
          acceptsForeign: false,
          visaSupport: false,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Job listing "${newJobTitle}" published successfully with Act 586 compliance!` });
        setShowNewJobModal(false);
        setNewJobTitle('');
        setNewJobSpecialty('');
        setNewJobDesc('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not publish shift opening.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setNewJobSubmitting(false);
    }
  };

  // Handle Invite Locum
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteModal) return;
    setInviteSubmitting(true);
    try {
      const res = await fetch(`/api/locums/${inviteModal.profileId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inviteMessage.trim(),
          jobId: inviteJobId || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setInviteSuccess(`Invitation sent to ${inviteModal.name}. They will receive an immediate notification.`);
        setTimeout(() => {
          setInviteSuccess('');
          setInviteModal(null);
        }, 2200);
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not send invitation.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Handle Chat with Practitioner
  const handleOpenChat = async (jobId: string, jobTitle: string, app: Application) => {
    setChatModal({
      jobId,
      jobTitle,
      applicantUserId: app.userId,
      applicantName: app.applicantName,
      applicantRole: app.applicantRole,
    });
    setChatLoading(true);
    try {
      const res = await fetch(`/api/facility/jobs/${jobId}/applicants/${app.userId}/messages`);
      const data = await res.json();
      if (data.status === 'success') {
        setChatMessages(data.data);
      }
    } catch {
      console.error('Failed to load messages');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatModal || !chatInput.trim()) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/facility/jobs/${chatModal.jobId}/applicants/${chatModal.applicantUserId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setChatMessages(prev => [...prev, data.data]);
        setChatInput('');
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Failed to send message.' });
    } finally {
      setChatSending(false);
    }
  };

  // Handle Add Document to Vault
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    setDocSubmitting(true);
    try {
      const res = await fetch('/api/facility/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: newDocType,
          title: newDocTitle.trim(),
          referenceNo: newDocRef.trim() || undefined,
          issuer: newDocIssuer.trim() || undefined,
          validUntil: newDocValidUntil || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Statutory certificate "${newDocTitle}" successfully logged to audit vault!` });
        setShowAddDocModal(false);
        setNewDocTitle('');
        setNewDocRef('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not log document.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setDocSubmitting(false);
    }
  };

  // Phase 4: Emergency Surge Broadcast Handler
  const handleSurgeBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeModal) return;
    setSurgeSubmitting(true);
    try {
      const res = await fetch(`/api/facility/jobs/${surgeModal.jobId}/surge-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surgeBonusMyr: Number(surgeBonus) || 25,
          urgentNote: surgeNote.trim(),
          instantClaim: surgeInstantClaim,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setSurgeModal(null);
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not dispatch surge call.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setSurgeSubmitting(false);
    }
  };

  // Phase 4: Batch Financial Settlement Handlers
  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTimesheetIds.length === 0) return;
    setBatchSubmitting(true);
    try {
      const res = await fetch('/api/facility/payouts/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timesheetIds: selectedTimesheetIds,
          bankName: batchBank,
          periodStart: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
          periodEnd: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setShowCreateBatchModal(false);
        setSelectedTimesheetIds([]);
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Batch creation failed.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleDisburseBatch = async (batchId: string) => {
    try {
      const res = await fetch(`/api/facility/payouts/batches/${batchId}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Disbursement failed.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    }
  };

  const handleExportBatchCsv = (batch: PayoutBatch) => {
    const headers = ['Beneficiary Name', 'Role', 'License/Registration No', 'Bank Code', 'Batch Reference', 'Gross Amount MYR', 'Tax Exemption Code', 'Status'];
    const rows = [
      ['Dr. Siti Aisyah binti Rahman', 'Doctor', 'MMC-48912', 'MAYBEMYKL', batch.batchReference, '960.00', 'SST-EXEMPT-MED', 'DISBURSED'],
      ['Nurse Nurul Huda binti Ismail', 'Nurse', 'LJM-88214', 'CIMBMYKL', batch.batchReference, '480.00', 'SST-EXEMPT-MED', 'DISBURSED'],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${batch.batchReference}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Phase 4: Locum Clinical Evaluation Handler
  const handleEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalModal) return;
    setEvalSubmitting(true);
    try {
      const res = await fetch('/api/facility/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: evalModal.jobId,
          applicantUserId: evalModal.applicant.userId,
          applicantName: evalModal.applicant.applicantName,
          applicantRole: evalModal.applicant.applicantRole,
          punctualityRating: evalPunctuality,
          clinicalSkillRating: evalClinical,
          documentationRating: evalDoc,
          teamworkRating: evalTeam,
          notes: evalNotes.trim(),
          isPreferred: evalPreferred,
          isBlacklisted: evalBlacklist,
          incidentReported: evalIncident,
          incidentSummary: evalIncident ? evalIncidentNotes.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setEvalModal(null);
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Evaluation submission failed.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setEvalSubmitting(false);
    }
  };

  // Phase 5: Multi-Staff RBAC Handlers
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;
    setStaffSubmitting(true);
    try {
      const res = await fetch('/api/facility/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName.trim(),
          email: newStaffEmail.trim(),
          role: newStaffRole,
          department: newStaffDept.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setShowAddStaffModal(false);
        setNewStaffName('');
        setNewStaffEmail('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not add team member.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleRemoveStaff = async (id: string) => {
    try {
      const res = await fetch(`/api/facility/team/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    }
  };

  // Phase 5: Statutory Clinical Incident Handlers
  const handleAddIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDesc.trim() || !incidentDept.trim()) return;
    setIncidentSubmitting(true);
    try {
      const res = await fetch('/api/facility/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentType,
          severity: incidentSeverity,
          department: incidentDept.trim(),
          locumName: incidentLocum.trim() || undefined,
          incidentDate: new Date().toISOString().slice(0, 10),
          description: incidentDesc.trim(),
          immediateAction: incidentAction.trim() || undefined,
          rootCauseAnalysis: incidentRca.trim() || undefined,
          kkmNotified: incidentKkmNotified,
          kkmReferenceNo: incidentKkmRef.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setShowAddIncidentModal(false);
        setIncidentDesc('');
        setIncidentAction('');
        setIncidentRca('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not log incident.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setIncidentSubmitting(false);
    }
  };

  const handleUpdateIncidentStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/facility/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    }
  };

  const tabs: DashboardTab<Tab>[] = [
    { id: 'shifts', label: 'Shift Vacancies & Applicants', icon: Calendar, count: stats.pendingApplicants },
    { id: 'roster', label: 'Multi-Ward Roster Matrix', icon: Grid, count: jobs.filter(j => j.status === 'Active').length },
    { id: 'locums', label: 'Verified Locum Roster', icon: Users, count: locums.length },
    { id: 'finance', label: 'Timesheet Settlement & Payouts', icon: DollarSign, count: pendingTimesheets.length },
    { id: 'vault', label: 'Act 586 Statutory Vault', icon: FileCheck, count: documents.length },
    { id: 'incidents', label: 'Clinical Incident Governance', icon: ShieldAlert, count: incidents.filter(i => i.status !== 'closed').length },
    { id: 'team', label: 'Facility Staff & RBAC', icon: UserCog, count: teamMembers.length },
    { id: 'cases', label: 'Patient Referrals & Quotes', icon: FileText, count: stats.patientCases },
    { id: 'profile', label: 'Facility Licence & Standards', icon: ShieldCheck },
  ];

  const filteredJobs = jobs.filter(j => {
    if (jobFilter === 'pending') return j.pendingCount > 0;
    if (jobFilter === 'active') return j.status === 'Active';
    return true;
  });

  const filteredLocums = locums.filter(l => {
    if (locumRoleFilter !== 'all' && l.role !== locumRoleFilter) return false;
    if (locumSearch) {
      const q = locumSearch.toLowerCase();
      const matchName = l.name.toLowerCase().includes(q);
      const matchSpec = l.specialization.toLowerCase().includes(q);
      const matchCity = l.city.toLowerCase().includes(q);
      const matchState = l.states.some(s => s.toLowerCase().includes(q));
      return matchName || matchSpec || matchCity || matchState;
    }
    return true;
  });

  return (
    <div className="w-full space-y-0 text-slate-800 font-sans">
      {/* Institutional Top Dashboard Header */}
      <DashboardHeader
        fullWidth={true}
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        tabsLabel="Facility workspace sections"
      >
        <BannerRow
          identity={
            <BannerIdentity
              as="h1"
              icon={Building2}
              name={facility?.name || 'Clinic & Hospital Facility Workspace'}
              badges={
                <div className="flex flex-wrap items-center gap-1.5">
                  <BannerBadge tone="brand">KKM Act 586 Licensed</BannerBadge>
                  {facility?.accreditations?.some(a => a.body === 'MSQH') && (
                    <BannerBadge tone="success">MSQH Accredited</BannerBadge>
                  )}
                  {facility?.mhtcMember && (
                    <BannerBadge tone="brand">MHTC Member</BannerBadge>
                  )}
                </div>
              }
              description={
                facility
                  ? `${facility.address} · Licence: ${facility.licenceNo} (Valid until ${facility.licenceExpiry})`
                  : 'Loading clinical facility telemetry…'
              }
            />
          }
          aside={
            <BannerKpis
              items={[
                { value: stats.activeVacancies, label: 'Active Openings' },
                { value: stats.pendingApplicants, label: 'Pending Applicants' },
                { value: stats.acceptedLocums, label: 'Scheduled Shifts' },
                { value: stats.patientCases, label: 'Patient Quotes' },
              ]}
            />
          }
        />
      </DashboardHeader>

      {/* Main Workspace Body */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Notifications and Alerts */}
        {notificationMsg && (
          <div
            role="alert"
            className={`p-4 border flex items-center justify-between text-sm font-semibold rounded-none ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notificationMsg.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <span>{notificationMsg.text}</span>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
            <AlertTriangle className="h-5 w-5 inline mr-2" />
            {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: SHIFT VACANCIES & APPLICANTS RECRUITMENT LOOP */}
        {/* ========================================================================= */}
        {tab === 'shifts' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Filter Openings:</span>
                <div className="inline-flex border border-[color:var(--t-200)] p-0.5 bg-slate-50">
                  <button
                    onClick={() => setJobFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      jobFilter === 'all'
                        ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All Vacancies ({jobs.length})
                  </button>
                  <button
                    onClick={() => setJobFilter('pending')}
                    className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      jobFilter === 'pending'
                        ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Needs Decision ({jobs.filter(j => j.pendingCount > 0).length})
                  </button>
                  <button
                    onClick={() => setJobFilter('active')}
                    className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      jobFilter === 'active'
                        ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Active Openings ({jobs.filter(j => j.status === 'Active').length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(true)}
                  className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold flex items-center gap-2 border border-[color:var(--t-700)] shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Post New Shift Opening
                </button>
                <button
                  type="button"
                  onClick={loadFacilityData}
                  className="p-2 border border-[color:var(--t-200)] bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                  title="Refresh listings"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Statutory Compliance Callout */}
            <div className="bg-amber-50/70 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase tracking-wider block text-amber-800">
                  KKM Act 586 Statutory Recruitment Standard
                </span>
                Private Healthcare Facilities and Services Act 1998 requires that private clinics and hospitals verify that all practicing doctors hold an active Malaysian Medical Council (MMC) registration with a valid Annual Practising Certificate (APC), and all nurses hold active Malaysian Nursing Board (LJM) certificates. CareVerified automates this credential audit before applicants reach your terminal.
              </div>
            </div>

            {/* Vacancies and Applicant List */}
            {filteredJobs.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-12 text-center space-y-3">
                <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-extrabold text-slate-900">No vacancies matching criteria</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click "Post New Shift Opening" above to publish shifts for verified doctors or nurses.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map(job => {
                  const isExpanded = expandedJobId === job.id;
                  return (
                    <div
                      key={job.id}
                      className="bg-white border border-[color:var(--t-200)] transition-shadow hover:shadow-xs"
                    >
                      {/* Job Header Bar */}
                      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--t-100)] bg-slate-50/50">
                        <div className="space-y-1.5 min-w-[280px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-[color:var(--t-600)] text-white text-[10px] font-black uppercase tracking-wider">
                              {job.type}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider">
                              For: {job.roleRequired || 'Any'}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              Posted: {new Date(job.postedAt).toLocaleDateString('en-MY')}
                            </span>
                          </div>
                          <h2 className="text-lg font-black text-[color:var(--ink)] tracking-tight">
                            {job.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                            <span className="flex items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                              {job.specialtyRequired}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {job.location}, {job.city}
                            </span>
                            <span className="font-extrabold text-[color:var(--t-700)]">
                              {job.salaryRange}
                            </span>
                          </div>
                        </div>

                        {/* Status & Toggle */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-slate-700 block">
                              Applicants ({job.applications.length})
                            </span>
                            {job.pendingCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-extrabold border border-amber-300">
                                <Clock className="h-3 w-3" />
                                {job.pendingCount} Pending Decision
                              </span>
                            ) : job.acceptedCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                {job.acceptedCount} Scheduled
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">No applicants yet</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {job.status === 'Active' && (
                              job.isUrgent ? (
                                <span className="px-2 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs animate-pulse">
                                  <Zap className="h-3 w-3 fill-white" />
                                  Surge (+RM {job.surgeBonusMyr || 25}/h)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSurgeModal({
                                      jobId: job.id,
                                      jobTitle: job.title,
                                      baseRate: 80,
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer border border-amber-600 shadow-xs"
                                  title="Dispatch Emergency SOS Roster Call"
                                >
                                  <Zap className="h-3 w-3 fill-white" />
                                  SOS Surge Call
                                </button>
                              )
                            )}

                            <select
                              value={job.status}
                              onChange={(e) => handleUpdateJobStatus(job.id, e.target.value as any)}
                              className={`text-[11px] font-black uppercase px-2 py-1.5 border cursor-pointer outline-none ${
                                job.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : job.status === 'Filled'
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                              title="Update Shift Vacancy Status"
                            >
                              <option value="Active">● Active</option>
                              <option value="Filled">✔ Filled</option>
                              <option value="Closed">✕ Closed</option>
                              <option value="Cancelled">⊘ Cancelled</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                              className="p-2 border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] text-slate-700 cursor-pointer flex items-center gap-1 text-xs font-bold"
                            >
                              <span>{isExpanded ? 'Hide' : 'Review'}</span>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Applicants Review Panel */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 bg-white border-t border-[color:var(--t-200)] space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                              Applicant Verification & Decision Terminal ({job.applications.length})
                            </h3>
                            <span className="text-xs text-slate-500">
                              Job ID: <code className="font-mono">{job.id}</code>
                            </span>
                          </div>

                          {job.applications.length === 0 ? (
                            <div className="p-6 bg-slate-50 text-center text-xs text-slate-500">
                              No practitioners have applied for this vacancy yet. You can invite qualified practitioners directly from the "Verified Locum Roster" tab.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {job.applications.map(app => (
                                <div
                                  key={app.id}
                                  className={`p-4 border transition-colors ${
                                    app.status === 'accepted'
                                      ? 'bg-emerald-50/40 border-emerald-300'
                                      : app.status === 'declined'
                                      ? 'bg-slate-50 border-slate-200 opacity-70'
                                      : 'bg-white border-[color:var(--t-200)] hover:border-[color:var(--t-400)]'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-4">
                                    {/* Applicant Details */}
                                    <div className="flex items-start gap-3.5 min-w-[260px]">
                                      <img
                                        src={app.avatar}
                                        alt={app.applicantName}
                                        className="w-12 h-12 object-cover border border-slate-200 shrink-0 bg-slate-100"
                                      />
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-black text-slate-900">
                                            {app.applicantName}
                                          </span>
                                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                                            {app.applicantRole}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                          <span>Registration: <strong className="font-mono text-slate-800">{app.applicantLicense || 'DEMO-MMC-0001'}</strong></span>
                                          <span>APC Expiry: <strong className="text-slate-800">{app.applicantApcExpiry || '2029-12-31'}</strong></span>
                                          {app.applicantRate && (
                                            <span className="text-[color:var(--t-700)] font-black">
                                              Rate: RM {app.applicantRate}/hr
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          Specialization: {app.specialization} · Experience: {app.experienceYears} yrs · Applied: {new Date(app.appliedAt).toLocaleDateString('en-MY')}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Decision Status / Actions */}
                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                                      {app.status === 'pending' ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setDecisionModal({ jobId: job.id, applicant: app, action: 'accepted' })}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 border border-emerald-700 cursor-pointer shadow-xs"
                                          >
                                            <Check className="h-4 w-4" />
                                            Accept Application
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDecisionModal({ jobId: job.id, applicant: app, action: 'declined' })}
                                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer"
                                          >
                                            <XCircle className="h-4 w-4" />
                                            Decline
                                          </button>
                                        </div>
                                      ) : app.status === 'accepted' ? (
                                        <div className="flex flex-col items-end gap-1.5">
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider">
                                              <CheckCircle2 className="h-3 w-3" />
                                              Accepted
                                            </span>
                                            {app.timesheetStatus === 'approved' ? (
                                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase border border-emerald-300">
                                                Timesheet Approved: {app.actualHours} hrs (RM {app.totalPayoutMyr?.toFixed(2)})
                                              </span>
                                            ) : app.timesheetStatus === 'submitted' ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setTimesheetModal({ jobId: job.id, jobTitle: job.title, applicant: app });
                                                  setTimesheetHours(String(app.actualHours || app.scheduledHours || 8.0));
                                                }}
                                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider border border-amber-600 cursor-pointer animate-pulse"
                                              >
                                                Verify Timesheet ({app.actualHours}h Submitted)
                                              </button>
                                            ) : app.timesheetStatus === 'on_duty' ? (
                                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-black uppercase border border-blue-300">
                                                ● On Duty (Clocked In)
                                              </span>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setTimesheetModal({ jobId: job.id, jobTitle: job.title, applicant: app });
                                                  setTimesheetHours(String(app.scheduledHours || 8.0));
                                                }}
                                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                                              >
                                                Verify Timesheet
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenChat(job.id, job.title, app)}
                                              className="px-2 py-0.5 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-700)] text-[11px] font-black uppercase border border-[color:var(--t-200)] flex items-center gap-1 cursor-pointer"
                                            >
                                              <MessageSquare className="h-3 w-3" />
                                              Shift Chat
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEvalModal({ jobId: job.id, applicant: app });
                                                setEvalNotes(`Shift performance on ${job.title}. Punctual, verified MMC/LJM roster compliance.`);
                                              }}
                                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-black uppercase border border-amber-300 flex items-center gap-1 cursor-pointer"
                                            >
                                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                              Audit Scorecard
                                            </button>
                                            <span className="text-[10px] text-slate-500">
                                              Decided: {app.decisionAt ? new Date(app.decisionAt).toLocaleDateString('en-MY') : 'Scheduled'}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-bold">
                                          Declined
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {app.decisionNotes && (
                                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 border border-slate-200 font-mono">
                                      Notes: {app.decisionNotes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1B: MULTI-WARD ROSTER MATRIX & SHIFT HEATMAP (PHASE 5) */}
        {/* ========================================================================= */}
        {tab === 'roster' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              {/* Ward Selector Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 mr-1">
                  Department / Ward:
                </span>
                {[
                  { id: 'all', label: 'All Wards' },
                  { id: 'ED', label: 'Emergency (ED)' },
                  { id: 'ICU', label: 'ICU / CCU' },
                  { id: 'Ward4B', label: 'General Ward 4B' },
                  { id: 'O&G', label: 'Labour & Delivery' },
                  { id: 'Pediatrics', label: 'Pediatrics / NICU' },
                  { id: 'OT', label: 'Day Surgery & OT' },
                ].map(ward => (
                  <button
                    key={ward.id}
                    onClick={() => setRosterWardFilter(ward.id)}
                    className={`px-3 py-1.5 text-xs font-bold border cursor-pointer transition-colors ${
                      rosterWardFilter === ward.id
                        ? 'bg-[color:var(--t-700)] text-white border-[color:var(--t-800)] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {ward.label}
                  </button>
                ))}
              </div>

              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <div className="inline-flex border border-slate-200">
                  <button
                    onClick={() => setRosterWeekOffset(prev => prev - 1)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border-r border-slate-200 cursor-pointer"
                  >
                    &larr; Prev Week
                  </button>
                  <span className="px-3 py-1.5 text-xs font-black bg-slate-50 text-slate-800 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    {rosterWeekOffset === 0 ? 'Current Week (Oct 12 – 18, 2026)' : `Week Offset: ${rosterWeekOffset > 0 ? '+' : ''}${rosterWeekOffset} wks`}
                  </span>
                  <button
                    onClick={() => setRosterWeekOffset(prev => prev + 1)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 cursor-pointer"
                  >
                    Next Week &rarr;
                  </button>
                </div>
                {rosterWeekOffset !== 0 && (
                  <button
                    onClick={() => setRosterWeekOffset(0)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            {/* Coverage Legend & Quick Metrics */}
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-black uppercase tracking-wider text-slate-500 text-[10px]">Coverage Legend:</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="w-2.5 h-2.5 bg-emerald-600 inline-block"></span> 100% Fully Staffed (Confirmed MMC/LJM)
                </span>
                <span className="flex items-center gap-1.5 font-bold text-amber-800">
                  <span className="w-2.5 h-2.5 bg-amber-500 inline-block"></span> Review Pending (Applicants Awaiting Action)
                </span>
                <span className="flex items-center gap-1.5 font-bold text-rose-800">
                  <span className="w-2.5 h-2.5 bg-rose-600 inline-block"></span> Critical Deficit (Urgent SOS Surge Needed)
                </span>
              </div>
              <div className="text-slate-600 font-semibold">
                Active Ward Openings: <strong className="text-[color:var(--t-700)]">{jobs.filter(j => j.status === 'Active').length}</strong> · Scheduled Locums: <strong className="text-emerald-700">{stats.acceptedLocums}</strong>
              </div>
            </div>

            {/* 7-Day Roster Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {[
                { day: 'Mon', date: 'Oct 12', shifts: jobs.slice(0, 1) },
                { day: 'Tue', date: 'Oct 13', shifts: [] },
                { day: 'Wed', date: 'Oct 14', shifts: jobs.slice(1, 2) },
                { day: 'Thu', date: 'Oct 15', shifts: [] },
                { day: 'Fri', date: 'Oct 16', shifts: jobs.slice(2, 3) },
                { day: 'Sat', date: 'Oct 17', shifts: jobs.filter(j => j.isUrgent) },
                { day: 'Sun', date: 'Oct 18', shifts: jobs.slice(0, 1) },
              ].map((col, idx) => (
                <div key={idx} className="bg-white border border-[color:var(--t-200)] flex flex-col min-h-[380px]">
                  {/* Day Header */}
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-slate-800 block text-xs">{col.day}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{col.date}</span>
                    </div>
                    {col.shifts.length > 0 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                        {col.shifts.length} Shift{col.shifts.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">Rest / In-House</span>
                    )}
                  </div>

                  {/* 3 Shifts Roster Rows */}
                  <div className="p-2 flex-1 space-y-2 flex flex-col justify-between">
                    {/* Morning Slot */}
                    <div className="p-2 border border-slate-100 bg-slate-50/50 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span>AM (07:00-15:00)</span>
                        <span className="text-emerald-700 font-black">● Covered</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 truncate">
                        Dr. Siti Aisyah (MMC)
                      </div>
                      <div className="text-[10px] text-slate-500">Emergency & Trauma</div>
                    </div>

                    {/* Afternoon Slot */}
                    <div className="p-2 border border-slate-100 bg-slate-50/50 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span>PM (14:30-22:30)</span>
                        <span className="text-emerald-700 font-black">● Covered</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 truncate">
                        Nurse Nurul Huda (LJM)
                      </div>
                      <div className="text-[10px] text-slate-500">Ward 4B In-Charge</div>
                    </div>

                    {/* Night Slot */}
                    {col.shifts.some(s => s.isUrgent) ? (
                      <div className="p-2 border border-rose-300 bg-rose-50 space-y-1 animate-pulse">
                        <div className="flex justify-between items-center text-[10px] font-black text-rose-800">
                          <span>Night (22:00-08:00)</span>
                          <span className="bg-rose-600 text-white px-1 py-0.2 text-[8px] uppercase">Surge Deficit</span>
                        </div>
                        <div className="text-[11px] font-black text-rose-950 truncate">
                          Resuscitation Bay Doctor
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const urgentJob = col.shifts.find(s => s.isUrgent);
                            if (urgentJob) {
                              setSurgeModal({ jobId: urgentJob.id, jobTitle: urgentJob.title, baseRate: 80 });
                            }
                          }}
                          className="w-full mt-1 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Zap className="h-2.5 w-2.5 fill-white" />
                          SOS Surge Blast
                        </button>
                      </div>
                    ) : col.shifts.length > 0 ? (
                      <div className="p-2 border border-amber-300 bg-amber-50/60 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-amber-800">
                          <span>Night (22:00-08:00)</span>
                          <span className="text-amber-700 font-black">Pending Review</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 truncate">
                          {col.shifts[0].title}
                        </div>
                        <div className="text-[10px] text-slate-500">{col.shifts[0].salaryRange}</div>
                      </div>
                    ) : (
                      <div className="p-2 border border-dashed border-slate-200 text-center space-y-1">
                        <div className="text-[10px] font-bold text-slate-400">Night (22:00-08:00)</div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewJobTitle(`Night Locum Shift (${col.day})`);
                            setShowNewJobModal(true);
                          }}
                          className="text-[10px] font-bold text-[color:var(--t-700)] hover:underline cursor-pointer"
                        >
                          + Add Night Shift
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VERIFIED LOCUM ROSTER DIRECTORY */}
        {/* ========================================================================= */}
        {tab === 'locums' && (
          <div className="space-y-6">
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[280px] relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search locums by doctor name, specialty, state, or city..."
                  value={locumSearch}
                  onChange={e => setLocumSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[color:var(--t-200)] text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase text-slate-500">Role:</span>
                <button
                  onClick={() => setLocumRoleFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    locumRoleFilter === 'all'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setLocumRoleFilter('doctor')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    locumRoleFilter === 'doctor'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700'
                  }`}
                >
                  Doctors
                </button>
                <button
                  onClick={() => setLocumRoleFilter('nurse')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    locumRoleFilter === 'nurse'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700'
                  }`}
                >
                  Nurses
                </button>
              </div>
            </div>

            {filteredLocums.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-12 text-center text-xs text-slate-500">
                No verified locums found matching search criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLocums.map(loc => (
                  <div
                    key={loc.profileId}
                    className="bg-white border border-[color:var(--t-200)] p-4 flex flex-col justify-between space-y-4 hover:border-[color:var(--t-400)] transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900">{loc.name}</span>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                              {loc.role}
                            </span>
                          </div>
                          <span className="text-xs text-[color:var(--t-700)] font-extrabold block">
                            {loc.specialization}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                          APC Active
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600">
                        <div>Registration: <strong className="font-mono text-slate-800">{loc.registry || 'MMC Registered'}</strong></div>
                        <div>APC Expiry: <strong className="text-slate-800">{loc.apcValidUntil || '2029-12-31'}</strong></div>
                        <div>Available in: <strong className="text-slate-800">{loc.states?.join(', ') || loc.city || 'Kuala Lumpur'}</strong></div>
                        {loc.minRate && (
                          <div className="text-xs font-black text-[color:var(--t-700)]">
                            Min Rate: RM {loc.minRate} / {loc.ratePeriod || 'hour'}
                          </div>
                        )}
                      </div>

                      {loc.note && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 border border-slate-100 italic">
                          "{loc.note}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setInviteModal(loc)}
                      className="w-full py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider border border-[color:var(--t-700)] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Invite to Shift
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PATIENT CASES & TREATMENT QUOTES */}
        {/* ========================================================================= */}
        {tab === 'cases' && (
          <div className="space-y-6">
            <div className="bg-white border border-[color:var(--t-200)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Patient Referrals & Treatment Quotation Desk
                  </h2>
                  <p className="text-xs text-slate-500">
                    Direct patient inquiries, treatment packages, and Ministry of Health compliance logs.
                  </p>
                </div>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold">
                  {cases.length} Total Registered Inquiries
                </span>
              </div>

              {cases.length === 0 ? (
                <div className="p-12 bg-slate-50 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200">
                  <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700">No active patient referral cases currently recorded for this facility.</p>
                  <p className="text-[11px] text-slate-500">Inbound medical travel enquiries and cross-border consultations will appear here automatically.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200">
                  {cases.map(c => (
                    <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{c.patient}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                            Origin: {c.country}
                          </span>
                          {c.specialty && (
                            <span className="px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] text-[10px] font-black uppercase border border-[color:var(--t-200)]">
                              {c.specialty}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{c.summary}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span>Case ID: <code className="font-mono text-slate-600 font-bold">{c.id}</code></span>
                          {c.patientEmail && <span>Contact: <strong className="text-slate-600">{c.patientEmail}</strong></span>}
                          {c.preferredFrom && <span>Requested: <strong className="text-slate-600">{c.preferredFrom}</strong></span>}
                          <span>Updated: {new Date(c.updatedAt).toLocaleDateString('en-MY')}</span>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 text-xs font-black uppercase border ${
                          c.status === 'quoted'
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : c.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : c.status === 'in_treatment'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {c.status.replace('_', ' ')}
                        </span>

                        {c.latestQuote && (
                          <span className="text-xs font-mono font-extrabold text-[color:var(--t-700)]">
                            RM {c.latestQuote.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ACT 586 STATUTORY AUDIT VAULT */}
        {/* ========================================================================= */}
        {tab === 'vault' && (
          <div className="space-y-6">
            <div className="bg-white border border-[color:var(--t-200)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[color:var(--t-100)]">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-emerald-600" />
                    KKM Act 586 Statutory Document & Audit Vault
                  </h2>
                  <p className="text-xs text-slate-500">
                    Verified digital repository for Form B/Form F licences, Bomba fire safety clearances, and radiation operating permits required under Malaysian law.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(true)}
                  className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Log Statutory Certificate
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map(doc => {
                  const isExpired = doc.validUntil && doc.validUntil < new Date().toISOString().slice(0, 10);
                  const isExpiringSoon = doc.validUntil && !isExpired && doc.validUntil <= new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

                  return (
                    <div
                      key={doc.id}
                      className="border border-[color:var(--t-200)] bg-slate-50/50 p-4 space-y-3 hover:border-[color:var(--t-400)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                            {doc.docType.replace('_', ' ')}
                          </span>
                          <h3 className="text-sm font-black text-slate-900 leading-snug">
                            {doc.title}
                          </h3>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                          isExpired
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : isExpiringSoon
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Verified'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600">
                        {doc.referenceNo && <div>Ref File: <strong className="font-mono text-slate-800">{doc.referenceNo}</strong></div>}
                        {doc.issuer && <div>Issuing Body: <span className="text-slate-800 font-semibold">{doc.issuer}</span></div>}
                        {doc.validUntil && (
                          <div>Validity: <strong className={isExpired ? 'text-rose-700 font-bold' : 'text-slate-800 font-bold'}>{doc.validUntil}</strong></div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Audited by: {doc.verifiedBy || 'KKM / CKAPS'}</span>
                        <span className="text-[color:var(--t-700)] font-bold flex items-center gap-1 cursor-pointer hover:underline">
                          <Lock className="h-3 w-3" /> Audit Sealed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4B: BATCH FINANCIAL RECONCILIATION & DUITNOW SETTLEMENT */}
        {/* ========================================================================= */}
        {tab === 'finance' && (
          <div className="space-y-6">
            {/* KPI Banner Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Pending Settlement Payout
                </span>
                <div className="text-2xl font-black text-[color:var(--t-700)] mt-1">
                  RM {pendingTimesheets.reduce((sum, t) => sum + (Number(t.totalPayoutMyr) || 0), 0).toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                  {pendingTimesheets.length} verified timesheets awaiting batching
                </span>
              </div>

              <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Disbursed This Month
                </span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  RM {payoutBatches.filter(b => b.status === 'disbursed').reduce((sum, b) => sum + (Number(b.totalAmountMyr) || 0), 0).toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                  {payoutBatches.filter(b => b.status === 'disbursed').length} batches settled via corporate DuitNow
                </span>
              </div>

              <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Corporate Banking Gateway
                </span>
                <div className="text-base font-black text-slate-800 mt-1">
                  Maybank & CIMB BizChannel
                </div>
                <span className="text-[11px] text-emerald-700 mt-1 block font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> DuitNow Bulk API Ready
                </span>
              </div>

              <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  LHDN e-Invoice Status
                </span>
                <div className="text-base font-black text-slate-800 mt-1">
                  Act 586 Medical Exemption
                </div>
                <span className="text-[11px] text-sky-700 mt-1 block font-bold">
                  MSIC 86101 · TIN Validated
                </span>
              </div>
            </div>

            {/* Section 1: Verified Locum Timesheets Awaiting Batch Settlement */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[color:var(--t-600)]" />
                    Verified Locum Timesheets (Awaiting Corporate Payout)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Clinical ward shift hours signed off by supervisors. Select timesheets to bundle into an automated corporate DuitNow batch.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">
                    {selectedTimesheetIds.length} of {pendingTimesheets.length} selected
                    {selectedTimesheetIds.length > 0 && (
                      <span className="ml-1 text-[color:var(--t-700)] font-black">
                        (RM {pendingTimesheets.filter(t => selectedTimesheetIds.includes(t.id)).reduce((s, t) => s + (Number(t.totalPayoutMyr) || 0), 0).toFixed(2)})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={selectedTimesheetIds.length === 0}
                    onClick={() => setShowCreateBatchModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-emerald-700 disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    <DollarSign className="h-4 w-4" />
                    Generate DuitNow Settlement Batch
                  </button>
                </div>
              </div>

              {pendingTimesheets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                  <div className="font-bold text-slate-700">All verified timesheets are settled</div>
                  <p>When ward supervisors verify locum shifts in the Shift tab, they will queue here for batch settlement.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedTimesheetIds.length === pendingTimesheets.length && pendingTimesheets.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTimesheetIds(pendingTimesheets.map(t => t.id));
                              } else {
                                setSelectedTimesheetIds([]);
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Practitioner & Credentials</th>
                        <th className="p-3">Shift Title / Department</th>
                        <th className="p-3 text-right">Hours Worked</th>
                        <th className="p-3 text-right">Rate / Payout</th>
                        <th className="p-3">Supervisor Sign-off Note</th>
                        <th className="p-3">Approval Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingTimesheets.map(t => {
                        const isSelected = selectedTimesheetIds.includes(t.id);
                        return (
                          <tr
                            key={t.id}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50/30' : ''}`}
                            onClick={() => {
                              setSelectedTimesheetIds(prev =>
                                prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                              );
                            }}
                          >
                            <td className="p-3" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedTimesheetIds(prev =>
                                    e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id)
                                  );
                                }}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-black text-slate-900">{t.applicantName}</div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <span className="uppercase font-bold text-slate-600">{t.applicantRole}</span>
                                <span>·</span>
                                <span className="font-mono text-slate-700">{t.licenseNumber || 'MMC/LJM'}</span>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {jobs.find(j => j.id === t.jobId)?.title || 'Clinical Ward Shift'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-700">
                              {t.actualHours} hrs
                            </td>
                            <td className="p-3 text-right">
                              <div className="font-black text-emerald-700 text-sm">
                                RM {t.totalPayoutMyr.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                @ RM {t.hourlyRate}/hr
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 text-[11px] max-w-xs truncate" title={t.supervisorNotes}>
                              {t.supervisorNotes || 'Verified against ward roster.'}
                            </td>
                            <td className="p-3 text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(t.approvedAt).toLocaleDateString('en-MY')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: Corporate Payout Batches & LHDN Tax Invoices */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[color:var(--t-600)]" />
                    Corporate DuitNow Settlement Batches & Tax Invoices ({payoutBatches.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audited settlement batches ready for bank file disbursement and LHDN compliant e-Invoice generation.
                  </p>
                </div>
              </div>

              {payoutBatches.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No payout settlement batches generated yet. Select pending timesheets above to create your first corporate settlement batch.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {payoutBatches.map(b => (
                    <div
                      key={b.id}
                      className="p-4 border border-slate-200 bg-white hover:border-slate-300 transition-shadow shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 font-mono">
                            {b.batchReference}
                          </span>
                          <div className="font-black text-slate-900 text-base">
                            RM {b.totalAmountMyr.toFixed(2)}
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {b.totalShifts} shift{b.totalShifts > 1 ? 's' : ''} · {b.bankName}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${
                          b.status === 'disbursed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {b.status === 'disbursed' ? '● Disbursed' : '⏳ Pending Bank File'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span>Created: {new Date(b.createdAt).toLocaleDateString('en-MY')}</span>
                        {b.disbursedAt && <span>Disbursed: {new Date(b.disbursedAt).toLocaleDateString('en-MY')}</span>}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {b.status === 'draft' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDisburseBatch(b.id)}
                              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-emerald-700 cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Disburse via DuitNow
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportBatchCsv(b)}
                              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-300 cursor-pointer"
                              title="Download Corporate Payment File"
                            >
                              <Download className="h-3.5 w-3.5" />
                              CSV
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setLhdnModal(b)}
                              className="flex-1 py-1.5 px-3 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-800)] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-[color:var(--t-200)] cursor-pointer"
                            >
                              <FileCheck className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                              LHDN e-Invoice Receipt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportBatchCsv(b)}
                              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-300 cursor-pointer"
                              title="Download Settlement File"
                            >
                              <Download className="h-3.5 w-3.5" />
                              CSV
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: CLINICAL INCIDENT GOVERNANCE & STATUTORY ADVERSE EVENT LOGBOOK */}
        {/* ========================================================================= */}
        {tab === 'incidents' && (
          <div className="space-y-6">
            {/* Header & Governance Banner */}
            <div className="bg-white border border-[color:var(--t-200)] p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Statutory Clinical Incident & Adverse Event Governance Logbook
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200">
                      KKM Act 586 / MSQH Std 3
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-3xl">
                    Mandatory clinical incident reporting, sentinel event escalation, Root Cause Analysis (RCA),
                    Corrective and Preventive Action (CAPA), and official Ministry of Health (KKM) statutory audit records.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddIncidentModal(true)}
                    className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-rose-700 hover:bg-rose-800 text-white cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Log Clinical Incident
                  </button>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Logged</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{incidents.length}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Act 586 audit log</div>
                </div>
                <div className="p-3 bg-amber-50/60 border border-amber-200">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Under Investigation</div>
                  <div className="text-xl font-black text-amber-800 mt-0.5">
                    {incidents.filter(i => i.status === 'investigating').length}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Active triage</div>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-200">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-blue-700">CAPA In Progress</div>
                  <div className="text-xl font-black text-blue-800 mt-0.5">
                    {incidents.filter(i => i.status === 'capa_in_progress').length}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Remediation action</div>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Closed & Audited</div>
                  <div className="text-xl font-black text-emerald-800 mt-0.5">
                    {incidents.filter(i => i.status === 'closed').length}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Compliance cleared</div>
                </div>
              </div>
            </div>

            {/* Incidents List */}
            <div className="space-y-4">
              {incidents.length === 0 ? (
                <div className="bg-white border border-[color:var(--t-200)] p-8 text-center space-y-3">
                  <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">No Clinical Incidents Recorded</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Your facility clinical incident record is pristine. All near-misses, adverse drug events,
                    or clinical deviations must be reported here per KKM guidelines.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddIncidentModal(true)}
                    className="px-4 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-black transition-colors"
                  >
                    Log First Incident
                  </button>
                </div>
              ) : (
                incidents.map((inc) => {
                  const severityBadgeColors = {
                    low: 'bg-slate-100 text-slate-700 border-slate-300',
                    moderate: 'bg-amber-100 text-amber-800 border-amber-300',
                    high: 'bg-orange-100 text-orange-800 border-orange-300',
                    critical: 'bg-rose-100 text-rose-800 border-rose-300',
                  }[inc.severity] || 'bg-slate-100 text-slate-700 border-slate-300';

                  const typeLabels: Record<string, string> = {
                    near_miss: 'Near Miss / Catch',
                    medication_error: 'Medication Administration Error',
                    patient_fall: 'Patient Fall / Bed Injury',
                    protocol_deviation: 'Clinical Protocol Deviation',
                    sentinel_event: 'Sentinel Event (Immediate Escalation)',
                  };

                  return (
                    <div
                      key={inc.id}
                      className={`bg-white border transition-colors ${
                        inc.severity === 'critical' ? 'border-rose-400 bg-rose-50/20' : 'border-[color:var(--t-200)]'
                      } p-5 space-y-4`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 border ${severityBadgeColors}`}>
                              {inc.severity.toUpperCase()} SEVERITY
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                              {typeLabels[inc.incidentType] || inc.incidentType}
                            </span>
                            <span className="text-xs font-mono text-slate-400">ID: {inc.id.slice(0, 8)}</span>
                            {inc.kkmNotified && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                KKM Notified {inc.kkmReferenceNo && `(${inc.kkmReferenceNo})`}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-700">
                            Department: <span className="text-slate-900 font-bold">{inc.department}</span>
                            {inc.locumName && (
                              <> • Staff / Locum Involved: <span className="text-slate-900 font-bold">{inc.locumName} ({inc.locumRole || 'Locum'})</span></>
                            )}
                            {' '}• Incident Date: <span className="text-slate-900 font-bold">{inc.incidentDate}</span>
                          </div>
                        </div>

                        {/* Status switcher & KKM Form View */}
                        <div className="flex items-center gap-2 shrink-0">
                          {inc.kkmNotified && (
                            <button
                              type="button"
                              onClick={() => setKkmReportModal(inc)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-600" />
                              View KKM Form
                            </button>
                          )}

                          {inc.status === 'investigating' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateIncidentStatus(inc.id, 'capa_in_progress')}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 cursor-pointer"
                            >
                              Start CAPA Plan
                            </button>
                          )}
                          {inc.status === 'capa_in_progress' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateIncidentStatus(inc.id, 'closed')}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 cursor-pointer"
                            >
                              Close & Sign Off
                            </button>
                          )}
                          {inc.status === 'closed' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Closed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Incident Narrative */}
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-bold text-slate-900">Incident Synopsis:</span>
                          <p className="text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
                            {inc.description}
                          </p>
                        </div>

                        {inc.immediateAction && (
                          <div>
                            <span className="font-bold text-slate-900">Immediate Clinical Mitigation:</span>
                            <p className="text-slate-600 mt-0.5 leading-relaxed bg-amber-50/50 p-2 border border-amber-200/60">
                              {inc.immediateAction}
                            </p>
                          </div>
                        )}

                        {inc.rootCauseAnalysis && (
                          <div>
                            <span className="font-bold text-slate-900">Root Cause Analysis (RCA) & CAPA Action:</span>
                            <p className="text-slate-600 mt-0.5 leading-relaxed bg-blue-50/50 p-2 border border-blue-200/60">
                              {inc.rootCauseAnalysis}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <span>Reported by: <span className="text-slate-600 font-semibold">{inc.reportedBy}</span></span>
                        <span>Logged: {new Date(inc.createdAt).toLocaleString('en-MY')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: FACILITY STAFF & RBAC MANAGEMENT */}
        {/* ========================================================================= */}
        {tab === 'team' && (
          <div className="space-y-6">
            {/* Header & RBAC Overview */}
            <div className="bg-white border border-[color:var(--t-200)] p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Facility Multi-Staff RBAC Management
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Role-Based Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-3xl">
                    Invite and manage authorized hospital directors, ward matrons, HR administrators, and finance
                    personnel. Enforce granular permissions across shift postings, clinical roster matrix, incident governance, and locum payouts.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(true)}
                    className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-black text-white cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Staff Member
                  </button>
                </div>
              </div>

              {/* RBAC Role Capabilities Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
                <div className="p-3 bg-purple-50/50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-900">Medical Director</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-purple-200 text-purple-800">Tier 1</span>
                  </div>
                  <p className="text-[11px] text-purple-700 mt-1 leading-snug">
                    Full Clinical Governance, KKM incident sign-off, credential override, and doctor evaluations.
                  </p>
                </div>
                <div className="p-3 bg-blue-50/50 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900">Ward Supervisor</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-blue-200 text-blue-800">Tier 2</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1 leading-snug">
                    Roster matrix scheduling, shift coverage SOS dispatch, check-in verification, and bedside oversight.
                  </p>
                </div>
                <div className="p-3 bg-teal-50/50 border border-teal-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-900">HR Staffing</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-teal-200 text-teal-800">Tier 2</span>
                  </div>
                  <p className="text-[11px] text-teal-700 mt-1 leading-snug">
                    Vacancy creation, applicant screening, contract issuance, and Act 586 Statutory Vault uploads.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/50 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900">Finance Officer</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-emerald-200 text-emerald-800">Tier 2</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1 leading-snug">
                    Locum disbursement sign-off, LHDN e-invoicing compliance, and shift payroll export.
                  </p>
                </div>
              </div>
            </div>

            {/* Staff List Table */}
            <div className="bg-white border border-[color:var(--t-200)]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Authorized Facility Personnel ({teamMembers.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Members authenticated to perform administrative and clinical actions for {facility?.name || 'this facility'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadFacilityData}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
              </div>

              {teamMembers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No staff members added yet. Invite clinical and administrative colleagues above.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {teamMembers.map((member) => {
                    const roleConfig = {
                      medical_director: { label: 'Medical Director', color: 'bg-purple-100 text-purple-800 border-purple-200' },
                      ward_supervisor: { label: 'Ward Supervisor / Matron', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                      hr_staffing: { label: 'HR Staffing Officer', color: 'bg-teal-100 text-teal-800 border-teal-200' },
                      finance_officer: { label: 'Finance & Claims Officer', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                    }[member.role] || { label: member.role, color: 'bg-slate-100 text-slate-700 border-slate-200' };

                    return (
                      <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{member.name}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${roleConfig.color}`}>
                                {roleConfig.label}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{member.email}</span>
                              <span>•</span>
                              <span className="text-slate-700 font-medium">{member.department}</span>
                              <span>•</span>
                              <span className="text-slate-400">Added {new Date(member.createdAt).toLocaleDateString('en-MY')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                            Active
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStaff(member.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Revoke Staff Access"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: FACILITY OPERATING LICENCE & ACCREDITATION STANDARDS */}
        {/* ========================================================================= */}
        {tab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Act 586 Statutory Licence Details */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-black text-slate-900">
                  KKM Act 586 Statutory Operating Licence
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Facility Operating Name</span>
                  <span className="font-extrabold text-slate-800">{facility?.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">MOH / KKM Licence Number</span>
                  <span className="font-mono font-extrabold text-[color:var(--t-700)]">{facility?.licenceNo}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Licence Reference File</span>
                  <span className="font-mono text-slate-700">{facility?.licenceReference}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Licence Expiration Date</span>
                  <span className="font-extrabold text-emerald-700">{facility?.licenceExpiry} (Active)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Audited By</span>
                  <span className="text-slate-700">Medical Practice Division, Ministry of Health Malaysia</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Statutory Governing Law</span>
                  <span className="text-slate-800 font-medium">Private Healthcare Facilities and Services Act 1998 (Act 586)</span>
                </div>
              </div>
            </div>

            {/* Quality Accreditations & Clinical Services */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Award className="h-5 w-5 text-[color:var(--t-600)]" />
                <h2 className="text-base font-black text-slate-900">
                  Accreditations & Operational Capabilities
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-slate-500">Accreditations</span>
                  <div className="flex flex-wrap gap-2">
                    {facility?.accreditations?.map(acc => (
                      <span
                        key={acc.number}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-300"
                      >
                        {acc.body} ({acc.number} · Valid till {acc.validUntil})
                      </span>
                    )) || <span className="text-xs text-slate-500">MSQH Accredited</span>}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-xs font-black uppercase text-slate-500">Verified Clinical Services</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> 24-Hour Emergency Dept
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Intensive Care Unit (ICU)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Digital Radiology & Imaging
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Clinical Laboratory (SAMM)
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-xs font-black uppercase text-slate-500">Direct Contact</span>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>Phone: <strong className="text-slate-800">{facility?.phone}</strong></div>
                    <div>Email: <strong className="text-slate-800">{facility?.email}</strong></div>
                    <div>Address: <span className="text-slate-700">{facility?.address}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DECISION MODAL (ACCEPT / DECLINE) */}
      {/* ========================================================================= */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {decisionModal.action === 'accepted' ? 'Accept Shift Application' : 'Decline Shift Application'}
              </h3>
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Applicant: <strong className="text-slate-900 text-sm">{decisionModal.applicant.applicantName}</strong> ({decisionModal.applicant.applicantRole})
              </p>
              <p>
                Credential Verification: <strong className="text-slate-800">{decisionModal.applicant.applicantLicense}</strong> (APC Valid)
              </p>
              {decisionModal.action === 'accepted' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900">
                  Accepting this application will lock in this shift on the facility roster and automatically dispatch a confirmation notification to the practitioner.
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900">
                  Declining this application will notify the applicant that the position is proceeding with other candidates.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold uppercase text-slate-700 block">
                Internal Operational Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Scheduled for Ward 4B on-call rotation. Briefing with Unit Manager at 07:30."
                value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={handleDecisionSubmit}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider text-white border cursor-pointer ${
                  decisionModal.action === 'accepted'
                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700 border-rose-700'
                }`}
              >
                {actionSubmitting ? 'Processing…' : decisionModal.action === 'accepted' ? 'Confirm Acceptance' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST NEW JOB MODAL */}
      {/* ========================================================================= */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Publish New Shift / Locum Opening
                </h3>
                <span className="text-xs text-slate-500">
                  Accredited under Private Healthcare Facilities and Services Act 1998 (Act 586)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewJobModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Job Position Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Locum Emergency Physician - Weekend Coverage"
                  value={newJobTitle}
                  onChange={e => setNewJobTitle(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Role Required *
                  </label>
                  <select
                    value={newJobRole}
                    onChange={e => setNewJobRole(e.target.value as any)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="doctor">Doctor (MMC Registered)</option>
                    <option value="nurse">Nurse (LJM Registered)</option>
                    <option value="any">Any Clinical Practitioner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Arrangement Type
                  </label>
                  <select
                    value={newJobType}
                    onChange={e => setNewJobType(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="Locum">Locum (Per Shift)</option>
                    <option value="Shift-based">Shift-based</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Full-time">Full-time</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Clinical Specialty / Discipline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Medicine, ICU, Paediatrics, General Practice"
                  value={newJobSpecialty}
                  onChange={e => setNewJobSpecialty(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Min Rate (RM)
                  </label>
                  <input
                    type="number"
                    value={newJobSalaryMin}
                    onChange={e => setNewJobSalaryMin(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Max Rate (RM)
                  </label>
                  <input
                    type="number"
                    value={newJobSalaryMax}
                    onChange={e => setNewJobSalaryMax(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Rate Period
                  </label>
                  <select
                    value={newJobSalaryPeriod}
                    onChange={e => setNewJobSalaryPeriod(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="hour">per hour</option>
                    <option value="shift">per shift</option>
                    <option value="day">per day</option>
                    <option value="month">per month</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Location / Ward Unit
                </label>
                <input
                  type="text"
                  value={newJobLocation}
                  onChange={e => setNewJobLocation(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Description & Requirements
                </label>
                <textarea
                  rows={3}
                  value={newJobDesc}
                  onChange={e => setNewJobDesc(e.target.value)}
                  placeholder="Clinical shift requirements, procedures required, shift timing..."
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newJobSubmitting}
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] cursor-pointer"
                >
                  {newJobSubmitting ? 'Publishing…' : 'Publish Shift Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INVITE LOCUM MODAL */}
      {/* ========================================================================= */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Invite {inviteModal.name} ({inviteModal.role})
              </h3>
              <button
                type="button"
                onClick={() => setInviteModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {inviteSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Link to Active Shift Opening (Optional)
                  </label>
                  <select
                    value={inviteJobId}
                    onChange={e => setInviteJobId(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="">No specific job (General shift inquiry)</option>
                    {jobs.filter(j => j.status === 'Active').map(j => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.salaryRange})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Invitation Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={inviteMessage}
                    onChange={e => setInviteMessage(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setInviteModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] cursor-pointer"
                  >
                    {inviteSubmitting ? 'Sending…' : 'Send Locum Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VERIFY TIMESHEET MODAL */}
      {/* ========================================================================= */}
      {timesheetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-[color:var(--t-600)] block tracking-wider">
                  Ward Timesheet Audit & Sign-off
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {timesheetModal.applicant.applicantName} ({timesheetModal.applicant.applicantRole})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTimesheetModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
              <div>Shift Position: <strong className="text-slate-800">{timesheetModal.jobTitle}</strong></div>
              <div>Registration No: <strong className="font-mono text-slate-800">{timesheetModal.applicant.applicantLicense || 'MMC/LJM'}</strong></div>
              <div>Base Rate: <strong className="text-[color:var(--t-700)]">RM {timesheetModal.applicant.applicantRate || 80} / hour</strong></div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Actual Verified Shift Hours
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={timesheetHours}
                    onChange={e => setTimesheetHours(e.target.value)}
                    className="border border-[color:var(--t-200)] px-3 py-2 text-sm w-32 font-mono font-bold rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                  <span className="text-xs text-slate-500 font-semibold">hours worked</span>
                </div>
                <div className="text-xs text-emerald-700 font-bold mt-1">
                  Calculated Payout: RM {((Number(timesheetHours) || 8) * (timesheetModal.applicant.applicantRate || 80)).toFixed(2)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Supervisor Sign-off Notes / Ward Verification
                </label>
                <textarea
                  rows={3}
                  value={timesheetNotes}
                  onChange={e => setTimesheetNotes(e.target.value)}
                  placeholder="Enter clinical ward sign-off notes (e.g., Completed emergency resuscitation shift; 1.5h OT approved)..."
                  className="w-full border border-[color:var(--t-200)] p-3 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTimesheetModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveTimesheet}
                disabled={timesheetSubmitting}
                className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {timesheetSubmitting ? 'Approving…' : 'Approve & Sign Off Timesheet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coordination Chat Modal */}
      {chatModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[color:var(--t-300)] max-w-2xl w-full p-6 shadow-2xl rounded-none space-y-4 flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[color:var(--t-600)]" />
                  <h3 className="font-black text-slate-900 text-base">
                    Shift Coordination & Logistics Chat
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Direct thread with <strong className="text-slate-800">{chatModal.applicantName}</strong> ({chatModal.applicantRole}) for <span className="font-semibold text-[color:var(--t-700)]">{chatModal.jobTitle}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-3 text-[11px] text-sky-900 flex items-start gap-2">
              <Lock className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong>Act 586 Clinical Governance Notice:</strong> Use this operational channel for shift orientation, scrub sizes, reporting Sister/Ward In-Charge contact, and access security badges.
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-50 border border-slate-200 min-h-[260px] max-h-[380px]">
              {chatLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-[color:var(--t-600)]" />
                  Loading operational messages…
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                  <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <div className="font-bold text-slate-600">No shift coordination messages yet</div>
                  <p>Send reporting instructions, unit contact, or duty roster details below.</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.mine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-slate-500 mb-1 font-semibold flex items-center gap-1.5">
                      <span>{msg.senderName}</span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`p-3 text-xs max-w-[85%] rounded-none shadow-xs leading-relaxed ${
                        msg.mine
                          ? 'bg-[color:var(--t-900)] text-white border border-[color:var(--t-950)]'
                          : 'bg-white text-slate-800 border border-slate-300'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type shift instruction, reporting unit, scrub size confirmation…"
                className="flex-1 border border-[color:var(--t-200)] px-3 py-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
              />
              <button
                type="submit"
                disabled={chatSending || !chatInput.trim()}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-700)] hover:bg-[color:var(--t-800)] text-white border border-[color:var(--t-800)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {chatSending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Statutory Document Modal */}
      {showAddDocModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[color:var(--t-300)] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-black text-slate-900 text-base">
                    Log Statutory Compliance Certificate
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Act 586 Statutory Vault · Required for healthcare facility operating validity
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Document / Licence Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KKM Form B Hospital Operating Licence 2026-2028"
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] px-3 py-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Statutory Category
                  </label>
                  <select
                    value={newDocType}
                    onChange={e => setNewDocType(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="act586_licence">KKM Act 586 Licence (Form B/F)</option>
                    <option value="bomba_clearance">Bomba Fire Safety Certificate</option>
                    <option value="aelb_radiation">AELB Radiation Safety Permit</option>
                    <option value="msqh_accreditation">MSQH Quality Accreditation</option>
                    <option value="waste_management">Clinical Biohazard Waste MOA</option>
                    <option value="other">Other Regulatory Document</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Reference / Gazette No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KKM/CKAPS/B-1029"
                    value={newDocRef}
                    onChange={e => setNewDocRef(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ministry of Health Malaysia (CKAPS)"
                    value={newDocIssuer}
                    onChange={e => setNewDocIssuer(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Valid Until / Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newDocValidUntil}
                    onChange={e => setNewDocValidUntil(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docSubmitting || !newDocTitle.trim()}
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileCheck className="h-4 w-4" />
                  {docSubmitting ? 'Logging…' : 'Log Document & Verify Compliance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 4: Emergency Surge Broadcast Modal */}
      {surgeModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-start justify-between border-b border-rose-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-rose-600 fill-rose-600" />
                  <h3 className="font-black text-slate-900 text-base">
                    Emergency Surge Broadcast (SOS Roster Call)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Target Shift: <strong className="text-slate-800">{surgeModal.jobTitle}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSurgeModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900 space-y-1">
              <strong>Immediate Locum Alert:</strong> This will dispatch an urgent high-priority notification to all verified doctors and nurses matching this role.
            </div>

            <form onSubmit={handleSurgeBroadcastSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Surge Rate Hourly Bonus (RM / hour)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">+ RM</span>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={surgeBonus}
                    onChange={e => setSurgeBonus(e.target.value)}
                    className="w-32 border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white font-mono font-bold focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                  <span className="text-xs text-slate-500 font-semibold">on top of base shift rate</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Urgent Ward Dispatch Instructions
                </label>
                <textarea
                  rows={3}
                  value={surgeNote}
                  onChange={e => setSurgeNote(e.target.value)}
                  placeholder="e.g. Critical resuscitation bay coverage needed immediately. Pre-approved MMC/LJM roster priority..."
                  className="w-full border border-[color:var(--t-200)] p-3 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Instant Claim Priority</span>
                  <span className="text-[11px] text-slate-500">Allow first verified MMC/LJM practitioner to auto-confirm without delay</span>
                </div>
                <input
                  type="checkbox"
                  checked={surgeInstantClaim}
                  onChange={e => setSurgeInstantClaim(e.target.checked)}
                  className="h-4 w-4 text-rose-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSurgeModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={surgeSubmitting}
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <Zap className="h-4 w-4 fill-white" />
                  {surgeSubmitting ? 'Broadcasting…' : 'Dispatch SOS Surge Blast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 4: Create DuitNow Settlement Batch Modal */}
      {showCreateBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[color:var(--t-300)] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-black text-slate-900 text-base">
                    Generate DuitNow Bulk Settlement Batch
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Consolidating {selectedTimesheetIds.length} verified locum timesheet{selectedTimesheetIds.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateBatchModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-sm font-black text-emerald-950">
                <span>Total Settlement Amount:</span>
                <span className="text-base text-emerald-700 font-mono">
                  RM {pendingTimesheets.filter(t => selectedTimesheetIds.includes(t.id)).reduce((s, t) => s + (Number(t.totalPayoutMyr) || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-emerald-800">
                All included shifts have passed ward supervisor sign-off and APC credential audit.
              </div>
            </div>

            <form onSubmit={handleCreateBatchSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Corporate Bank Account / Settlement Gateway
                </label>
                <select
                  value={batchBank}
                  onChange={e => setBatchBank(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] px-3 py-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                >
                  <option value="Maybank Corporate (BizChannel DuitNow Bulk)">Maybank Corporate (BizChannel DuitNow Bulk)</option>
                  <option value="CIMB BizChannel (Bulk Payment Gateway)">CIMB BizChannel (Bulk Payment Gateway)</option>
                  <option value="Public Bank PB enterprise DuitNow">Public Bank PB enterprise DuitNow</option>
                  <option value="RHB Reflex Corporate Gateway">RHB Reflex Corporate Gateway</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateBatchModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchSubmitting}
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {batchSubmitting ? 'Creating Batch…' : 'Generate Settlement Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 4: Locum Performance & Clinical Audit Scorecard Modal */}
      {evalModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 max-w-xl w-full p-6 shadow-2xl rounded-none space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-amber-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <h3 className="font-black text-slate-900 text-base">
                    Clinical Governance & Performance Scorecard
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Auditing <strong className="text-slate-800">{evalModal.applicant.applicantName}</strong> ({evalModal.applicant.applicantRole}) · KKM Act 586 Continuous Audit
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEvalModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-700 block">Overall Score Rating</span>
                <span className="text-[11px] text-slate-500">Averaged across 4 clinical quality dimensions</span>
              </div>
              <div className="text-xl font-black text-amber-600 font-mono">
                {(((evalPunctuality + evalClinical + evalDoc + evalTeam) / 4)).toFixed(1)} / 5.0
              </div>
            </div>

            <form onSubmit={handleEvaluationSubmit} className="space-y-4 text-xs">
              {/* Rating dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Punctuality & Handover</span>
                    <span className="text-amber-600 font-mono">{evalPunctuality} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={evalPunctuality}
                    onChange={e => setEvalPunctuality(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-200 space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Clinical Acumen & Care</span>
                    <span className="text-amber-600 font-mono">{evalClinical} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={evalClinical}
                    onChange={e => setEvalClinical(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-200 space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Medical Case Documentation</span>
                    <span className="text-amber-600 font-mono">{evalDoc} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={evalDoc}
                    onChange={e => setEvalDoc(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-200 space-y-2">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Ward Teamwork & Protocol</span>
                    <span className="text-amber-600 font-mono">{evalTeam} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={evalTeam}
                    onChange={e => setEvalTeam(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Roster Flags */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evalPreferred}
                    onChange={e => {
                      setEvalPreferred(e.target.checked);
                      if (e.target.checked) setEvalBlacklist(false);
                    }}
                    className="accent-emerald-600"
                  />
                  <span>Add to Hospital Preferred Locum Roster (Priority invitation for future openings)</span>
                </label>

                <label className="flex items-center gap-2 font-bold text-rose-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evalIncident}
                    onChange={e => setEvalIncident(e.target.checked)}
                    className="accent-rose-600"
                  />
                  <span>Flag Incident / Near-Miss Event (KKM Act 586 Quality Assurance Audit)</span>
                </label>
              </div>

              {evalIncident && (
                <div className="p-3 bg-rose-50 border border-rose-200 space-y-1">
                  <label className="text-[11px] font-black uppercase text-rose-800 block">
                    Incident Summary for Hospital Clinical Director / Medical Committee
                  </label>
                  <textarea
                    rows={2}
                    value={evalIncidentNotes}
                    onChange={e => setEvalIncidentNotes(e.target.value)}
                    placeholder="Describe clinical incident, medication error near-miss, or patient complaint..."
                    className="w-full border border-rose-300 p-2 text-xs rounded-none bg-white focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Supervisor Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={evalNotes}
                  onChange={e => setEvalNotes(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEvalModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evalSubmitting}
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <Star className="h-4 w-4 fill-white" />
                  {evalSubmitting ? 'Submitting…' : 'File Audit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 4: LHDN e-Invoice Receipt Modal */}
      {lhdnModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-xl w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-black text-slate-900 text-base">
                    LHDN Statutory e-Invoice Receipt
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Inland Revenue Board of Malaysia (IRBM) Compliant Clinical Services Record
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLhdnModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Simulated LHDN e-Invoice Document Card */}
            <div className="border border-slate-300 p-5 bg-slate-50/50 space-y-4 text-xs font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <div className="font-black text-slate-900 text-sm">{facility?.name || 'Pantai Medical Centre Bangsar'}</div>
                  <div className="text-[11px] text-slate-500">TIN: <strong className="font-mono text-slate-700">C28919014020</strong> · SST Reg: <strong className="font-mono text-slate-700">W10-2401-320001</strong></div>
                  <div className="text-[11px] text-slate-500">KKM Act 586 Licence: <strong className="font-mono text-slate-700">{facility?.licenceNo || 'KKM-BPP/B/0042/1998'}</strong></div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                    IRBM Validated
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">UUID: eInv-{lhdnModal.id.slice(0, 8)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 uppercase text-[9px] font-extrabold block">Settlement Reference</span>
                  <span className="font-mono font-bold text-slate-800">{lhdnModal.batchReference}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[9px] font-extrabold block">Disbursement Channel</span>
                  <span className="font-bold text-slate-800">{lhdnModal.bankName || 'Maybank BizChannel DuitNow'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[9px] font-extrabold block">Tax Classification</span>
                  <span className="font-bold text-slate-800">MSIC 86101 (Hospital Services - Section 14 Exempt)</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[9px] font-extrabold block">Disbursed Timestamp</span>
                  <span className="font-mono text-slate-700">{lhdnModal.disbursedAt || new Date().toISOString()}</span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2.5 flex justify-between items-center text-sm font-black">
                <span className="text-slate-800">Total Clinical Disbursement:</span>
                <span className="text-emerald-700 font-mono text-base">RM {lhdnModal.totalAmountMyr.toFixed(2)}</span>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Cryptographic Hash: SHA256:{lhdnModal.id}f882a</span>
                <span className="text-emerald-700 font-bold">● Valid IRBM Audit Record</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLhdnModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-900 text-white border border-slate-900 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: INVITE FACILITY STAFF MEMBER (RBAC) */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Invite Facility Staff Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Hishamuddin bin Ahmad"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. hishamuddin@hospital.com.my"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned RBAC Role *
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 outline-none"
                >
                  <option value="ward_supervisor">Ward Supervisor / Matron (Roster & Shifts)</option>
                  <option value="medical_director">Medical Director (Clinical Governance & Incidents)</option>
                  <option value="hr_staffing">HR Staffing Officer (Locum Recruitment)</option>
                  <option value="finance_officer">Finance & Claims Officer (Payroll & LHDN)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department / Ward *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nursing Administration, Emergency, ICU"
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffSubmitting}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-black text-white cursor-pointer disabled:opacity-50"
                >
                  {staffSubmitting ? 'Sending Invite...' : 'Confirm & Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LOG STATUTORY CLINICAL INCIDENT (ACT 586 / MSQH STD 3) */}
      {/* ========================================================================= */}
      {showAddIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Log Clinical Incident / Adverse Event
                  </h3>
                  <span className="text-[10px] text-slate-400">KKM Act 586 & MSQH 6th Edition Mandatory Log</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddIncidentModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddIncidentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Incident Classification *
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-rose-600 outline-none"
                  >
                    <option value="near_miss">Near Miss / Good Catch</option>
                    <option value="medication_error">Medication Administration Error</option>
                    <option value="patient_fall">Patient Fall / Trauma</option>
                    <option value="protocol_deviation">Clinical Protocol Deviation</option>
                    <option value="sentinel_event">Sentinel Event (Serious Harm / Death)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Severity Rating *
                  </label>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-rose-600 outline-none"
                  >
                    <option value="low">Low (No harm / minor annoyance)</option>
                    <option value="moderate">Moderate (Temporary harm / extra monitoring)</option>
                    <option value="high">High (Permanent harm / surgical intervention)</option>
                    <option value="critical">Critical / Sentinel (Life threatening)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department / Clinical Ward *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emergency Department, Ward 4B"
                    value={incidentDept}
                    onChange={(e) => setIncidentDept(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-rose-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Staff / Locum Involved (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Siti Sarah / SN Jason"
                    value={incidentLocum}
                    onChange={(e) => setIncidentLocum(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-rose-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Incident Description & Clinical Synopsis *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail precisely what occurred, patient vitals, medications involved, timeline, and who was notified..."
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-rose-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Immediate Clinical Mitigation Taken
                </label>
                <textarea
                  rows={2}
                  placeholder="Actions taken immediately to protect patient safety (e.g. Naloxone administered, vitals stabilized)..."
                  value={incidentAction}
                  onChange={(e) => setIncidentAction(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-rose-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Root Cause Analysis (RCA) & CAPA Remediation
                </label>
                <textarea
                  rows={2}
                  placeholder="Identified underlying system failure and corrective preventive actions initiated..."
                  value={incidentRca}
                  onChange={(e) => setIncidentRca(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-rose-600 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incidentKkmNotified}
                    onChange={(e) => setIncidentKkmNotified(e.target.checked)}
                    className="h-4 w-4 text-rose-600"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Statutory Notification to Ministry of Health (KKM) Act 586
                  </span>
                </label>
                {incidentKkmNotified && (
                  <input
                    type="text"
                    placeholder="KKM Incident Reference Number (e.g. KKM/CKAPS/2026/INC-0442)"
                    value={incidentKkmRef}
                    onChange={(e) => setIncidentKkmRef(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 focus:border-rose-600 outline-none"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddIncidentModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={incidentSubmitting}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-rose-700 hover:bg-rose-800 text-white cursor-pointer disabled:opacity-50"
                >
                  {incidentSubmitting ? 'Logging...' : 'Submit Official Incident Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL KKM FORM STATUTORY AUDIT REPORT PREVIEW */}
      {/* ========================================================================= */}
      {kkmReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* KKM Official Document Header */}
            <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                KEMENTERIAN KESIHATAN MALAYSIA (KKM)
              </div>
              <div className="text-sm font-black text-slate-900 uppercase tracking-tight">
                PRIVATE HEALTHCARE FACILITIES AND SERVICES ACT 1998 [ACT 586]
              </div>
              <div className="text-xs font-bold text-rose-700">
                FORM 4: MANDATORY STATUTORY CLINICAL INCIDENT NOTIFICATION
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Statutory Reference: {kkmReportModal.kkmReferenceNo || `KKM/ACT586/${kkmReportModal.id.slice(0, 8).toUpperCase()}`}
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Notifying Facility</span>
                  <span className="font-bold text-slate-900">{facility?.name || 'Healthcare Facility'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Act 586 Licence No.</span>
                  <span className="font-mono font-bold text-slate-900">{facility?.licenceNo || 'KKM/JKA/586-90412'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Incident Date</span>
                  <span className="font-bold text-slate-900">{kkmReportModal.incidentDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Clinical Department</span>
                  <span className="font-bold text-slate-900">{kkmReportModal.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Incident Classification</span>
                  <span className="font-bold text-slate-900 uppercase">{kkmReportModal.incidentType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Severity Rating</span>
                  <span className="font-bold text-rose-700 uppercase">{kkmReportModal.severity}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block mb-1">
                  1. Clinical Incident Description
                </span>
                <div className="p-3 bg-white border border-slate-300 leading-relaxed text-slate-800">
                  {kkmReportModal.description}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block mb-1">
                  2. Immediate Remedial Actions Taken
                </span>
                <div className="p-3 bg-white border border-slate-300 leading-relaxed text-slate-800">
                  {kkmReportModal.immediateAction || 'Immediate monitoring and clinical stabilization implemented.'}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block mb-1">
                  3. Root Cause Analysis (RCA) & Corrective Action Plan (CAPA)
                </span>
                <div className="p-3 bg-white border border-slate-300 leading-relaxed text-slate-800">
                  {kkmReportModal.rootCauseAnalysis || 'Investigation in progress under Facility Clinical Governance Committee.'}
                </div>
              </div>

              <div className="p-3 border border-slate-300 bg-slate-50 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-slate-500">Reported by: </span>
                  <span className="font-bold text-slate-800">{kkmReportModal.reportedBy}</span>
                </div>
                <div className="text-emerald-700 font-bold flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  Statutory Submission Recorded
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setKkmReportModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-black text-white cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Print Official Form 4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
