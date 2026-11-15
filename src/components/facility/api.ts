async function jsonRequest<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Unexpected response (${res.status}) from ${url}`);
  }
  return res.json();
}

function jsonBody(method: 'POST' | 'PUT' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const facilityApi = {
  getMe: () => jsonRequest('/api/facility/me'),
  getJobs: () => jsonRequest('/api/facility/jobs'),
  getInfrastructure: () => jsonRequest('/api/facility/infrastructure'),
  getLocums: () => jsonRequest('/api/locums'),
  getCases: () => jsonRequest('/api/facility/cases'),
  getPackages: (facilityId?: string) =>
    jsonRequest(facilityId ? `/api/packages?facility_id=${encodeURIComponent(facilityId)}&status=all` : '/api/packages?status=all'),
  getPromotions: (facilityId?: string) =>
    jsonRequest(facilityId ? `/api/promotions?facility_id=${encodeURIComponent(facilityId)}` : '/api/promotions'),
  getPackageOrders: () => jsonRequest('/api/facility/package-orders'),
  getReferralLedger: () => jsonRequest('/api/facility/referral-ledger'),

  submitApplicantDecision: (jobId: string, applicantUserId: string, decision: string, notes?: string) =>
    jsonRequest(`/api/facility/jobs/${jobId}/applicants/${applicantUserId}/decision`, jsonBody('POST', { decision, notes })),

  updateJobStatus: (jobId: string, status: 'Active' | 'Closed') =>
    jsonRequest(`/api/facility/jobs/${jobId}/status`, jsonBody('PATCH', { status })),

  createJob: (payload: Record<string, unknown>) =>
    jsonRequest('/api/jobs', jsonBody('POST', payload)),

  inviteLocum: (profileId: string, payload: { jobId?: string; message: string }) =>
    jsonRequest(`/api/locums/${profileId}/invite`, jsonBody('POST', payload)),

  getApplicantMessages: (jobId: string, applicantUserId: string) =>
    jsonRequest(`/api/facility/jobs/${jobId}/applicants/${applicantUserId}/messages`),

  sendApplicantMessage: (jobId: string, applicantUserId: string, message: string) =>
    jsonRequest(`/api/facility/jobs/${jobId}/applicants/${applicantUserId}/messages`, jsonBody('POST', { message })),

  submitCaseQuote: (caseId: string, payload: Record<string, unknown>) =>
    jsonRequest(`/api/facility/cases/${caseId}/quote`, jsonBody('POST', payload)),

  updateCaseStatus: (caseId: string, status: string) =>
    jsonRequest(`/api/facility/cases/${caseId}/status`, jsonBody('PATCH', { status })),

  confirmPackageOrder: (orderId: string, status: string) =>
    jsonRequest(`/api/facility/package-orders/${orderId}/confirm`, jsonBody('PATCH', { status })),

  savePackage: (editingId: string | null, payload: Record<string, unknown>) =>
    jsonRequest(editingId ? `/api/packages/${editingId}` : '/api/packages', jsonBody(editingId ? 'PUT' : 'POST', payload)),

  deletePackage: (id: string) =>
    jsonRequest(`/api/packages/${id}`, { method: 'DELETE' }),

  savePromo: (editingId: string | null, payload: Record<string, unknown>) =>
    jsonRequest(editingId ? `/api/promotions/${editingId}` : '/api/promotions', jsonBody(editingId ? 'PUT' : 'POST', payload)),

  deletePromo: (id: string) =>
    jsonRequest(`/api/promotions/${id}`, { method: 'DELETE' }),

  saveInfrastructure: (payload: { equipment: string[]; amenities: string[] }) =>
    jsonRequest('/api/facility/infrastructure', jsonBody('PUT', payload)),

  saveBillingSettings: (payload: { billingPreference: 'escrow' | 'invoice'; billingContactEmail?: string; sstRegistrationNo?: string }) =>
    jsonRequest('/api/facility/billing-settings', jsonBody('PUT', payload)),

  approveTimesheet: (jobId: string, applicantUserId: string, actualHours?: number) =>
    jsonRequest(`/api/facility/jobs/${jobId}/applicants/${applicantUserId}/timesheet/approve`, jsonBody('POST', { actualHours })),
};
