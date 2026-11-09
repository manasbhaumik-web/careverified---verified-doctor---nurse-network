import React from 'react';

/**
 * MediCred marketplace icon set.
 * 24px grid, 1.75 stroke, square caps & miter joins (DESIGN.md zero-radius rule).
 * Colour comes from `currentColor`, so `text-[color:var(--t-600)]` follows the active theme;
 * the tinted fill is the same colour at 14% opacity.
 * Standalone SVG copies live in /public/assets/icons/packages/.
 */
export interface PkgIconProps extends React.SVGProps<SVGSVGElement> { size?: number; title?: string }

function Base({ size = 24, title, children, ...rest }: PkgIconProps & { children: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="square" strokeLinejoin="miter" role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Health Screening */
export const HealthScreeningIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <rect x="5" y="4" width="14" height="17" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <rect x="5" y="4" width="14" height="17"/>
    <rect x="9" y="2.5" width="6" height="3" fill="currentColor" stroke="none"/>
    <path d="M8.5 12.2l2.3 2.3 4.7-4.7"/>
    <path d="M8.5 17.5h7"/>
  </Base>
);

/** Cardiology */
export const CardiologyIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M12 20 4.2 12.3A4.8 4.8 0 0 1 12 6.5a4.8 4.8 0 0 1 7.8 5.8Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M12 20 4.2 12.3A4.8 4.8 0 0 1 12 6.5a4.8 4.8 0 0 1 7.8 5.8Z"/>
    <path d="M2.5 12.5h5l1.6-2.8 2.4 5.3 1.8-3.5 1 1h7.2"/>
  </Base>
);

/** Orthopaedics */
export const OrthopaedicsIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <g transform="rotate(-45 12 12)">
    <path d="M8 10.6h8a2.3 2.3 0 1 1 2.6 1.4 2.3 2.3 0 1 1-2.6 1.4H8a2.3 2.3 0 1 1-2.6-1.4A2.3 2.3 0 1 1 8 10.6Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M8 10.6h8a2.3 2.3 0 1 1 2.6 1.4 2.3 2.3 0 1 1-2.6 1.4H8a2.3 2.3 0 1 1-2.6-1.4A2.3 2.3 0 1 1 8 10.6Z"/>
    </g>
  </Base>
);

/** Maternity */
export const MaternityIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M10 3a6.5 6.5 0 0 1 6.5 6.5H10Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M10 3a6.5 6.5 0 0 1 6.5 6.5H10Z"/>
    <path d="M3 9.5h13.5a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6Z"/>
    <path d="M16.5 9.5 18.5 5H21"/>
    <circle cx="7" cy="19" r="1.8"/><circle cx="13.5" cy="19" r="1.8"/>
  </Base>
);

/** Fertility */
export const FertilityIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.75" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <circle cx="12" cy="12" r="8.75"/>
    <circle cx="9.6" cy="10" r="2.6"/><circle cx="14.4" cy="10" r="2.6"/><circle cx="12" cy="14.6" r="2.6"/>
  </Base>
);

/** Oncology */
export const OncologyIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M12 15.2c-2.3-2.6-4-5.3-4-7.7a4 4 0 0 1 8 0c0 2.4-1.7 5.1-4 7.7Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M12 15.2c-2.3-2.6-4-5.3-4-7.7a4 4 0 0 1 8 0c0 2.4-1.7 5.1-4 7.7Z"/>
    <path d="M10.1 12.8 5.5 21l2.6-.4L9.3 22l3.8-6.5"/>
    <path d="M13.9 12.8 18.5 21l-2.6-.4-1.2 1.4-3.6-6.2"/>
  </Base>
);

/** Eye Care */
export const OphthalmologyIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/>
    <circle cx="12" cy="12" r="3.25" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <circle cx="12" cy="12" r="3.25"/>
    <rect x="11" y="11" width="2" height="2" fill="currentColor" stroke="none"/>
  </Base>
);

/** Dental */
export const DentalIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M7.7 3.5c-2.4 0-4.2 1.9-4.2 4.6 0 3 1.4 4.6 2.1 7.1l1.5 5.6h2.3l1.1-5c.3-1.2 .8-1.9 1.5-1.9s1.2.7 1.5 1.9l1.1 5h2.3l1.5-5.6c.7-2.5 2.1-4.1 2.1-7.1 0-2.7-1.8-4.6-4.2-4.6-1.9 0-2.6 1-4.3 1s-2.4-1-4.3-1Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M7.7 3.5c-2.4 0-4.2 1.9-4.2 4.6 0 3 1.4 4.6 2.1 7.1l1.5 5.6h2.3l1.1-5c.3-1.2 .8-1.9 1.5-1.9s1.2.7 1.5 1.9l1.1 5h2.3l1.5-5.6c.7-2.5 2.1-4.1 2.1-7.1 0-2.7-1.8-4.6-4.2-4.6-1.9 0-2.6 1-4.3 1s-2.4-1-4.3-1Z"/>
  </Base>
);

/** Surgery */
export const SurgeryIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M20.5 3.5 9.5 14.5l2 2 6.8-6.8c2.4-2.4 3-4.6 2.2-6.2Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M20.5 3.5 9.5 14.5l2 2 6.8-6.8c2.4-2.4 3-4.6 2.2-6.2Z"/>
    <path d="M9.5 14.5 3 21l1 1 .5.5 7-7"/>
  </Base>
);

/** Medical Package */
export const GeneralPackageIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <rect x="3" y="7" width="18" height="13" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <rect x="3" y="7" width="18" height="13"/>
    <path d="M9 7V4h6v3"/>
    <path d="M12 10.5v6M9 13.5h6"/>
  </Base>
);

/** Verified Facility */
export const VerifiedFacilityIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6Z"/>
    <path d="M8.5 11.8l2.5 2.5 4.5-4.8"/>
  </Base>
);

/** Offer / Savings */
export const OfferIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M3 3h8.5l9.5 9.5-8.5 8.5L3 11.5Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M3 3h8.5l9.5 9.5-8.5 8.5L3 11.5Z"/>
    <rect x="6.2" y="6.2" width="2.6" height="2.6"/>
    <path d="M10 15.5l5.5-5.5"/>
  </Base>
);

/** Duration */
export const DurationIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M7.5 3.5c0 5 4.5 5.8 4.5 8.5s-4.5 3.5-4.5 8.5h9c0-5-4.5-5.8-4.5-8.5s4.5-3.5 4.5-8.5Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M5.5 3.5h13M5.5 20.5h13"/>
    <path d="M7.5 3.5c0 5 4.5 5.8 4.5 8.5s-4.5 3.5-4.5 8.5M16.5 3.5c0 5-4.5 5.8-4.5 8.5s4.5 3.5 4.5 8.5"/>
  </Base>
);

/** Fasting Required */
export const FastingRequiredIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M6 3v5.5a2 2 0 0 0 4 0V3M8 3v18"/>
    <path d="M17 21V3c-2 1.6-3 4.2-3 7.5h3"/>
    <path d="M3 21 21 3"/>
  </Base>
);

/** International Patients */
export const InternationalIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9c2.4-2.5 3.6-5.5 3.6-9s-1.2-6.5-3.6-9Z"/>
    <path d="M3 12h18"/>
  </Base>
);

/** Inclusions */
export const InclusionsIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M10.5 6h10M10.5 12h10M10.5 18h10"/>
    <path d="M3.5 6l1.5 1.5L8 4.5M3.5 12l1.5 1.5L8 10.5M3.5 18l1.5 1.5L8 16.5"/>
  </Base>
);

/** Enquire */
export const EnquireIcon = (p: PkgIconProps) => (
  <Base {...p}>
    <path d="M3 4h18v13H10l-5 4v-4H3Z" fill="currentColor" fillOpacity=".14" stroke="none"/>
    <path d="M3 4h18v13H10l-5 4v-4H3Z"/>
    <path d="M7.5 9h9M7.5 12.5h6"/>
  </Base>
);

const CATEGORY_RULES: [string[], (p: PkgIconProps) => React.ReactElement][] = [
  [["screen", "check-up", "checkup", "executive", "wellness"], HealthScreeningIcon],
  [["cardi", "heart", "cardiac"], CardiologyIcon],
  [["ortho", "bone", "joint", "spine", "knee"], OrthopaedicsIcon],
  [["matern", "birth", "deliver", "obstet", "pregnan", "baby"], MaternityIcon],
  [["fertil", "ivf", "icsi", "reproduct"], FertilityIcon],
  [["onco", "cancer", "tumour", "tumor", "mammo", "chemo"], OncologyIcon],
  [["ophthal", "eye", "vision", "lasik", "cataract", "optic"], OphthalmologyIcon],
  [["dent", "tooth", "teeth", "oral", "orthodont"], DentalIcon],
  [["surg", "procedure", "operat", "bariatric", "laparo"], SurgeryIcon],
];

/** Picks the icon for a package category (keyword match, e.g. "Executive Health Screening" → screening). */
export function PackageCategoryIcon({ category = '', ...p }: PkgIconProps & { category?: string }) {
  const c = category.toLowerCase();
  const Icon = CATEGORY_RULES.find(([kws]) => kws.some(k => c.includes(k)))?.[1] ?? GeneralPackageIcon;
  return <Icon {...p} />;
}
