import React, { useCallback, useEffect, useState } from 'react';
import { useTr } from '../locale';
import { MY_STATES, PREFERRED_LANGUAGES, RELATIONSHIPS } from '../identity';
import { UserRound } from 'lucide-react';
import { WorkspaceHeader, BannerBadge } from '../shared/ui';

interface Address { line1: string; line2?: string; city: string; state?: string; postcode: string; country: string }
interface Profile {
  account: { id: string; role: string; name: string; email: string; createdAt: string; nameEditable: boolean };
  patient: {
    idType: string | null; idNumberMasked: string; nationality: string | null; dateOfBirth: string | null; gender: string | null; phone: string;
    address: Address | null; preferredLanguage: string; emergencyContactName: string; emergencyContactRelationship: string; emergencyContactPhone: string;
    nextOfKin: { name: string; relationship: string; phone: string } | null;
  } | null;
  professional: { licenseNumber: string | null; specialty: string | null; verificationStatus: string | null; credentialState: string | null } | null;
}
type Msg = { ok: boolean; text: string } | null;

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const emptyAddress: Address = { line1: '', line2: '', city: '', state: '', postcode: '', country: 'MY' };

/**
 * The signed-in person's own profile: their details, their sign-in email and password, and (for a practitioner) the status of
 * their professional credentials. A member can edit personal details; ID number, date of birth and nationality are shown, not editable.
 * A practitioner's name is tied to the verified licence, so it is read-only here.
 */
export default function ProfilePage({ onUserUpdated, onOpenCredentials }: {
  onUserUpdated?: (u: { name: string; email: string }) => void;
  onOpenCredentials?: () => void;
}) {
  const tx = useTr();
  const [p, setP] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    const r = await send('/api/me/profile', 'GET');
    if (r.status === 'success') { setP(r.data); setLoadError(false); } else setLoadError(true);
  }, []);
  useEffect(() => { load().catch(() => setLoadError(true)); }, [load]);

  // Account (name)
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState('');
  // Personal information
  const [editPersonal, setEditPersonal] = useState(false);
  const [f, setF] = useState<any>(null);
  // Email and password
  const [email, setEmail] = useState({ newEmail: '', currentPassword: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  if (loadError) return <p role="alert" className="text-sm text-rose-800 p-4">{tx('Could not load your profile.')}</p>;
  if (!p) return <p role="status" className="text-sm text-slate-600 p-4">{tx('Loading…')}</p>;

  const a = p.account;
  const pt = p.patient;
  const roleLabel = a.role === 'patient' ? tx('Member') : a.role === 'practitioner' ? tx('Practitioner') : a.role === 'admin' ? tx('Board Admin') : a.role === 'pharmacy' ? tx('Pharmacy') : tx('Facility');
  const fail = (r: any) => setMsg({ ok: false, text: r.message || tx('Could not save.') });
  const ok = (text: string, data?: Profile) => {
    setMsg({ ok: true, text });
    if (data) { setP(data); onUserUpdated?.({ name: data.account.name, email: data.account.email }); }
  };

  const startPersonal = () => {
    if (!pt) return;
    setF({
      phone: pt.phone, gender: pt.gender ?? 'Other', preferredLanguage: pt.preferredLanguage,
      address: { ...emptyAddress, ...(pt.address ?? {}) },
      emergencyContactName: pt.emergencyContactName, emergencyContactRelationship: pt.emergencyContactRelationship || 'Other', emergencyContactPhone: pt.emergencyContactPhone,
      hasNok: !!pt.nextOfKin, nok: pt.nextOfKin ?? { name: '', relationship: 'Other', phone: '' },
    });
    setEditPersonal(true); setMsg(null);
  };
  const savePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await send('/api/me/profile', 'PUT', {
      phone: f.phone, gender: f.gender, preferredLanguage: f.preferredLanguage, ...(addressFilled(f.address) ? { address: f.address } : {}),
      emergencyContactName: f.emergencyContactName, emergencyContactRelationship: f.emergencyContactRelationship, emergencyContactPhone: f.emergencyContactPhone,
      nextOfKin: f.hasNok ? f.nok : null,
    });
    if (r.status === 'success') { setEditPersonal(false); ok(tx('Personal details saved.'), r.data); } else fail(r);
  };
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await send('/api/me/profile', 'PUT', { name });
    if (r.status === 'success') { setEditName(false); ok(tx('Name saved.'), r.data); } else fail(r);
  };
  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await send('/api/me/email', 'POST', email);
    if (r.status === 'success') { setEmail({ newEmail: '', currentPassword: '' }); ok(tx('Sign-in email changed.'), r.data); } else fail(r);
  };
  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return setMsg({ ok: false, text: tx('The two new passwords do not match.') });
    const r = await send('/api/auth/change-password', 'POST', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
    if (r.status === 'success') { setPw({ currentPassword: '', newPassword: '', confirm: '' }); ok(tx('Password changed. Other devices were signed out.')); } else fail(r);
  };

  const addressFilled = (x: Address) => !!(x.line1?.trim() || x.city?.trim() || x.postcode?.trim());
  const setAddr = (k: keyof Address, v: string) => setF({ ...f, address: { ...f.address, [k]: v } });
  const langLabel = (c: string) => PREFERRED_LANGUAGES.find(l => l.code === c)?.label ?? c;
  const row = (label: string, value: React.ReactNode) => (
    <div><dt className="text-xs font-bold text-slate-600">{label}</dt><dd className="text-sm font-semibold text-[color:var(--ink)] mt-0.5 break-words">{value || '—'}</dd></div>
  );
  const addrText = (x: Address | null) => x ? [x.line1, x.line2, `${x.postcode} ${x.city}`.trim(), x.state, x.country].filter(Boolean).join(', ') : '';

  return (
    <section aria-label={tx('My profile')} className="page-w mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <WorkspaceHeader
        icon={UserRound}
        eyebrow={tx('Account · Personal information and sign-in details')}
        title={tx('My profile')}
        description={tx('See and update your own details. Changes apply to your account only.')}
        badges={<BannerBadge tone="brand">{roleLabel}</BannerBadge>}
        aside={<span className="text-xs text-[color:var(--ink-2)]">{tx('Member since')} {new Date(a.createdAt).toLocaleDateString()}</span>}
      />

      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm font-bold p-3 border ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-200' : 'text-rose-900 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      {/* Account */}
      <div className="app-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{tx('Account')}</h2>
          {a.nameEditable && !editName && <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setName(a.name); setEditName(true); setMsg(null); }}>{tx('Edit name')}</button>}
        </div>
        {editName ? (
          <form onSubmit={saveName} className="flex flex-wrap items-end gap-2">
            <div className="grow max-w-sm"><label htmlFor="pf-name" className="form-label">{tx('Full name')}</label><input id="pf-name" className="form-input" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" /></div>
            <button type="submit" className="btn btn-sm btn-primary">{tx('Save')}</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditName(false)}>{tx('Cancel')}</button>
          </form>
        ) : (
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{row(tx('Full name'), a.name)}{row(tx('Sign-in email'), a.email)}</dl>
        )}
        {!a.nameEditable && <p className="text-xs text-slate-600">{tx('Your name is tied to your verified licence. To change it, contact the board.')}</p>}
      </div>

      {/* Personal information (members) */}
      {pt && (
        <div className="app-card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{tx('Personal information')}</h2>
            {!editPersonal && <button type="button" className="btn btn-sm btn-secondary" onClick={startPersonal}>{tx('Edit details')}</button>}
          </div>
          {!editPersonal ? (
            <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {row(pt.idType === 'passport' ? tx('Passport number') : tx('MyKad number'), pt.idNumberMasked)}
              {row(tx('Date of birth'), pt.dateOfBirth)}
              {row(tx('Nationality'), pt.nationality)}
              {row(tx('Gender'), pt.gender)}
              {row(tx('Phone'), pt.phone)}
              {row(tx('Preferred language'), langLabel(pt.preferredLanguage))}
              <div className="sm:col-span-2">{row(tx('Address'), addrText(pt.address))}</div>
              {row(tx('Emergency contact'), pt.emergencyContactName ? `${pt.emergencyContactName} (${pt.emergencyContactRelationship || '—'}) · ${pt.emergencyContactPhone}` : '')}
              {row(tx('Next of kin'), pt.nextOfKin ? `${pt.nextOfKin.name} (${pt.nextOfKin.relationship}) · ${pt.nextOfKin.phone}` : '')}
            </dl>
          ) : (
            <form onSubmit={savePersonal} className="grid sm:grid-cols-2 gap-3">
              <p className="sm:col-span-2 text-xs text-slate-600">{tx('Your ID number, date of birth and nationality identify you and cannot be changed here.')}</p>
              <div><label htmlFor="pf-phone" className="form-label">{tx('Phone')}</label><input id="pf-phone" type="tel" autoComplete="tel" className="form-input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} required /></div>
              <div><label htmlFor="pf-gender" className="form-label">{tx('Gender')}</label>
                <select id="pf-gender" className="form-input" value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })}>{['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{tx(g)}</option>)}</select></div>
              <div><label htmlFor="pf-lang" className="form-label">{tx('Preferred language')}</label>
                <select id="pf-lang" className="form-input" value={f.preferredLanguage} onChange={e => setF({ ...f, preferredLanguage: e.target.value })}>{PREFERRED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></div>
              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3 border-t border-[color:var(--t-100)] pt-3">
                <h3 className="sm:col-span-2 text-sm font-extrabold">{tx('Address')}</h3>
                <div className="sm:col-span-2"><label htmlFor="pf-l1" className="form-label">{tx('Address line 1')}</label><input id="pf-l1" autoComplete="address-line1" className="form-input" value={f.address.line1} onChange={e => setAddr('line1', e.target.value)} required={!!pt.address} /></div>
                <div className="sm:col-span-2"><label htmlFor="pf-l2" className="form-label">{tx('Address line 2')}</label><input id="pf-l2" autoComplete="address-line2" className="form-input" value={f.address.line2 ?? ''} onChange={e => setAddr('line2', e.target.value)} /></div>
                <div><label htmlFor="pf-city" className="form-label">{tx('City')}</label><input id="pf-city" autoComplete="address-level2" className="form-input" value={f.address.city} onChange={e => setAddr('city', e.target.value)} required={!!pt.address} /></div>
                <div><label htmlFor="pf-country" className="form-label">{tx('Country code (for example MY)')}</label><input id="pf-country" maxLength={2} autoComplete="country" className="form-input" value={f.address.country} onChange={e => setAddr('country', e.target.value.toUpperCase())} required={!!pt.address} /></div>
                <div><label htmlFor="pf-state" className="form-label">{tx('State')}</label>
                  {f.address.country === 'MY'
                    ? <select id="pf-state" className="form-input" value={f.address.state ?? ''} onChange={e => setAddr('state', e.target.value)} required={!!pt.address}><option value="">{tx('Choose…')}</option>{MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    : <input id="pf-state" autoComplete="address-level1" className="form-input" value={f.address.state ?? ''} onChange={e => setAddr('state', e.target.value)} />}</div>
                <div><label htmlFor="pf-post" className="form-label">{tx('Postcode')}</label><input id="pf-post" autoComplete="postal-code" className="form-input" value={f.address.postcode} onChange={e => setAddr('postcode', e.target.value)} required={!!pt.address} /></div>
              </div>
              <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3 border-t border-[color:var(--t-100)] pt-3">
                <h3 className="sm:col-span-3 text-sm font-extrabold">{tx('Emergency contact')}</h3>
                <div><label htmlFor="pf-en" className="form-label">{tx('Name')}</label><input id="pf-en" className="form-input" value={f.emergencyContactName} onChange={e => setF({ ...f, emergencyContactName: e.target.value })} required /></div>
                <div><label htmlFor="pf-er" className="form-label">{tx('Relationship')}</label>
                  <select id="pf-er" className="form-input" value={f.emergencyContactRelationship} onChange={e => setF({ ...f, emergencyContactRelationship: e.target.value })}>{RELATIONSHIPS.map(r => <option key={r} value={r}>{tx(r)}</option>)}</select></div>
                <div><label htmlFor="pf-ep" className="form-label">{tx('Phone')}</label><input id="pf-ep" type="tel" className="form-input" value={f.emergencyContactPhone} onChange={e => setF({ ...f, emergencyContactPhone: e.target.value })} required /></div>
              </div>
              <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3 border-t border-[color:var(--t-100)] pt-3">
                <label className="sm:col-span-3 inline-flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={f.hasNok} onChange={e => setF({ ...f, hasNok: e.target.checked })} />{tx('Add a next of kin')}</label>
                {f.hasNok && <>
                  <div><label htmlFor="pf-kn" className="form-label">{tx('Name')}</label><input id="pf-kn" className="form-input" value={f.nok.name} onChange={e => setF({ ...f, nok: { ...f.nok, name: e.target.value } })} required /></div>
                  <div><label htmlFor="pf-kr" className="form-label">{tx('Relationship')}</label>
                    <select id="pf-kr" className="form-input" value={f.nok.relationship} onChange={e => setF({ ...f, nok: { ...f.nok, relationship: e.target.value } })}>{RELATIONSHIPS.map(r => <option key={r} value={r}>{tx(r)}</option>)}</select></div>
                  <div><label htmlFor="pf-kp" className="form-label">{tx('Phone')}</label><input id="pf-kp" type="tel" className="form-input" value={f.nok.phone} onChange={e => setF({ ...f, nok: { ...f.nok, phone: e.target.value } })} required /></div>
                </>}
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-sm btn-primary">{tx('Save changes')}</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditPersonal(false)}>{tx('Cancel')}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Professional credentials (practitioners): status only; they are managed in the workspace */}
      {p.professional && (
        <div className="app-card space-y-3">
          <h2 className="text-lg font-bold">{tx('Professional credentials')}</h2>
          <dl className="grid sm:grid-cols-3 gap-4">
            {row(tx('Registration number'), p.professional.licenseNumber)}
            {row(tx('Specialty'), p.professional.specialty)}
            {row(tx('Verification status'), p.professional.verificationStatus)}
          </dl>
          <p className="text-xs text-slate-600">{tx('Licence, APC and CPD details are managed in your workspace under Licensing and APC.')}</p>
          {onOpenCredentials && <button type="button" className="btn btn-sm btn-secondary" onClick={onOpenCredentials}>{tx('Open Licensing and APC')}</button>}
        </div>
      )}

      {/* Sign-in details */}
      <div className="app-card space-y-4">
        <h2 className="text-lg font-bold">{tx('Sign-in details')}</h2>
        <form onSubmit={saveEmail} className="grid sm:grid-cols-3 gap-3 items-end">
          <h3 className="sm:col-span-3 text-sm font-extrabold">{tx('Change sign-in email')}</h3>
          <div><label htmlFor="pf-ne" className="form-label">{tx('New email')}</label><input id="pf-ne" type="email" autoComplete="email" className="form-input" value={email.newEmail} onChange={e => setEmail({ ...email, newEmail: e.target.value })} required /></div>
          <div><label htmlFor="pf-ec" className="form-label">{tx('Current password')}</label><input id="pf-ec" type="password" autoComplete="current-password" className="form-input" value={email.currentPassword} onChange={e => setEmail({ ...email, currentPassword: e.target.value })} required /></div>
          <div><button type="submit" className="btn btn-sm btn-primary">{tx('Change email')}</button></div>
        </form>
        <form onSubmit={savePassword} className="grid sm:grid-cols-4 gap-3 items-end border-t border-[color:var(--t-100)] pt-4">
          <h3 className="sm:col-span-4 text-sm font-extrabold">{tx('Change password')}</h3>
          <div><label htmlFor="pf-cp" className="form-label">{tx('Current password')}</label><input id="pf-cp" type="password" autoComplete="current-password" className="form-input" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} required /></div>
          <div><label htmlFor="pf-np" className="form-label">{tx('New password')}</label><input id="pf-np" type="password" autoComplete="new-password" className="form-input" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} required /></div>
          <div><label htmlFor="pf-cf" className="form-label">{tx('Confirm new password')}</label><input id="pf-cf" type="password" autoComplete="new-password" className="form-input" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} required /></div>
          <div><button type="submit" className="btn btn-sm btn-primary">{tx('Change password')}</button></div>
          <p className="sm:col-span-4 text-xs text-slate-600">{tx('Changing your password signs you out on other devices.')}</p>
        </form>
      </div>
    </section>
  );
}