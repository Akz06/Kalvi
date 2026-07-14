/**
 * Central place for configurable defaults and helpers so nothing school-specific
 * is hardcoded across the codebase.
 */

export interface FeatureFlags {
  students: boolean;
  staff: boolean;
  classes: boolean;
  attendance: boolean;
  fees: boolean;
  exams: boolean;          // Phase 2
  parentPortal: boolean;   // Phase 3
  academicYears: boolean;
  onlinePayments: boolean; // Phase 3.4 — gated until admin configures gateway
}

export const DEFAULT_FEATURES: FeatureFlags = {
  students: true,
  staff: true,
  classes: true,
  attendance: true,
  fees: true,
  exams: true,
  parentPortal: true,
  academicYears: true,
  onlinePayments: false,   // off by default until admin configures a gateway
};

/** Safely parse the JSON feature-flag string stored on SchoolSettings. */
export function parseFeatures(raw: string | null | undefined): FeatureFlags {
  if (!raw) return { ...DEFAULT_FEATURES };
  try {
    return { ...DEFAULT_FEATURES, ...(JSON.parse(raw) as Partial<FeatureFlags>) };
  } catch {
    return { ...DEFAULT_FEATURES };
  }
}

/**
 * Configurable grade bands. Percentage thresholds are inclusive lower bounds.
 * Kept here so a future release can move them into SchoolSettings per board.
 */
const GRADE_BANDS: { min: number; grade: string }[] = [
  { min: 91, grade: "A+" },
  { min: 81, grade: "A" },
  { min: 71, grade: "B+" },
  { min: 61, grade: "B" },
  { min: 51, grade: "C+" },
  { min: 41, grade: "C" },
  { min: 33, grade: "D" },
  { min: 0, grade: "F" },
];

export function computeGrade(
  marksObtained: number,
  maxMarks: number
): { percentage: number; grade: string } {
  const percentage = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
  const band =
    GRADE_BANDS.find((b) => percentage >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
  return { percentage: Math.round(percentage * 100) / 100, grade: band.grade };
}
