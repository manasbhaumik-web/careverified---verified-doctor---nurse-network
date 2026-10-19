import React from 'react';
import { useOnCallStatus, onCallLabel } from '../useOnCallStatus';

/** Navbar chip: how many doctors are online right now. Only mounted inside the signed-in app, so it only polls there. */
export default function OnCallChip() {
  const onCall = useOnCallStatus();
  const online = !!onCall && onCall.onlineDoctors > 0;
  return (
    <div role="status" className="hidden xl:flex items-center gap-2.5 self-center shrink-0 whitespace-nowrap bg-white/15 border-0 px-3.5 py-1.5 rounded-none text-xs font-extrabold text-white my-auto">
      <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-300'}`} aria-hidden="true"></span>
      <span>{onCallLabel(onCall)}</span>
    </div>
  );
}
