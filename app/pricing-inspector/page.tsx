"use client";

import React, { useMemo, useState } from "react";
import {
  buildDisqualifyingRuleExplanations,
  RuleResult,
  RuleExplanation,
} from "../utils/ruleExplanation";
import DevConsole from "./DevConsole";
import PriceAdjustmentsPanel from "./PriceAdjustmentsPanel";



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

function pickRuleValues(
  rules: RuleResult[] | null | undefined,
  opts: { hidden: boolean }
): number[] {
  if (!Array.isArray(rules)) return [];
  return rules
    .filter((r) => {
      const isPriceTarget = r.target === "Price";
      const fired = r.booleanEquationValue === true;
      const categoryOk =
        typeof r.category === "string" &&
        PRICE_RULE_CATEGORIES.includes(r.category as (typeof PRICE_RULE_CATEGORIES)[number]);
      const hiddenFlag = r.isHiddenAdjustment === opts.hidden;
      return isPriceTarget && fired && categoryOk && hiddenFlag;
    })
    .map((r) => toNumberSafe(r.resultEquationValue));
}

function pickClampRemovals(
  clamps: PriceClamp[] | null | undefined
): number[] {
  if (!Array.isArray(clamps)) return [];
  return clamps
    .filter((c) => {
      const isPriceTarget = c.target === "Price";
      const categoryOk =
        typeof c.category === "string" &&
        PRICE_RULE_CATEGORIES.includes(c.category as (typeof PRICE_RULE_CATEGORIES)[number]);
      return isPriceTarget && categoryOk;
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

function buildPriceBreakdown(
  product: PpeResult,
  priceRow: PriceRow,
  brokerCompField: number
): PriceBreakdown {
  const pbaRaw = (priceRow as { priceBeforeAdjustments?: unknown })
    .priceBeforeAdjustments;
  const pba =
    Object.prototype.hasOwnProperty.call(priceRow, "priceBeforeAdjustments") &&
    pbaRaw !== undefined
      ? toNumberSafe(pbaRaw)
      : null;

  const paba = toNumberSafe(
    (priceRow as { priceAfterBaseAdjustments?: unknown })
      .priceAfterBaseAdjustments
  );

  const rlHidden = sum(pickRuleValues(product.ruleResults, { hidden: true }));
  const rlVisible = sum(pickRuleValues(product.ruleResults, { hidden: false }));
  const plHidden = sum(pickRuleValues(priceRow.ruleResults, { hidden: true }));
  const plVisible = sum(pickRuleValues(priceRow.ruleResults, { hidden: false }));

  const basePrice = paba + plHidden;

  const visibleResultAdj = rlVisible;
  const visibleRowAdj = plVisible;
  const totalVisiblePriceAdj = visibleResultAdj + visibleRowAdj;

  const clampAdj = sum(pickClampRemovals(priceRow.clampResults));

  const reconstructedPrice = basePrice + totalVisiblePriceAdj - clampAdj;

  const enginePrice = toNumberSafe(priceRow.price);
  const netPrice = toNumberSafe(
    (priceRow as { netPrice?: unknown }).netPrice ?? priceRow.price
  );

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
  const [selectedIneligibleCode, setSelectedIneligibleCode] =
    useState<string>("");
  const [selectedInvalidCode, setSelectedInvalidCode] = useState<string>("");
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<number>(-1);

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

      if (!isPpeResponse(parsed)) {
        setError("Missing $.data.results[]");
        setRawResults([]);
        setFileName(file.name);
        setLoanAmount(null);
        setDesiredLockPeriod(null);
        setBrokerCompBps(0);
        return;
      }

      const results = parsed.data?.results ?? [];
      setRawResults(results);
      setError(null);
      setFileName(file.name);

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
    } catch {
      setError("Invalid JSON");
      setRawResults([]);
      setFileName(fileName ?? file.name);
      setLoanAmount(null);
      setDesiredLockPeriod(null);
      setBrokerCompBps(0);
    }
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

  const selectedPriceRow: PriceRow | undefined =
    prices[selectedPriceIndex] ?? prices[0];

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
            Upload JSON
          </label>
        </div>
      </header>

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
                <div className="px-3 py-2 rounded bg-green-50 border border-green-200">
                  <span className="font-semibold">{eligible.length}</span>{" "}
                  eligible products
                </div>
                <div className="px-3 py-2 rounded bg-yellow-50 border border-yellow-200">
                  <span className="font-semibold">{ineligible.length}</span>{" "}
                  ineligible products
                </div>
                <div className="px-3 py-2 rounded bg-red-50 border border-red-200">
                  <span className="font-semibold">{invalid.length}</span>{" "}
                  invalid products
                </div>
              </div>

              {/* Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                {/* Eligible */}
                <div>
                  <div className="font-semibold mb-1">Eligible Results</div>
                  <div className="text-xs text-gray-600 mb-2 h-[42px] flex flex-col justify-between">
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isEligible == true
                    </code>
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isValidResult == true
                    </code>
                  </div>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                    value={selectedEligibleCode}
                    onChange={(e) => {
                      setSelectedEligibleCode(e.target.value);
                      setSelectedIneligibleCode("");
                      setSelectedInvalidCode("");
                      setSelectedPriceIndex(-1);
                    }}
                  >
                    <option value="">Select eligible product</option>
                    {eligible.map((p) => (
                      <option key={p.code ?? ""} value={p.code ?? ""}>
                        {p.code ?? "(no code)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ineligible */}
                <div>
                  <div className="font-semibold mb-1">Ineligible Results</div>
                  <div className="text-xs text-gray-600 mb-2 h-[42px] flex flex-col justify-between">
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isEligible == false
                    </code>
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isValidResult == true
                    </code>
                  </div>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                    value={selectedIneligibleCode}
                    onChange={(e) => {
                      setSelectedIneligibleCode(e.target.value);
                      setSelectedEligibleCode("");
                      setSelectedInvalidCode("");
                      setSelectedPriceIndex(-1);
                    }}
                  >
                    <option value="">Select ineligible product</option>
                    {ineligible.map((p) => (
                      <option key={p.code ?? ""} value={p.code ?? ""}>
                        {p.code ?? "(no code)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Invalid */}
                <div>
                  <div className="font-semibold mb-1">Invalid Results</div>
                  <div className="text-xs text-gray-600 mb-2 h-[42px] flex flex-col justify-between">
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      $.data.results[x].isValidResult == false
                    </code>
                    <span />
                  </div>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                    value={selectedInvalidCode}
                    onChange={(e) => {
                      setSelectedInvalidCode(e.target.value);
                      setSelectedEligibleCode("");
                      setSelectedIneligibleCode("");
                      setSelectedPriceIndex(-1);
                    }}
                  >
                    <option value="">Select invalid product</option>
                    {invalid.map((p) => (
                      <option key={p.code ?? ""} value={p.code ?? ""}>
                        {p.code ?? "(no code)"}
                      </option>
                    ))}
                  </select>
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
              ? "Eligible Results"
              : selectedIsIneligible
              ? "Ineligible Results"
              : selectedIsInvalid
              ? "Invalid Results"
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

                    // Price stack stats
                    const allRates = prices
                      .map((p) => toNumberSafe(p.rate))
                      .filter((r) => !Number.isNaN(r));
                    const allPrices = prices
                      .map((p) =>
                        toNumberSafe((p as { netPrice?: unknown }).netPrice ?? p.price)
                      )
                      .filter((px) => !Number.isNaN(px));

                    const minRate = allRates.length ? Math.min(...allRates) : null;
                    const maxRate = allRates.length ? Math.max(...allRates) : null;
                    const bestPrice = allPrices.length ? Math.max(...allPrices) : null;
                    const worstPrice = allPrices.length ? Math.min(...allPrices) : null;

                    let parRate: number | null = null;
                    let parDelta = Infinity;
                    for (const row of prices) {
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

                    // Price breakdown for selected row
                    let priceBreakdown: PriceBreakdown | null = null;
                    if (selectedPriceRow) {
                      priceBreakdown = buildPriceBreakdown(
                        selectedProduct,
                        selectedPriceRow,
                        brokerCompBps
                      );
                    }

                    return (
                      <>
                        {/* ========================================================== */}
                        {/*  SUMMARY (PRODUCT-LEVEL – NOT COLLAPSIBLE)                 */}
                        {/* ========================================================== */}
                        <div>
    
                          {/* PRODUCT IDENTIFIERS — SIMPLE, CLEAN, 2 BOXES */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">Product Code</div>
                              <div className="text-gray-900">
                                {selectedProduct.code ?? "(missing)"}
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">Product Name</div>
                              <div className="text-gray-900">
                                {selectedProduct.name ?? "(missing)"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                totalBasePriceAdjustments
                              </div>
                              <div className="text-gray-900">
                                {totalBasePriceAdjustments.toFixed(4)}
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                totalSRPAdjustments
                              </div>
                              <div className="text-gray-900">
                                {totalSRPAdjustments.toFixed(4)}
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                totalRateAdjustments
                              </div>
                              <div className="text-gray-900">
                                {totalRateAdjustments.toFixed(4)}
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                totalAdjustments
                              </div>
                              <div className="text-gray-900">
                                {totalAdjustments.toFixed(4)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ========================================================== */}
                        {/* RATE / PRICE STACK SUMMARY & TABLE (NO TOP ACCORDION)      */}
                        {/* ========================================================== */}

                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Rate / Price Stack Summary &amp; Table
                          </h3>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">Total Price Rows</div>
                              <div>{prices.length}</div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">Min / Max Rate</div>
                              <div>
                                {minRate} → {maxRate}
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                Best / Worst Net Price
                              </div>
                              <div>
                                {bestPrice} → {worstPrice}
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm md:col-span-3">
                              <div className="font-medium text-gray-700">Par-ish Rate</div>
                              <div>{parRate ?? "(none)"}</div>
                            </div>
                          </div>

                          {/* =============================== */}
                          {/* PRICE TABLE                     */}
                          {/* =============================== */}
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
                                                  )} (+$${Math.abs(creditDollars).toFixed(
                                                    0
                                                  )})`
                                                : "0.000 ($0)"
                                              : "n/a"}
                                          </td>
                                          <td className="border px-2 py-1">{lock ?? "—"}</td>
                                          <td className="border px-2 py-1">{investor}</td>
                                        </tr>

                                        {isSelected && (
                                          <tr className="bg-gray-50">
                                            <td colSpan={7} className="p-3">
                                              <PriceAdjustmentsPanel
                                                ruleResultsProduct={
                                                  selectedProduct.ruleResults ?? []
                                                }
                                                ruleResultsRow={row.ruleResults ?? []}
                                              />
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>


                        {/* ========================================================== */}
                        {/* FEE SUMMARY (APPLIED ONLY)                                */}
                        {/* ========================================================== */}

                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Applied Fees
                          </h3>

                          {(() => {
                            // Applied fees = booleanEquationValue === true
                            const appliedFees = (feeResults ?? []).filter((f: any) => {
                              return f?.booleanEquationValue === true;
                            });

                            // Sum using resultEquationValue (most reliable)
                            const totalAppliedFees = appliedFees.reduce(
                              (sum: number, f: any) => {
                                const val = toNumberSafe(
                                  f?.resultEquationValue ??
                                  f?.resultEquationValueUnclamped ??
                                  0
                                );
                                return sum + val;
                              },
                              0
                            );

                            return (
                              <div className="mt-3 text-sm">
                                <div className="font-medium text-gray-700 mb-1">
                                  Total Applied Fees
                                </div>

                                <div className="p-3 border rounded bg-white shadow-sm">
                                  {totalAppliedFees.toFixed(2)}
                                </div>

                                {appliedFees.length === 0 && (
                                  <div className="mt-2 text-xs text-gray-500 italic">
                                    No applied fees for this scenario.
                                  </div>
                                )}

                                {appliedFees.map((f: any, i: number) => {
                                  const amount = toNumberSafe(
                                    f?.resultEquationValue ??
                                    f?.resultEquationValueUnclamped ??
                                    0
                                  );

                                  return (
                                    <div
                                      key={i}
                                      className="p-3 mt-2 border rounded bg-white shadow-sm"
                                    >
                                      <div className="font-medium text-gray-900">
                                        {f?.ruleName || "(unnamed fee)"}
                                      </div>

                                      <div className="text-xs text-gray-600">
                                        Amount: {amount.toFixed(2)}
                                      </div>

                                      <div className="text-xs text-gray-500">
                                        Paid By: {f?.paidBy || "—"}
                                      </div>

                                      <div className="text-xs text-gray-500">
                                        Paid To: {f?.paidTo || "—"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        {/* ========================================================== */}
                        {/* RULE BUCKETS — TOP SECTION (NO OUTER ACCORDION)            */}
                        {/* ========================================================== */}

                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Rule Buckets Used for Pricing
                          </h3>

                          {usedRules.length === 0 ? (
                            <div className="mt-3 text-sm text-gray-600 italic">
                              No rule buckets fired for this product.
                            </div>
                          ) : (
                            (() => {
                              // Group rules by Category :: Subcategory (same as before)
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
                  {/* GROUPED RULES */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900">
                      Disqualifying Eligibility Rules (Grouped)
                    </h3>

                    {(() => {
                      const rules = buildDisqualifyingRuleExplanations(
                        selectedProduct.ruleResults ?? null
                      );

                      if (rules.length === 0) {
                        return (
                          <div className="text-sm text-gray-600 italic">
                            No explicit eligibility rules disqualified this
                            product. It may be ineligible because no priceable
                            matrix or investor rows exist for this scenario.
                          </div>
                        );
                      }

                      const grouped: Record<string, RuleExplanation[]> = {};
                      for (const rule of rules) {
                        const key = rule.categoryLabel;
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(rule);
                      }

                      const categoryKeys = Object.keys(grouped).sort();

                      return (
                        <div className="space-y-5">
                          {categoryKeys.map((category) => (
                            <div key={category} className="space-y-3">
                              <div className="text-sm font-semibold text-gray-800 border-l-4 border-gray-300 pl-3">
                                {category}
                              </div>

                              <div className="space-y-3">
                                {grouped[category].map((rule, index) => (
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
                                        {rule.ruleInheritedName || "(none)"}
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
                                        {JSON.stringify(rule, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </section>
              )}

              {/* ================================================================== */}
              {/* INVALID VIEW                                                      */}
              {/* ================================================================== */}
              {selectedIsInvalid && (
                <section className="space-y-4">
                  <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 text-sm text-gray-800">
                    <div>
                      <span className="font-medium">invalidResultReason:</span>{" "}
                      {selectedProduct.invalidResultReason ?? "(none)"}
                    </div>
                    <div>
                      <span className="font-medium">uniqueInvestorCount:</span>{" "}
                      <code className="bg-gray-100 px-1 rounded text-xs">
                        {selectedProduct.uniqueInvestorCount ?? 0}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Prices count:</span>{" "}
                      <code className="bg-gray-100 px-1 rounded text-xs">
                        {pricesCount}
                      </code>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </section>

        {selectedProduct && selectedPriceRow && (
          <DevConsole
            raw={selectedProduct}
            product={selectedProduct}
            priceRow={selectedPriceRow}
            breakdown={buildPriceBreakdown(
              selectedProduct,
              selectedPriceRow,
              brokerCompBps || 0
            )}
            ruleResults={selectedProduct.ruleResults}
          />
        )}

      </main>
    </div>
  );
}
