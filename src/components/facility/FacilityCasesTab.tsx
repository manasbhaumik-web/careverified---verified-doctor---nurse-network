import React from 'react';
import {
  Building2, FileText, DollarSign, CheckCircle2, BadgeCheck, Receipt, ShieldCheck
} from 'lucide-react';
import WorkspaceHeader from '../WorkspaceHeader';
import { BannerBadge } from '../DashboardHeader';
import { PatientCase, ReferralLedgerData, ReferralLedgerCase } from './types';

interface FacilityCasesTabProps {
  cases: PatientCase[];
  casesSubTab: 'referrals' | 'ledger';
  setCasesSubTab: (tab: 'referrals' | 'ledger') => void;
  caseStatusFilter: string;
  setCaseStatusFilter: (val: string) => void;
  filteredCases: PatientCase[];
  referralLedger: ReferralLedgerData | null;
  onOpenQuoteModal: (c: PatientCase) => void;
  onUpdateCaseStatus: (caseId: string, status: string) => void;
  onSelectInvoice: (invoice: ReferralLedgerCase) => void;
}

export default function FacilityCasesTab({
  cases,
  casesSubTab,
  setCasesSubTab,
  caseStatusFilter,
  setCaseStatusFilter,
  filteredCases,
  referralLedger,
  onOpenQuoteModal,
  onUpdateCaseStatus,
  onSelectInvoice,
}: FacilityCasesTabProps) {
  return (
    <div className="space-y-4">
      <WorkspaceHeader
        icon={Building2}
        eyebrow="Clinical Logistics & Patient Intake"
        title="Patient Referrals, Quotations & Facilitator Ledger"
        description="Manage cross-border medical referrals, issue formal treatment quotes, and track automated 8% institutional facilitator success fees."
        badges={<BannerBadge tone="brand">MHTC Coordinated</BannerBadge>}
        tabs={[
          { id: 'referrals', label: 'Inbound Referrals', count: cases.length },
          { id: 'ledger', label: 'Commission Ledger (8% Fee)', count: referralLedger?.cases.length || 0 },
        ]}
        activeTab={casesSubTab}
        onTabChange={(t) => setCasesSubTab(t as any)}
      />

      {/* ------------------------------------------------------------------- */}
      {/* SUB-TAB 1: INBOUND REFERRALS & TREATMENT QUOTES */}
      {/* ------------------------------------------------------------------- */}
      {casesSubTab === 'referrals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-extrabold uppercase text-slate-400">Filter Status:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {['all', 'enquiry', 'quoted', 'accepted', 'in_treatment', 'completed'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCaseStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-bold uppercase cursor-pointer ${
                    caseStatusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="p-12 bg-slate-50 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200">
              <FileText className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No active patient referral cases found.</p>
              <p className="text-xs text-slate-500">Inbound clinical referral inquiries and cross-border consultations will appear here automatically.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200">
              {filteredCases.map(c => (
                <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{c.patient}</span>
                      {c.trackingCode && (
                        <span className="font-mono text-2xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5">
                          {c.trackingCode}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-2xs font-extrabold uppercase border ${
                        c.patientType === 'international_traveler'
                          ? 'bg-sky-50 text-sky-800 border-sky-300'
                          : c.patientType === 'expat_resident'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}>
                        {c.patientType === 'international_traveler' ? '✈️ Int’l Traveler' : c.patientType === 'expat_resident' ? '🌏 Expat Resident' : '🇲🇾 Local Citizen'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-2xs font-extrabold uppercase">
                        Origin: {c.country}
                      </span>
                      {c.urgency && c.urgency !== 'routine' && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-300 text-2xs font-black uppercase">
                          {c.urgency === 'urgent' ? '🚨 Urgent' : '⚡ Priority'}
                        </span>
                      )}
                      {c.guaranteeLetter && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 text-2xs font-black uppercase">
                          LOG / Direct Billing
                        </span>
                      )}
                      {c.specialty && (
                        <span className="px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] text-2xs font-black uppercase border border-[color:var(--t-200)]">
                          {c.specialty}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-2xs font-black uppercase border ${
                        c.status === 'quoted'
                          ? 'bg-sky-50 text-sky-800 border-sky-300'
                          : c.status === 'accepted'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : c.status === 'in_treatment'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : c.status === 'completed'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
                      {c.summary}
                    </p>

                    {c.revisionNotes && (
                      <div className="p-2 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                        <span className="font-black text-amber-800 uppercase text-xs">⚠️ Patient Requested Revision:</span>
                        <span>"{c.revisionNotes}"</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Case ID: <code className="font-mono text-slate-600 font-bold">{c.id}</code></span>
                      {c.patientEmail && <span>Contact: <strong className="text-slate-600">{c.patientEmail}</strong></span>}
                      {c.insuranceCarrier && <span>Insurance: <strong className="text-slate-600">{c.insuranceCarrier}</strong></span>}
                      {c.preferredFrom && <span>Requested: <strong className="text-slate-600">{c.preferredFrom}</strong></span>}
                      <span>Updated: {new Date(c.updatedAt).toLocaleDateString('en-MY')}</span>
                    </div>

                    {c.latestQuote && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-900">Current Treatment Quotation (v{c.latestQuote.version}):</span>
                        <span className="font-mono font-black text-emerald-800 text-xs">
                          RM {c.latestQuote.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* Completed Case: Facilitator Success-Fee Invoice Callout */}
                    {c.status === 'completed' && c.commissionInvoiceNo && (
                      <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-emerald-400" />
                          <span>Hospital Facilitator Invoice: <strong className="font-mono text-emerald-300">{c.commissionInvoiceNo}</strong></span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-300">
                            Success Fee (8%): <strong>RM {c.referralCommissionMyr?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</strong>
                          </span>
                          <span className={`text-2xs font-black uppercase px-2 py-0.5 ${
                            c.commissionStatus === 'settled' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
                          }`}>
                            {c.commissionStatus || 'Invoiced'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quotation & Status Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {c.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => onOpenQuoteModal(c)}
                        className="px-3 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        {c.latestQuote ? 'Update Quote' : 'Issue Treatment Quote'}
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      {c.status === 'quoted' && (
                        <button
                          type="button"
                          onClick={() => onUpdateCaseStatus(c.id, 'accepted')}
                          className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 cursor-pointer"
                        >
                          Mark Accepted
                        </button>
                      )}
                      {c.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => onUpdateCaseStatus(c.id, 'in_treatment')}
                          className="px-2 py-1 text-xs font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] border border-[color:var(--t-200)] cursor-pointer"
                        >
                          Admit / In Treatment
                        </button>
                      )}
                      {c.status === 'in_treatment' && (
                        <button
                          type="button"
                          onClick={() => onUpdateCaseStatus(c.id, 'completed')}
                          className="px-2 py-1 text-xs font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Discharge & Invoice Fee
                        </button>
                      )}
                      {c.status === 'completed' && c.commissionInvoiceNo && (
                        <button
                          type="button"
                          onClick={() => {
                            const ledgerItem = referralLedger?.cases.find(lc => lc.id === c.id);
                            if (ledgerItem) onSelectInvoice(ledgerItem);
                          }}
                          className="px-2 py-1 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 cursor-pointer flex items-center gap-1"
                        >
                          <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                          View Invoice
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUB-TAB 2: AUTOMATED REFERRAL COMMISSION LEDGER */}
      {/* ------------------------------------------------------------------- */}
      {casesSubTab === 'ledger' && (
        <div className="space-y-5">
          {/* Healthcare Regulatory Compliance Banner */}
          <div className="p-4 bg-slate-900 text-white space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <h4 className="font-black text-sm uppercase tracking-wider text-emerald-300">
                Malaysian Medical Act 1971 & MMC Ethical Code Compliance Notice
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              All success fees recorded below are <strong>strictly institutional facilitation fees</strong> payable by the healthcare facility to CareVerified for patient coordination, cross-border second opinions, and medical logistics. <strong>Doctor professional consultation fees are never split or subject to referral commissions</strong>, ensuring 100% adherence to MMC Ethical Code Chapter 2 & Act 586 statutory directives.
            </p>
          </div>

          {/* Ledger Aggregate KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 space-y-1">
              <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Total Discharged Referrals</span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {referralLedger?.cases.length || 0} Cases
              </div>
              <span className="text-2xs text-slate-500 font-medium">Completed medical admissions</span>
            </div>

            <div className="bg-white border border-slate-200 p-4 space-y-1">
              <span className="text-xs font-mono font-bold uppercase text-emerald-700 block">Institutional Success Fee Rate</span>
              <div className="text-2xl font-black text-emerald-800 font-mono">
                {referralLedger?.summary.commissionRatePct || 8}%
              </div>
              <span className="text-2xs text-slate-500 font-medium">Contracted facilitation rate</span>
            </div>

            <div className="bg-white border border-slate-200 p-4 space-y-1">
              <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Total Invoiced Fees (MYR)</span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                RM {(referralLedger?.summary.totalInvoicedMyr || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-2xs text-slate-500 font-medium">Settled: RM {(referralLedger?.summary.totalSettledMyr || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="bg-white border border-slate-200 p-4 space-y-1">
              <span className="text-xs font-mono font-bold uppercase text-amber-800 block">Pending Settlement (MYR)</span>
              <div className="text-2xl font-black text-amber-700 font-mono">
                RM {(referralLedger?.summary.totalPendingMyr || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-2xs text-amber-700 font-medium">Net-30 Corporate Terms</span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Patient Admission & Commission Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Itemized historical record of finalized hospital patient admissions with verifiable facilitation invoices.
                </p>
              </div>
            </div>

            {!referralLedger || referralLedger.cases.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2 bg-slate-50 border border-dashed border-slate-200">
                <Receipt className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No discharged patient referral records in the ledger yet.</p>
                <p className="text-xs text-slate-400">
                  When an admitted patient completes treatment and is discharged, their final institutional invoice will be generated here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-extrabold text-xs uppercase tracking-wider">
                      <th className="p-3">Patient & Origin</th>
                      <th className="p-3">Clinical Specialty</th>
                      <th className="p-3">Discharge Date</th>
                      <th className="p-3 text-right">Hospital Quotation (MYR)</th>
                      <th className="p-3 text-right">8% Success Fee (MYR)</th>
                      <th className="p-3">Invoice Number</th>
                      <th className="p-3">Settlement</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referralLedger.cases.map(lc => (
                      <tr key={lc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <strong className="text-slate-900 block font-bold">{lc.patient}</strong>
                          <span className="text-xs text-slate-500">{lc.country}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] text-2xs font-black uppercase border border-[color:var(--t-200)]">
                            {lc.specialty || 'General Care'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-xs">
                          {new Date(lc.updatedAt).toLocaleDateString('en-MY')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          RM {lc.finalQuotationMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-800 tabular-nums">
                          RM {lc.referralCommissionMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <code className="font-mono text-xs font-black text-[color:var(--t-700)] bg-slate-100 px-1.5 py-0.5">
                            {lc.commissionInvoiceNo || 'Pending'}
                          </code>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-2xs font-black uppercase ${
                            lc.commissionStatus === 'settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {lc.commissionStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectInvoice(lc)}
                            className="px-2.5 py-1 text-xs font-bold border border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <FileText className="h-3 w-3 text-slate-500" />
                            Invoice Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
