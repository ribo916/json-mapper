"use client";

import React, { useMemo, useState } from "react";
import {
  buildDisqualifyingRuleExplanations,
  RuleResult,
  RuleExplanation,
} from "../utils/ruleExplanation";

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

interface PriceClamp {
  clampedFrom?: unknown;
  clampedTo?: unknown;
  category?: string | null;
}

interface PriceRow {
  rate?: unknown;
  price?: unknown;
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
/* COMPONENT                                                                 */
/* -------------------------------------------------------------------------- */

export default function PricingInspector(): JSX.Element {
  const [rawResults, setRawResults] = useState<PpeResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [selectedEligibleCode, setSelectedEligibleCode] = useState<string>("");
  const [selectedIneligibleCode, setSelectedIneligibleCode] =
    useState<string>("");
  const [selectedInvalidCode, setSelectedInvalidCode] = useState<string>("");

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
        return;
      }

      const results = parsed.data?.results ?? [];
      setRawResults(results);
      setError(null);
      setFileName(file.name);

      setSelectedEligibleCode("");
      setSelectedIneligibleCode("");
      setSelectedInvalidCode("");
    } catch {
      setError("Invalid JSON");
      setRawResults([]);
      setFileName(file.name);
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

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
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
              Pricing Scenario Inspector
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
              {/* COMMON SUMMARY */}
              <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-2">
                <div className="font-semibold text-gray-900">
                  Product Summary
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Code:</span>{" "}
                    <code className="bg-gray-100 px-1 rounded text-xs">
                      {selectedProduct.code ?? "(missing)"}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedProduct.name ?? "(missing)"}
                  </div>
                  <div>
                    <span className="font-medium">isValidResult:</span>{" "}
                    <code className="bg-gray-100 px-1 rounded text-xs">
                      {String(selectedProduct.isValidResult)}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">isEligible:</span>{" "}
                    <code className="bg-gray-100 px-1 rounded text-xs">
                      {String(selectedProduct.isEligible)}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Prices count:</span>{" "}
                    <code className="bg-gray-100 px-1 rounded text-xs">
                      {pricesCount}
                    </code>{" "}
                    <span className="text-gray-500">
                      (from{" "}
                      <code className="bg-gray-100 px-1 rounded text-[11px]">
                        $.data.results[x].prices[]
                      </code>
                      )
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">
                      Excluded investors count:
                    </span>{" "}
                    <code className="bg-gray-100 px-1 rounded text-xs">
                      {excludedInvestorsCount}
                    </code>{" "}
                    <span className="text-gray-500">
                      (from{" "}
                      <code className="bg-gray-100 px-1 rounded text-[11px]">
                        $.data.results[x].excludedInvestors[]
                      </code>
                      )
                    </span>
                  </div>
                </div>
              </div>

              {/* ================================================================== */}
              {/* ELIGIBLE VIEW                                                     */}
              {/* ================================================================== */}
              {selectedIsEligible && (
                <section className="space-y-8">
                  {/* SUMMARY BANNER */}
                  <div className="bg-green-50 border border-green-200 p-4 rounded text-sm text-gray-800">
                    <div className="font-semibold mb-1">
                      Eligible Product Summary
                    </div>
                    <p className="leading-snug">
                      This product is eligible because both{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        $.data.results[x].isEligible == true
                      </code>{" "}
                      and{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        $.data.results[x].isValidResult == true
                      </code>{" "}
                      are satisfied. The sections below show how the engine
                      priced this scenario and which rule buckets contributed.
                    </p>
                  </div>

                  {(() => {
                    const feeResults = (selectedProduct.feeResults ??
                      []) as FeeResultLite[];

                    // Price stack stats
                    const allRates = prices
                      .map((p) => toNumberSafe(p.rate))
                      .filter((r) => !Number.isNaN(r));
                    const allPrices = prices
                      .map((p) => toNumberSafe(p.price))
                      .filter((px) => !Number.isNaN(px));

                    const minRate = allRates.length
                      ? Math.min(...allRates)
                      : null;
                    const maxRate = allRates.length
                      ? Math.max(...allRates)
                      : null;
                    const bestPrice = allPrices.length
                      ? Math.max(...allPrices)
                      : null;
                    const worstPrice = allPrices.length
                      ? Math.min(...allPrices)
                      : null;

                    let parRate: number | null = null;
                    let parDelta = Infinity;
                    for (const row of prices) {
                      const r = toNumberSafe(row.rate);
                      const p = toNumberSafe(row.price);
                      if (!Number.isNaN(r) && !Number.isNaN(p)) {
                        const d = Math.abs(p);
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
                        s +
                        toNumberSafe(
                          f.amount !== undefined ? f.amount : f.feeAmount
                        ),
                      0
                    );

                    // Rule buckets (booleanEquationValue == false means rule passed / applied)
                    const usedRules = (selectedProduct.ruleResults ?? []).filter(
                      (r) => r.booleanEquationValue === false
                    );

                    return (
                      <>
                        {/* PRICE STACK SUMMARY */}
                        <details className="group">
                          <summary className="cursor-pointer text-lg font-semibold text-gray-900 mb-2">
                            Rate / Price Stack Summary
                          </summary>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                Total Price Rows
                              </div>
                              <div>{prices.length}</div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                Min / Max Rate
                              </div>
                              <div>
                                {minRate} &rarr; {maxRate}
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                Best / Worst Price
                              </div>
                              <div>
                                {bestPrice} &rarr; {worstPrice}
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm md:col-span-3">
                              <div className="font-medium text-gray-700">
                                Par-ish Rate (closest to 0 price)
                              </div>
                              <div>{parRate ?? "(none)"}</div>
                            </div>
                          </div>
                        </details>

                        {/* AGGREGATE ADJUSTMENTS (PRODUCT-LEVEL TOTALS) */}
                        <details className="group">
                          <summary className="cursor-pointer text-lg font-semibold text-gray-900 mb-2">
                            Adjustment Summary (Aggregated Totals)
                          </summary>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                totalBasePriceAdjustments
                              </div>
                              <div className="text-gray-900">
                                {totalBasePriceAdjustments.toFixed(4)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                from{" "}
                                <code className="bg-gray-100 px-1 rounded text-[11px]">
                                  $.data.results[x].totalBasePriceAdjustments
                                </code>
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                totalSRPAdjustments
                              </div>
                              <div className="text-gray-900">
                                {totalSRPAdjustments.toFixed(4)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                from{" "}
                                <code className="bg-gray-100 px-1 rounded text-[11px]">
                                  $.data.results[x].totalSRPAdjustments
                                </code>
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                totalRateAdjustments
                              </div>
                              <div className="text-gray-900">
                                {totalRateAdjustments.toFixed(4)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                from{" "}
                                <code className="bg-gray-100 px-1 rounded text-[11px]">
                                  $.data.results[x].totalRateAdjustments
                                </code>
                              </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm">
                              <div className="font-medium text-gray-700">
                                totalAdjustments
                              </div>
                              <div className="text-gray-900">
                                {totalAdjustments.toFixed(4)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                from{" "}
                                <code className="bg-gray-100 px-1 rounded text-[11px]">
                                  $.data.results[x].totalAdjustments
                                </code>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            These values are reported totals from PPE and may
                            include additional internal adjustments that are not
                            broken out individually in the response.
                          </div>
                        </details>

                        {/* FEE SUMMARY */}
                        <details className="group">
                          <summary className="cursor-pointer text-lg font-semibold text-gray-900 mb-2">
                            Fee Summary
                          </summary>

                          <div className="mt-3 text-sm">
                            <div className="font-medium text-gray-700 mb-1">
                              Total Fee Amount (reported)
                            </div>
                            <div className="p-3 border rounded bg-white shadow-sm">
                              {feeTotal.toFixed(4)}
                            </div>

                            {feeResults.slice(0, 5).map((f, i) => (
                              <div
                                key={i}
                                className="p-3 mt-2 border rounded bg-white shadow-sm"
                              >
                                <div className="font-medium text-gray-900">
                                  {f.feeName || f.name || "(unnamed fee)"}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Amount:{" "}
                                  {toNumberSafe(
                                    f.amount !== undefined
                                      ? f.amount
                                      : f.feeAmount
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Type: {f.feeType || f.type || "(none)"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>

                        {/* RULE BUCKETS USED */}
                        <details className="group">
                          <summary className="cursor-pointer text-lg font-semibold text-gray-900 mb-2">
                            Rule Buckets Used for Pricing
                          </summary>

                          {usedRules.length === 0 ? (
                            <div className="mt-3 text-sm text-gray-600 italic">
                              No rule buckets fired for this product. This is
                              unusual for an eligible, priced scenario.
                            </div>
                          ) : (
                            (() => {
                              // Group by category + subCategory
                              const grouped = usedRules.reduce<
                                Record<string, RuleResult[]>
                              >((acc, r) => {
                                const cat = r.category || "Unknown";
                                const sub =
                                  (r as { subCategory?: string | null })
                                    .subCategory || "";
                                const key = sub ? `${cat} :: ${sub}` : cat;
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(r);
                                return acc;
                              }, {});

                              const categoryEntries = Object.entries(grouped).sort(
                                ([a], [b]) => a.localeCompare(b)
                              );

                              return (
                                <div className="mt-3 space-y-3">
                                  {categoryEntries.map(([key, list]) => {
                                    const [cat, sub] = key.split(" :: ");
                                    return (
                                      <details
                                        key={key}
                                        className="border border-gray-200 rounded-lg bg-white shadow-sm"
                                      >
                                        <summary className="px-3 py-2 cursor-pointer flex items-center justify-between text-sm font-semibold text-gray-800">
                                          <span>
                                            {cat}
                                            {sub ? ` \u00b7 ${sub}` : ""}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {list.length} rule
                                            {list.length === 1 ? "" : "s"}
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
                                              {(
                                                r as { subCategory?: string | null }
                                              ).subCategory && (
                                                <div className="text-xs text-gray-600">
                                                  Subcategory:{" "}
                                                  {
                                                    (
                                                      r as {
                                                        subCategory?: string | null;
                                                      }
                                                    ).subCategory
                                                  }
                                                </div>
                                              )}
                                              <div className="text-xs text-gray-600 mt-0.5">
                                                booleanEquationValue:{" "}
                                                {String(r.booleanEquationValue)}
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1">
                                                <span className="font-medium">
                                                  Path:
                                                </span>{" "}
                                                <code className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[11px]">
                                                  $.data.results[x].ruleResults[]
                                                </code>
                                              </div>

                                              {/* Raw JSON for this rule */}
                                              <details className="mt-2 text-xs">
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
                        </details>
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
                  {/* SUMMARY */}
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded text-sm text-gray-800">
                    <div className="font-semibold mb-1">
                      Why This Product Is Ineligible
                    </div>
                    <p className="leading-snug">
                      This product is ineligible because it has a valid result
                      but is marked as not eligible.{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        $.data.results[x].isValidResult == true
                      </code>{" "}
                      and{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        $.data.results[x].isEligible == false
                      </code>
                      . Rules where{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        booleanEquationValue == true
                      </code>{" "}
                      indicate eligibility conditions that were violated.
                    </p>
                  </div>

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
                  <div className="bg-red-50 border border-red-200 p-4 rounded text-sm text-gray-800">
                    <div className="font-semibold mb-1">
                      Why This Product Is Invalid
                    </div>
                    <p className="leading-snug mb-1">
                      This product is invalid because PPE could not generate a
                      usable pricing scenario. The most common causes are:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>
                        <code className="bg-white border px-1 rounded text-xs">
                          $.data.results[x].isValidResult == false
                        </code>
                      </li>
                      <li>
                        Prices are empty:{" "}
                        <code className="bg-white border px-1 rounded text-xs">
                          $.data.results[x].prices.length == 0
                        </code>
                      </li>
                      <li>
                        Often{" "}
                        <code className="bg-white border px-1 rounded text-xs">
                          $.data.results[x].uniqueInvestorCount == 0
                        </code>{" "}
                        which indicates that no investors could price this
                        scenario.
                      </li>
                    </ul>
                  </div>

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
      </main>
    </div>
  );
}
