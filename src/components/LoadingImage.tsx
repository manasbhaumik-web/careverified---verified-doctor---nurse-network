import React from 'react';

interface LoadingImageProps {
  className?: string;
  size?: number;
}

/**
 * Animated clinical loading graphic dynamically styled with the active application theme.
 * Uses --t-600, --t-700, --t-200, and --e-600 CSS variables.
 */
export default function LoadingImage({ className = '', size = 80 }: LoadingImageProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="Loading MedCred"
      role="img"
    >
      <defs>
        <linearGradient id="medcred-theme-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--t-600, #0284c7)" />
          <stop offset="100%" stopColor="var(--t-700, #0369a1)" />
        </linearGradient>
        <filter id="medcred-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* Steady, calming circular boundary track */}
      <circle
        cx="60"
        cy="60"
        r="54"
        stroke="var(--t-200, #bae6fd)"
        strokeWidth="2.5"
        opacity="0.65"
      />

      {/* Main clinical rounded emblem - stable and locked */}
      <rect
        x="18"
        y="18"
        width="84"
        height="84"
        rx="20"
        fill="url(#medcred-theme-glow)"
        filter="url(#medcred-shadow)"
      />

      {/* Verification inner badge subtle outline */}
      <rect
        x="22"
        y="22"
        width="76"
        height="76"
        rx="16"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />

      {/* Iconic Clinical Cross */}
      <path
        d="M51 36h18v15h15v18H69v15H51V69H36V51h15V36z"
        fill="#ffffff"
      />

      {/* Smooth, steady orbital tracker ring (gentle 2.4s linear rotation, no flicker) */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 60 60"
          to="360 60 60"
          dur="2.4s"
          repeatCount="indefinite"
        />
        <circle
          cx="60"
          cy="60"
          r="46"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="40 250"
          opacity="0.95"
        />
        {/* Luminous beacon tracking smoothly on the ring */}
        <circle
          cx="106"
          cy="60"
          r="4"
          fill="var(--e-600, #10b981)"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
