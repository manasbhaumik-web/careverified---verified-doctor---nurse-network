import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Lock, User, Check, RefreshCw, Smartphone } from 'lucide-react';
import { ChatMessage } from '../types';

export default function SecureMessenger() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          receiverId: 'doc-1',
          receiverName: 'Dr. Siti Aminah Binti Ahmad',
          text: outgoingText
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        // Append outgoing message
        setMessages(prev => [...prev, data.data]);
        
        // After 1.5 seconds, reload to get doctor's smart simulated reply from the server!
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

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[520px]" id="secure-messenger-panel">
      {/* Header Panel */}
      <div className="bg-blue-900 p-4 text-white flex items-center justify-between border-b border-blue-800">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              Secure Practitioner Consultation Channel
            </h3>
            <span className="text-[10px] text-blue-200 block font-medium">HIPAA Compliant End-to-End Encryption</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-blue-950/40 border border-blue-400/20 rounded-lg px-2.5 py-1">
          <Lock className="h-3 w-3 text-blue-300" />
          <span className="text-[9px] font-bold text-blue-200">SECURE DISPATCH</span>
        </div>
      </div>

      {/* Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
        <div className="text-center py-2">
          <span className="text-[9px] font-bold bg-slate-200/60 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto max-w-fit">
            <Shield className="h-3 w-3 text-blue-600" />
            Medical council identity confirmed
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === 'patient-1';
          return (
            <div 
              key={msg.id}
              className={`flex flex-col max-w-[75%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <span className="text-[9px] text-slate-400 font-bold mb-0.5 px-1">{msg.senderName}</span>
              <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                isMe 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
              }`}>
                {msg.text}
              </div>
              <span className="text-[8px] text-slate-400 font-semibold mt-1 flex items-center gap-1 px-1">
                {msg.timestamp}
                {isMe && <Check className="h-3 w-3 text-blue-600" />}
              </span>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold italic pl-1">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Specialist is typing clinical guidance...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSendMessage} className="border-t border-slate-100 p-3 bg-white flex gap-2">
        <input
          type="text"
          placeholder="Type secure diagnostic or care consultation message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 text-xs border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-slate-50"
        />
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl p-2.5 shadow-md transition-all shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
