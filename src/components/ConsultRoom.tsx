import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PhoneOff, Send, Video, VideoOff, Mic, MicOff, Stethoscope, ShieldCheck,
  Columns, Maximize2, MessageSquare, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Radio
} from 'lucide-react';
import ClinicalWorkspace from './ClinicalWorkspace';
import DischargeSummaryDialog, { DischargeSummaryData } from './DischargeSummaryDialog';

interface Props {
  consultId: string;
  myUserId: string;
  isDoctor: boolean;
  onEnded: () => void;
  onNavigateToPrescriptions?: () => void;
}

const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

/** Live consultation: text chat for everyone, plus peer-to-peer video when the consult is a video one. */
export default function ConsultRoom({ consultId, myUserId, isDoctor, onEnded, onNavigateToPrescriptions }: Props) {
  const [consult, setConsult] = useState<any>(null);
  const [messages, setMessages] = useState<{ id: number; senderUserId: string; text: string; ts: string }[]>([]);
  const [text, setText] = useState('');
  const [videoState, setVideoState] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState('');
  const [showClinical, setShowClinical] = useState(true);
  const [dischargeData, setDischargeData] = useState<DischargeSummaryData | null>(null);
  const [hudMode, setHudMode] = useState<'split' | 'video-focus'>('split');
  const [chatOpen, setChatOpen] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
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
          if (c.data.status !== 'active') { 
            teardown(); 
            if (!isDoctor && c.data.dischargeSummary) {
              setDischargeData({
                ...c.data.dischargeSummary,
                doctorName: c.data.professional?.name,
                doctorSpecialization: c.data.professional?.specialization,
                doctorCouncilNumber: c.data.professional?.councilRegistrationNumber
              });
            } else {
              onEnded(); 
            }
            return; 
          }
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

  useEffect(() => {
    if (!consult?.acceptedAt) return;
    const start = new Date(consult.acceptedAt).getTime();
    const updateTimer = () => {
      setSessionSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [consult?.acceptedAt]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
    
    // If patient ended the call, load the discharge summary before exiting
    if (!isDoctor) {
      try {
        const c = await fetch(`/api/consults/${consultId}`).then(r => r.json());
        if (c.status === 'success' && c.data.dischargeSummary) {
          setDischargeData({
            ...c.data.dischargeSummary,
            doctorName: c.data.professional?.name,
            doctorSpecialization: c.data.professional?.specialization,
            doctorCouncilNumber: c.data.professional?.councilRegistrationNumber
          });
          return;
        }
      } catch { /* proceed to onEnded */ }
    }
    onEnded();
  };

  if (dischargeData) {
    return (
      <DischargeSummaryDialog 
        data={dischargeData}
        onClose={() => {
          setDischargeData(null);
          onEnded();
        }}
        onNavigateToPrescriptions={onNavigateToPrescriptions}
      />
    );
  }

  if (!consult) return <p className="text-sm text-slate-600 p-6">Connecting to your consultation…</p>;

  const other = isDoctor ? `${consult.patientName ?? 'Patient'}` : consult.professional?.name ?? 'Doctor';

  // =========================================================================
  // Clinician Heads-Up Display (HUD): Side-by-side video & charting cockpit
  // =========================================================================
  if (isDoctor) {
    return (
      <section className="bg-slate-50 border border-[color:var(--t-200)] shadow-xs rounded-none" aria-label="Clinician Consultation HUD">
        {/* Clinician HUD Master Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="p-1.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
              <Stethoscope className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                  Consultation HUD · {other}
                </h2>
                {isVideo && (
                  <span
                    role="status"
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-none inline-flex items-center gap-1 ${
                      videoState === 'connected'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : videoState === 'connecting'
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : videoState === 'failed'
                        ? 'bg-rose-50 text-rose-800 border border-rose-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {videoState === 'connected' ? 'P2P Encrypted · Live' : videoState === 'connecting' ? 'Connecting Video…' : videoState === 'failed' ? 'Connection Error' : 'Standby'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                MMC Telehealth Consultation · Started {consult.acceptedAt ? new Date(consult.acceptedAt).toLocaleTimeString() : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Session Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-bold">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{formatDuration(sessionSeconds)}</span>
            </div>

            {/* Layout Mode Toggles */}
            <div className="hidden sm:inline-flex border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setHudMode('split')}
                className={`px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  hudMode === 'split' ? 'bg-white text-[color:var(--t-700)] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Split HUD (Video & Charting side-by-side)"
              >
                <Columns className="h-3.5 w-3.5" />
                <span>Split HUD</span>
              </button>
              <button
                type="button"
                onClick={() => setHudMode('video-focus')}
                className={`px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  hudMode === 'video-focus' ? 'bg-white text-[color:var(--t-700)] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Video Focus (Expanded video)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Video Focus</span>
              </button>
            </div>

            {/* End Visit Button */}
            <button
              onClick={end}
              className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-3.5 py-2 cursor-pointer transition-colors shadow-xs rounded-none"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              <span>End & Finalize</span>
            </button>
          </div>
        </header>

        {/* HUD Content Area */}
        {hudMode === 'split' ? (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Pinned Video, Triage Summary & Quick Chat Drawer */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 lg:sticky lg:top-4">
              {isVideo && (
                <div className="bg-slate-950 relative aspect-video flex items-center justify-center border border-slate-800 shadow-sm overflow-hidden">
                  <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
                  <video ref={localVideo} autoPlay playsInline muted className="absolute bottom-2.5 right-2.5 w-24 h-18 sm:w-28 sm:h-20 object-cover border border-white/80 bg-black shadow-md" />

                  {videoState !== 'connected' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-white text-xs font-semibold text-center p-4 bg-slate-950/90">
                      {videoState === 'idle' && (
                        <button onClick={startVideo} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white px-4 py-2 font-extrabold cursor-pointer rounded-none">
                          Start Video Call
                        </button>
                      )}
                      {videoState === 'connecting' && <span className="bg-amber-900/80 border border-amber-500/50 px-3 py-1.5 text-amber-200">Connecting encrypted video…</span>}
                      {videoState === 'failed' && (
                        <div className="bg-rose-950/90 border border-rose-500 p-3 space-y-2 max-w-xs">
                          <p className="text-rose-200 font-bold">Video connection interrupted.</p>
                          <button onClick={startVideo} className="bg-rose-700 hover:bg-rose-600 text-white px-3 py-1 font-bold text-xs cursor-pointer rounded-none">
                            Retry Call Setup
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {videoState === 'connected' && (
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-slate-900/85 p-1 border border-white/20 backdrop-blur-xs">
                      <button
                        type="button"
                        onClick={() => toggle('audio')}
                        aria-pressed={micOn}
                        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                        className={`h-8 px-2.5 flex items-center gap-1 text-xs font-bold rounded-none cursor-pointer transition-colors ${
                          micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}
                      >
                        {micOn ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-white" />}
                        <span>{micOn ? 'Mute' : 'Muted'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle('video')}
                        aria-pressed={camOn}
                        aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
                        className={`h-8 px-2.5 flex items-center gap-1 text-xs font-bold rounded-none cursor-pointer transition-colors ${
                          camOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}
                      >
                        {camOn ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-white" />}
                        <span>{camOn ? 'Stop Cam' : 'Cam Off'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Triage Telemetry & Intake Info */}
              <div className="bg-white border border-slate-200 p-3.5 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="font-extrabold uppercase tracking-wider text-xs text-slate-500">Patient Triage Intake</span>
                  {consult.redFlags && consult.redFlags.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5">
                      <AlertTriangle className="h-3 w-3 text-rose-600" /> Red Flags ({consult.redFlags.length})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> No Urgent Red Flags
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Reported Symptoms</p>
                  <p className="text-slate-800 font-medium bg-slate-50 border border-slate-100 p-2 text-xs leading-relaxed max-h-20 overflow-y-auto">
                    {consult.symptoms}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-50 p-2 border border-slate-100">
                    <p className="text-xs uppercase font-bold text-slate-500">Jurisdiction</p>
                    <p className="font-semibold text-slate-800">{consult.patientCountry === 'MY' || !consult.patientCountry ? 'Malaysia (Domestic)' : `${consult.patientCountry} (Cross-Border)`}</p>
                  </div>
                  <div className="bg-slate-50 p-2 border border-slate-100">
                    <p className="text-xs uppercase font-bold text-slate-500">Health Record</p>
                    <p className="font-semibold text-slate-800">{consult.shareRecord ? 'Consent Active (30d)' : 'Not Shared'}</p>
                  </div>
                </div>
              </div>

              {/* In-Call Quick Chat Module */}
              <div className="bg-white border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setChatOpen(v => !v)}
                  className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    <span>In-Call Patient Chat</span>
                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                      {messages.length}
                    </span>
                  </span>
                  {chatOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {chatOpen && (
                  <div className="flex flex-col h-60 border-t border-slate-100">
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[color:var(--t-bg)] text-xs">
                      {messages.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-4">No chat messages yet during this call.</p>
                      )}
                      {messages.map(m => (
                        <div key={m.id} className={`max-w-[85%] text-xs px-2.5 py-1.5 ${m.senderUserId === myUserId ? 'ml-auto bg-[color:var(--t-600)] text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                          {m.text}
                        </div>
                      ))}
                      <div ref={endRef} />
                    </div>
                    {error && <p className="text-xs font-bold text-rose-700 px-3 py-1 bg-rose-50">{error}</p>}
                    <form onSubmit={send} className="flex gap-1.5 p-2 border-t border-slate-100 bg-white">
                      <input value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Type a message…"
                        className="flex-1 border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[color:var(--t-600)]" aria-label="Message" />
                      <button className="bg-[color:var(--t-600)] text-white px-3 cursor-pointer" aria-label="Send"><Send className="h-3.5 w-3.5" /></button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Full-Height Clinical Charting Workspace */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-[color:var(--t-600)]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Clinician Charting & Prescription Cockpit
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  SOAP Notes · e-Prescribe · MCs · Labs
                </span>
              </div>
              <ClinicalWorkspace kind="consult" refId={consultId} />
            </div>
          </div>
        ) : (
          /* Video Focus Mode */
          <div className="p-4 space-y-4">
            <div className="bg-slate-950 relative aspect-video max-h-[560px] w-full mx-auto flex items-center justify-center border border-slate-800 shadow-sm overflow-hidden">
              <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideo} autoPlay playsInline muted className="absolute bottom-3 right-3 w-32 h-24 object-cover border-2 border-white/80 bg-black shadow-lg" />
              
              {videoState === 'connected' && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-900/85 p-1.5 border border-white/20 backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => toggle('audio')}
                    aria-pressed={micOn}
                    aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                    className={`h-9 px-3 flex items-center gap-1.5 text-xs font-bold rounded-none cursor-pointer transition-colors ${
                      micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {micOn ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-white" />}
                    <span>{micOn ? 'Mute' : 'Muted'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle('video')}
                    aria-pressed={camOn}
                    aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
                    className={`h-9 px-3 flex items-center gap-1.5 text-xs font-bold rounded-none cursor-pointer transition-colors ${
                      camOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {camOn ? <Video className="h-4 w-4 text-emerald-400" /> : <VideoOff className="h-4 w-4 text-white" />}
                    <span>{camOn ? 'Stop Cam' : 'Cam Off'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="border border-slate-200 bg-white p-4 shadow-xs">
              <button onClick={() => setShowClinical(v => !v)} aria-expanded={showClinical} className="text-xs font-extrabold flex items-center gap-1.5 mb-3 cursor-pointer">
                <Stethoscope className="h-4 w-4 text-[color:var(--t-600)]" /> Clinical tools {showClinical ? '(hide)' : '(show)'}
              </button>
              {showClinical && <ClinicalWorkspace kind="consult" refId={consultId} />}
            </div>
          </div>
        )}
      </section>
    );
  }

  // =========================================================================
  // Patient View: Focused Video & Chat Interface
  // =========================================================================
  return (
    <section className="bg-white border border-[color:var(--t-200)] shadow-xs rounded-none" aria-label="Consultation room">
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold text-slate-900">Consultation with {other}</p>
            {isVideo && (
              <span
                role="status"
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-none inline-flex items-center gap-1 ${
                  videoState === 'connected'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : videoState === 'connecting'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                    : videoState === 'failed'
                    ? 'bg-rose-50 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                <ShieldCheck className="h-3 w-3" />
                {videoState === 'connected' ? 'P2P Encrypted · Live' : videoState === 'connecting' ? 'Connecting Video…' : videoState === 'failed' ? 'Connection Error' : 'Standby'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{isVideo ? 'Encrypted Video Consult' : 'Encrypted Text Chat'} · started {consult.acceptedAt ? new Date(consult.acceptedAt).toLocaleTimeString() : ''}</p>
        </div>
        <button onClick={end} className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-4 py-2 cursor-pointer rounded-none">
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
                {videoState === 'idle' && <span>Waiting for the doctor to start the video call. You can chat in the meantime.</span>}
                {videoState === 'connecting' && <span className="bg-amber-900/80 border border-amber-500/50 px-3 py-1.5 text-amber-200">Connecting encrypted video…</span>}
                {videoState === 'failed' && (
                  <div className="bg-rose-950/90 border border-rose-500 p-3 space-y-2 max-w-xs">
                    <p className="text-rose-200 font-bold">Video could not connect. Use the chat, or reconnect.</p>
                  </div>
                )}
              </div>
            )}
            {videoState === 'connected' && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-900/80 p-1.5 border border-white/20">
                <button
                  type="button"
                  onClick={() => toggle('audio')}
                  aria-pressed={micOn}
                  aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                  className={`h-9 px-3 flex items-center gap-1.5 text-xs font-bold rounded-none cursor-pointer transition-colors ${
                    micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                >
                  {micOn ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-white" />}
                  <span>{micOn ? 'Mute' : 'Muted'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggle('video')}
                  aria-pressed={camOn}
                  aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
                  className={`h-9 px-3 flex items-center gap-1.5 text-xs font-bold rounded-none cursor-pointer transition-colors ${
                    camOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                >
                  {camOn ? <Video className="h-4 w-4 text-emerald-400" /> : <VideoOff className="h-4 w-4 text-white" />}
                  <span>{camOn ? 'Stop Cam' : 'Cam Off'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col h-[420px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[color:var(--t-bg)]">
            <p className="text-xs text-slate-500 bg-white border border-slate-100 p-2">Reason for consultation: {consult.symptoms}</p>
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
    </section>
  );
}
