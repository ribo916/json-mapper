/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { RuleResult } from "../utils/ruleExplanation";
import InfoIconWithModal from "./InfoIconWithModal"; 

interface Props {
  ruleResultsProduct: RuleResult[];
  ruleResultsRow: RuleResult[];
}

/* ========================================================================= */
/*  HELPERS                                                                  */
/* ========================================================================= */

const toNum = (v: any): number => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

/**
 * A rule counts as PRICE-IMPACTING if:
 * - booleanEquationValue === true
 * - resultEquationValue or resultEquationValueUnclamped is non-zero
 * - target === "Price" (or target is missing/empty)
 */
function isPriceImpacting(r: RuleResult): boolean {
  if (!r) return false;
  if (r.booleanEquationValue !== true) return false;

  const raw =
    r.resultEquationValue !== undefined && r.resultEquationValue !== null
      ? r.resultEquationValue
      : (r as any).resultEquationValueUnclamped;

  const val = toNum(raw);
  if (val === 0) return false;

  if (r.target && r.target !== "Price") return false;

  return true;
}

/** Margin = category === "Margin" AND price-impacting */
function isMarginRule(r: RuleResult): boolean {
  return r.category === "Margin" && isPriceImpacting(r);
}

/** SRP = category === "SRP" AND price-impacting */
function isSRPRule(r: RuleResult): boolean {
  return r.category === "SRP" && isPriceImpacting(r);
}

/**
 * LLPA heuristic:
 *  - price-impacting
 *  - AND (subCategory === "LLPA"
 *       OR ruleName contains "LLPA"
 *       OR (category === "Adjustment" and NOT obviously SRP))
 *
 * This captures:
 *  - classic LLPA rules with explicit LLPA naming
 *  - your example like "2nd Community No" (category=Adjustment, subCategory=None)
 */
function isLLPARule(r: RuleResult): boolean {
  if (!isPriceImpacting(r)) return false;

  const name = (r.ruleName || "").toString();
  const sub = ((r as any).subCategory || "").toString();
  const cat = (r.category || "").toString();

  if (sub === "LLPA") return true;
  if (name.includes("LLPA")) return true;

  // Heuristic: adjustment rules that are not SRP are treated as LLPA-ish
  if (cat === "Adjustment" && !name.includes("SRP")) return true;

  return false;
}

/**
 * Rounding rules:
 *  - category === "Rounding"
 *  - booleanEquationValue === true
 *  - target === "Price" or missing
 *
 * PPE does NOT expose a numeric rounding delta in the API payload,
 * so we only know that rounding occurred, not its size.
 */
function isRoundingRule(r: RuleResult): boolean {
  if (!r) return false;
  if (r.category !== "Rounding") return false;
  if (r.booleanEquationValue !== true) return false;
  if (r.target && r.target !== "Price") return false;
  return true;
}

/* ========================================================================= */
/*  BUCKET COMPONENT                                                         */
/* ========================================================================= */

function Bucket({
  title,
  items,
  includeUnknownEntry = false,
  unknownLabel = "Unknown",
}: {
  title: string;
  items: RuleResult[];
  includeUnknownEntry?: boolean;
  unknownLabel?: string;
}) {
  const total =
    items.reduce(
      (sum, r) =>
        sum +
        toNum(
          r.resultEquationValue ??
            (r as any).resultEquationValueUnclamped ??
            0
        ),
      0
    ) || 0;

  const showUnknown = includeUnknownEntry;

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 p-3 shadow-sm w-full mb-2">


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
      {items.length === 0 && !showUnknown && (
        <div className="text-[10px] text-gray-500 italic">No adjustments</div>
      )}

      {items.length > 0 && (
        <div className="space-y-[2px]">
          {items.map((r, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px] text-gray-700"
            >
              <span className="truncate">
                {r.ruleName || "(unnamed rule)"}
              </span>
              <span className="font-medium">
                {toNum(
                  r.resultEquationValue ??
                    (r as any).resultEquationValueUnclamped ??
                    0
                ).toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Non-numeric rounding indicator */}
      {showUnknown && (
        <div className="flex justify-between text-[11px] text-gray-500 italic mt-1">
          <span>{unknownLabel}</span>
          <span>??</span>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/*  MAIN PANEL                                                               */
/* ========================================================================= */

export default function PriceAdjustmentsPanel({
  ruleResultsProduct,
  ruleResultsRow,
}: Props) {
  // 1) Combine product-level + row-level rules
  const allRules: RuleResult[] = useMemo(
    () => [...(ruleResultsProduct ?? []), ...(ruleResultsRow ?? [])],
    [ruleResultsProduct, ruleResultsRow]
  );

  // 2) Price-impacting rules (used for Margin/SRP/LLPA buckets)
  const priceRules: RuleResult[] = useMemo(
    () => allRules.filter(isPriceImpacting),
    [allRules]
  );

  // 3) Buckets
  const margin = priceRules.filter(isMarginRule);
  const srp = priceRules.filter(isSRPRule);
  const llpa = priceRules.filter(isLLPARule);

  // 4) Rounding (non-numeric, just presence)
  const roundingRules = allRules.filter(isRoundingRule);
  const roundingFired = roundingRules.length > 0;

  // 5) Total (sum of numeric buckets ONLY — rounding delta is not exposed)
  const totalAll =
    [...margin, ...srp, ...llpa].reduce(
      (sum, r) =>
        sum +
        toNum(
          r.resultEquationValue ??
            (r as any).resultEquationValueUnclamped ??
            0
        ),
      0
    ) || 0;

  return (
    <div className="relative border border-gray-300 rounded-md bg-gray-100 p-2 pl-3 w-full max-w-md mb-2 shadow-inner">
      <div className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-l-md"></div>
      <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
        Pricing Adjustments
        <InfoIconWithModal title="How Pricing Adjustments Are Selected">
          <div className="space-y-4 text-sm text-gray-700">

            {/* PRODUCT + ROW RULES */}
            <div>
              <div className="font-semibold text-gray-900">Rule Sources</div>
              <ul className="list-disc list-inside text-xs text-gray-600 mt-1 space-y-1">
                <li>
                  Product-level rules:{" "}
                  <code className="bg-gray-100 px-1 rounded">$.data.results[x].ruleResults[]</code>
                </li>
                <li>
                  Row-level rules:{" "}
                  <code className="bg-gray-100 px-1 rounded">$.data.results[x].prices[y].ruleResults[]</code>
                </li>
                <li>These are merged to create the full rule set evaluated for pricing.</li>
              </ul>
            </div>

            {/* PRICE IMPACTING LOGIC */}
            <div>
              <div className="font-semibold text-gray-900">Price-Impacting Rules</div>
              <ul className="list-disc list-inside text-xs text-gray-600 mt-1 space-y-1">
                <li><code>booleanEquationValue === true</code> (the rule fired)</li>
                <li>Numeric result is non-zero</li>
                <li>
                  <code>target === "Price"</code> or target missing/null (affects price-level values)
                </li>
              </ul>
            </div>

            {/* BUCKET TYPES */}
            <div>
              <div className="font-semibold text-gray-900">Adjustment Buckets</div>

              <div className="mt-1 text-xs text-gray-600 space-y-2">
                <div>
                  <span className="font-medium text-gray-800">Margin</span>
                  <div className="ml-4">
                    category:{" "}
                    <code className="bg-gray-100 px-1 rounded">"Margin"</code>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-800">SRP</span>
                  <div className="ml-4">
                    category:{" "}
                    <code className="bg-gray-100 px-1 rounded">"SRP"</code>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-800">LLPA</span>
                  <ul className="ml-4 list-disc list-inside space-y-1">
                    <li><code>subCategory === "LLPA"</code></li>
                    <li>Rule name contains “LLPA”</li>
                    <li>
                      category === "Adjustment" AND ruleName does NOT contain “SRP”
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ROUNDING */}
            <div>
              <div className="font-semibold text-gray-900">Rounding Rules</div>
              <ul className="list-disc list-inside text-xs text-gray-600 mt-1 space-y-1">
                <li><code>category === "Rounding"</code></li>
                <li><code>booleanEquationValue === true</code></li>
                <li><code>target === "Price"</code> or target missing</li>
                <li className="text-gray-500">
                  PPE does NOT expose the numeric rounding delta — only that rounding occurred.
                </li>
              </ul>
            </div>

          </div>
        </InfoIconWithModal>

      </div>

      {/* Margin */}
      <Bucket
        title="Margin Adjustments"
        items={margin}
        includeUnknownEntry={roundingFired}
        unknownLabel="Corporate Rounding Applied (unknown)"
      />

      {/* SRP */}
      <Bucket title="SRP Adjustments" items={srp} />

      {/* LLPA */}
      <Bucket title="LLPA Adjustments" items={llpa} />

      {/* TOTAL (numeric only, rounding excluded because API does not expose it) */}
      <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-semibold text-gray-900">
        <div>Total (excluding rounding)</div>
        <div>{totalAll.toFixed(3)}</div>
      </div>

    </div>
  );
}
