import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

interface Item { id: string; ts: string; title: string; body: string; isRead: number }

/** In-app notifications (verification decisions, expiry warnings, complaint updates). */
export default function NotificationBell() {
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

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative h-11 w-11 flex items-center justify-center text-white bg-transparent border border-white/60 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
        title="Notifications"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[color:var(--t-700)] text-[10px] font-black flex items-center justify-center">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white text-slate-800 border border-[color:var(--t-200)] shadow-lg z-50">
          {items.length === 0 ? (
            <p className="p-4 text-xs text-slate-500">No notifications yet.</p>
          ) : items.map(i => (
            <div key={i.id} className={`p-3 border-b border-slate-100 text-xs ${i.isRead ? '' : 'bg-[color:var(--t-50)]'}`}>
              <p className="font-extrabold">{i.title}</p>
              <p className="text-slate-600 mt-0.5">{i.body}</p>
              <p className="text-[10px] text-slate-400 mt-1">{new Date(i.ts).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
