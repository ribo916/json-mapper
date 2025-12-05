/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { RuleResult } from "../utils/ruleExplanation";

interface Props {
  ruleResultsProduct: RuleResult[];
  ruleResultsRow: RuleResult[];
}

// ===============================================
// TOP-LEVEL SUBCOMPONENT — SAFE FOR REACT/LINT/TS
// ===============================================
function AdjustmentSection({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="w-full border border-gray-200 rounded-md bg-gray-50 p-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <div className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide">
          {title}
        </div>
        <div className="text-[11px] font-bold text-gray-900">
          {total.toFixed(3)}
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-[10px] text-gray-500 italic">No adjustments</div>
      ) : (
        <div className="space-y-[2px]">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between text-[11px] text-gray-700"
            >
              <span className="truncate">{item.label}</span>
              <span className="font-medium">{item.value.toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




export default function PriceAdjustmentsPanel({
  ruleResultsProduct,
  ruleResultsRow,
}: Props) {
  const toNum = (v: any) => {
    const n = typeof v === "string" ? parseFloat(v) : Number(v);
    return isNaN(n) ? 0 : n;
  };

  // Combine product-level + row-level visible adjustments
  const all = useMemo(
    () =>
      [...(ruleResultsProduct ?? []), ...(ruleResultsRow ?? [])].filter(
        (r) => r?.booleanEquationValue === true
      ),
    [ruleResultsProduct, ruleResultsRow]
  );

  /* ----------------------------- GROUPING LOGIC ----------------------------- */
  const margin = all.filter((r) => r.category === "Margin");

  const srp = all.filter((r) => r.category === "SRP");

  const llpa = all.filter((r) => {
    const sub = (r as any)?.subCategory || "";
    const name = r.ruleName || "";
    const inh = (r as any)?.ruleInheritedName || "";

    return (
      r.category === "Adjustment" &&
      (sub === "LLPA" || name.includes("LLPA") || inh.includes("LLPA"))
    );
  });

  /* ------------------------------ TOTALS ------------------------------ */
  const sum = (arr: RuleResult[]) =>
    arr.reduce((acc, r) => acc + toNum(r.resultEquationValue), 0);

  const totalMargin = sum(margin);
  const totalSRP = sum(srp);
  const totalLLPA = sum(llpa);

  const totalAll = totalMargin + totalSRP + totalLLPA;

  /* ---------- CONVERT RULE RESULTS INTO {label, value} ARRAYS ---------- */

  const marginItems = margin.map((r) => ({
    label: r.ruleName ?? "(unnamed rule)",
    value: toNum(r.resultEquationValue),
  }));

  const srpItems = srp.map((r) => ({
    label: r.ruleName ?? "(unnamed rule)",
    value: toNum(r.resultEquationValue),
  }));

  const llpaItems = llpa.map((r) => ({
    label: r.ruleName ?? "(unnamed rule)",
    value: toNum(r.resultEquationValue),
  }));

  /* ------------------------------ RENDER ------------------------------ */
  return (
    <div className="p-2 bg-white border border-gray-200 rounded-md shadow-sm space-y-2 text-[11px] w-[75%] mx-auto">
  
      <div className="text-[12px] font-semibold text-gray-900">
        Pricing Adjustments
      </div>
  
      <AdjustmentSection
        title="Margin Adjustments"
        total={totalMargin}
        items={marginItems}
      />
  
      <AdjustmentSection
        title="SRP Adjustments"
        total={totalSRP}
        items={srpItems}
      />
  
      <AdjustmentSection
        title="LLPA Adjustments"
        total={totalLLPA}
        items={llpaItems}
      />
  
      <div className="pt-2 border-t border-gray-200 flex justify-between text-[12px] font-semibold text-gray-900">
        <div>Total</div>
        <div>{totalAll.toFixed(3)}</div>
      </div>
  
    </div>
  );
  
}
