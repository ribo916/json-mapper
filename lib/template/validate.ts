import { classify } from "./classify";
import { RawTemplate } from "./types";

export type Severity = "error" | "warning" | "info";

export interface Finding {
  severity: Severity;
  /** dotted path or enum name the finding anchors to */
  target: string;
  message: string;
  category: "duplicate-enum-id" | "required-not-visible";
}

/** Structural checks over one template (no schema involved). */
export function validate(raw: RawTemplate): Finding[] {
  const findings: Finding[] = [];
  const n = classify(raw);

  // Duplicate enum ids (catches e.g. the loanPurposeOptions id:6 collision).
  for (const e of n.enums) {
    const seen = new Set<string>();
    for (const o of e.options) {
      const key = String(o.id);
      if (seen.has(key)) {
        findings.push({
          severity: "warning",
          target: e.name,
          category: "duplicate-enum-id",
          message: `Duplicate option id "${key}" in ${e.name} (e.g. "${o.text}").`,
        });
      }
      seen.add(key);
    }
  }

  // Required but not visible.
  for (const f of n.fields) {
    if (f.control.required === true && f.control.visible === false) {
      findings.push({
        severity: "warning",
        target: f.id,
        category: "required-not-visible",
        message: `${f.id} is required but not visible.`,
      });
    }
  }

  return findings;
}

export function summarize(findings: Finding[]): { errors: number; warnings: number; info: number } {
  return {
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
}
