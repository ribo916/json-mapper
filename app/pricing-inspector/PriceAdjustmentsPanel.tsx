/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { RuleResult } from "../utils/ruleExplanation";

interface Props {
  ruleResultsProduct: RuleResult[];
  ruleResultsRow: RuleResult[];
}

/* ===========================================================================
   SMALL ADJUSTMENT CARD (Margin / SRP / LLPA)
   =========================================================================== */
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
    <div className="border border-gray-200 rounded-md bg-gray-50 p-2 w-[70%]">
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
          {items.map((it, idx) => (
            <div
              key={idx}
              className="flex justify-between text-[11px] text-gray-700"
            >
              <span className="truncate">{it.label}</span>
              <span className="font-medium">{it.value.toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===========================================================================
   MAIN COMPONENT
   =========================================================================== */
export default function PriceAdjustmentsPanel({
  ruleResultsProduct,
  ruleResultsRow,
}: Props) {
  /* -----------------------------------------------------------------------
     COMBINE PRODUCT + ROW RULE RESULTS
     ----------------------------------------------------------------------- */
  const combinedRuleResults = useMemo(
    () => [...(ruleResultsProduct ?? []), ...(ruleResultsRow ?? [])],
    [ruleResultsProduct, ruleResultsRow]
  );

  const toNum = (v: any) => {
    const n = typeof v === "string" ? parseFloat(v) : Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  /* -----------------------------------------------------------------------
     VISIBLE ADJUSTMENTS — EXACT PSEUDOCODE YOU APPROVED
     ----------------------------------------------------------------------- */
  const visible = combinedRuleResults.filter((r) => {
    if (!r) return false;

    return (
      r.booleanEquationValue === true &&
      (r as any).isHiddenAdjustment !== true &&
      (
        r.category === "Margin" ||
        r.category === "SRP" ||
        r.subCategory === "LLPA" ||
        (r.ruleName ?? "").includes("LLPA")
      )
    );
  });

  /* -----------------------------------------------------------------------
     GROUP BY TYPE
     ----------------------------------------------------------------------- */
  const margin = visible.filter((r) => r.category === "Margin");
  const srp = visible.filter((r) => r.category === "SRP");
  const llpa = visible.filter(
    (r) => r.subCategory === "LLPA" || (r.ruleName ?? "").includes("LLPA")
  );

  /* -----------------------------------------------------------------------
     TOTALS
     ----------------------------------------------------------------------- */
  const sum = (arr: RuleResult[]) =>
    arr.reduce((acc, r) => acc + toNum(r.resultEquationValue), 0);

  const totalMargin = sum(margin);
  const totalSRP = sum(srp);
  const totalLLPA = sum(llpa);
  const totalAll = totalMargin + totalSRP + totalLLPA;

  /* -----------------------------------------------------------------------
     FORMAT ITEMS FOR SECTIONS
     ----------------------------------------------------------------------- */
  const toItems = (arr: RuleResult[]) =>
    arr.map((r) => ({
      label: r.ruleName || "(unnamed rule)",
      value: toNum(r.resultEquationValue),
    }));

  /* -----------------------------------------------------------------------
     RENDER
     ----------------------------------------------------------------------- */
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3 text-sm">
      <div className="font-semibold text-gray-900 text-sm">
        Pricing Adjustments
      </div>

      {/* ------------------- Margin ------------------- */}
      <AdjustmentSection
        title="Margin Adjustments"
        total={totalMargin}
        items={toItems(margin)}
      />

      {/* ------------------- SRP ------------------- */}
      <AdjustmentSection
        title="SRP Adjustments"
        total={totalSRP}
        items={toItems(srp)}
      />

      {/* ------------------- LLPA ------------------- */}
      <AdjustmentSection
        title="LLPA Adjustments"
        total={totalLLPA}
        items={toItems(llpa)}
      />

      {/* TOTAL */}
      <div className="pt-3 border-t border-gray-200 flex justify-between font-semibold text-gray-900 text-sm">
        <span>Total</span>
        <span>{totalAll.toFixed(3)}</span>
      </div>

      {/* -----------------------------------------------------------------
         DEVELOPER MINI-NOTE WITH JSON PATHS + PSEUDOCODE
         ----------------------------------------------------------------- */}
      <div className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 leading-relaxed mt-2">
        <div className="font-semibold text-gray-700 mb-1">
          How this panel selects adjustments
        </div>

        <pre className="text-[10px] whitespace-pre-wrap">
{`// product rules → $.data.results[x].ruleResults[]
// row rules     → $.data.results[x].prices[y].ruleResults[]

combinedRuleResults = productRules + rowRules

visible = combinedRuleResults.filter(r =>
  r.booleanEquationValue === true &&
  r.isHiddenAdjustment !== true &&
  (
    r.category === "Margin" ||
    r.category === "SRP" ||
    r.subCategory === "LLPA" ||
    r.ruleName?.includes("LLPA")
  )
)`}
        </pre>
      </div>
    </div>
  );
}
