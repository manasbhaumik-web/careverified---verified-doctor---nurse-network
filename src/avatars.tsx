import React, { useState, useEffect } from 'react';

export type UserRoleType = 'patient' | 'doctor' | 'nurse' | 'practitioner' | 'pharmacy' | 'facility' | 'admin';
export type GenderType = 'male' | 'female' | 'other';
export type EthnicityType = 'malay' | 'chinese' | 'indian' | 'other';

/** Universal failover person photo: high-res, friendly passport ID headshot */
export const DEFAULT_FAILOVER_AVATAR = '/assets/failover_person.jpg';

/** Role-specific default failover photos (passport-size ID headshots) */
export const ROLE_FAILOVER_AVATARS: Record<string, string> = {
  patient: '/assets/patient_female_malay.jpg',
  doctor: '/assets/malaysian_female_doctor.jpg',
  nurse: '/assets/malaysian_female_nurse.jpg',
  practitioner: '/assets/malaysian_female_doctor.jpg',
  pharmacy: '/assets/pharmacist_female_malay.jpg',
  facility: '/assets/facility_director_male.jpg',
  admin: '/assets/admin_board_female.jpg',
};

/** High-res passport portraits categorized by role, gender, ethnicity */
export const AVATAR_CATALOG = {
  doctors: {
    female_malay: '/assets/malaysian_female_doctor.jpg',
    male_malay: '/assets/malaysian_male_doctor.jpg',
    male_chinese: '/assets/doctor_male_chinese.jpg',
    female_indian: '/assets/doctor_female_indian.jpg',
  },
  nurses: {
    female_malay: '/assets/malaysian_female_nurse.jpg',
    male_malaysian: '/assets/nurse_male_malaysian.jpg',
  },
  pharmacists: {
    female_malay: '/assets/pharmacist_female_malay.jpg',
    male_chinese: '/assets/pharmacist_male_chinese.jpg',
  },
  patients: {
    female_malay: '/assets/patient_female_malay.jpg',
    male_chinese: '/assets/patient_male_chinese.jpg',
    female_chinese: '/assets/patient_female_chinese.jpg',
    female_indian: '/assets/patient_female_indian.jpg',
    male_malay: '/assets/malaysian_male_patient.jpg',
  },
  facility: {
    director_male: '/assets/facility_director_male.jpg',
  },
  admin: {
    board_female: '/assets/admin_board_female.jpg',
  },
  failover: '/assets/failover_person.jpg',
};

/** Get the best failover avatar for a given role */
export function getRoleFailoverAvatar(role?: string | null): string {
  if (!role) return DEFAULT_FAILOVER_AVATAR;
  const normalized = role.toLowerCase().trim();
  return ROLE_FAILOVER_AVATARS[normalized] || DEFAULT_FAILOVER_AVATAR;
}

/** Get avatar URL with role-appropriate fallback */
export function getAvatarWithFallback(avatarUrl?: string | null, role?: string | null): string {
  if (avatarUrl && avatarUrl.trim() !== '' && !avatarUrl.includes('placeholder') && !avatarUrl.includes('undefined')) {
    return avatarUrl;
  }
  return getRoleFailoverAvatar(role);
}

/** Look up a specific profile avatar by role, gender, and ethnicity */
export function getProfileAvatar(params: {
  role: string;
  gender?: string;
  ethnicity?: string;
}): string {
  const r = params.role.toLowerCase();
  const g = params.gender?.toLowerCase() || 'female';
  const e = params.ethnicity?.toLowerCase() || 'malay';

  if (r === 'doctor' || (r === 'practitioner' && !params.role.includes('nurse'))) {
    if (g === 'male' && e === 'chinese') return AVATAR_CATALOG.doctors.male_chinese;
    if (g === 'female' && e === 'indian') return AVATAR_CATALOG.doctors.female_indian;
    if (g === 'male') return AVATAR_CATALOG.doctors.male_malay;
    return AVATAR_CATALOG.doctors.female_malay;
  }

  if (r === 'nurse') {
    if (g === 'male') return AVATAR_CATALOG.nurses.male_malaysian;
    return AVATAR_CATALOG.nurses.female_malay;
  }

  if (r === 'pharmacy') {
    if (g === 'male' || e === 'chinese') return AVATAR_CATALOG.pharmacists.male_chinese;
    return AVATAR_CATALOG.pharmacists.female_malay;
  }

  if (r === 'patient') {
    if (g === 'male' && e === 'chinese') return AVATAR_CATALOG.patients.male_chinese;
    if (g === 'male') return AVATAR_CATALOG.patients.male_malay;
    if (e === 'chinese') return AVATAR_CATALOG.patients.female_chinese;
    if (e === 'indian') return AVATAR_CATALOG.patients.female_indian;
    return AVATAR_CATALOG.patients.female_malay;
  }

  if (r === 'facility') {
    return AVATAR_CATALOG.facility.director_male;
  }

  if (r === 'admin') {
    return AVATAR_CATALOG.admin.board_female;
  }

  return DEFAULT_FAILOVER_AVATAR;
}

export interface UserAvatarProps extends React.ComponentPropsWithoutRef<'img'> {
  src?: string | null;
  alt?: string;
  className?: string;
  role?: string | null;
  fallbackRole?: string | null;
  name?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

/**
 * Robust User Avatar component with multi-level image error recovery:
 * 1. Tries primary src
 * 2. On error -> swaps to role-specific failover portrait
 * 3. On second error -> swaps to universal failover portrait
 * 4. Never shows a broken image icon.
 */
export function UserAvatar({
  src,
  alt = 'User profile',
  role,
  fallbackRole,
  className = 'w-10 h-10 rounded-full object-cover',
  ...rest
}: UserAvatarProps) {
  const targetRole = role || fallbackRole;
  const initialSrc = getAvatarWithFallback(src, targetRole);
  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [errorCount, setErrorCount] = useState<number>(0);

  // Sync if prop changes
  useEffect(() => {
    setCurrentSrc(getAvatarWithFallback(src, targetRole));
    setErrorCount(0);
  }, [src, targetRole]);

  const handleError = () => {
    if (errorCount === 0) {
      setErrorCount(1);
      const roleFallback = getRoleFailoverAvatar(targetRole);
      if (roleFallback !== currentSrc) {
        setCurrentSrc(roleFallback);
        return;
      }
    }
    if (errorCount <= 1) {
      setErrorCount(2);
      if (currentSrc !== DEFAULT_FAILOVER_AVATAR) {
        setCurrentSrc(DEFAULT_FAILOVER_AVATAR);
      }
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      referrerPolicy="no-referrer"
      {...rest}
    />
  );
}
