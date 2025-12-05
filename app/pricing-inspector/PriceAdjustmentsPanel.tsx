"use client";

import React, { useMemo } from "react";
import { RuleResult } from "../utils/ruleExplanation";

interface Props {
  ruleResultsProduct: RuleResult[];
  ruleResultsRow: RuleResult[];
}

export default function PriceAdjustmentsPanel({
  ruleResultsProduct,
  ruleResultsRow,
}: Props) {
  // Combine product-level + row-level for adjustment display
  const all = useMemo(
    () =>
      [...(ruleResultsProduct ?? []), ...(ruleResultsRow ?? [])].filter(
        (r) => r?.booleanEquationValue === true
      ),
    [ruleResultsProduct, ruleResultsRow]
  );

  const toNum = (v: any) => {
    const n = typeof v === "string" ? parseFloat(v) : Number(v);
    return isNaN(n) ? 0 : n;
  };

  /* ----------------------------- GROUPING LOGIC ----------------------------- */
  const margin = all.filter((r) => r.category === "Margin");

  const srp = all.filter((r) => r.category === "SRP");

  const llpa = all.filter((r) => {
    const sub = (r as any)?.subCategory || "";
    const name = r.ruleName || "";
    const inh = (r as any)?.ruleInheritedName || "";

    return (
      r.category === "Adjustment" &&
      (sub === "LLPA" ||
        name.includes("LLPA") ||
        inh.includes("LLPA"))
    );
  });

  /* ------------------------------ TOTALS ------------------------------ */
  const sum = (arr: RuleResult[]) =>
    arr.reduce((acc, r) => acc + toNum(r.resultEquationValue), 0);

  const totalMargin = sum(margin);
  const totalSRP = sum(srp);
  const totalLLPA = sum(llpa);

  const totalAll = totalMargin + totalSRP + totalLLPA;

  /* ------------------------------ RENDER ------------------------------ */

  const Section = ({
    title,
    total,
    items,
  }: {
    title: string;
    total: number;
    items: RuleResult[];
  }) => (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-gray-800">
        {title}:{" "}
        <span className="text-gray-900">{total.toFixed(3)}</span>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-gray-500 italic pl-1">
          No adjustments
        </div>
      ) : (
        <div className="pl-3 space-y-1">
          {items.map((r, i) => (
            <div
              key={i}
              className="flex justify-between text-sm text-gray-700"
            >
              <div>{r.ruleName || "(unnamed rule)"}</div>
              <div>{toNum(r.resultEquationValue).toFixed(3)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4 text-sm">
      <div className="text-lg font-semibold text-gray-900">
        Pricing Adjustments
      </div>

      <Section
        title="Margin Adjustments"
        total={totalMargin}
        items={margin}
      />

      <Section
        title="SRP Adjustments"
        total={totalSRP}
        items={srp}
      />

      <Section
        title="LLPA Adjustments"
        total={totalLLPA}
        items={llpa}
      />

      <div className="pt-3 border-t border-gray-200 flex justify-between text-base font-semibold text-gray-900">
        <div>Total</div>
        <div>{totalAll.toFixed(3)}</div>
      </div>
    </div>
  );
}
