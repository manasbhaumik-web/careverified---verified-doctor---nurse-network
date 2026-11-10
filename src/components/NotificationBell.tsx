import React, { useEffect, useState } from 'react';
import { useTr } from '../locale';
import { Bell } from 'lucide-react';

interface Item { id: string; ts: string; title: string; body: string; isRead: number }

export interface NotificationBellProps {
  className?: string;
  tone?: 'onColor' | 'light';
}

/** In-app notifications (verification decisions, expiry warnings, complaint updates). */
export default function NotificationBell({ className = '', tone = 'onColor' }: NotificationBellProps = {}) {
  const tx = useTr();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  const load = () =>
    fetch('/api/notifications').then(r => (r.ok ? r.json() : null))
      .then(d => d?.status === 'success' && setItems(d.data)).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const unread = items.filter(i => !i.isRead).length;
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      // keep the unread styling for this view, clear the badge on the next load
      setTimeout(load, 4000);
    }
  };

  const buttonTone = tone === 'onColor'
    ? 'text-white border-white/25 hover:border-white/50 bg-white/10 hover:bg-white/20'
    : 'text-slate-700 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50';

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className={`relative h-10 w-10 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-white/40 ${buttonTone}`}
        title={tx('Notifications')}
        aria-label={unread ? tx('Notifications, {n} unread', { n: unread }) : tx('Notifications')}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-2xs font-extrabold flex items-center justify-center shadow-xs border-2 border-[color:var(--t-600)] leading-none tabular-nums">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white text-slate-800 border border-slate-200 shadow-xl rounded-none z-50 divide-y divide-slate-100">
          <div className="px-3.5 py-2 bg-[color:var(--t-50)] border-b border-slate-200 text-2xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)]">
            {tx('Notifications')}
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-xs text-slate-500 font-medium">No notifications yet.</p>
          ) : items.map(i => (
            <div key={i.id} className={`p-3.5 text-xs transition-colors ${i.isRead ? '' : 'bg-[color:var(--t-50)]/60'}`}>
              <p className="font-bold text-slate-900 leading-snug">{i.title}</p>
              <p className="text-slate-600 mt-0.5 leading-relaxed text-xs">{i.body}</p>
              <p className="text-2xs font-mono font-medium text-slate-400 mt-1">{new Date(i.ts).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
