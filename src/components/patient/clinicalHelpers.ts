import { formatDate } from '../../locale';
import { DoctorProfile, NurseProfile, UserRole } from '../../types';

export const fmtPatientDate = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return formatDate(new Date(iso), { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

export function classifyBp(v1?: number | string | null, v2?: number | string | null) {
  const sys = Number(v1);
  const dia = Number(v2);
  if (!sys || !dia) {
    return { label: 'Optimal / Normal', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
  }
  if (sys >= 140 || dia >= 90) {
    return { label: 'Stage 2 Hypertension', badgeClass: 'bg-rose-50 text-rose-800 border-rose-300' };
  }
  if ((sys >= 130 && sys < 140) || (dia >= 80 && dia < 90)) {
    return { label: 'Stage 1 Hypertension', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' };
  }
  if (sys >= 120 && sys < 130 && dia < 80) {
    return { label: 'Elevated BP', badgeClass: 'bg-[color:var(--t-50)] text-[color:var(--t-800)] border-[color:var(--t-200)]' };
  }
  if (sys < 90 || dia < 60) {
    return { label: 'Low BP (Hypotension)', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' };
  }
  return { label: 'Normal Target Range', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
}

export function matchRecommendedSpecialists(
  professionals: (DoctorProfile | NurseProfile)[],
  patientConditions: string[],
  bpValue1?: number | null
): (DoctorProfile | NurseProfile)[] {
  const conditionsStr = patientConditions.join(' ').toLowerCase();
  const hasHypertension =
    conditionsStr.includes('hyper') ||
    conditionsStr.includes('pressure') ||
    Boolean(bpValue1 && bpValue1 >= 130);
  const hasDermatology =
    conditionsStr.includes('skin') ||
    conditionsStr.includes('derm') ||
    conditionsStr.includes('eczema') ||
    conditionsStr.includes('rash');
  const hasPediatric = conditionsStr.includes('pediat') || conditionsStr.includes('child');
  const hasNeuro =
    conditionsStr.includes('neuro') || conditionsStr.includes('migraine') || conditionsStr.includes('headache');

  const matched = professionals.filter((p) => {
    const spec = p.specialization.toLowerCase();
    if (hasHypertension && (spec.includes('cardio') || spec.includes('physician') || spec.includes('general'))) return true;
    if (hasDermatology && spec.includes('derm')) return true;
    if (hasPediatric && spec.includes('pediat')) return true;
    if (hasNeuro && spec.includes('neuro')) return true;
    return false;
  });

  if (matched.length > 0) return matched.slice(0, 3);
  return professionals.filter((p) => p.role === UserRole.DOCTOR).slice(0, 3);
}
