import React, { useCallback, useEffect, useState } from 'react';
import { Truck, Snowflake, ShieldCheck } from 'lucide-react';
import { MY_STATES, toE164 } from '../identity';

const jget = (url: string) => fetch(url).then(r => r.json());
const jsend = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const METHOD_LABEL: Record<string, string> = { pharmacy_courier: "Pharmacy's own rider", grab: 'Grab delivery', lalamove: 'Lalamove', other_courier: 'Other courier' };
const STATUS_LABEL: Record<string, string> = {
  requested: 'Requested', arranged: 'Arranged', out_for_delivery: 'Out for delivery', delivered: 'Delivered', failed: 'Failed', cancelled: 'Cancelled',
};
const GL_LABEL: Record<string, string> = { requested: 'Waiting for the pharmacy', approved: 'Guarantee letter approved', declined: 'Not covered by the guarantee letter' };
const input = 'border border-slate-300 px-2 min-h-[44px] text-xs';
const link = 'min-h-[44px] px-2 inline-flex items-center font-bold underline cursor-pointer';

interface Props {
  rx: any;                  // prescription as returned by /api/records/me
  pharmacies: any[];        // /api/pharmacies
  onChange: () => void;
}

/** Insurance (panel pharmacies, guarantee letters) and home delivery for one prescription. */
export default function PrescriptionExtras({ rx, pharmacies, onChange }: Props) {
  const pharmacy = pharmacies.find(p => p.id === rx.pharmacyId);
  const [policies, setPolicies] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any | null>(null);
  const [msg, setMsg] = useState('');
  const [addIns, setAddIns] = useState(false);
  const [ins, setIns] = useState({ insurer: '', memberNo: '', policyType: 'individual', employer: '' });
  const [askDelivery, setAskDelivery] = useState(false);
  const [dForm, setDForm] = useState({ method: '', line1: '', line2: '', postcode: '', city: '', state: '', phone: '' });

  const load = useCallback(async () => {
    const [p, d] = await Promise.all([jget('/api/me/insurance'), rx.pharmacyId ? jget(`/api/prescriptions/${rx.id}/delivery`) : Promise.resolve(null)]);
    if (p.status === 'success') setPolicies(p.data);
    if (d?.status === 'success') setDelivery(d.data);
  }, [rx.id, rx.pharmacyId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  // Pre-fill the delivery form from the patient's profile
  useEffect(() => {
    if (!askDelivery) return;
    jget('/api/auth/me').then(d => {
      const pt = d?.data?.patient; if (!pt) return;
      setDForm(f => ({ ...f, line1: f.line1 || pt.address?.line1 || '', line2: f.line2 || pt.address?.line2 || '', postcode: f.postcode || pt.address?.postcode || '', city: f.city || pt.address?.city || '', state: f.state || pt.address?.state || '', phone: f.phone || pt.phone || '' }));
    }).catch(() => {});
  }, [askDelivery]);

  const say = (d: any, ok: string) => { setMsg(d.status === 'success' ? ok : d.message); if (d.status === 'success') { load(); onChange(); } };

  const addPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jsend('POST', '/api/me/insurance', ins);
    if (d.status === 'success') { setAddIns(false); setIns({ insurer: '', memberNo: '', policyType: 'individual', employer: '' }); }
    say(d, 'Insurance saved.');
  };
  const requestDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = toE164(dForm.phone);
    if (!phone) { setMsg('Enter a phone number the rider can call.'); return; }
    const d = await jsend('POST', `/api/prescriptions/${rx.id}/delivery`, { method: dForm.method, contactPhone: phone, address: { line1: dForm.line1, line2: dForm.line2, postcode: dForm.postcode, city: dForm.city, state: dForm.state } });
    if (d.status === 'success') setAskDelivery(false);
    say(d, 'Delivery requested.');
  };

  if (rx.status !== 'active' && rx.status !== 'dispensed') return null;
  const offersDelivery = !!pharmacy && pharmacy.services.includes('Home delivery') && pharmacy.deliveryMethods.length > 0;
  const open = delivery && ['requested', 'arranged', 'out_for_delivery'].includes(delivery.status);

  return (
    <div className="space-y-2 pt-2 mt-1 border-t border-slate-100 text-xs">
      {msg && <p className="font-bold text-sky-900 bg-sky-50 border border-sky-200 p-1.5" role="status">{msg}</p>}

      {/* Insurance and guarantee letter */}
      {rx.status === 'active' && rx.pharmacyId && (
        <div className="space-y-1.5">
          <p className="font-bold flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Insurance</p>
          {pharmacy?.panelInsurers?.length > 0 && <p className="text-slate-700">{pharmacy.name} accepts: {pharmacy.panelInsurers.join(', ')}.</p>}
          <div className="flex flex-wrap gap-2">
            <select aria-label="Insurance policy" className={input} value={rx.insurancePolicyId ?? ''} onChange={async e => say(await jsend('POST', `/api/prescriptions/${rx.id}/insurance`, { policyId: e.target.value || null }), 'Updated.')}>
              <option value="">No insurance</option>
              {policies.map(p => <option key={p.id} value={p.id}>{p.insurer} · {p.memberNo}{p.policyType === 'corporate' ? ` · ${p.employer}` : ''}</option>)}
            </select>
            <button type="button" className={link} onClick={() => setAddIns(a => !a)}>{addIns ? 'Cancel' : 'Add insurance'}</button>
          </div>
          {rx.insurancePolicyId && rx.glStatus && <p className={rx.glStatus === 'declined' ? 'font-bold text-rose-700' : 'font-bold text-emerald-700'}>{GL_LABEL[rx.glStatus] ?? rx.glStatus}{rx.glNumber ? ` (${rx.glNumber})` : ''}{rx.glNote ? `: ${rx.glNote}` : ''}</p>}
          {addIns && (
            <form onSubmit={addPolicy} className="grid grid-cols-2 gap-2 border border-slate-200 p-2">
              <input className={input} placeholder="Insurer" required value={ins.insurer} onChange={e => setIns({ ...ins, insurer: e.target.value })} />
              <input className={input} placeholder="Member / policy no." required value={ins.memberNo} onChange={e => setIns({ ...ins, memberNo: e.target.value })} />
              <select className={input} value={ins.policyType} onChange={e => setIns({ ...ins, policyType: e.target.value })}><option value="individual">Individual</option><option value="corporate">Corporate (employer)</option></select>
              {ins.policyType === 'corporate' ? <input className={input} placeholder="Employer" required value={ins.employer} onChange={e => setIns({ ...ins, employer: e.target.value })} /> : <span />}
              <button className="col-span-2 bg-[color:var(--t-600)] text-white font-bold min-h-[44px] cursor-pointer">Save</button>
            </form>
          )}
          <p className="text-slate-700">The pharmacy sees only the insurer, your member number and employer.</p>
        </div>
      )}

      {/* Home delivery */}
      {rx.pharmacyId && (offersDelivery || delivery) && (
        <div className="space-y-1.5">
          <p className="font-bold flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Home delivery (Malaysia only)</p>
          {delivery && (
            <div className="border border-slate-200 p-2 space-y-1">
              <p><b>{STATUS_LABEL[delivery.status] ?? delivery.status}</b> · {METHOD_LABEL[delivery.method] ?? delivery.method}{delivery.partnerRef ? ` · ref ${delivery.partnerRef}` : ''}{delivery.fee != null ? ` · fee RM ${delivery.fee.toFixed(2)} (paid to the pharmacy or rider)` : ''}</p>
              {delivery.trackingUrl && <p><a href={delivery.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold text-[color:var(--t-700)]">Track delivery</a></p>}
              {delivery.coldChain && <p className="flex gap-1.5 text-sky-900"><Snowflake className="h-3.5 w-3.5 shrink-0 mt-0.5" />{delivery.temperatureNote}</p>}
              {delivery.failureReason && <p className="text-rose-700 font-bold">{delivery.failureReason}</p>}
              {['requested', 'arranged'].includes(delivery.status) && <button type="button" className={link} onClick={async () => say(await jsend('POST', `/api/deliveries/${delivery.id}/cancel`), 'Delivery cancelled.')}>Cancel delivery</button>}
            </div>
          )}
          {offersDelivery && !open && rx.status === 'active' && (askDelivery ? (
            <form onSubmit={requestDelivery} className="grid grid-cols-2 gap-2 border border-slate-200 p-2">
              <select className={`${input} col-span-2`} required value={dForm.method} onChange={e => setDForm({ ...dForm, method: e.target.value })}>
                <option value="">Delivery by…</option>
                {pharmacy.deliveryMethods.map((m: string) => <option key={m} value={m}>{METHOD_LABEL[m] ?? m}</option>)}
              </select>
              <input className={`${input} col-span-2`} placeholder="Address line 1" required value={dForm.line1} onChange={e => setDForm({ ...dForm, line1: e.target.value })} />
              <input className={`${input} col-span-2`} placeholder="Address line 2 (optional)" value={dForm.line2} onChange={e => setDForm({ ...dForm, line2: e.target.value })} />
              <input className={input} placeholder="Postcode (5 digits)" inputMode="numeric" maxLength={5} required value={dForm.postcode} onChange={e => setDForm({ ...dForm, postcode: e.target.value.replace(/\D/g, '') })} />
              <input className={input} placeholder="City" required value={dForm.city} onChange={e => setDForm({ ...dForm, city: e.target.value })} />
              <select className={input} required value={dForm.state} onChange={e => setDForm({ ...dForm, state: e.target.value })}><option value="">State…</option>{MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input className={input} placeholder="Phone the rider can call" required value={dForm.phone} onChange={e => setDForm({ ...dForm, phone: e.target.value })} />
              <p className="col-span-2 text-slate-700">Your address and phone are shared with the pharmacy and its delivery partner only to deliver this order.</p>
              <button className="col-span-2 bg-[color:var(--t-600)] text-white font-bold min-h-[44px] cursor-pointer">Request delivery</button>
            </form>
          ) : <button type="button" className={link} onClick={() => setAskDelivery(true)}>Request home delivery</button>)}
        </div>
      )}
    </div>
  );
}
