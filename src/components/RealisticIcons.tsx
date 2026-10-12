import React from 'react';

interface RealisticIconProps {
  size?: number;
  className?: string;
  badge?: string;
}

/**
 * 1. Realistic 3D Clinical Cross Badge
 * Chrome beveled bezel, dual enamel glass depth, soft inner highlight
 */
export function RealisticCrossIcon({ size = 32, className = '' }: RealisticIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id="cross-glow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="50%" stopColor="var(--t-600, #0284c7)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </radialGradient>
        <linearGradient id="chrome-bezel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="25%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="75%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="cross-enamel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--t-500, #0ea5e9)" />
          <stop offset="60%" stopColor="var(--t-600, #0284c7)" />
          <stop offset="100%" stopColor="var(--t-800, #075985)" />
        </linearGradient>
        <filter id="cross-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Chrome Bevel Base */}
      <path
        d="M18 4h12v12h12v12H30v12H18V28H6V16h12V4z"
        fill="url(#chrome-bezel)"
        filter="url(#cross-shadow)"
      />
      {/* Inner Enamel Infill */}
      <path
        d="M19.5 5.5h9v12h12v9h-12v12h-9v-12h-12v-9h12v-12z"
        fill="url(#cross-enamel)"
      />
      {/* 3D Glass Specular Reflection */}
      <path
        d="M19.5 5.5h9v12h12v4h-12v-4h-9v-12z"
        fill="url(#cross-glow)"
      />
      {/* Corner Highlight */}
      <circle cx="21" cy="7.5" r="1.5" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

/**
 * 2. Realistic Stethoscope Icon
 * Polished surgical stainless steel bell, flexible tubing, chrome binaural arc
 */
export function RealisticStethoscopeIcon({ size = 32, className = '' }: RealisticIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="metal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="tube-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--t-700, #0369a1)" />
          <stop offset="50%" stopColor="var(--t-900, #0c4a6e)" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <filter id="steth-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Binaurals */}
      <path d="M14 6v8c0 6.5 4.5 12 10 12s10-5.5 10-12V6" stroke="url(#metal-gradient)" strokeWidth="3.2" strokeLinecap="round" filter="url(#steth-shadow)" />
      {/* Ear tips */}
      <circle cx="14" cy="6" r="2.2" fill="#334155" />
      <circle cx="34" cy="6" r="2.2" fill="#334155" />

      {/* Tube Stem & Loop */}
      <path
        d="M24 26v4c0 6-5 9-9 9s-7-3-7-7 3-7 7-7h15"
        stroke="url(#tube-gradient)"
        strokeWidth="3.8"
        strokeLinecap="round"
        fill="none"
        filter="url(#steth-shadow)"
      />

      {/* Chest Piece / Stethoscope Head */}
      <g transform="translate(30, 25)">
        <circle cx="6" cy="6" r="7.5" fill="url(#metal-gradient)" stroke="#64748b" strokeWidth="0.8" />
        <circle cx="6" cy="6" r="5" fill="var(--t-600, #0284c7)" opacity="0.3" />
        <circle cx="6" cy="6" r="2.5" fill="#f8fafc" />
        <circle cx="4.5" cy="4.5" r="1" fill="#ffffff" />
      </g>
    </svg>
  );
}

/**
 * 3. Realistic Translucent RX Gel Capsule Pill
 * Two-tone capsule, micro-granules, glossy curved highlight
 */
export function RealisticPillIcon({ size = 32, className = '' }: RealisticIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="pill-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="var(--t-600, #0284c7)" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="pill-bottom" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <filter id="pill-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.25" />
        </filter>
      </defs>

      <g transform="rotate(45 24 24)" filter="url(#pill-shadow)">
        {/* Top Half (Color) */}
        <path d="M17 12a7 7 0 0 1 14 0v12h-14V12z" fill="url(#pill-top)" />
        {/* Bottom Half (Translucent White) */}
        <path d="M17 24h14v12a7 7 0 0 1-14 0V24z" fill="url(#pill-bottom)" />
        {/* Pill Joint Ring */}
        <line x1="17" y1="24" x2="31" y2="24" stroke="#94a3b8" strokeWidth="0.8" opacity="0.6" />
        {/* Micro Granules inside */}
        <circle cx="21" cy="29" r="1" fill="#94a3b8" opacity="0.7" />
        <circle cx="26" cy="31" r="1.1" fill="var(--t-600, #0284c7)" opacity="0.5" />
        <circle cx="23" cy="33" r="0.9" fill="#94a3b8" opacity="0.7" />
        {/* Long Glossy Glass Reflection */}
        <path d="M19 14a2 2 0 0 1 2-2h1v20h-3V14z" fill="#ffffff" opacity="0.45" />
      </g>
    </svg>
  );
}

/**
 * 4. Realistic Embossed Accreditation Seal Badge
 * Metallic gold/bronze serrated medal with embossed medical emblem
 */
export function RealisticSealIcon({ size = 32, className = '' }: RealisticIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id="gold-radial" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="85%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </radialGradient>
        <linearGradient id="gold-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="50%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#713f12" />
        </linearGradient>
        <filter id="seal-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Outer Scalloped Cog */}
      <circle cx="24" cy="24" r="20" fill="url(#gold-radial)" filter="url(#seal-shadow)" />
      {/* Outer Rim */}
      <circle cx="24" cy="24" r="17.5" stroke="url(#gold-rim)" strokeWidth="1.5" fill="none" />
      <circle cx="24" cy="24" r="15" stroke="#fef08a" strokeWidth="0.8" strokeDasharray="1.5 1.5" fill="none" opacity="0.75" />
      {/* Embossed Medical Shield & Ribbon */}
      <path d="M24 14l6 2.5v5.5c0 4.5-3 8-6 9.5-3-1.5-6-5-6-9.5v-5.5l6-2.5z" fill="#713f12" opacity="0.3" transform="translate(0, 0.8)" />
      <path d="M24 14l6 2.5v5.5c0 4.5-3 8-6 9.5-3-1.5-6-5-6-9.5v-5.5l6-2.5z" fill="url(#gold-radial)" stroke="#fef9c3" strokeWidth="1" />
      {/* Inner Checkmark */}
      <path d="M21 21.5l2 2 4-4" stroke="#713f12" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21.5l2 2 4-4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 5. Realistic ECG Vital Monitor Screen
 * Beveled aluminum monitor bezel, CRT dark glass, glowing green ECG trace
 */
export function RealisticECGIcon({ size = 32, className = '' }: RealisticIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="bezel-metal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <radialGradient id="screen-glare" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <filter id="ecg-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#22c55e" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Monitor Outer Chassis */}
      <rect x="5" y="6" width="38" height="36" rx="6" fill="url(#bezel-metal)" stroke="#64748b" strokeWidth="1" />
      {/* Inner Screen Display */}
      <rect x="8" y="9" width="32" height="30" rx="3.5" fill="url(#screen-glare)" />
      {/* Grid Lines */}
      <line x1="8" y1="24" x2="40" y2="24" stroke="#14532d" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
      <line x1="24" y1="9" x2="24" y2="39" stroke="#14532d" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
      {/* Neon ECG Heartbeat Waveform */}
      <path
        d="M9 24h6l2.5-3 2 6 3-12 3.5 15 2-6 2 2h7"
        stroke="#22c55e"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ecg-glow)"
      />
      {/* Top Status LED */}
      <circle cx="12" cy="12" r="1.2" fill="#ef4444" />
    </svg>
  );
}

/**
 * 6. Realistic Telehealth Camera Studio Lens
 * Anodized aluminum housing, glass lens reflection aperture, red recording tally
 */
export function RealisticCameraIcon({ size = 32, className = '' }: RealisticIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="body-chassis" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <radialGradient id="lens-iris" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
          <stop offset="35%" stopColor="#1e1b4b" />
          <stop offset="70%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
      </defs>

      {/* Camera Body */}
      <rect x="6" y="6" width="36" height="36" rx="8" fill="url(#body-chassis)" stroke="#94a3b8" strokeWidth="1" />
      {/* Outer Lens Bezel */}
      <circle cx="24" cy="24" r="14" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="11.5" fill="url(#lens-iris)" />
      {/* Optical Glass Flare */}
      <ellipse cx="21" cy="20" rx="4" ry="2.5" fill="#ffffff" opacity="0.5" transform="rotate(-30 21 20)" />
      {/* Active Tally Recording Dot */}
      <circle cx="12" cy="12" r="1.8" fill="#ef4444" />
      <circle cx="12" cy="12" r="1" fill="#fca5a5" />
    </svg>
  );
}
