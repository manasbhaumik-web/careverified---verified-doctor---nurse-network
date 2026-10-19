import React from 'react';

export interface TeleAnswers {
  firstVisit: boolean;
  chronic: boolean;
  seenBefore: boolean;
  inMalaysia: boolean;
  country: string;
  ack: boolean;
}

export const defaultTeleAnswers: TeleAnswers = { firstVisit: true, chronic: false, seenBefore: false, inMalaysia: true, country: '', ack: false };

/** Request fields for /api/consults and video /api/bookings. */
export const teleToPayload = (a: TeleAnswers) => ({
  firstVisit: a.firstVisit,
  chronicCondition: a.chronic,
  seenInPersonBefore: !a.firstVisit && a.seenBefore,
  patientCountry: a.inMalaysia ? 'MY' : a.country.trim().toUpperCase(),
  acknowledgeCrossBorder: !a.inMalaysia && a.ack,
});

/** The questions Malaysian telemedicine rules depend on: follow-up vs first visit, long-term condition, location. */
export default function TelemedicineQuestions({ value, onChange }: { value: TeleAnswers; onChange: (v: TeleAnswers) => void }) {
  const set = (patch: Partial<TeleAnswers>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="space-y-3 border border-[color:var(--t-200)] p-4">
      <legend className="px-1 text-xs font-extrabold uppercase tracking-wider text-[color:var(--ink)]">About this consultation</legend>
      <label className="flex items-center gap-3 min-h-[44px] py-1 text-sm leading-snug text-[color:var(--ink)] cursor-pointer">
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={value.firstVisit} onChange={e => set({ firstVisit: e.target.checked })} />
        <span>This is the first time I am seeing a doctor about this problem (not a follow-up).</span>
      </label>
      {!value.firstVisit && (
        <label className="flex items-center gap-3 min-h-[44px] text-sm leading-snug text-[color:var(--ink)] cursor-pointer bg-amber-50 border border-amber-300 p-3">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={value.seenBefore} onChange={e => set({ seenBefore: e.target.checked })} />
          <span>I confirm a doctor has already seen me in person for this problem. If we have no earlier visit on record, this is treated as a first visit unless you confirm.</span>
        </label>
      )}
      <label className="flex items-center gap-3 min-h-[44px] py-1 text-sm leading-snug text-[color:var(--ink)] cursor-pointer">
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={value.chronic} onChange={e => set({ chronic: e.target.checked })} />
        <span>It relates to a long-term condition (for example diabetes, high blood pressure, heart or kidney disease).</span>
      </label>
      <label className="flex items-center gap-3 min-h-[44px] py-1 text-sm leading-snug text-[color:var(--ink)] cursor-pointer">
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={value.inMalaysia} onChange={e => set({ inMalaysia: e.target.checked })} />
        <span>I am in Malaysia right now.</span>
      </label>
      {!value.inMalaysia && (
        <div className="space-y-2">
          <input value={value.country} onChange={e => set({ country: e.target.value.slice(0, 2) })} required placeholder="Country code, e.g. SG" aria-label="Country code"
            className="w-40 min-h-[44px] border border-[color:var(--t-200)] p-2 text-sm uppercase placeholder:text-slate-600" />
          <label className="flex items-center gap-3 min-h-[44px] text-sm leading-snug text-[color:var(--ink)] cursor-pointer bg-amber-50 border border-amber-300 p-3">
            <input type="checkbox" required className="h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={value.ack} onChange={e => set({ ack: e.target.checked })} />
            <span>I understand this is a cross-border consultation. The doctor is licensed in Malaysia, cannot provide emergency care where I am, and cannot issue an e-prescription or controlled medicines to me.</span>
          </label>
        </div>
      )}
    </fieldset>
  );
}
