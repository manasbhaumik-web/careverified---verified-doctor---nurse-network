import React from 'react';

interface LoadingImageProps {
  className?: string;
  size?: number;
}

/**
 * Loading graphic: the MediCred "Verified Pulse" brand mark (shield, heartbeat and verified badge) with a calm pulse.
 * Colours follow the active theme (--t-600). Motion is CSS (see .brand-load-* in index.css), so reduced-motion settings apply.
 */
export default function LoadingImage({ className = '', size = 80 }: LoadingImageProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="Loading MediCred"
      role="img"
    >
      <g className="brand-load-shield">
        <path d="M24 3 40 9v13c0 10-7 18-16 23C15 40 8 32 8 22V9z" fill="var(--t-600, #0A7A63)" />
      </g>
      <path
        className="brand-load-pulse"
        pathLength={1}
        d="M13 26h5.5l3-9.5 5 15.5 3.5-10 1.5 4H35"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="38" r="8" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
      <path d="m32.5 38 2.5 2.5 4.5-5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}