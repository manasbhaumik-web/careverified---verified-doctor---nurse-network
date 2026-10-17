import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, Search, Ban } from 'lucide-react';
import { ChatMessage } from '../types';
import DashboardHeader from './DashboardHeader';

interface Thread { id: string; name: string; role: string; blocked: boolean }

const jpost = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

/** Messages with the people you are in a care relationship with. Block anyone who bothers you; report problems to support. */
export default function SecureMessenger({ currentUserId, embedded = false }: { currentUserId: string; embedded?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Phones show the list or one conversation at a time; larger screens show both.
  const [mobileThread, setMobileThread] = useState(false);
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
    <div className={embedded ? "space-y-4" : "w-full space-y-0"} id="secure-messenger-panel">
      {!embedded && (
        <div className={mobileThread ? 'hidden lg:block' : ''}>
          <DashboardHeader
            icon={MessageSquare}
            eyebrow="Messages"
            title="Your care team"
            description="Messages are private to you and the other person. Do not use messages for emergencies: call 999. Replies can take time."
          />
        </div>
      )}

      <div className={embedded ? "space-y-4" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"}>
        <div className={`bg-white border border-[color:var(--t-200)] shadow-xs grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] lg:h-[calc(100dvh-280px)] lg:min-h-[520px] ${mobileThread ? 'h-[calc(100dvh-9rem-env(safe-area-inset-bottom))]' : ''}`}>
        <aside aria-label="Conversations" className={`${mobileThread ? 'hidden lg:flex' : 'flex'} border-b lg:border-b-0 lg:border-r border-[color:var(--t-200)] flex-col min-h-0 lg:max-h-none bg-white`}>
          <div className="p-3 border-b border-[color:var(--t-200)]">
            <label htmlFor="mailbox-search" className="sr-only">Search conversations</label>
            <div className="flex items-center gap-2 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3.5 h-12 focus-within:border-[color:var(--t-600)] transition-colors">
              <Search className="h-4 w-4 text-slate-500 shrink-0" />
              <input id="mailbox-search" placeholder="Search care team…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-0 bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder-slate-500" />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-[color:var(--t-100)]">
            {shown.map(t => (
              <li key={t.id}>
                <button onClick={() => { setActiveId(t.id); setMobileThread(true); }} aria-current={t.id === activeId ? 'true' : undefined}
                  className={`w-full text-left px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-colors ${t.id === activeId ? 'bg-[color:var(--t-50)] shadow-[inset_4px_0_0_var(--t-600)]' : 'hover:bg-[color:var(--t-50)]'}`}>
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 bg-[color:var(--t-100)] border border-[color:var(--t-200)] flex items-center justify-center font-bold text-xs text-[color:var(--t-700)]">
                      {t.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[color:var(--ink)] truncate">{t.name}</p>
                    <p className="text-xs text-[color:var(--ink-2)] truncate mt-0.5">{t.role}{t.blocked ? ' · blocked' : ''}</p>
                  </div>
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-4 py-12 text-sm text-[color:var(--ink-2)] text-center">
                <MessageSquare className="h-8 w-8 text-[color:var(--t-300)] mx-auto mb-2" />
                {threads.length === 0 ? 'You can message practitioners after you have booked or consulted them.' : 'No conversations found.'}
              </li>
            )}
          </ul>
        </aside>

        <section aria-label="Conversation" className={`${mobileThread ? 'flex' : 'hidden lg:flex'} flex-col min-h-0 lg:min-h-0 min-w-0 bg-[color:var(--t-bg)]`}>
          {current ? (
            <>
              <div className="px-5 py-3.5 bg-white border-b border-[color:var(--t-200)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button type="button" onClick={() => setMobileThread(false)} aria-label="Back to conversations" className="lg:hidden -ml-2 h-11 w-11 shrink-0 flex items-center justify-center text-[color:var(--t-700)] cursor-pointer text-xl font-bold">&#8592;</button>
                  <div className="h-9 w-9 bg-[color:var(--t-100)] border border-[color:var(--t-200)] flex items-center justify-center font-bold text-xs text-[color:var(--t-700)] shrink-0">
                    {current.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[color:var(--ink)] truncate flex items-center gap-2">
                      {current.name}
                      <span className="text-[10px] font-mono uppercase tracking-wider bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] px-1.5 py-0.5">Verified</span>
                    </h2>
                    <p className="text-xs text-[color:var(--ink-2)] truncate">{current.role}</p>
                  </div>
                </div>
                <button onClick={toggleBlock} className="text-xs font-bold border border-slate-200 px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:bg-rose-50 text-[color:var(--ink-2)] hover:text-rose-700 transition-colors">
                  <Ban className="h-3.5 w-3.5" /> {current.blocked ? 'Unblock' : 'Block'}
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
                {thread.length === 0 && (
                  <div className="text-center py-16 text-sm text-[color:var(--ink-2)]">
                    <MessageSquare className="h-8 w-8 text-[color:var(--t-400)] mx-auto mb-2" />
                    No messages yet. Send a message to start communicating with {current.name}.
                  </div>
                )}
                {thread.map(m => {
                  const mine = m.senderId === currentUserId;
                  return (
                    <div key={m.id} className={`flex flex-col max-w-[80%] ${mine ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className={`px-4 py-3 text-sm leading-relaxed ${mine ? 'bg-[color:var(--t-600)] text-white shadow-xs' : 'bg-white border border-[color:var(--t-200)] text-[color:var(--ink)] shadow-xs'}`}>
                        {m.text}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 font-mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {error && <p role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 border-t border-rose-200 px-5 py-2">{error}</p>}
              <form onSubmit={send} className="border-t border-[color:var(--t-200)] px-3 sm:px-5 py-3 bg-white flex items-center gap-2 sm:gap-3 shrink-0">
                <label htmlFor="mailbox-message" className="sr-only">Message</label>
                <input id="mailbox-message" value={text} onChange={e => setText(e.target.value)} maxLength={2000} enterKeyHint="send" autoComplete="off" placeholder="Type a message to your practitioner…"
                  className="flex-1 min-w-0 h-12 text-sm border border-[color:var(--t-200)] px-4 outline-none focus:border-[color:var(--t-600)] bg-[color:var(--t-bg)] text-[color:var(--ink)] transition-colors placeholder-slate-500" />
                <button disabled={!text.trim()} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white h-12 px-4 sm:px-6 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs shrink-0" aria-label="Send">
                  <span className="hidden sm:inline">Send</span> <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-sm text-[color:var(--ink-2)] p-8 text-center space-y-2">
              <MessageSquare className="h-10 w-10 text-[color:var(--t-300)]" />
              <p className="font-bold text-[color:var(--ink)]">No conversation selected</p>
              <p className="text-xs">Select a care provider from the left panel to read and reply.</p>
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
