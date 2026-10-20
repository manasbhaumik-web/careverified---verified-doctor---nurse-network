import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, RefreshCw, Filter, ShieldCheck, 
  AlertTriangle, Clock, ArrowDownUp, CheckCircle2, User,
  ExternalLink, Download, Eye, ChevronRight, X
} from 'lucide-react';

export interface AuditLogEntry {
  id: number;
  ts: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  details: string | null;
  parsedDetails?: any;
}

export interface AdminAuditLogProps {
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function AdminAuditLog({ onClose, isEmbedded = false }: AdminAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [error, setError] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const url = selectedAction !== 'all' 
        ? `/api/admin/audit-logs?limit=100&action=${encodeURIComponent(selectedAction)}` 
        : `/api/admin/audit-logs?limit=100`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(data.data.logs || []);
        setTotalCount(data.data.totalCount || (data.data.logs || []).length);
      } else {
        setError(data.message || 'Failed to retrieve audit log telemetry.');
      }
    } catch (err: any) {
      setError(err.message || 'Network connection failed while querying audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actionMatch = log.action?.toLowerCase().includes(q);
    const actorMatch = log.actor_id?.toLowerCase().includes(q) || log.actor_role?.toLowerCase().includes(q);
    const targetMatch = log.target_id?.toLowerCase().includes(q) || log.target_type?.toLowerCase().includes(q);
    const detailsMatch = log.details?.toLowerCase().includes(q);
    return actionMatch || actorMatch || targetMatch || detailsMatch;
  });

  const getActionTone = (action: string) => {
    if (action.includes('suspend') || action.includes('reject') || action.includes('breach')) {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
    if (action.includes('sanction') || action.includes('warning') || action.includes('info')) {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    if (action.includes('decision') || action.includes('reinstate') || action.includes('verify') || action.includes('approve')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const exportAuditCsv = () => {
    const headers = ['ID', 'Timestamp (UTC)', 'Actor ID', 'Actor Role', 'Action', 'Target Type', 'Target ID', 'IP Address', 'Details'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.ts}"`,
      `"${l.actor_id || 'system'}"`,
      `"${l.actor_role || 'internal'}"`,
      `"${l.action}"`,
      `"${l.target_type || ''}"`,
      `"${l.target_id || ''}"`,
      `"${l.ip || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medcred_statutory_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerClasses = isEmbedded
    ? "bg-white border border-slate-200 rounded-none p-5 shadow-xs space-y-4"
    : "fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in";

  const contentClasses = isEmbedded
    ? "w-full space-y-4"
    : "relative bg-white border-2 border-slate-900 rounded-none max-w-5xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto space-y-5";

  return (
    <div className={containerClasses}>
      <div className={contentClasses} onClick={isEmbedded ? undefined : (e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-100 text-slate-800 border border-slate-300 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-black uppercase tracking-wider px-2 py-0.5 bg-slate-900 text-amber-300 border border-slate-800">
                  Statutory Audit Log (WAL Mode)
                </span>
                <span className="text-xs text-slate-500 font-mono">SQLite careverified.db</span>
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mt-0.5">
                Regulatory Action Audit Trail &amp; System Log Inspector
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportAuditCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
              title="Export filtered audit logs to CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh audit telemetry from server"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {!isEmbedded && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Metric Ribbons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Total Audit Events</span>
            <span className="text-xl font-black text-slate-900 tabular-nums">{totalCount}</span>
            <span className="text-xs text-slate-600 block mt-0.5 font-semibold">Persisted in SQLite</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Active Search Filter</span>
            <span className="text-xl font-black text-slate-900 tabular-nums">{filteredLogs.length}</span>
            <span className="text-xs text-emerald-700 font-bold block mt-0.5">Matching criteria</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Integrity Mode</span>
            <span className="text-xl font-black text-slate-900 font-mono text-xs">WAL PRAGMA</span>
            <span className="text-xs text-emerald-700 font-bold block mt-0.5">Crash-proof ACID log</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Statutory Scope</span>
            <span className="text-xl font-black text-slate-900 font-mono text-xs">Act 50 / 586</span>
            <span className="text-xs text-slate-600 block mt-0.5 font-semibold">Retention compliance</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit trail by actor ID, practitioner ID, action, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="all">All Actions (Full Trail)</option>
              <option value="verification">Verification &amp; Approvals</option>
              <option value="sanction">Sanctions &amp; Dual-Signoff</option>
              <option value="professional.suspend">Suspension Orders</option>
              <option value="professional.reinstate">Reinstatements</option>
              <option value="complaint">Complaints &amp; Reports</option>
              <option value="breach">PDPA Data Breaches</option>
              <option value="retention">Retention &amp; Erasure</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs">
                <th className="p-2.5">Log ID</th>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Actor (Role)</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Target</th>
                <th className="p-2.5">Details</th>
                <th className="p-2.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading statutory audit records from WAL SQLite database...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                    No audit records matched your search query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-mono text-xs text-slate-500 font-bold">#{log.id}</td>
                    <td className="p-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {new Date(log.ts).toLocaleString([], { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td className="p-2.5">
                      <span className="font-bold text-slate-900 block truncate max-w-[130px]" title={log.actor_id || 'system'}>
                        {log.actor_id || 'System Daemon'}
                      </span>
                      <span className="text-xs font-mono text-slate-500 block uppercase font-semibold">
                        {log.actor_role || 'system'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className={`text-2xs font-bold uppercase px-2 py-0.5 border ${getActionTone(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-xs text-slate-700">
                      {log.target_type ? `${log.target_type}:${log.target_id?.slice(0, 10)}` : '—'}
                    </td>
                    <td className="p-2.5 text-slate-600 max-w-xs truncate" title={log.details || ''}>
                      {log.details ? (
                        <span className="font-mono text-xs">{log.details.slice(0, 60)}{log.details.length > 60 ? '...' : ''}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Log Detail Inspector Modal */}
        {selectedLog && (
          <div 
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setSelectedLog(null)}
          >
            <div 
              className="relative bg-white border-2 border-slate-900 rounded-none max-w-lg w-full p-5 shadow-2xl space-y-4 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between pb-2 border-b border-slate-200">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Audit Record Inspector</span>
                  <h4 className="text-sm font-black text-slate-900 font-mono">Event #{selectedLog.id} · {selectedLog.action}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="h-7 w-7 text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700 bg-slate-50 p-3 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-500 block uppercase">Timestamp (ISO)</span>
                  <span className="font-mono font-semibold text-xs">{selectedLog.ts}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 block uppercase">IP Address</span>
                  <span className="font-mono font-semibold text-xs">{selectedLog.ip || 'Local Loopback'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 block uppercase">Actor ID</span>
                  <span className="font-mono font-semibold text-xs">{selectedLog.actor_id || 'System'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 block uppercase">Actor Role</span>
                  <span className="font-mono font-bold text-xs uppercase text-emerald-800">{selectedLog.actor_role || 'internal'}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-600 block uppercase mb-1">Parsed JSON Event Metadata:</span>
                <div className="p-3 bg-slate-900 text-emerald-300 font-mono text-xs max-h-48 overflow-y-auto border border-slate-800">
                  <pre>{JSON.stringify(selectedLog.parsedDetails || selectedLog.details, null, 2)}</pre>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
