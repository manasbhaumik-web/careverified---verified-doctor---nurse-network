import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, Search, Ban } from 'lucide-react';
import { ChatMessage } from '../types';

interface Thread { id: string; name: string; role: string; blocked: boolean }

const jpost = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

/** Messages with the people you are in a care relationship with. Block anyone who bothers you; report problems to support. */
export default function SecureMessenger({ currentUserId }: { currentUserId: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const d = await fetch('/api/chats/threads').then(r => r.json()).catch(() => null);
    if (d?.status === 'success') { setThreads(d.data); setActiveId(prev => prev ?? d.data[0]?.id ?? null); }
  }, []);
  const loadMessages = useCallback(async () => {
    const d = await fetch('/api/chats').then(r => r.json()).catch(() => null);
    if (d?.status === 'success') setMessages(d.data);
  }, []);

  useEffect(() => {
    loadThreads(); loadMessages();
    const t = setInterval(() => { loadMessages(); }, 5000);
    return () => clearInterval(t);
  }, [loadThreads, loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeId]);

  const current = threads.find(t => t.id === activeId) ?? null;
  const thread = messages.filter(m => current && (m.senderId === current.id || m.receiverId === current.id));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !text.trim()) return;
    setError('');
    const body = text;
    setText('');
    const d = await jpost('/api/chats', { receiverId: current.id, receiverName: current.name, text: body });
    if (d.status === 'success') setMessages(prev => [...prev, d.data]);
    else { setError(d.message || 'Message not sent.'); setText(body); }
  };

  const toggleBlock = async () => {
    if (!current) return;
    if (!current.blocked && !window.confirm(`Block ${current.name}? They will no longer be able to message you. You can unblock them later.`)) return;
    await jpost(current.blocked ? `/api/blocks/${current.id}` : '/api/blocks', current.blocked ? undefined : { chatId: current.id }, current.blocked ? 'DELETE' : 'POST');
    loadThreads();
  };

  const shown = threads.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="w-full space-y-5" id="secure-messenger-panel">
      <header className="bg-white border border-[#FECDD3] shadow-xs px-5 py-5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#B91C1C]">Messages</div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">Your care team</h1>
        <p className="text-sm text-slate-600 mt-1">Messages are private to you and the other person. Do not use messages for emergencies: call 999. Replies can take time.</p>
      </header>

      <div className="bg-white border border-[#FECDD3] shadow-xs grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] lg:h-[calc(100vh-300px)] lg:min-h-[480px]">
        <aside aria-label="Conversations" className="border-b lg:border-b-0 lg:border-r border-[#FECDD3] flex flex-col min-h-0 max-h-[320px] lg:max-h-none">
          <div className="p-3 border-b border-[#FECDD3]">
            <label htmlFor="mailbox-search" className="sr-only">Search conversations</label>
            <div className="flex items-center gap-2 border border-[#FECDD3] bg-[#FFF8F9] px-3 min-h-[40px]">
              <Search className="h-4 w-4 text-slate-500 shrink-0" />
              <input id="mailbox-search" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-0 bg-transparent text-sm outline-none" />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-[#FFE4E6]">
            {shown.map(t => (
              <li key={t.id}>
                <button onClick={() => setActiveId(t.id)} aria-current={t.id === activeId ? 'true' : undefined}
                  className={`w-full text-left px-4 py-3.5 cursor-pointer ${t.id === activeId ? 'bg-[#FFF0F2] shadow-[inset_4px_0_0_#DC2626]' : 'hover:bg-[#FFF0F2]'}`}>
                  <p className="text-sm font-bold truncate">{t.name}</p>
                  <p className="text-xs text-slate-600 truncate">{t.role}{t.blocked ? ' · blocked' : ''}</p>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-8 text-sm text-slate-600 text-center">{threads.length === 0 ? 'You can message practitioners after you have booked or consulted them.' : 'No match.'}</li>}
          </ul>
        </aside>

        <section aria-label="Conversation" className="flex flex-col min-h-[420px] lg:min-h-0 min-w-0 bg-[#FFF8F9]">
          {current ? (
            <>
              <div className="px-5 py-3 bg-white border-b border-[#FECDD3] flex items-center justify-between gap-3">
                <div className="min-w-0"><h2 className="text-base font-bold truncate">{current.name}</h2><p className="text-xs text-slate-600">{current.role}</p></div>
                <button onClick={toggleBlock} className="text-xs font-bold border border-slate-200 px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:bg-rose-50">
                  <Ban className="h-3.5 w-3.5" /> {current.blocked ? 'Unblock' : 'Block'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {thread.length === 0 && (
                  <div className="text-center py-12 text-sm text-slate-600"><MessageSquare className="h-6 w-6 text-[#DC2626] mx-auto mb-2" />No messages yet. Say hello to {current.name}.</div>
                )}
                {thread.map(m => {
                  const mine = m.senderId === currentUserId;
                  return (
                    <div key={m.id} className={`flex flex-col max-w-[78%] ${mine ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className={`px-4 py-2.5 text-sm ${mine ? 'bg-[#DC2626] text-white' : 'bg-white border border-[#FECDD3]'}`}>{m.text}</div>
                      <span className="text-[11px] text-slate-500 mt-1">{new Date(m.timestamp).toLocaleString()}</span>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {error && <p role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 px-5 py-2">{error}</p>}
              <form onSubmit={send} className="border-t border-[#FECDD3] px-5 py-3 bg-white flex gap-3">
                <label htmlFor="mailbox-message" className="sr-only">Message</label>
                <input id="mailbox-message" value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Type a message"
                  className="flex-1 min-w-0 min-h-[44px] text-sm border border-[#FECDD3] px-4 outline-none focus:border-[#DC2626] bg-[#FFF8F9]" />
                <button disabled={!text.trim()} className="bg-[#DC2626] disabled:bg-slate-300 text-white min-h-[44px] px-6 text-sm font-bold flex items-center gap-2 cursor-pointer">
                  Send <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : <div className="flex-1 flex items-center justify-center text-sm text-slate-600 p-8 text-center">Select a conversation.</div>}
        </section>
      </div>
    </div>
  );
}
