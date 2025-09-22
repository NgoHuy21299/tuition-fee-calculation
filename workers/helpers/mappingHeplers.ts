// Helpers for flag mapping
export function dbFlagToBool(n: number): boolean {
  return n === 1;
}
export function boolToDbFlag(b: boolean | undefined): number | null {
  if (b === undefined) return null;
  return b ? 1 : 0;
}