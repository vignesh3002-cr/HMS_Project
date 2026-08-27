/* Shared vital-sign derivations used across doctor/admin pages. */

const toPositiveNumber = (value: number | null): number | null =>
  value !== null && value > 0 ? value : null;

/**
 * Body Surface Area via the Mosteller formula:
 *   BSA (m²) = √(height_cm × weight_kg / 3600)
 * Returns null when either input is missing or non-positive.
 */
export const computeBsa = (
  heightCm: number | null,
  weightKg: number | null
): number | null => {
  const height = toPositiveNumber(heightCm);
  const weight = toPositiveNumber(weightKg);
  if (height === null || weight === null) return null;
  const bsa = Math.sqrt((height * weight) / 3600);
  return Number.isFinite(bsa) ? Number(bsa.toFixed(2)) : null;
};

/**
 * Body Mass Index: weight_kg / height_m², rounded to 1 decimal.
 * Returns null when either input is missing or non-positive.
 */
export const computeBmi = (
  heightCm: number | null,
  weightKg: number | null
): number | null => {
  const height = toPositiveNumber(heightCm);
  const weight = toPositiveNumber(weightKg);
  if (height === null || weight === null) return null;
  const meters = height / 100;
  const bmi = weight / (meters * meters);
  return Number.isFinite(bmi) ? Number(bmi.toFixed(1)) : null;
};
