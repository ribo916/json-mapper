import { RawTemplate } from "./types";

/** Serialize a template back to JSON in the original shape.
 *
 * Round-trip note: JavaScript reorders integer-like object keys into ascending
 * numeric order. In the observed files the affected keys (e.g. criteria.armPrograms
 * "36"/"60"/"84"/"120", criteria.loanPrograms "300"/"480") are already stored in
 * ascending order, so an unedited load -> export is byte-stable. Non-numeric keys
 * preserve their insertion order. */
export function serialize(raw: RawTemplate): string {
  return JSON.stringify(raw, null, 2) + "\n";
}

export function downloadJson(name: string, raw: RawTemplate): void {
  const blob = new Blob([serialize(raw)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".json") ? name : `${name}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
