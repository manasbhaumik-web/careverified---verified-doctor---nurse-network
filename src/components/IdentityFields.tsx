import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  DIAL_CODES, MY_STATES, NATIONALITIES, addressProblem, formatNricInput, isPassportNumber, maskNric, normalisePassport, parseNric, toE164,
  type Address,
} from '../identity';

const label = 'text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block';
const hint = 'text-[11px] font-semibold mt-1';

// ───────── ID: MyKad for citizens and permanent residents, passport for visitors ─────────
export interface IdState { idType: 'nric' | 'passport'; idNumber: string; nationality: string; dob: string }
export const emptyId: IdState = { idType: 'nric', idNumber: '', nationality: 'MY', dob: '' };

/** Problem with the ID section, or null. */
export function idProblem(v: IdState): string | null {
  if (v.idType === 'nric') return parseNric(v.idNumber) ? null : 'Enter a valid 12-digit MyKad number (YYMMDD-PB-####).';
  if (!isPassportNumber(v.idNumber)) return 'Enter your passport number (letters and digits, 5 to 15 characters).';
  if (!v.nationality || v.nationality === 'MY') return 'Choose your nationality.';
  if (!v.dob || Number.isNaN(Date.parse(v.dob)) || new Date(v.dob) > new Date()) return 'Enter your date of birth.';
  return null;
}

export function IdFields({ value, onChange }: { value: IdState; onChange: (v: IdState) => void }) {
  const [reveal, setReveal] = useState(true);
  const set = (p: Partial<IdState>) => onChange({ ...value, ...p });
  const nric = value.idType === 'nric' ? parseNric(value.idNumber) : null;
  const typed = value.idNumber.length > 0;
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Identity document" className="grid grid-cols-2 gap-2">
        {([['nric', 'MyKad (citizen / permanent resident)'], ['passport', 'Passport (visitor)']] as const).map(([id, text]) => (
          <button key={id} type="button" role="radio" aria-checked={value.idType === id}
            onClick={() => onChange({ idType: id, idNumber: '', nationality: id === 'nric' ? 'MY' : '', dob: '' })}
            className={`p-2.5 border text-xs font-bold text-left cursor-pointer ${value.idType === id ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)]' : 'border-[color:var(--t-200)] hover:bg-slate-50'}`}>
            {text}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className={label} htmlFor="id-number">{value.idType === 'nric' ? 'MyKad number (NRIC) *' : 'Passport number *'}</label>
        <div className="relative">
          <input id="id-number" className="form-input pr-10 font-mono" required autoComplete="off" inputMode={value.idType === 'nric' ? 'numeric' : 'text'}
            type={reveal ? 'text' : 'password'} value={value.idNumber}
            placeholder={value.idType === 'nric' ? '900101-14-5399' : 'A12345678'}
            onChange={e => set({ idNumber: value.idType === 'nric' ? formatNricInput(e.target.value) : normalisePassport(e.target.value).slice(0, 15) })} />
          <button type="button" onClick={() => setReveal(r => !r)} aria-label={reveal ? 'Hide number' : 'Show number'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer">
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {value.idType === 'nric' && typed && (nric
          ? <p className={`${hint} text-emerald-700`}>Valid format · born {nric.birthDate} · shown to others as {maskNric(value.idNumber)}</p>
          : value.idNumber.replace(/\D/g, '').length === 12 ? <p className={`${hint} text-rose-700`}>This is not a valid MyKad number (check the birth date).</p> : <p className={`${hint} text-slate-500`}>12 digits: birth date, place code, then 4 digits.</p>)}
        {value.idType === 'passport' && typed && !isPassportNumber(value.idNumber) && <p className={`${hint} text-rose-700`}>Use 5 to 15 letters and digits.</p>}
      </div>

      {value.idType === 'passport' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={label} htmlFor="id-nationality">Nationality *</label>
            <select id="id-nationality" className="form-select" required value={value.nationality} onChange={e => set({ nationality: e.target.value })}>
              <option value="">Choose…</option>
              {NATIONALITIES.filter(n => n.code !== 'MY').map(n => <option key={n.code} value={n.code}>{n.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="id-dob">Date of birth *</label>
            <input id="id-dob" type="date" className="form-input" required max={new Date().toISOString().slice(0, 10)} value={value.dob} onChange={e => set({ dob: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Phone with country code ─────────
export interface PhoneState { dial: string; number: string }
export const emptyPhone: PhoneState = { dial: '+60', number: '' };
export const phoneE164 = (v: PhoneState) => toE164(v.number, v.dial);

export function PhoneField({ id, title, value, onChange, required = true }: { id: string; title: string; value: PhoneState; onChange: (v: PhoneState) => void; required?: boolean }) {
  const ok = value.number.trim() === '' || phoneE164(value) !== null;
  return (
    <div className="space-y-1.5">
      <label className={label} htmlFor={id}>{title}{required ? ' *' : ''}</label>
      <div className="flex gap-2">
        <select aria-label="Country code" className="form-select w-28 shrink-0" value={value.dial} onChange={e => onChange({ ...value, dial: e.target.value })}>
          {DIAL_CODES.map(d => <option key={d.code} value={d.dial}>{d.code} {d.dial}</option>)}
        </select>
        <input id={id} type="tel" inputMode="tel" className="form-input" required={required} placeholder={value.dial === '+60' ? '12-345 6789' : 'Phone number'}
          value={value.number} onChange={e => onChange({ ...value, number: e.target.value })} />
      </div>
      {!ok && <p className={`${hint} text-rose-700`}>This does not look like a valid phone number for {value.dial}.</p>}
    </div>
  );
}

// ───────── Address: Malaysian (state + 5-digit postcode) or international ─────────
export const emptyAddress: Address = { line1: '', line2: '', city: '', state: '', postcode: '', country: 'MY' };

export function AddressFields({ value, onChange }: { value: Address; onChange: (v: Address) => void }) {
  const set = (p: Partial<Address>) => onChange({ ...value, ...p });
  const my = value.country === 'MY';
  const problem = value.postcode && my && !/^\d{5}$/.test(value.postcode) ? 'A Malaysian postcode has 5 digits.' : '';
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className={label} htmlFor="addr-country">Country of residence *</label>
        <select id="addr-country" className="form-select" value={value.country} onChange={e => onChange({ ...emptyAddress, country: e.target.value })}>
          {NATIONALITIES.filter(n => n.code !== 'XX').map(n => <option key={n.code} value={n.code}>{n.name}</option>)}
          <option value="XX">Other</option>
        </select>
      </div>
      <input className="form-input" required placeholder="Address line 1" aria-label="Address line 1" maxLength={120} value={value.line1} onChange={e => set({ line1: e.target.value })} />
      <input className="form-input" placeholder="Address line 2 (optional)" aria-label="Address line 2" maxLength={120} value={value.line2 ?? ''} onChange={e => set({ line2: e.target.value })} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input className="form-input" required placeholder={my ? 'Postcode (5 digits)' : 'Postal code'} aria-label="Postcode" inputMode={my ? 'numeric' : 'text'}
          maxLength={my ? 5 : 12} value={value.postcode} onChange={e => set({ postcode: my ? e.target.value.replace(/\D/g, '') : e.target.value })} />
        <input className="form-input" required placeholder="City" aria-label="City" maxLength={60} value={value.city} onChange={e => set({ city: e.target.value })} />
        {my ? (
          <select className="form-select" required aria-label="State" value={value.state ?? ''} onChange={e => set({ state: e.target.value })}>
            <option value="">State…</option>
            {MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <input className="form-input" placeholder="State / region" aria-label="State or region" maxLength={60} value={value.state ?? ''} onChange={e => set({ state: e.target.value })} />
        )}
      </div>
      {problem && <p className={`${hint} text-rose-700`}>{problem}</p>}
    </div>
  );
}

export { addressProblem };
