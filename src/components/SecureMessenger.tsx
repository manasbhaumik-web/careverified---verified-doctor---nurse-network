import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Lock, Check, RefreshCw, MessageSquare, Search, UserCheck } from 'lucide-react';
import { ChatMessage } from '../types';

export default function SecureMessenger() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState('doc-1');
  const [searchThread, setSearchThread] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const threads = [
    {
      id: 'doc-1',
      name: 'Dr. Siti Aminah Binti Ahmad',
      role: 'Cardiology Specialist',
      avatar: '/assets/malaysian_female_doctor.jpg',
      status: 'Online',
      lastMessage: 'Your ECG Telemetry report has been reviewed.',
      unread: 0
    },
    {
      id: 'doc-2',
      name: 'Dr. Ananya Sen',
      role: 'Internal Medicine (MD)',
      avatar: '/assets/malaysian_male_doctor.jpg',
      status: 'Online',
      lastMessage: 'Appointment confirmed for July 12.',
      unread: 1
    },
    {
      id: 'nurse-1',
      name: 'Nurse Faridah Binti Yusof',
      role: 'Senior ICU Nurse',
      avatar: '/assets/malaysian_female_nurse.jpg',
      status: 'Offline',
      lastMessage: 'Medication dose dispatch updated.',
      unread: 0
    }
  ];

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/chats');
      const data = await response.json();
      if (data.status === 'success') {
        setMessages(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const outgoingText = text;
    setText('');
    setLoading(true);

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: 'patient-1',
          senderName: 'Ahmad Fauzi Bin Ramli',
          receiverId: activeThreadId,
          receiverName: threads.find(t => t.id === activeThreadId)?.name || 'Clinical Specialist',
          text: outgoingText
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMessages(prev => [...prev, data.data]);
        
        setTimeout(async () => {
          await fetchMessages();
          setLoading(false);
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const currentThread = threads.find(t => t.id === activeThreadId) || threads[0];

  const filteredThreads = threads.filter(
    t => t.name.toLowerCase().includes(searchThread.toLowerCase()) || t.role.toLowerCase().includes(searchThread.toLowerCase())
  );

  return (
    <div className="w-full space-y-5" id="secure-messenger-panel">
      {/* Page header */}
      <header className="bg-gradient-to-r from-[#FFF0F2] via-[#FFF5F6] to-[#FFE9EB] border border-[#FECDD3] shadow-xs px-5 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-11 w-11 bg-[#DC2626] text-white flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#047857]">Secure mailbox</div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] leading-tight">Clinical Consultation Mailbox</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 bg-[#DC2626] text-white text-xs font-bold tracking-wide">
            <Shield className="h-3.5 w-3.5" /> HIPAA safe
          </span>
          <span className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-semibold">
            <Lock className="h-3.5 w-3.5 text-[#059669]" /> 256-bit encrypted
          </span>
          <span className="inline-flex items-center min-h-[36px] px-3.5 bg-white border border-[#FECDD3] text-[#334155] text-xs font-semibold">
            MMC reg validated
          </span>
        </div>
      </header>

      <div className="bg-white border border-[#FECDD3] shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_300px] lg:h-[calc(100vh-290px)] lg:min-h-[560px]">
        {/* Conversation list */}
        <aside aria-label="Conversations" className="border-b lg:border-b-0 lg:border-r border-[#FECDD3] bg-white flex flex-col min-h-0 max-h-[360px] lg:max-h-none">
          <div className="p-4 border-b border-[#FECDD3]">
            <label htmlFor="mailbox-search" className="sr-only">Search clinical conversations</label>
            <div className="flex items-center gap-2.5 border border-[#FECDD3] bg-[#FFF8F9] px-3.5 min-h-[44px] focus-within:border-[#DC2626]">
              <Search className="h-4 w-4 text-slate-500 shrink-0" />
              <input
                id="mailbox-search"
                type="text"
                placeholder="Search clinical conversations"
                value={searchThread}
                onChange={(e) => setSearchThread(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#1E293B] outline-none placeholder-slate-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#334155]">Conversations</span>
            <span className="text-xs font-semibold text-slate-500">{filteredThreads.length}</span>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-[#FFE4E6]">
            {filteredThreads.map(thread => {
              const isActive = thread.id === activeThreadId;
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => setActiveThreadId(thread.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`w-full text-left px-5 py-4 flex gap-3.5 items-center transition-colors cursor-pointer ${
                      isActive ? 'bg-[#FFF0F2] shadow-[inset_4px_0_0_#DC2626]' : 'hover:bg-[#FFF0F2]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img src={thread.avatar} alt="" className="h-12 w-12 rounded-full object-cover border border-[#FECDD3]" />
                      {thread.status === 'Online' && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-[15px] font-bold truncate ${isActive ? 'text-[#B91C1C]' : 'text-[#1E293B]'}`}>{thread.name}</span>
                        {thread.unread > 0 && (
                          <span className="bg-[#DC2626] text-white text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">
                            {thread.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#334155] font-semibold truncate mt-0.5">{thread.role}</p>
                      <p className="text-[13px] text-slate-500 truncate mt-0.5">{thread.lastMessage}</p>
                    </div>
                  </button>
                </li>
              );
            })}
            {filteredThreads.length === 0 && (
              <li className="px-5 py-8 text-sm text-slate-600 text-center">No conversations match your search.</li>
            )}
          </ul>
        </aside>

        {/* Active conversation */}
        <section aria-label="Conversation" className="flex flex-col min-h-[480px] lg:min-h-0 min-w-0 bg-[#FFF8F9]">
          <div className="px-6 py-4 bg-white border-b border-[#FECDD3] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <img src={currentThread.avatar} alt="" className="h-12 w-12 rounded-full object-cover border border-[#FECDD3]" />
                {currentThread.status === 'Online' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[17px] font-bold text-[#1E293B]">{currentThread.name}</h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5">
                    <UserCheck className="h-3 w-3 text-[#059669]" /> Verified
                  </span>
                </div>
                <p className="text-[13px] text-[#334155] mt-0.5">{currentThread.role} &bull; Active council session</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 min-h-[36px] px-3.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[11px] font-bold uppercase tracking-wider">
              <Lock className="h-3.5 w-3.5 text-[#059669]" /> End-to-end encrypted
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#FECDD3] text-[#B91C1C] text-[11px] font-bold uppercase tracking-wider">
                <Shield className="h-3.5 w-3.5 text-[#DC2626]" />
                Medical council identity validated &bull; encrypted session
              </span>
            </div>

            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center text-center gap-2 py-12">
                <div className="h-14 w-14 rounded-full bg-[#FFE4E6] flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-[#DC2626]" />
                </div>
                <p className="text-[15px] font-semibold text-[#1E293B]">No messages in this conversation yet</p>
                <p className="text-[13px] text-[#334155] max-w-sm">Send a secure message or diagnostic question to {currentThread.name}.</p>
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderId === 'patient-1';
              return (
                <div key={msg.id} className={`flex flex-col max-w-[78%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <span className="text-xs text-[#334155] font-semibold mb-1 px-1">{msg.senderName}</span>
                  <div className={`px-4 py-3 text-sm leading-relaxed shadow-3xs ${
                    isMe ? 'bg-[#DC2626] text-white border border-[#B91C1C]' : 'bg-white border border-[#FECDD3] text-[#1E293B]'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="tabular-nums text-[11px] text-slate-500 mt-1 flex items-center gap-1 px-1">
                    {msg.timestamp}
                    {isMe && <Check className="h-3 w-3 text-[#DC2626]" />}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#B91C1C] font-semibold bg-[#FFF0F2] px-3 py-2 border border-[#FECDD3] max-w-xs">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Specialist is processing diagnostic guidance...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-[#FECDD3] px-6 py-4 bg-white flex flex-wrap gap-3 shrink-0">
            <label htmlFor="mailbox-message" className="sr-only">Secure consultation message</label>
            <input
              id="mailbox-message"
              type="text"
              placeholder="Type a secure consultation message or diagnostic question"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-[1_1_280px] min-w-0 min-h-[48px] text-sm border border-[#FECDD3] px-4 outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] bg-[#FFF8F9] text-[#1E293B] placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!text.trim() || loading}
              className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-slate-300 disabled:cursor-not-allowed text-white min-h-[48px] px-7 text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Send</span>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>

        {/* Practitioner details */}
        <aside aria-label="Practitioner details" className="hidden xl:flex flex-col gap-5 border-l border-[#FECDD3] bg-white p-6">
          <div className="flex flex-col items-center text-center gap-2.5">
            <img src={currentThread.avatar} alt="" className="h-[72px] w-[72px] rounded-full object-cover border border-[#FECDD3]" />
            <div>
              <p className="text-base font-bold text-[#1E293B]">{currentThread.name}</p>
              <p className="text-[13px] text-[#334155] mt-0.5">{currentThread.role}</p>
            </div>
          </div>
          <dl className="flex flex-col gap-3 border-t border-[#FECDD3] pt-4">
            <div className="flex justify-between gap-3">
              <dt className="text-xs text-slate-600">Availability</dt>
              <dd className={`text-[13px] font-semibold ${currentThread.status === 'Online' ? 'text-[#047857]' : 'text-slate-600'}`}>{currentThread.status}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-xs text-slate-600">Credentials</dt>
              <dd className="text-[13px] font-semibold text-[#047857]">Council verified</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-xs text-slate-600">Session</dt>
              <dd className="text-[13px] font-semibold text-[#1E293B]">Encrypted</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
