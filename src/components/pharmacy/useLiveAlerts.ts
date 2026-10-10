import { useCallback, useEffect, useRef, useState } from 'react';

const SOUND_KEY = 'pharmacy_alert_sound';
const DESKTOP_KEY = 'pharmacy_alert_desktop';

const readFlag = (key: string) => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
const writeFlag = (key: string, on: boolean) => { try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* storage unavailable */ } };

/** A short two-tone chime made with the Web Audio API (no audio file needed). */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + i * 0.18); osc.stop(now + i * 0.18 + 0.32);
    });
    setTimeout(() => ctx.close(), 900);
  } catch { /* audio blocked or unsupported */ }
}

/**
 * Keeps the workspace live: refreshes on a timer and when the tab becomes visible again, puts the number of new
 * prescriptions in the browser tab title, and (if the person turned them on) plays a chime and shows a desktop
 * notification when new work arrives.
 */
export function useLiveAlerts({ newCount, refresh, pollMs = 20_000 }: { newCount: number | undefined; refresh: () => Promise<void> | void; pollMs?: number }) {
  const supported = typeof Notification !== 'undefined';
  const [sound, setSound] = useState(() => readFlag(SOUND_KEY));
  const [desktop, setDesktop] = useState(() => supported && readFlag(DESKTOP_KEY) && Notification.permission === 'granted');
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const previous = useRef<number | undefined>(undefined);

  useEffect(() => {
    const run = async () => { await refresh(); setUpdatedAt(Date.now()); setTick(t => t + 1); };
    const id = setInterval(run, pollMs);
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh, pollMs]);

  // new work arrived since the last check
  useEffect(() => {
    if (newCount === undefined) return;
    if (previous.current !== undefined && newCount > previous.current) {
      if (sound) chime();
      if (desktop && supported && Notification.permission === 'granted') {
        try { new Notification('New prescription received', { body: `${newCount} waiting in your MedCred inbox.` }); } catch { /* not allowed here */ }
      }
    }
    previous.current = newCount;
  }, [newCount, sound, desktop, supported]);

  // "(2) MedCred ..." in the browser tab so the count is visible from other tabs
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = newCount ? `(${newCount}) ${base}` : base;
    return () => { document.title = base; };
  }, [newCount]);

  const toggleSound = useCallback(() => {
    setSound(prev => { const next = !prev; writeFlag(SOUND_KEY, next); if (next) chime(); return next; });
  }, []);

  const toggleDesktop = useCallback(async () => {
    if (!supported) return;
    if (desktop) { setDesktop(false); writeFlag(DESKTOP_KEY, false); return; }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    const on = permission === 'granted';
    setDesktop(on); writeFlag(DESKTOP_KEY, on);
  }, [desktop, supported]);

  return { sound, toggleSound, desktop, toggleDesktop, desktopSupported: supported, updatedAt, tick };
}
