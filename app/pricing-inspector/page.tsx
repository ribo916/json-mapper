/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import React, { useMemo, useState } from "react";
import {
  buildDisqualifyingRuleExplanations,
  RuleResult,
  RuleExplanation,
} from "../utils/ruleExplanation";
import DevConsole from "./DevConsole";
import PriceAdjustmentsPanel from "./PriceAdjustmentsPanel";
import InfoIconWithModal from "./InfoIconWithModal"; 
import CollapseIcon from "./CollapseIcon"; 

// ===============================================
// HYBRID PRODUCT PICKER (with contextual styling)
// ===============================================
function HybridProductPicker({
  products,
  selectedValue,
  setSelectedValue,
  placeholder = "Select product…",
  color = "gray",
}: {
  products: PpeResult[];
  selectedValue: string;
  setSelectedValue: (v: string) => void;
  placeholder?: string;
  color?: "gray" | "green" | "yellow" | "red";
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) =>
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.code ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  const selectedLabel = (() => {
    const p = products.find((p) => p.code === selectedValue);
    if (!p) return placeholder;
    return `${p.name ?? "(no name)"} – ${p.code ?? "(no code)"}`;
  })();

  // dynamic section color mapping
  const theme = {
    gray: {
      selectedBg: "bg-white",
      selectedBorder: "border-gray-300",
      selectedText: "text-gray-900",
    },
    green: {
      selectedBg: selectedValue ? "bg-green-50" : "bg-white",
      selectedBorder: selectedValue ? "border-green-400" : "border-gray-300",
      selectedText: selectedValue ? "text-green-800" : "text-gray-900",
    },
    yellow: {
      selectedBg: selectedValue ? "bg-yellow-50" : "bg-white",
      selectedBorder: selectedValue ? "border-yellow-400" : "border-gray-300",
      selectedText: selectedValue ? "text-yellow-800" : "text-gray-900",
    },
    red: {
      selectedBg: selectedValue ? "bg-red-50" : "bg-white",
      selectedBorder: selectedValue ? "border-red-400" : "border-gray-300",
      selectedText: selectedValue ? "text-red-800" : "text-gray-900",
    },
  }[color];

  return (
    <div className="relative text-sm">
      {/* SELECTED DISPLAY BAR */}
      <div
        className={`
          w-full rounded px-2 py-1 border cursor-pointer
          ${theme.selectedBg} ${theme.selectedBorder} ${theme.selectedText}
        `}
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
      >
        {selectedLabel}
      </div>

      {/* DROPDOWN PANEL */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-2">
          <input
            autoFocus
            type="text"
            placeholder="Search name, code, or ID…"
            className="w-full mb-2 px-2 py-1 border border-gray-300 rounded text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-xs text-gray-500 px-2 py-2">No matches</div>
            )}

            {filtered.map((p) => (
              <div
                key={p.code}
                className="px-2 py-1 cursor-pointer rounded hover:bg-gray-100"
                onClick={() => {
                  setSelectedValue(p.code ?? "");
                  setOpen(false);
                }}
              >
                <div className="font-medium text-gray-900 text-sm">
                  {p.name} – {p.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===============================================
// PRICE BREAKDOWN TYPE
// ===============================================
interface PriceBreakdown {
  pba: number | null;
  paba: number;
  basePrice: number;

  // REQUIRED — these were missing and caused your TS errors
  visibleResultAdj: number;
  visibleRowAdj: number;

  totalVisiblePriceAdj: number;
  clampAdj: number;
  reconstructedPrice: number;
  enginePrice: number;
  brokerCompField: number;
  netPrice: number;
  priceDiff: number;
  netDiff: number;
}

// ===============================================
// PRICE MATH BREAKDOWN COMPONENT (4 wiki steps)
// ===============================================
function PriceMathBreakdown({
  breakdown,
}: {
  breakdown: PriceBreakdown | null;
}) {
  if (!breakdown) return null;

  const {
    basePrice,
    totalVisiblePriceAdj,
    clampAdj,
    reconstructedPrice,
    enginePrice,
    netPrice,
    priceDiff,
    netDiff,
  } = breakdown;

  return (
    <div className="mt-3 p-5 rounded-lg bg-gray-50 shadow-md text-xs w-full space-y-4">
      <div className="text-xs font-semibold text-gray-900 mb-2">
        Price Construction Breakdown (Wiki Steps 1–4)
      </div>

      <table className="w-full text-xs">
        <tbody className="divide-y divide-gray-300">

          {/* =============================================================== */}
          {/* STEP 1 - CALCULATE BASE PRICE                                  */}
          {/* =============================================================== */}
          <tr className="align-top">
            <td className="py-2 font-medium text-gray-700 w-1/3">
              Step 1 – Base Price
            </td>
            <td className="py-2 text-gray-900 min-w-[80px]">
              {basePrice.toFixed(4)}
            </td>
            <td className="py-2 text-[11px] text-gray-600 leading-relaxed pl-3">
              <strong>How to Calculate Base Price</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>
                  Start with{" "}
                  <code>prices[i].priceAfterBaseAdjustments</code>.
                </li>
                <li>
                  Add in <strong>hidden price-level adjustments</strong> (it
                  already includes the hidden result-level adjustments):
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>
                      Loop through{" "}
                      <code>results[j].prices[i].ruleResults</code> and sum{" "}
                      <code>resultEquationValue</code> where:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>
                          <code>isHiddenAdjustment == true</code>
                        </li>
                        <li>
                          <code>target == "Price"</code>
                        </li>
                        <li>
                          <code>
                            category in ["Adjustment", "SRP", "Margin"]
                          </code>
                        </li>
                        <li>
                          <code>booleanEquationValue == true</code>{" "}
                          (indicating the rule fired)
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ol>

              <div className="mt-2 text-gray-500">
                <strong>JSON anchors:</strong>{" "}
                <code>data.results[x].prices[y].priceAfterBaseAdjustments</code>{" "}
                + hidden price-level rules in{" "}
                <code>data.results[x].prices[y].ruleResults[]</code>.
              </div>
            </td>
          </tr>

          {/* =============================================================== */}
          {/* STEP 2 - VISIBLE PRICE ADJUSTMENTS                             */}
          {/* =============================================================== */}
          <tr className="align-top">
            <td className="py-2 font-medium text-gray-700">
              Step 2 – VisiblePriceAdjustments
            </td>
            <td className="py-2 text-gray-900 min-w-[80px]">
              {totalVisiblePriceAdj.toFixed(4)}
            </td>
            <td className="py-2 text-[11px] text-gray-600 leading-relaxed pl-3">
              <strong>Step 2 – Calculate VisiblePriceAdjustments</strong>
              <p className="mt-1">
                Loop through both Result-Level and Price-Level rulesets to get
                all <strong>visible</strong> price adjustments.
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>
                  Loop through <code>prices[i].ruleResults</code> and sum{" "}
                  <code>resultEquationValue</code> where:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>
                      <code>isHiddenAdjustment == false</code>
                    </li>
                    <li>
                      <code>booleanEquationValue == true</code>
                    </li>
                    <li>
                      <code>target == "Price"</code>
                    </li>
                    <li>
                      <code>
                        category in ["Adjustments", "SRP", "Margin"]
                      </code>
                    </li>
                  </ul>
                </li>
                <li>
                  Loop through <code>results[j].ruleResults</code> and sum{" "}
                  <code>resultEquationValue</code> using the same logic.
                </li>
              </ol>

              <div className="mt-2 text-gray-500">
                <strong>JSON anchors:</strong>{" "}
                <code>data.results[x].prices[y].ruleResults[]</code> and{" "}
                <code>data.results[x].ruleResults[]</code>.
              </div>
            </td>
          </tr>

          {/* =============================================================== */}
          {/* STEP 3 - PRICE CLAMP ADJUSTMENTS                               */}
          {/* =============================================================== */}
          <tr className="align-top">
            <td className="py-2 font-medium text-gray-700">
              Step 3 – PriceClampAdjustments
            </td>
            <td className="py-2 text-gray-900 min-w-[80px]">
              {clampAdj.toFixed(4)}
            </td>
            <td className="py-2 text-[11px] text-gray-600 leading-relaxed pl-3">
              <strong>Step 3 – Calculate PriceClampAdjustments</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>
                  Loop through <code>prices[i].clampResults[]</code> and sum{" "}
                  <code>(unclamped - clamped)</code> where:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>
                      <code>target == "Price"</code>
                    </li>
                    <li>
                      <code>
                        category in ["Adjustments", "SRP", "Margin"]
                      </code>
                    </li>
                  </ul>
                </li>
              </ol>
              <p className="mt-1">
                A delta indicates the clamp bit.
              </p>
              <p className="mt-1">
                <strong>Note:</strong> You will see entries where{" "}
                <code>category = "TotalPrice"</code> and may wonder why that
                isn't included. These represent the aggregate of all
                price-related categories and serve as a summary reference, not a
                separate clamp adjustment.
              </p>

              <div className="mt-2 text-gray-500">
                <strong>JSON anchor:</strong>{" "}
                <code>data.results[x].prices[y].clampResults[]</code>.
              </div>
            </td>
          </tr>

          {/* =============================================================== */}
          {/* STEP 4 - FINAL PRICE                                           */}
          {/* =============================================================== */}
          <tr className="bg-gray-50 align-top">
            <td className="py-2 font-semibold text-gray-900">
              Step 4 – Final Price (Calculated)
            </td>
            <td className="py-2 font-semibold text-gray-900 min-w-[80px]">
              {reconstructedPrice.toFixed(4)}
            </td>
            <td className="py-2 text-[11px] text-gray-600 leading-relaxed pl-3">
              <strong>Step 4 – Calculate the Final Price</strong>
              <p className="mt-1">
                <code>
                  Final Price = BasePrice + VisiblePriceAdjustments -
                  PriceClampAdjustments
                </code>
              </p>
              <p className="mt-1">
                This price corresponds to <code>prices[i].price</code>, not{" "}
                <code>prices[i].netPrice</code>, which requires rounding logic
                and broker compensation.
              </p>

              <hr className="my-1 border-gray-300" />

              <div className="text-gray-500 space-y-1">
                <div>
                  <strong>JSON Engine Price:</strong>{" "}
                  <code>data.results[x].prices[y].price</code> ={" "}
                  <span className="font-mono">
                    {enginePrice.toFixed(4)}
                  </span>
                  <span className="ml-1">
                    (Δ JSON − Calculated ={" "}
                    <span className="font-mono">
                      {priceDiff.toFixed(4)}
                    </span>
                    )
                  </span>
                </div>
                <div>
                  <strong>JSON Net Price:</strong>{" "}
                  <code>data.results[x].prices[y].netPrice</code> ={" "}
                  <span className="font-mono">
                    {netPrice.toFixed(4)}
                  </span>
                  <span className="ml-1">
                    (Δ Net − Engine ={" "}
                    <span className="font-mono">
                      {netDiff.toFixed(4)}
                    </span>
                    )
                  </span>
                </div>

                <div className="mt-1">
                  <strong>Calculated Net Price (Engine + Broker Comp):</strong>{" "}
                  <span className="font-mono">
                    {(enginePrice + breakdown.brokerCompField).toFixed(4)}
                  </span>
                  <span className="ml-1 text-gray-500">
                    (This is NOT authoritative — included for developer comparison only)
                  </span>
                </div>

              </div>
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
}



/* -------------------------------------------------------------------------- */
/* HELPERS + LIGHTWEIGHT TYPES                                               */
/* -------------------------------------------------------------------------- */

function toNumberSafe(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

const PRICE_RULE_CATEGORIES = ["Adjustment", "SRP", "Margin"] as const;

interface PriceClamp {
  target?: string | null;
  category?: string | null;
  clamped?: unknown;
  unclamped?: unknown;

  // older names (if Polly ever returns them)
  clampedFrom?: unknown;
  clampedTo?: unknown;
}

interface PriceRow {
  rate?: unknown;
  apr?: unknown;
  price?: unknown;
  netPrice?: unknown;
  netPriceBeforeRounding?: unknown;
  principalAndInterest?: unknown;
  lockPeriod?: unknown;
  investor?: unknown;

  priceBeforeAdjustments?: unknown;
  priceAfterBaseAdjustments?: unknown;

  totalPriceAdjustments?: unknown;
  totalMarginAdjustments?: unknown;
  totalPriceSRPAdjustments?: unknown;

  ruleResults?: RuleResult[] | null;
  clampResults?: PriceClamp[] | null;
}

interface FeeResultLite {
  amount?: unknown;
  feeAmount?: unknown;
  feeName?: string | null;
  name?: string | null;
  feeType?: string | null;
  type?: string | null;
}

/* -------------------------------------------------------------------------- */
/* PPE RESPONSE TYPES                                                        */
/* -------------------------------------------------------------------------- */

interface PpeResult {
  code?: string | null;
  name?: string | null;

  isEligible?: boolean | null;
  isValidResult?: boolean | null;

  prices?: PriceRow[] | null;
  ruleResults?: RuleResult[] | null;

  invalidResultReason?: string | null;
  uniqueInvestorCount?: number | null;

  excludedInvestors?: unknown[] | null;

  allInvestorsExcluded?: boolean | null;
  lockDeskWorkflowResults?: unknown[] | null;
  complianceResults?: unknown[] | null;
  feeResults?: FeeResultLite[] | null;
  inheritance?: unknown[] | null;
  sources?: unknown[] | null;

  // Product-level totals
  totalAdjustments?: number | null;
  totalBasePriceAdjustments?: number | null;
  totalSRPAdjustments?: number | null;
  totalRateAdjustments?: number | null;
}

interface PpeResponse {
  data?: {
    loan?: {
      amount?: unknown;
    };
    search?: {
      desiredLockPeriod?: unknown;
    };
    brokerCompPlan?: {
      calculatedAdjustment?: unknown;
    };
    results?: PpeResult[];
  };
}

/* -------------------------------------------------------------------------- */
/* TYPE GUARD                                                                */
/* -------------------------------------------------------------------------- */

function isPpeResponse(value: unknown): value is PpeResponse {
  if (!value || typeof value !== "object") return false;
  const maybeData = (value as { data?: unknown }).data;
  if (!maybeData || typeof maybeData !== "object") return false;
  const maybeResults = (maybeData as { results?: unknown }).results;
  if (!Array.isArray(maybeResults)) return false;
  return true;
}

/* -------------------------------------------------------------------------- */
/* PRICE BREAKDOWN HELPERS (mirror wiki logic)                               */
/* -------------------------------------------------------------------------- */

/**
 * Select numeric price deltas from ruleResults, honoring:
 * - fired rules only (booleanEquationValue === true)
 * - target === "Price" OR target is missing/empty
 * - hidden vs visible based on isHiddenAdjustment
 * - resultEquationValue OR resultEquationValueUnclamped
 */
function pickRuleValues(
  rules: RuleResult[] | null | undefined,
  opts: { hidden: boolean }
): number[] {
  if (!Array.isArray(rules)) return [];

  return rules
    .filter((r) => {
      if (!r) return false;

      // Only fired rules
      if (r.booleanEquationValue !== true) return false;

      // Target: "Price" OR missing/null/empty (engine treats missing as price)
      if (r.target && r.target !== "Price") return false;

      // Numeric delta: use resultEquationValue or resultEquationValueUnclamped
      const raw =
        r.resultEquationValue !== undefined && r.resultEquationValue !== null
          ? r.resultEquationValue
          : (r as any).resultEquationValueUnclamped;

      const val = toNumberSafe(raw);
      if (val === 0) return false;

      // Hidden vs visible:
      //  - hidden: isHiddenAdjustment === true
      //  - visible: anything that is NOT explicitly hidden
      const isHidden = r.isHiddenAdjustment === true;
      return opts.hidden ? isHidden : !isHidden;
    })
    .map((r) => {
      const raw =
        r.resultEquationValue !== undefined && r.resultEquationValue !== null
          ? r.resultEquationValue
          : (r as any).resultEquationValueUnclamped;
      return toNumberSafe(raw);
    });
}

/**
 * Clamp adjustments:
 * - Use unclampedValue - clampedValue
 * - Include clamps where target is "Price" OR missing/empty
 * - Do NOT filter by category; any price clamp applies.
 */
function pickClampRemovals(
  clamps: PriceClamp[] | null | undefined
): number[] {
  if (!Array.isArray(clamps)) return [];

  return clamps
    .filter((c) => {
      if (!c) return false;

      // Clamp applies to price when target is "Price" OR missing/null/empty
      if (c.target && c.target !== "Price") return false;

      // If we have any unclamped/clamped pair, we consider it
      const hasUnclamped =
        c.unclamped !== undefined || c.clampedFrom !== undefined;
      const hasClamped = c.clamped !== undefined || c.clampedTo !== undefined;
      return hasUnclamped && hasClamped;
    })
    .map((c) => {
      // Support either (clamped/unclamped) or (clampedFrom/clampedTo)
      const unclamped =
        c.unclamped !== undefined ? c.unclamped : c.clampedFrom;
      const clamped =
        c.clamped !== undefined ? c.clamped : c.clampedTo;
      return toNumberSafe(unclamped) - toNumberSafe(clamped);
    });
}

interface PriceBreakdown {
  pba: number | null;
  paba: number;
  basePrice: number;
  visibleResultAdj: number;
  visibleRowAdj: number;
  totalVisiblePriceAdj: number;
  clampAdj: number;
  reconstructedPrice: number;
  enginePrice: number;
  netPrice: number;
  brokerCompField: number;
  priceDiff: number;
  netDiff: number;
}

/**
 * Rebuild the engine’s price math from JSON:
 *
 *  pba              = priceBeforeAdjustments
 *  paba             = priceAfterBaseAdjustments
 *  basePrice        = paba   // hidden adjustments already applied by engine
 *  visibleResultAdj = visible product-level adjustments
 *  visibleRowAdj    = visible row-level adjustments
 *  totalVisible     = visibleResultAdj + visibleRowAdj
 *  clampAdj         = sum(unclamped - clamped) over clampResults
 *  reconstructed    = basePrice + totalVisible - clampAdj
 *  enginePrice      = prices[y].price
 *  netPrice         = prices[y].netPrice ?? prices[y].price
 */
function buildPriceBreakdown(
  product: PpeResult,
  priceRow: PriceRow,
  brokerCompField: number
): PriceBreakdown {
  // Price before adjustments (may be missing in some responses)
  const pbaRaw = (priceRow as { priceBeforeAdjustments?: unknown })
    .priceBeforeAdjustments;
  const pba =
    Object.prototype.hasOwnProperty.call(priceRow, "priceBeforeAdjustments") &&
    pbaRaw !== undefined
      ? toNumberSafe(pbaRaw)
      : null;

  // Price after base adjustments (paba)
  const paba = toNumberSafe(
    (priceRow as { priceAfterBaseAdjustments?: unknown })
      .priceAfterBaseAdjustments
  );

  // Hidden / visible adjustments (display only—NOT used in basePrice calc)
  const productHidden = sum(pickRuleValues(product.ruleResults, { hidden: true }));
  const productVisible = sum(
    pickRuleValues(product.ruleResults, { hidden: false })
  );

  const rowHidden = sum(pickRuleValues(priceRow.ruleResults, { hidden: true }));
  const rowVisible = sum(
    pickRuleValues(priceRow.ruleResults, { hidden: false })
  );

  // *** FIXED ***
  // Base Price = paba. Engine has ALREADY applied base + hidden adjustments.
  // Never add hidden again—doing so double-counts them.
  const basePrice = paba;

  // Visible adjustments
  const visibleResultAdj = productVisible;
  const visibleRowAdj = rowVisible;
  const totalVisiblePriceAdj = visibleResultAdj + visibleRowAdj;

  // Clamp adjustments (unclamped - clamped)
  const clampAdj = sum(pickClampRemovals(priceRow.clampResults));

  // Reconstructed engine price from components
  const reconstructedPrice = basePrice + totalVisiblePriceAdj - clampAdj;

  // Engine price + net price from payload
  const enginePrice = toNumberSafe(priceRow.price);
  const netPrice = toNumberSafe(
    (priceRow as { netPrice?: unknown }).netPrice ?? priceRow.price
  );

  // Diffs (debugging / sanity checks)
  const priceDiff = +(enginePrice - reconstructedPrice).toFixed(3);
  const netDiff = +((enginePrice + brokerCompField) - netPrice).toFixed(3);

  return {
    pba,
    paba,
    basePrice,
    visibleResultAdj,
    visibleRowAdj,
    totalVisiblePriceAdj,
    clampAdj,
    reconstructedPrice,
    enginePrice,
    netPrice,
    brokerCompField,
    priceDiff,
    netDiff,
  };
}



/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                 */
/* -------------------------------------------------------------------------- */

export default function PricingInspector() {
  const [rawResults, setRawResults] = useState<PpeResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [loanAmount, setLoanAmount] = useState<number | null>(null);
  const [desiredLockPeriod, setDesiredLockPeriod] = useState<number | null>(null);
  const [brokerCompBps, setBrokerCompBps] = useState<number>(0);

  const [selectedEligibleCode, setSelectedEligibleCode] = useState<string>("");
  const [selectedIneligibleCode, setSelectedIneligibleCode] = useState<string>("");
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [selectedInvalidCode, setSelectedInvalidCode] = useState<string>("");
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<number>(-1);
  
  const [showOverview, setShowOverview] = useState(false);
  const [showRateTable, setShowRateTable] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [showRuleBuckets, setShowRuleBuckets] = useState(false);

  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [pasteText, setPasteText] = useState<string>("");
  const [showPastePanel, setShowPastePanel] = useState<boolean>(false);


  /* ------------------------------------------------------------------------ */
  /* FILE UPLOAD                                                              */
  /* ------------------------------------------------------------------------ */

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      loadPpeJson(parsed, file.name);
    } catch {
      setError("Invalid JSON");
      setRawResults([]);
      setFileName(fileName ?? file.name);
      setLoanAmount(null);
      setDesiredLockPeriod(null);
      setBrokerCompBps(0);
    }
  };

  const handlePaste = (): void => {
    try {
      const parsed: unknown = JSON.parse(pasteText);
      loadPpeJson(parsed);
    } catch {
      setError("Invalid JSON");
      setRawResults([]);
      setFileName(null);
      setLoanAmount(null);
      setDesiredLockPeriod(null);
      setBrokerCompBps(0);
    }
  };

  const loadPpeJson = (parsed: unknown, fileName?: string): void => {
    if (!isPpeResponse(parsed)) {
      setError("Missing $.data.results[]");
      setRawResults([]);
      setFileName(fileName ?? null);
      setLoanAmount(null);
      setDesiredLockPeriod(null);
      setBrokerCompBps(0);
      return;
    }

    const results = parsed.data?.results ?? [];
    setRawResults(results);
    setError(null);
    setFileName(fileName ?? null);

    // Pull out shared scenario fields for UI calculations
    const loanAmt = toNumberSafe(parsed.data?.loan?.amount);
    setLoanAmount(loanAmt || null);

    const lock = toNumberSafe(parsed.data?.search?.desiredLockPeriod);
    setDesiredLockPeriod(lock || null);

    const comp = toNumberSafe(
      parsed.data?.brokerCompPlan?.calculatedAdjustment
    );
    setBrokerCompBps(comp || 0);

    // Reset selections
    setSelectedEligibleCode("");
    setSelectedIneligibleCode("");
    setSelectedInvalidCode("");
    setSelectedPriceIndex(-1);
  };

  /* ------------------------------------------------------------------------ */
  /* CLASSIFICATION GROUPS                                                    */
  /* ------------------------------------------------------------------------ */

  const eligible = useMemo(
    () =>
      rawResults.filter(
        (r) => r.isEligible === true && r.isValidResult === true
      ),
    [rawResults]
  );

  const ineligible = useMemo(
    () =>
      rawResults.filter(
        (r) => r.isEligible === false && r.isValidResult === true
      ),
    [rawResults]
  );

  const invalid = useMemo(
    () => rawResults.filter((r) => r.isValidResult === false),
    [rawResults]
  );

  /* ------------------------------------------------------------------------ */
  /* SELECTED PRODUCT                                                         */
  /* ------------------------------------------------------------------------ */

  const selectedProduct: PpeResult | undefined = useMemo(() => {
    if (selectedEligibleCode) {
      return eligible.find((p) => p.code === selectedEligibleCode);
    }
    if (selectedIneligibleCode) {
      return ineligible.find((p) => p.code === selectedIneligibleCode);
    }
    if (selectedInvalidCode) {
      return invalid.find((p) => p.code === selectedInvalidCode);
    }
    return undefined;
  }, [
    eligible,
    ineligible,
    invalid,
    selectedEligibleCode,
    selectedIneligibleCode,
    selectedInvalidCode,
  ]);

  const selectedIsEligible =
    selectedProduct?.isValidResult === true &&
    selectedProduct.isEligible === true;

  const selectedIsIneligible =
    selectedProduct?.isValidResult === true &&
    selectedProduct.isEligible === false;

  const selectedIsInvalid = selectedProduct?.isValidResult === false;

  const prices = (selectedProduct?.prices ?? []) as PriceRow[];
  const pricesCount = prices.length;
  const excludedInvestorsCount = (selectedProduct?.excludedInvestors ?? [])
    .length;

  const selectedPriceRow: PriceRow | null =
  selectedPriceIndex !== null &&
  selectedPriceIndex >= 0 &&
  selectedPriceIndex < prices.length
    ? prices[selectedPriceIndex]
    : null;

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-1"
          >
            ← Back to Tools
          </a>
          <div className="w-8 h-8 bg-white border border-gray-300 flex items-center justify-center rounded-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <circle cx="6" cy="12" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="18" cy="18" r="2" />
              <line x1="8" y1="12" x2="16" y2="6" />
              <line x1="8" y1="12" x2="16" y2="18" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">
              Pricing Inspector
            </div>
            <div className="text-xs text-gray-600">
              Upload a PPE response JSON and inspect products in{" "}
              <code className="bg-gray-100 px-1 rounded text-[11px]">
                $.data.results[]
              </code>
              .
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {fileName && (
            <span className="text-gray-700 text-sm truncate max-w-xs">
              {fileName}
            </span>
          )}

          <div className="flex items-center gap-1 border border-gray-300 rounded-md p-1">
            <button
              onClick={() => setInputMode("upload")}
              className={`px-3 py-1 text-sm rounded ${
                inputMode === "upload"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setInputMode("paste")}
              className={`px-3 py-1 text-sm rounded ${
                inputMode === "paste"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Paste JSON
            </button>
          </div>

          {inputMode === "upload" && (
            <>
              <input
                id="fileInput"
                type="file"
                accept=".json"
                onChange={handleUpload}
                className="hidden"
              />
              <label
                htmlFor="fileInput"
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-100 cursor-pointer"
              >
                Choose File
              </label>
            </>
          )}

          {inputMode === "paste" && (
            <button
              onClick={() => setShowPastePanel(!showPastePanel)}
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-100 cursor-pointer"
            >
              {showPastePanel ? "Hide" : "Show"} Paste Panel
            </button>
          )}
        </div>
      </header>

      {/* PASTE PANEL */}
      {showPastePanel && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Paste PPE JSON Response:
                </label>
                <span className="text-xs text-gray-500">
                  {pasteText.length} characters
                </span>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your PPE JSON response here..."
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={handlePaste}
                  disabled={!pasteText.trim()}
                  className="inline-flex items-center px-4 py-2 rounded-md border border-transparent bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="px-6 py-6 space-y-8 max-w-7xl mx-auto">
        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* ================================================================== */}
        {/* HIGH LEVEL RESULTS                                                 */}
        {/* ================================================================== */}
        <section>
          <h2 className="text-xl font-semibold mb-3">High Level Results</h2>

          {rawResults.length === 0 ? (
            <div className="text-sm text-gray-600">
              Upload a PPE response file to see product classifications.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary counts */}
              <div className="flex flex-wrap gap-4 text-sm">

                {/* Eligible */}
                <div className="px-3 py-2 rounded bg-green-50 border border-green-400 text-green-800">
                  <span className="font-semibold">{eligible.length}</span>{" "}
                  eligible products
                </div>

                {/* Ineligible */}
                <div className="px-3 py-2 rounded bg-yellow-50 border border-yellow-400 text-yellow-800">
                  <span className="font-semibold">{ineligible.length}</span>{" "}
                  ineligible products
                </div>

                {/* Invalid */}
                <div className="px-3 py-2 rounded bg-red-50 border border-red-400 text-red-800">
                  <span className="font-semibold">{invalid.length}</span>{" "}
                  invalid products
                </div>

              </div>

              {/* Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                {/* Eligible */}
                <div>
                  <div className="text-xs text-gray-600 mb-2 h-[42px] flex flex-col justify-between">
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isEligible == true
                    </code>
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isValidResult == true
                    </code>
                  </div>
                  <HybridProductPicker
                    products={eligible}
                    selectedValue={selectedEligibleCode}
                    setSelectedValue={(v) => {
                      setSelectedEligibleCode(v);
                      setSelectedIneligibleCode("");
                      setSelectedInvalidCode("");
                      setSelectedPriceIndex(-1);
                    }}
                    placeholder="Select eligible product"
                    color="green"
                  />
                </div>

                {/* Ineligible */}
                <div>
                  <div className="text-xs text-gray-600 mb-2 h-[42px] flex flex-col justify-between">
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isEligible == false
                    </code>
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isValidResult == true
                    </code>
                  </div>
                  <HybridProductPicker
                    products={ineligible}
                    selectedValue={selectedIneligibleCode}
                    setSelectedValue={(v) => {
                      setSelectedIneligibleCode(v);
                      setSelectedEligibleCode("");
                      setSelectedInvalidCode("");
                      setSelectedPriceIndex(-1);
                    }}
                    placeholder="Select ineligible product"
                    color="yellow"
                  />
                </div>

                {/* Invalid */}
                <div>
                  <div className="text-xs text-gray-600 mb-2 h-[42px] flex flex-col justify-between">
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isValidResult == false
                    </code>
                    <span />
                  </div>
                  <HybridProductPicker
                    products={invalid}
                    selectedValue={selectedInvalidCode}
                    setSelectedValue={(v) => {
                      setSelectedInvalidCode(v);
                      setSelectedEligibleCode("");
                      setSelectedIneligibleCode("");
                      setSelectedPriceIndex(-1);
                    }}
                    placeholder="Select invalid product"
                    color="red"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <hr className="border-gray-300" />

        {/* ================================================================== */}
        {/* DETAILED RESULTS                                                   */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {selectedIsEligible
              ? ""
              : selectedIsIneligible
              ? ""
              : selectedIsInvalid
              ? ""
              : "Detailed Results"}
          </h2>

          {!selectedProduct && (
            <div className="text-sm text-gray-600">
              Select a product above to view detailed analysis.
            </div>
          )}

          {selectedProduct && (
            <div className="space-y-8 text-sm text-gray-800">

              {/* ================================================================== */}
              {/* ELIGIBLE VIEW                                                     */}
              {/* ================================================================== */}
              {selectedIsEligible && (
                <section className="space-y-8">
                  {(() => {
                    const feeResults = (selectedProduct.feeResults ?? []) as FeeResultLite[];

                    // *** FIX 1: Create sortedPrices (used everywhere consistently)
                    const sortedPrices = prices
                      .slice()
                      .sort((a, b) => toNumberSafe(a.rate) - toNumberSafe(b.rate));

                    // Price stack stats — now based on sortedPrices
                    const allRates = sortedPrices
                      .map((p) => toNumberSafe(p.rate))
                      .filter((r) => !Number.isNaN(r));

                    const allPrices = sortedPrices
                      .map((p) =>
                        toNumberSafe((p as { netPrice?: unknown }).netPrice ?? p.price)
                      )
                      .filter((px) => !Number.isNaN(px));

                    const minRate = allRates.length ? Math.min(...allRates) : null;
                    const maxRate = allRates.length ? Math.max(...allRates) : null;
                    const bestPrice = allPrices.length ? Math.max(...allPrices) : null;
                    const worstPrice = allPrices.length ? Math.min(...allPrices) : null;

                    // Par logic — also must use sortedPrices
                    let parRate: number | null = null;
                    let parDelta = Infinity;
                    for (const row of sortedPrices) {
                      const r = toNumberSafe(row.rate);
                      const p = toNumberSafe(
                        (row as { netPrice?: unknown }).netPrice ?? row.price
                      );
                      if (!Number.isNaN(r) && !Number.isNaN(p)) {
                        const d = Math.abs(p - 100);
                        if (d < parDelta) {
                          parDelta = d;
                          parRate = r;
                        }
                      }
                    }

                    // Product-level totals
                    const totalAdjustments =
                      (selectedProduct.totalAdjustments ?? 0) || 0;
                    const totalBasePriceAdjustments =
                      (selectedProduct.totalBasePriceAdjustments ?? 0) || 0;
                    const totalSRPAdjustments =
                      (selectedProduct.totalSRPAdjustments ?? 0) || 0;
                    const totalRateAdjustments =
                      (selectedProduct.totalRateAdjustments ?? 0) || 0;

                    // Fees
                    const feeTotal = feeResults.reduce(
                      (s, f) =>
                        s + toNumberSafe(f.amount !== undefined ? f.amount : f.feeAmount),
                      0
                    );

                    // Rule buckets
                    const usedRules = (selectedProduct.ruleResults ?? []).filter(
                      (r) => r.booleanEquationValue === true
                    );

                    // *** FIX 2: selectedPriceRow MUST come from sortedPrices, not prices
                    const selectedPriceRow =
                      selectedPriceIndex >= 0 &&
                      selectedPriceIndex < sortedPrices.length
                        ? sortedPrices[selectedPriceIndex]
                        : null;

                    // Price breakdown for selected row
                    let priceBreakdown: PriceBreakdown | null = null;
                    if (selectedPriceRow) {
                      priceBreakdown = buildPriceBreakdown(
                        selectedProduct,
                        selectedPriceRow,   // ← now correct row every time
                        brokerCompBps
                      );
                    }

                    return (
                      <>
                        {/* ========================================================== */}
                        {/* PRODUCT OVERVIEW + ADJUSTMENT TOTALS (COLLAPSIBLE CARD)     */}
                        {/* ========================================================== */}
                        <div className="mt-8">
                          <button
                            onClick={() => setShowOverview((v) => !v)}
                            className="flex items-center justify-between w-full mb-2"
                          >
                            <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              Product Overview &amp; Adjustment Totals
                            </div>

                            <span className="text-gray-600 hover:text-gray-800">
                              <CollapseIcon open={showOverview} />
                            </span>
                          </button>

                          {showOverview && (
                            <div className="mt-3 p-5 rounded-lg bg-gray-50 shadow-md text-sm space-y-4">

                              <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-100">

                                  {/* Product Name */}
                                  <tr>
                                    <td className="py-2 font-medium text-gray-700 w-1/3">
                                      Product Name
                                    </td>
                                    <td className="py-2 text-gray-900">
                                      {selectedProduct.name ?? "(missing)"}
                                    </td>
                                    <td className="py-2 text-xs text-gray-500 text-right align-top">
                                      <code className="bg-gray-100 px-1 rounded">$.data.results[x].name</code>
                                    </td>
                                  </tr>

                                  {/* Product ID */}
                                  <tr>
                                    <td className="py-2 font-medium text-gray-700">
                                      Product Code
                                    </td>
                                    <td className="py-2 text-gray-900">
                                      {selectedProduct.code ?? "(missing)"}
                                    </td>
                                    <td className="py-2 text-xs text-gray-500 text-right align-top">
                                      <code className="bg-gray-100 px-1 rounded">$.data.results[x].code</code>
                                    </td>
                                  </tr>

                                  {/* Product Code */}
                                  <tr>
                                    <td className="py-2 font-medium text-gray-700">
                                      Product Code
                                    </td>
                                    <td className="py-2 text-gray-900">
                                      {selectedProduct.code ?? "(missing)"}
                                    </td>
                                    <td className="py-2 text-xs text-gray-500 text-right align-top">
                                      <code className="bg-gray-100 px-1 rounded">$.data.results[x].code</code>
                                    </td>
                                  </tr>

                                  {/* Base Price Adj */}
                                  <tr>
                                    <td className="py-2 font-medium text-gray-700">
                                      Base Price Adj
                                    </td>
                                    <td className="py-2 text-gray-900">
                                      {totalBasePriceAdjustments.toFixed(4)}
                                    </td>
                                    <td className="py-2 text-xs text-gray-500 text-right align-top">
                                      <code className="bg-gray-100 px-1 rounded">
                                        $.data.results[x].totalBasePriceAdjustments
                                      </code>
                                    </td>
                                  </tr>

                                  {/* SRP Adjustments */}
                                  <tr>
                                    <td className="py-2 font-medium text-gray-700">
                                      SRP Adjustments
                                    </td>
                                    <td className="py-2 text-gray-900">
                                      {totalSRPAdjustments.toFixed(4)}
                                    </td>
                                    <td className="py-2 text-xs text-gray-500 text-right align-top">
                                      <code className="bg-gray-100 px-1 rounded">
                                        $.data.results[x].totalSRPAdjustments
                                      </code>
                                    </td>
                                  </tr>

                                  {/* Rate Adjustments */}
                                  <tr>
                                    <td className="py-2 font-medium text-gray-700">
                                      Rate Adjustments
                                    </td>
                                    <td className="py-2 text-gray-900">
                                      {totalRateAdjustments.toFixed(4)}
                                    </td>
                                    <td className="py-2 text-xs text-gray-500 text-right align-top">
                                      <code className="bg-gray-100 px-1 rounded">
                                        $.data.results[x].totalRateAdjustments
                                      </code>
                                    </td>
                                  </tr>

                                  {/* All Price Adjustments */}
                                  <tr className="bg-gray-100">
                                    <td className="py-2 font-semibold text-gray-900">
                                      All Price Adjustments
                                    </td>
                                    <td className="py-2 font-semibold text-gray-900">
                                      {totalAdjustments.toFixed(4)}
                                    </td>
                                    <td className="py-2 text-xs text-gray-500 text-right align-top">
                                      <code className="bg-gray-100 px-1 rounded">
                                        $.data.results[x].totalAdjustments
                                      </code>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>

                              <div className="text-xs text-gray-500">
                                Note: These values are sourced from PPE product-level totals.
                                <span className="block">
                                  <code>totalAdjustments</code> may include rounding and categories not
                                  shown individually above.
                                </span>
                              </div>

                            </div>
                          )}
                        </div>

                        {/* ========================================================== */}
                        {/* RATE / PRICE STACK SUMMARY & TABLE (COLLAPSABLE)           */}
                        {/* ========================================================== */}
                        <div className="mt-6">

                          {/* HEADER + COLLAPSE TOGGLE (div, not button!) */}
                          <div
                            onClick={() => setShowRateTable((v) => !v)}
                            role="button"
                            tabIndex={0}
                            className="flex items-center justify-between w-full mb-2 cursor-pointer select-none"
                          >
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                              Rate / Price Stack Summary &amp; Table

                              {/* INFO ICON */}
                              <InfoIconWithModal title="Rate / Price Table Header Logic">
                                <div className="space-y-4 text-sm text-gray-700">

                                  {/* RATE */}
                                  <div>
                                    <div className="font-semibold text-gray-900">Rate</div>
                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                      $.data.results[x].prices[y].rate
                                    </code>
                                  </div>

                                  {/* APR */}
                                  <div>
                                    <div className="font-semibold text-gray-900">Estimated APR</div>
                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                      $.data.results[x].prices[y].apr
                                    </code>
                                  </div>

                                  {/* NET PRICE */}
                                  <div>
                                    <div className="font-semibold text-gray-900">Price (Net)</div>
                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                      $.data.results[x].prices[y].netPrice
                                    </code>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Falls back to <code>price</code> when <code>netPrice</code> is missing.
                                    </div>
                                  </div>

                                  {/* ENGINE PRICE */}
                                  <div>
                                    <div className="font-semibold text-gray-900">Engine Price</div>
                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                      $.data.results[x].prices[y].price
                                    </code>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Only shown separately when <strong>Engine ≠ Net</strong>.
                                    </div>
                                  </div>

                                  {/* P&I */}
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      Principal &amp; Interest (P&amp;I)
                                    </div>
                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                      $.data.results[x].prices[y].principalAndInterest
                                    </code>
                                  </div>

                                  {/* CREDIT / COST */}
                                  <div>
                                    <div className="font-semibold text-gray-900">Credit / Cost</div>
                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                      netPrice − 100
                                    </code>

                                    <ul className="list-disc list-inside text-xs text-gray-600 mt-1 space-y-1">
                                      <li>Positive = cost to borrower</li>
                                      <li>Negative = credit to borrower</li>
                                      <li>
                                        Dollar amount:{" "}
                                        <code className="bg-gray-100 px-1 rounded">
                                          (loanAmount × (netPrice − 100)) ÷ 100
                                        </code>
                                      </li>
                                      <li>Example: Net 102.000 → +2.000 points → loanAmount × 0.02</li>
                                      <li>Example: Net 98.500 → −1.500 points → loanAmount × −0.015</li>
                                    </ul>
                                  </div>

                                  {/* LOCK PERIOD */}
                                  <div>
                                    <div className="font-semibold text-gray-900">Lock Period</div>
                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                      $.data.results[x].prices[y].lockPeriod
                                    </code>
                                  </div>

                                  {/* INVESTOR */}
                                  <div>
                                    <div className="font-semibold text-gray-900">Investor</div>
                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                      $.data.results[x].prices[y].investor
                                    </code>
                                  </div>

                                </div>
                              </InfoIconWithModal>
                            </h3>

                            {/* Collapse Icon */}
                            <CollapseIcon open={showRateTable} />
                          </div>

                          {/* COLLAPSABLE CONTENT */}
                          {showRateTable && (
                            <div className="mt-4 overflow-x-auto">
                              <table className="min-w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-gray-100 text-[11px] uppercase tracking-wide text-gray-600">
                                    <th className="border px-2 py-1 text-left">Rate</th>
                                    <th className="border px-2 py-1 text-left">Est APR</th>
                                    <th className="border px-2 py-1 text-left">Price (Net)</th>
                                    <th className="border px-2 py-1 text-left">P&amp;I</th>
                                    <th className="border px-2 py-1 text-left">Credit/Cost</th>
                                    <th className="border px-2 py-1 text-left">Lock Period</th>
                                    <th className="border px-2 py-1 text-left">Investor</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {[...prices]
                                    .slice()
                                    .sort((a, b) => toNumberSafe(a.rate) - toNumberSafe(b.rate))
                                    .map((row, idx) => {
                                      const rate = toNumberSafe(row.rate);
                                      const apr = toNumberSafe(row.apr);
                                      const priceEngine = toNumberSafe(row.price);
                                      const netPrice = toNumberSafe(
                                        (row as { netPrice?: unknown }).netPrice ?? row.price
                                      );
                                      const pni = toNumberSafe(row.principalAndInterest);

                                      const effLoanAmount =
                                        loanAmount && loanAmount !== 0 ? loanAmount : null;

                                      let creditPts = 0;
                                      let creditDollars = 0;

                                      if (effLoanAmount) {
                                        creditPts = netPrice - 100;
                                        creditDollars = (effLoanAmount * creditPts) / 100;
                                      }

                                      const lock =
                                        toNumberSafe(row.lockPeriod ?? desiredLockPeriod) || null;

                                      const investor =
                                        (row.investor as string | undefined) ?? "(unknown)";

                                      const isSelected = idx === selectedPriceIndex;

                                      return (
                                        <React.Fragment key={idx}>
                                          <tr
                                            className={`cursor-pointer transition-colors ${
                                              isSelected
                                                ? "bg-blue-50/70 hover:bg-blue-100"
                                                : "hover:bg-gray-100"
                                            }`}
                                            onClick={() =>
                                              setSelectedPriceIndex((prev) =>
                                                prev === idx ? -1 : idx
                                              )
                                            }
                                          >
                                            <td className="border px-2 py-1">
                                              {rate.toFixed(3)}
                                            </td>
                                            <td className="border px-2 py-1">
                                              {apr ? apr.toFixed(6) : "—"}
                                            </td>
                                            <td className="border px-2 py-1">
                                              {netPrice.toFixed(3)}
                                              <div className="text-[10px] text-gray-500">
                                                Engine: {priceEngine.toFixed(3)}
                                              </div>
                                            </td>
                                            <td className="border px-2 py-1">
                                              {pni ? pni.toFixed(2) : "—"}
                                            </td>
                                            <td className="border px-2 py-1">
                                              {effLoanAmount
                                                ? creditPts > 0
                                                  ? `-${creditPts.toFixed(3)} (-$${Math.abs(
                                                      creditDollars
                                                    ).toFixed(0)})`
                                                  : creditPts < 0
                                                  ? `+${Math.abs(creditPts).toFixed(
                                                      3
                                                    )} (+$${Math.abs(creditDollars).toFixed(0)})`
                                                  : "0.000 ($0)"
                                                : "n/a"}
                                            </td>
                                            <td className="border px-2 py-1">
                                              {lock ?? "—"}
                                            </td>
                                            <td className="border px-2 py-1">
                                              {investor}
                                            </td>
                                          </tr>

                                          {isSelected && (
                                            <tr className="bg-gray-50">
                                              <td colSpan={7} className="p-3">
                                                <div className="flex gap-4">
                                                  <PriceAdjustmentsPanel
                                                    ruleResultsProduct={
                                                      selectedProduct.ruleResults ?? []
                                                    }
                                                    ruleResultsRow={row.ruleResults ?? []}
                                                  />
                                                  <PriceMathBreakdown breakdown={priceBreakdown} />
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>


                        {/* ========================================================== */}
                        {/* FEE SUMMARY (APPLIED ONLY)                                */}
                        {/* ========================================================== */}
                        <div className="mt-6">

                          {/* COLLAPSABLE HEADER */}
                          <div
                            onClick={() => setShowFees((v) => !v)}
                            role="button"
                            tabIndex={0}
                            className="flex items-center justify-between w-full mb-2 cursor-pointer select-none"
                          >
                            <h3 className="text-lg font-semibold text-gray-900">
                              Fees
                            </h3>

                            <CollapseIcon open={showFees} />
                          </div>

                          {/* COLLAPSABLE CONTENT */}
                          {showFees && (
                            <div className="mt-6 p-5 rounded-lg bg-gray-50 shadow-md text-sm">
                              {(() => {
                                const appliedFees = (feeResults ?? []).filter(
                                  (f: any) => f?.booleanEquationValue === true
                                );

                                const totalAppliedFees = appliedFees.reduce((sum: number, f: any) => {
                                  const val = toNumberSafe(
                                    f?.resultEquationValue ??
                                      f?.resultEquationValueUnclamped ??
                                      0
                                  );
                                  return sum + val;
                                }, 0);

                                return (
                                  <>
                                    {/* Summary Table */}
                                    <table className="w-full text-sm">
                                      <tbody className="divide-y divide-gray-200">

                                        {/* Total Fees */}
                                        <tr className="bg-gray-50">
                                          <td className="py-2 font-semibold text-gray-900 w-1/3">
                                            Total Applied Fees
                                          </td>
                                          <td className="py-2 font-semibold text-gray-900">
                                            {totalAppliedFees.toFixed(2)}
                                          </td>
                                          <td className="py-2 text-xs text-gray-500 text-right align-top">
                                            <code className="bg-gray-100 px-1 rounded">
                                              $.data.results[x].feeResults[*].resultEquationValue
                                            </code>
                                          </td>
                                        </tr>

                                        {/* No Fees */}
                                        {appliedFees.length === 0 && (
                                          <tr>
                                            <td
                                              colSpan={3}
                                              className="py-2 text-xs text-gray-500 italic"
                                            >
                                              No applied fees for this scenario.
                                            </td>
                                          </tr>
                                        )}

                                        {/* Individual Fees */}
                                        {appliedFees.map((f: any, i: number) => {
                                          const amount = toNumberSafe(
                                            f?.resultEquationValue ??
                                              f?.resultEquationValueUnclamped ??
                                              0
                                          );

                                          return (
                                            <tr key={i}>
                                              <td className="py-2 font-medium text-gray-700">
                                                {f?.ruleName || "(unnamed fee)"}
                                                <div className="text-xs text-gray-500">
                                                  Paid By: {f?.paidBy || "—"} · Paid To:{" "}
                                                  {f?.paidTo || "—"}
                                                </div>
                                              </td>

                                              <td className="py-2 text-gray-900">
                                                {amount.toFixed(2)}
                                              </td>

                                              <td className="py-2 text-xs text-gray-500 text-right align-top">
                                                <code className="bg-gray-100 px-1 rounded">
                                                  $.data.results[x].feeResults[{i}]
                                                </code>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>

                                    <div className="mt-2 text-xs text-gray-500">
                                      Fees are shown only when{" "}
                                      <code>booleanEquationValue = true</code>.
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* ========================================================== */}
                        {/* RULE BUCKETS — TOP SECTION (COLLAPSABLE)                   */}
                        {/* ========================================================== */}
                        <div className="mt-6">

                          {/* HEADER — collapsable, NOT a button */}
                          <div
                            onClick={() => setShowRuleBuckets(v => !v)}
                            role="button"
                            tabIndex={0}
                            className="flex items-center justify-between w-full mb-2 cursor-pointer select-none"
                          >
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              Rule Buckets Used for Pricing
                            </h3>

                            <CollapseIcon open={showRuleBuckets} />
                          </div>

                          {/* COLLAPSABLE CONTENT */}
                          {showRuleBuckets && (
                            <div>

                              <div className="text-sm text-gray-600 mb-4 leading-relaxed">
                                These are <strong>product-level ruleResults</strong> from 
                                <code className="bg-gray-100 px-1 mx-1 rounded text-xs">
                                  $.data.results[x].ruleResults[]
                                </code>
                                grouped by <em>Category</em> and <em>Subcategory</em>.
                                These rules fire before rate-level pricing and determine
                                <strong> base price, adjustments, eligibility, and LLPA/SRP logic</strong>.
                                This section does <strong>not</strong> include rate-specific ruleResults from
                                <code className="bg-gray-100 px-1 mx-1 rounded text-xs">
                                  $.data.results[x].prices[y].ruleResults[]
                                </code>.
                              </div>

                              {usedRules.length === 0 ? (
                                <div className="mt-3 text-sm text-gray-600 italic">
                                  No rule buckets fired for this product.
                                </div>
                              ) : (
                                (() => {
                                  // GROUP RULES
                                  const grouped = usedRules.reduce<Record<string, RuleResult[]>>((acc, r) => {
                                    const cat = r.category || "Unknown";
                                    let sub = (r as any)?.subCategory || "";
                                    if (sub === "None") sub = "";

                                    const key = sub ? `${cat} :: ${sub}` : cat;

                                    if (!acc[key]) acc[key] = [];
                                    acc[key].push(r);
                                    return acc;
                                  }, {});

                                  const entries = Object.entries(grouped).sort(([a], [b]) =>
                                    a.localeCompare(b)
                                  );

                                  return (
                                    <div className="mt-3 space-y-3">
                                      {entries.map(([key, list]) => {
                                        const [cat, maybeSub] = key.split(" :: ");

                                        return (
                                          <details
                                            key={key}
                                            className="border border-gray-200 rounded-lg bg-white shadow-sm"
                                          >
                                            <summary className="px-3 py-2 cursor-pointer flex items-center justify-between text-sm font-semibold text-gray-800">
                                              <span>
                                                {cat}
                                                {maybeSub ? ` · ${maybeSub}` : ""}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                {list.length} rule{list.length === 1 ? "" : "s"}
                                              </span>
                                            </summary>

                                            <div className="px-3 py-3 border-t border-gray-200 space-y-2 text-sm">
                                              {list.map((r, idx) => (
                                                <div
                                                  key={idx}
                                                  className="p-2 rounded border border-gray-200 bg-gray-50"
                                                >
                                                  <div className="font-medium text-gray-900">
                                                    {r.ruleName || "(unnamed rule)"}
                                                  </div>

                                                  <div className="text-xs text-gray-600 mt-0.5">
                                                    Category: {r.category || "Unknown"}
                                                  </div>

                                                  {(r as any).subCategory &&
                                                    (r as any).subCategory !== "None" && (
                                                      <div className="text-xs text-gray-600">
                                                        Subcategory: {(r as any).subCategory}
                                                      </div>
                                                    )}

                                                  <div className="text-xs text-gray-600 mt-0.5">
                                                    booleanEquationValue: {String(r.booleanEquationValue)}
                                                  </div>

                                                  <div className="text-xs text-gray-500 mt-1">
                                                    <span className="font-medium">Path:</span>{" "}
                                                    <code className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[11px]">
                                                      $.data.results[x].ruleResults[]
                                                    </code>
                                                  </div>

                                                  <details className="text-xs mt-2">
                                                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                                      Show raw rule JSON
                                                    </summary>
                                                    <pre className="mt-2 p-2 bg-white border rounded text-[11px] overflow-x-auto">
                                                      {JSON.stringify(r, null, 2)}
                                                    </pre>
                                                  </details>
                                                </div>
                                              ))}
                                            </div>
                                          </details>
                                        );
                                      })}
                                    </div>
                                  );
                                })()
                              )}

                            </div>
                          )}
                        </div>

                        <hr className="my-1 border-gray-300" />
                      </>
                    );
                  })()}
                </section>
              )}

              {/* ================================================================== */}
              {/* INELIGIBLE VIEW                                                   */}
              {/* ================================================================== */}
              {selectedIsIneligible && (
                <section className="space-y-6">
                  {(() => {
                    const ruleResults = (selectedProduct.ruleResults ??
                      []) as RuleResult[];

                    const prices = Array.isArray(
                      (selectedProduct as any)?.prices
                    )
                      ? ((selectedProduct as any).prices as any[])
                      : [];

                    const pricesCount = prices.length;
                    const uniqueInvestorCount =
                      (selectedProduct as any)?.uniqueInvestorCount ?? 0;
                    const allInvestorsExcluded = Boolean(
                      (selectedProduct as any)?.allInvestorsExcluded
                    );

                    // ------------------------------------------------------------
                    // MATRIX GROUPING (REAL MATRIX STRUCTURE)
                    // Group by prefix before " - Rule"
                    // e.g. "MH Advantage Conf: Eligibility Matrix - Rule 00"
                    //  => matrixKey = "MH Advantage Conf: Eligibility Matrix"
                    // ------------------------------------------------------------
                    const matrixRows = ruleResults
                      .map((r, i) => ({ ...r, index: i }))
                      .filter((r) => r.category === "EligibilityMatrix");

                    const matrixGroups = matrixRows.reduce(
                      (acc, row) => {
                        const sourceName =
                          row.ruleInheritedName ?? row.ruleName ?? "";

                        const parts = sourceName.split("- Rule");
                        const matrixKey =
                          (parts[0]?.trim() || "Eligibility Matrix").trim();

                        if (!acc[matrixKey]) acc[matrixKey] = [];
                        acc[matrixKey].push(row);
                        return acc;
                      },
                      {} as Record<string, RuleResult[]>
                    );

                    type MatrixGroupMeta = {
                      matrixName: string;
                      rows: RuleResult[];
                      rowCount: number;
                      passedCount: number;
                      failedCount: number;
                      allRowsFailed: boolean;
                      someRowsPassed: boolean;
                    };

                    const matrixMeta: MatrixGroupMeta[] = Object.entries(
                      matrixGroups
                    ).map(([matrixName, rows]) => {
                      const passedCount = rows.filter(
                        (r) => r.booleanEquationValue === true
                      ).length;
                      const failedCount = rows.filter(
                        (r) => r.booleanEquationValue === false
                      ).length;

                      return {
                        matrixName,
                        rows,
                        rowCount: rows.length,
                        passedCount,
                        failedCount,
                        allRowsFailed: passedCount === 0 && failedCount > 0,
                        someRowsPassed: passedCount > 0,
                      };
                    });

                    const totalMatrixGroups = matrixMeta.length;
                    const fullyFailedMatrices = matrixMeta.filter(
                      (g) => g.allRowsFailed
                    ).length;
                    const partiallyPassingMatrices = matrixMeta.filter(
                      (g) => g.someRowsPassed
                    ).length;

                    const anyEligibilityMatrix = matrixRows.length > 0;
                    const anyMatrixFullyFailed = matrixMeta.some(
                      (g) => g.allRowsFailed
                    );

                    // If at least one matrix group fully failed, /ineligible-matrices will help
                    const matrixApiSupported =
                      anyEligibilityMatrix && anyMatrixFullyFailed;

                    // ------------------------------------------------------------
                    // NON-MATRIX RULES (use helper, filter out matrix)
                    // ------------------------------------------------------------
                    const allDisqualifying =
                      buildDisqualifyingRuleExplanations(ruleResults);

                    const nonMatrixRules = allDisqualifying.filter(
                      (r) => r.categoryLabel !== "EligibilityMatrix"
                    );

                    return (
                      <>
                        {/* ======================================================== */}
                        {/* DEVELOPER SUMMARY (ALWAYS FIRST)                        */}
                        {/* ======================================================== */}
                        <div className="border border-yellow-200 bg-yellow-50 rounded-lg px-4 py-3 text-xs space-y-2">
                          <div className="font-semibold text-yellow-900">
                            Developer Summary: How this product became ineligible
                          </div>

                          <div className="text-[11px] text-yellow-900 space-y-1 leading-relaxed">
                            <ul className="list-disc ml-4 space-y-0.5">
                              <li><strong>Prices returned:</strong> {pricesCount}</li>
                              <li><strong>Unique investors:</strong> {uniqueInvestorCount}</li>
                              <li><strong>All investors excluded:</strong> {String(allInvestorsExcluded)}</li>
                              <li><strong>Matrix groups:</strong> {totalMatrixGroups}</li>
                              <li><strong>Fully failed matrices:</strong> {fullyFailedMatrices}</li>
                              <li><strong>Partially passing matrices:</strong> {partiallyPassingMatrices}</li>
                              <li>
                                <strong>/ineligible-matrices:</strong>{" "}
                                {matrixApiSupported ? (
                                  <span className="text-green-700 font-semibold">
                                    Supported — at least one matrix group fully failed
                                  </span>
                                ) : (
                                  <span className="text-red-700 font-semibold">
                                    Not useful — at least one matrix group had a passing row
                                  </span>
                                )}
                              </li>
                            </ul>

                            {/* Explanation */}
                            <p className="mt-1">
                              <strong>PPE determines eligibility using two layers of evaluation:</strong><br />
                              1) <strong>Static eligibility rules</strong> must all pass.<br />
                              2) <strong>At least one Eligibility Matrix</strong> must contain 
                              <strong> at least one row where all conditions pass</strong>.
                            </p>

                            <p>
                              A product is marked <strong>ineligible</strong> when 
                              <strong> no eligibility path remains</strong>. This happens when:
                            </p>

                            <ul className="list-disc ml-4 space-y-0.5">
                              <li><strong>Any static eligibility rule fails</strong>, OR</li>
                              <li>
                                <strong>Every row in every Eligibility Matrix fails</strong> —
                                meaning no matrix produced a passing row.
                              </li>
                            </ul>

                            <p className="mt-1">
                              When a matrix group <strong>fully fails</strong> (all its rows evaluate false),
                              PPE can provide <code>/ineligible-matrices</code> details containing the 
                              <em>exact reasons</em> why each row failed its conditions.
                              If even one row passes in any matrix group, the endpoint returns nothing.
                            </p>

                            <p>
                              Without <code>/ineligible-matrices</code>, we only know which rules evaluated 
                              <code>true/false</code>. We <strong>cannot</strong> see the internal expressions 
                              (LTV, DTI, Occupancy, PropertyType, etc.) that caused each row to fail.
                            </p>
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* NON-MATRIX RULES                                         */}
                        {/* ======================================================== */}
                        <details className="border border-gray-200 rounded-lg bg-white shadow-sm">
                          <summary className="px-3 py-2 cursor-pointer flex items-center justify-between text-sm font-semibold text-gray-800">
                            <span>Disqualifying Eligibility Rules (Non-Matrix)</span>
                            <span className="text-xs text-gray-500">
                              {nonMatrixRules.length} rule
                              {nonMatrixRules.length === 1 ? "" : "s"}
                            </span>
                          </summary>

                          <div className="px-3 py-3 border-t border-gray-200">
                            {nonMatrixRules.length === 0 ? (
                              <div className="text-sm text-gray-600 italic">
                                No explicit non-matrix eligibility rules disqualified
                                this product.
                              </div>
                            ) : (
                              (() => {
                                const grouped: Record<
                                  string,
                                  RuleExplanation[]
                                > = {};

                                for (const rule of nonMatrixRules) {
                                  const key = rule.categoryLabel;
                                  if (!grouped[key]) grouped[key] = [];
                                  grouped[key].push(rule);
                                }

                                const categoryKeys = Object.keys(grouped).sort();

                                return (
                                  <div className="space-y-5">
                                    {categoryKeys.map((category) => (
                                      <div
                                        key={category}
                                        className="space-y-3"
                                      >
                                        <div className="text-sm font-semibold text-gray-800 border-l-4 border-gray-300 pl-3">
                                          {category}
                                        </div>

                                        <div className="space-y-3">
                                          {grouped[category].map(
                                            (rule, index) => (
                                              <div
                                                key={`${category}-${index}`}
                                                className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm"
                                              >
                                                <div className="font-medium text-gray-900 mb-1">
                                                  {rule.ruleName}
                                                </div>

                                                <div className="text-sm text-gray-700 mb-2 leading-snug">
                                                  {rule.explanation}
                                                </div>

                                                <div className="text-xs text-gray-500 space-y-1 mb-2">
                                                  <div>
                                                    <span className="font-medium">
                                                      Category:
                                                    </span>{" "}
                                                    {rule.categoryLabel}
                                                  </div>
                                                  <div>
                                                    <span className="font-medium">
                                                      Inherited Category:
                                                    </span>{" "}
                                                    {rule.ruleInheritedName ||
                                                      "(none)"}
                                                  </div>
                                                  <div>
                                                    <span className="font-medium">
                                                      Source Path:
                                                    </span>{" "}
                                                      <code className="px-1 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs">
                                                        {rule.jsonPath}
                                                      </code>
                                                  </div>
                                                </div>

                                                <details className="text-xs mt-1">
                                                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                                    Show rule explanation JSON
                                                  </summary>
                                                  <pre className="mt-2 p-2 bg-gray-100 border rounded text-[11px] overflow-x-auto">
                                                    {JSON.stringify(
                                                      rule,
                                                      null,
                                                      2
                                                    )}
                                                  </pre>
                                                </details>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        </details>

                        {/* ======================================================== */}
                        {/* MATRIX GROUPS (OPTION C – ONE ACCORDION PER MATRIX)     */}
                        {/* ======================================================== */}
                        <details className="border border-blue-200 bg-blue-50 rounded-lg shadow-sm">
                          <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-blue-900">
                            Eligibility Matrices
                          </summary>

                          <div className="px-4 py-3 text-xs space-y-4 text-blue-900">
                            {totalMatrixGroups === 0 ? (
                              <div className="text-[12px] italic">
                                No EligibilityMatrix groups found for this product.
                              </div>
                            ) : (
                              matrixMeta.map((group, groupIndex) => (
                                <details
                                  key={groupIndex}
                                  className="border border-blue-200 bg-white rounded-lg shadow-sm"
                                >
                                  <summary className="px-3 py-2 cursor-pointer text-sm font-semibold text-blue-800 flex items-center justify-between">
                                    <span>{group.matrixName}</span>
                                    <span className="text-xs text-blue-600">
                                      {group.rowCount} row
                                      {group.rowCount === 1 ? "" : "s"}
                                    </span>
                                  </summary>

                                  <div className="px-3 py-3 border-t border-blue-200 space-y-4">
                                    <div className="text-[11px] pb-1">
                                      <span className="font-semibold">
                                        Matrix Status:
                                      </span>{" "}
                                      {group.allRowsFailed ? (
                                        <span className="text-red-700 font-semibold">
                                          ALL ROWS FAILED — this matrix
                                          disqualified the product
                                        </span>
                                      ) : group.passedCount > 0 ? (
                                        <span className="text-green-700 font-semibold">
                                          {group.passedCount} row
                                          {group.passedCount === 1 ? "" : "s"}{" "}
                                          passed
                                        </span>
                                      ) : (
                                        <span className="text-gray-700">
                                          No passing rows
                                        </span>
                                      )}
                                    </div>

                                    {group.rows.map((row, i) => (
                                      <div
                                        key={i}
                                        className="border border-gray-200 rounded-lg p-3 bg-gray-50 shadow-sm"
                                      >
                                        <div className="flex justify-between items-center mb-1">
                                          <div className="font-medium text-gray-900">
                                            {row.ruleName}
                                          </div>

                                          <div
                                            className={`text-xs font-semibold ${
                                              row.booleanEquationValue
                                                ? "text-green-700"
                                                : "text-red-700"
                                            }`}
                                          >
                                            {row.booleanEquationValue
                                              ? "PASS"
                                              : "FAIL"}
                                          </div>
                                        </div>

                                        <div className="text-xs text-gray-600 mb-1">
                                          Inherited Category:{" "}
                                          {row.ruleInheritedName ?? "(none)"}
                                        </div>

                                        <details className="text-xs">
                                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                            Show row JSON
                                          </summary>
                                          <pre className="mt-2 p-2 bg-white border rounded text-[11px] overflow-x-auto">
                                            {JSON.stringify(row, null, 2)}
                                          </pre>
                                        </details>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ))
                            )}
                          </div>
                        </details>
                      </>
                    );
                  })()}
                </section>
              )}

              {/* ================================================================== */}
              {/* INVALID VIEW                                                      */}
              {/* ================================================================== */}
              {selectedIsInvalid && (
                <section className="space-y-4">
                  <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 shadow-sm">
                    {/* Header */}
                    <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      Invalid Product
                    </h3>

                    {/* Structured table (same content, no white inner card) */}
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-red-100">
                        {/* Reason */}
                        <tr>
                          <td className="py-2 font-medium text-red-900 w-1/3 align-top">
                            Reason
                            <div className="text-xs text-red-800 mt-1">
                              JSON:{" "}
                              <code className="bg-red-100 px-1 rounded text-[11px]">
                                data.results[].invalidResultReason
                              </code>
                            </div>
                          </td>
                          <td className="py-2 text-red-900">
                            {selectedProduct.invalidResultReason ?? "(none)"}
                          </td>
                        </tr>

                        {/* Unique Investors */}
                        <tr>
                          <td className="py-2 font-medium text-red-900 align-top">
                            Unique Investors
                            <div className="text-xs text-red-800 mt-1">
                              JSON:{" "}
                              <code className="bg-red-100 px-1 rounded text-[11px]">
                                data.results[].uniqueInvestorCount
                              </code>
                            </div>
                          </td>
                          <td className="py-2 text-red-900">
                            <code className="bg-red-100 px-1 rounded text-xs">
                              {selectedProduct.uniqueInvestorCount ?? 0}
                            </code>
                          </td>
                        </tr>

                        {/* Prices Count */}
                        <tr>
                          <td className="py-2 font-medium text-red-900 align-top">
                            Prices Returned
                            <div className="text-xs text-red-800 mt-1">
                              JSON:{" "}
                              <code className="bg-red-100 px-1 rounded text-[11px]">
                                data.results[].prices
                              </code>
                            </div>
                          </td>
                          <td className="py-2 text-red-900">
                            <code className="bg-red-100 px-1 rounded text-xs">
                              {pricesCount}
                            </code>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* DEV CONSOLE DRAWER                                            */}
        {/* ============================================================= */}
        {(() => {
          return (
            <>
              {selectedProduct && (
          <>
        <button
          onClick={() => setConsoleOpen((v) => !v)}
          className="
            fixed bottom-4 right-4 z-50
            bg-gray-800 hover:bg-gray-700
            text-yellow-400 border border-yellow-500
            p-3 rounded-full shadow-lg
            flex items-center justify-center
          "
          aria-label="Toggle Developer Console"
        >
          {consoleOpen ? (
            // Icon when console is open (chevron down)
            <svg xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6" fill="none"
                viewBox="0 0 24 24" stroke="currentColor"
                strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            // Icon when console is closed (terminal icon)
            <svg xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6" fill="none"
                viewBox="0 0 24 24" stroke="currentColor"
                strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 9l3 3-3 3m5 0h3M4 7h16v10H4z" />
            </svg>
          )}
        </button>


            <div
              className={`
                fixed left-0 right-0 bottom-0 z-40
                bg-[#1a1a1a] border-t border-yellow-500
                transition-transform duration-300
                h-[60vh] overflow-y-auto
                ${consoleOpen ? "translate-y-0" : "translate-y-full"}
              `}
            >
              <DevConsole
                raw={selectedProduct}
                product={selectedProduct}
                priceRow={selectedPriceRow}
                ruleResults={selectedProduct.ruleResults ?? []}
                isEligible={selectedIsEligible}
              />
            </div>
          </>
        )}

            </>
          );
        })()}

      </main>

    </div>
  );
}
