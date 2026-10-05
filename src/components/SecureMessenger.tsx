import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Lock, Check, RefreshCw, MessageSquare, Search, PhoneCall, Video, UserCheck } from 'lucide-react';
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

  return (
    <div className="bg-white border border-[#FECDD3] rounded-none shadow-3xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[560px]" id="secure-messenger-panel">
      {/* Sidebar Thread Inbox */}
      <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#FECDD3] bg-slate-50 flex flex-col justify-between">
        {/* Inbox Header */}
        <div className="p-3.5 bg-[#0F172A] text-white border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#DC2626]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Clinical Consult Mailbox</h3>
          </div>
          <span className="bg-[#DC2626] text-white text-[9px] font-black px-2 py-0.5 rounded-none">
            HIPAA Safe
          </span>
        </div>

        {/* Search Thread Filter */}
        <div className="p-3 border-b border-[#FECDD3] bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search clinical conversations..."
              value={searchThread}
              onChange={(e) => setSearchThread(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-[#FECDD3] rounded-none py-2 pl-9 pr-3 outline-none focus:border-[#DC2626] font-semibold text-slate-700"
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#FECDD3]/50">
          {threads
            .filter(t => t.name.toLowerCase().includes(searchThread.toLowerCase()) || t.role.toLowerCase().includes(searchThread.toLowerCase()))
            .map(thread => {
              const isActive = thread.id === activeThreadId;
              return (
                <div
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`p-3.5 transition-all cursor-pointer flex gap-3 items-center ${
                    isActive
                      ? 'bg-[#FFF0F2] border-l-4 border-l-[#DC2626]'
                      : 'hover:bg-white bg-slate-50/50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={thread.avatar}
                      alt={thread.name}
                      className="h-10 w-10 rounded-full object-cover border border-[#FECDD3]"
                    />
                    {thread.status === 'Online' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className={`text-xs font-black truncate ${isActive ? 'text-[#DC2626]' : 'text-slate-800'}`}>
                        {thread.name}
                      </h4>
                      {thread.unread > 0 && (
                        <span className="bg-[#DC2626] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                          {thread.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{thread.role}</p>
                    <p className="text-[10px] text-slate-400 italic truncate mt-0.5">{thread.lastMessage}</p>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Security Compliance Footer */}
        <div className="p-3 bg-white border-t border-[#FECDD3] text-[9px] text-slate-500 font-bold flex items-center justify-between">
          <span className="flex items-center gap-1 text-[#DC2626]">
            <Lock className="h-3 w-3" /> 256-Bit Encrypted
          </span>
          <span>MMC Reg Validated</span>
        </div>
      </div>

      {/* Main Consultation Conversation View */}
      <div className="lg:col-span-8 flex flex-col justify-between h-[560px] bg-white">
        {/* Active Conversation Header */}
        <div className="p-3.5 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={currentThread.avatar}
                alt={currentThread.name}
                className="h-9 w-9 rounded-full object-cover border border-slate-600"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white animate-pulse"></span>
            </div>
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                {currentThread.name}
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              </h3>
              <p className="text-[10px] text-rose-200 font-semibold">{currentThread.role} &bull; Active Council Session</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-white/10 border border-white/20 px-2.5 py-1 text-[9px] font-bold text-slate-300">
              <Lock className="h-3 w-3 text-rose-300" />
              <span>END-TO-END ENCRYPTED</span>
            </div>
          </div>
        </div>

        {/* Messages Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FFF0F2]/20">
          <div className="text-center py-1">
            <span className="text-[9px] font-bold bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3] px-3 py-1 rounded-none uppercase tracking-wider inline-flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-[#DC2626]" />
              Medical Council Identity Validated &bull; Encrypted Session
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.senderId === 'patient-1';
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[78%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <span className="text-[10px] text-slate-500 font-bold mb-0.5 px-1">{msg.senderName}</span>
                <div className={`p-3 rounded-none text-xs font-semibold leading-relaxed shadow-3xs ${
                  isMe
                    ? "bg-[#DC2626] text-white border border-[#B91C1C]"
                    : "bg-white border border-[#FECDD3] text-slate-800"
                }`}>
                  {msg.text}
                </div>
                <span className="font-mono tabular-nums text-[8px] text-slate-400 font-semibold mt-1 flex items-center gap-1 px-1">
                  {msg.timestamp}
                  {isMe && <Check className="h-3 w-3 text-[#DC2626]" />}
                </span>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-[#DC2626] font-bold italic pl-1 bg-[#FFF0F2] p-2 border border-[#FECDD3] max-w-xs">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Specialist is processing diagnostic guidance...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <form onSubmit={handleSendMessage} className="border-t border-[#FECDD3] p-3 bg-white flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Type secure consultation message or diagnostic query..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 text-xs border border-[#FECDD3] rounded-none px-4 py-2.5 outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] font-semibold bg-slate-50 text-slate-800 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-slate-300 text-white rounded-none px-5 py-2.5 text-xs font-black shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
