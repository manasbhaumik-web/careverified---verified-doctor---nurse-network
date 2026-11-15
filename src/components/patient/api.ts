async function safeJson<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    return await res.json();
  } catch {
    return null;
  }
}

export const patientApi = {
  getRecommendedReading: () => safeJson('/api/me/recommended-reading'),
  getMyRecords: () => safeJson('/api/records/me'),
  getOnCallStatus: () => safeJson('/api/on-call/status'),
  getMyConsults: () => safeJson('/api/consults/mine'),
  getPharmacies: () => safeJson('/api/pharmacies'),
  getSupportTickets: () => safeJson('/api/support/tickets'),

  cancelBooking: (bookingId: string) =>
    safeJson(`/api/bookings/${bookingId}/cancel`, { method: 'POST' }),

  endConsult: (consultId: string) =>
    safeJson(`/api/consults/${consultId}/end`, { method: 'POST' }),

  dispatchPrescription: (rxId: string, pharmacyId: string, shareSafety: boolean) =>
    safeJson(`/api/prescriptions/${rxId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pharmacyId, shareSafety }),
    }),
};
