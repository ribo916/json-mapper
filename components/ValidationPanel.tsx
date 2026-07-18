"use client";

import React, { useMemo } from "react";
import { LoadedTemplate } from "@/lib/template/types";
import { validate, summarize, Finding } from "@/lib/template/validate";
import { Badge } from "./ui";

const toneFor: Record<Finding["severity"], "rose" | "amber" | "slate"> = {
  error: "rose",
  warning: "amber",
  info: "slate",
};

export function ValidationPanel({ template }: { template: LoadedTemplate }) {
  const findings = useMemo(() => validate(template.raw), [template.raw]);
  const counts = summarize(findings);

  if (findings.length === 0) {
    return (
      <p className="px-1 text-xs text-emerald-700 dark:text-emerald-300">
        No validation findings for {template.name}.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        {counts.errors > 0 && <Badge tone="rose">{counts.errors} errors</Badge>}
        {counts.warnings > 0 && <Badge tone="amber">{counts.warnings} warnings</Badge>}
        {counts.info > 0 && <Badge tone="slate">{counts.info} info</Badge>}
      </div>
      <ul className="scroll-thin max-h-64 space-y-1 overflow-auto text-xs">
        {findings.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded border border-border px-2 py-1 text-fg"
          >
            <Badge tone={toneFor[f.severity]}>{f.severity}</Badge>
            <span>{f.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
