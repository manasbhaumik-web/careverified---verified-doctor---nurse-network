import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PhoneOff, Send, Video, VideoOff, Mic, MicOff, Stethoscope } from 'lucide-react';
import ClinicalWorkspace from './ClinicalWorkspace';

interface Props {
  consultId: string;
  myUserId: string;
  isDoctor: boolean;
  onEnded: () => void;
}

const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

/** Live consultation: text chat for everyone, plus peer-to-peer video when the consult is a video one. */
export default function ConsultRoom({ consultId, myUserId, isDoctor, onEnded }: Props) {
  const [consult, setConsult] = useState<any>(null);
  const [messages, setMessages] = useState<{ id: number; senderUserId: string; text: string; ts: string }[]>([]);
  const [text, setText] = useState('');
  const [videoState, setVideoState] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState('');
  const [showClinical, setShowClinical] = useState(true);
  const lastMsg = useRef(0);
  const lastSignal = useRef(0);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const isVideo = consult?.mode === 'video';

  // ---- chat + status polling ----
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const c = await fetch(`/api/consults/${consultId}`).then(r => r.json());
        if (!stop && c.status === 'success') {
          setConsult(c.data);
          if (c.data.status !== 'active') { teardown(); onEnded(); return; }
        }
        const m = await fetch(`/api/consults/${consultId}/messages?after=${lastMsg.current}`).then(r => r.json());
        if (!stop && m.status === 'success' && m.data.length) {
          lastMsg.current = m.data[m.data.length - 1].id;
          setMessages(prev => [...prev, ...m.data]);
        }
      } catch { /* transient network error; try again next tick */ }
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => { stop = true; clearInterval(t); };
  }, [consultId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    const d = await jpost(`/api/consults/${consultId}/messages`, { text: t });
    if (d.status !== 'success') setError(d.message || 'Message not sent.');
  };

  // ---- WebRTC ----
  const teardown = useCallback(() => {
    pc.current?.close(); pc.current = null;
    localStream.current?.getTracks().forEach(t => t.stop()); localStream.current = null;
  }, []);
  useEffect(() => teardown, [teardown]);

  const sendSignal = (kind: string, payload: unknown) => jpost(`/api/consults/${consultId}/signal`, { kind, payload });

  const ensurePeer = async () => {
    if (pc.current) return pc.current;
    const ice = await fetch('/api/ice-servers').then(r => r.json()).then(d => d.data).catch(() => []);
    const peer = new RTCPeerConnection({ iceServers: ice });
    pc.current = peer;
    peer.onicecandidate = ev => { if (ev.candidate) sendSignal('ice', ev.candidate.toJSON()); };
    peer.ontrack = ev => { if (remoteVideo.current) remoteVideo.current.srcObject = ev.streams[0]; };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setVideoState('connected');
      if (peer.connectionState === 'failed') setVideoState('failed');
    };
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    stream.getTracks().forEach(tr => peer.addTrack(tr, stream));
    return peer;
  };

  const handleSignal = async (s: { kind: string; payload: any }) => {
    if (s.kind === 'hangup') { teardown(); setVideoState('idle'); return; }
    const peer = await ensurePeer();
    if (s.kind === 'offer') {
      await peer.setRemoteDescription(s.payload);
      for (const c of pendingIce.current.splice(0)) await peer.addIceCandidate(c);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal('answer', peer.localDescription);
    } else if (s.kind === 'answer') {
      await peer.setRemoteDescription(s.payload);
      for (const c of pendingIce.current.splice(0)) await peer.addIceCandidate(c);
    } else if (s.kind === 'ice') {
      if (peer.remoteDescription) await peer.addIceCandidate(s.payload);
      else pendingIce.current.push(s.payload);
    }
  };

  // The doctor starts the call (creates the offer); the patient answers.
  const startVideo = async () => {
    setError(''); setVideoState('connecting');
    try {
      const peer = await ensurePeer();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal('offer', peer.localDescription);
    } catch (e: any) {
      setVideoState('failed');
      setError(e?.name === 'NotAllowedError' ? 'Camera or microphone permission was denied.' : 'Could not start video.');
    }
  };

  useEffect(() => {
    if (!isVideo || started.current) return;
    started.current = true;
    let stop = false;
    const poll = async () => {
      try {
        const d = await fetch(`/api/consults/${consultId}/signals?after=${lastSignal.current}`).then(r => r.json());
        if (stop || d.status !== 'success') return;
        for (const s of d.data) {
          lastSignal.current = Math.max(lastSignal.current, s.id);
          setVideoState(v => (v === 'idle' ? 'connecting' : v));
          try { await handleSignal(s); } catch (e: any) {
            setVideoState('failed');
            setError(e?.name === 'NotAllowedError' ? 'Camera or microphone permission was denied.' : 'Video connection error.');
          }
        }
      } catch { /* retry */ }
    };
    const t = setInterval(poll, 1000);
    return () => { stop = true; clearInterval(t); };
  }, [isVideo, consultId]);

  const toggle = (kind: 'audio' | 'video') => {
    const tracks = kind === 'audio' ? localStream.current?.getAudioTracks() : localStream.current?.getVideoTracks();
    tracks?.forEach(t => { t.enabled = !t.enabled; });
    if (kind === 'audio') setMicOn(v => !v); else setCamOn(v => !v);
  };

  const end = async () => {
    if (!window.confirm(isDoctor ? 'End this consultation for both of you?' : 'End this consultation?')) return;
    if (isVideo) sendSignal('hangup', null);
    teardown();
    await jpost(`/api/consults/${consultId}/end`);
    onEnded();
  };

  if (!consult) return <p className="text-sm text-slate-600 p-6">Connecting to your consultation…</p>;

  const other = isDoctor ? `${consult.patientName ?? 'Patient'}` : consult.professional?.name ?? 'Doctor';
  return (
    <section className="bg-white border border-[color:var(--t-200)] shadow-xs" aria-label="Consultation room">
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-extrabold text-slate-900">Consultation with {other}</p>
          <p className="text-[11px] text-slate-500">{isVideo ? 'Video' : 'Chat'} · started {consult.acceptedAt ? new Date(consult.acceptedAt).toLocaleTimeString() : ''}</p>
        </div>
        <button onClick={end} className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-4 py-2 cursor-pointer">
          <PhoneOff className="h-4 w-4" /> End
        </button>
      </header>

      <div className={`grid ${isVideo ? 'lg:grid-cols-2' : ''} gap-0`}>
        {isVideo && (
          <div className="bg-slate-900 relative min-h-[260px] flex items-center justify-center">
            <video ref={remoteVideo} autoPlay playsInline className="w-full h-full max-h-[420px] object-cover" />
            <video ref={localVideo} autoPlay playsInline muted className="absolute bottom-3 right-3 w-28 h-20 object-cover border-2 border-white/70 bg-black" />
            {videoState !== 'connected' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white text-xs font-semibold text-center p-4">
                {videoState === 'idle' && (isDoctor
                  ? <button onClick={startVideo} className="bg-[color:var(--t-600)] px-5 py-2.5 font-extrabold cursor-pointer">Start video call</button>
                  : <span>Waiting for the doctor to start the video call. You can chat in the meantime.</span>)}
                {videoState === 'connecting' && <span>Connecting video…</span>}
                {videoState === 'failed' && <span>Video could not connect. Use the chat, or ask the doctor to restart the call.</span>}
              </div>
            )}
            {videoState === 'connected' && (
              <div className="absolute bottom-3 left-3 flex gap-2">
                <button onClick={() => toggle('audio')} aria-label="Toggle microphone" className="h-9 w-9 bg-black/60 text-white flex items-center justify-center cursor-pointer">{micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
                <button onClick={() => toggle('video')} aria-label="Toggle camera" className="h-9 w-9 bg-black/60 text-white flex items-center justify-center cursor-pointer">{camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}</button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col h-[420px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[color:var(--t-bg)]">
            <p className="text-[11px] text-slate-500 bg-white border border-slate-100 p-2">Reason for consultation: {consult.symptoms}</p>
            {messages.map(m => (
              <div key={m.id} className={`max-w-[85%] text-sm px-3 py-2 ${m.senderUserId === myUserId ? 'ml-auto bg-[color:var(--t-600)] text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {error && <p className="text-xs font-bold text-rose-700 px-4 py-2 bg-rose-50">{error}</p>}
          <form onSubmit={send} className="flex gap-2 p-3 border-t border-slate-100">
            <input value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Type a message…"
              className="flex-1 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--t-600)]" aria-label="Message" />
            <button className="bg-[color:var(--t-600)] text-white px-4 cursor-pointer" aria-label="Send"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      </div>
      {isDoctor && (
        <div className="border-t border-slate-100 p-4">
          <button onClick={() => setShowClinical(v => !v)} aria-expanded={showClinical} className="text-xs font-extrabold flex items-center gap-1.5 mb-3 cursor-pointer">
            <Stethoscope className="h-4 w-4" /> Clinical tools {showClinical ? '(hide)' : '(show)'}
          </button>
          {showClinical && <ClinicalWorkspace kind="consult" refId={consultId} />}
        </div>
      )}
    </section>
  );
}
