"use client";

import React, { useMemo, useState } from "react";
import {
  buildDisqualifyingRuleExplanations,
  RuleResult,
  RuleExplanation,
} from "../utils/ruleExplanation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                       */
/* -------------------------------------------------------------------------- */

interface PpeResult {
  code?: string | null;
  name?: string | null;

  isEligible?: boolean | null;
  isValidResult?: boolean | null;

  prices?: unknown[] | null;

  ruleResults?: RuleResult[] | null;

  invalidResultReason?: string | null;
  uniqueInvestorCount?: number | null;

  excludedInvestors?: unknown[] | null;

  allInvestorsExcluded?: boolean | null;
  lockDeskWorkflowResults?: unknown[] | null;
  complianceResults?: unknown[] | null;
  feeResults?: unknown[] | null;
  inheritance?: unknown[] | null;
  sources?: unknown[] | null;
}

interface PpeResponse {
  data?: {
    results?: PpeResult[];
  };
}

/* -------------------------------------------------------------------------- */
/* TYPE GUARD                                                                  */
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
/* COMPONENT                                                                   */
/* -------------------------------------------------------------------------- */

export default function PricingInspector() {
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
    if (!file) {
      return;
    }

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

      // reset selections
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

  /* ------------------------------------------------------------------------ */
  /* HELPERS                                                                  */
  /* ------------------------------------------------------------------------ */

  const pricesCount = (selectedProduct?.prices ?? []).length;
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

      {/* MAIN CONTENT */}
      <main className="px-6 py-6 space-y-8 max-w-7xl mx-auto">
        {/* ERROR BANNER */}
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

                {/* FIX: uniform height for label block */}
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

                {/* FIX: same height as eligible */}
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

                {/* FIX: same height, no need for "..." hack */}
                <div className="text-xs text-gray-600 mb-2 h-[42px] flex flex-col justify-between">
                  <code className="bg-gray-100 px-1 rounded text-[11px]">
                    $.data.results[x].isValidResult == false
                  </code>
                  {/* intentionally blank second row to match height */}
                  <span></span>
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

              {/* ELIGIBLE VIEW */}
              {selectedIsEligible && (
                <section className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-gray-800">
                    <div className="font-semibold mb-1">
                      Why This Product Is Eligible
                    </div>
                    <p className="leading-snug">
                      This product is <strong>eligible</strong> because it has a
                      valid result, is marked as eligible, and returns at least
                      one price / rate stack in{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        $.data.results[x].prices[]
                      </code>
                      . This inspector does not attempt to re-evaluate rule
                      logic for eligible products; instead it focuses on
                      negative paths (ineligible and invalid) for debugging.
                    </p>
                  </div>
                </section>
              )}

              {/* INELIGIBLE VIEW */}
              {selectedIsIneligible && (
                <section className="space-y-6">
                  {/* SUMMARY */}
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded text-sm text-gray-800">
                    <div className="font-semibold mb-1">
                      Why This Product Is Ineligible
                    </div>
                    <p className="leading-snug">
                      This product is <strong>ineligible</strong> because it has
                      a valid result but is marked as not eligible and returns
                      no price rows. In other words,{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        $.data.results[x].isValidResult == true
                      </code>
                      ,{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        $.data.results[x].isEligible == false
                      </code>{" "}
                      and{" "}
                      <code className="bg-white border px-1 rounded text-xs">
                        $.data.results[x].prices.length == 0
                      </code>
                      . The rule evaluations below are used to explain which
                      eligibility rules disqualified this scenario.
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
                            matrix rows exist for this scenario, even though no
                            individual rule is flagged.
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
                                    <div className="text-xs text-gray-500 space-y-0.5">
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
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* FLAT VIEW */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                      Show flat list of disqualifying rules
                    </summary>
                    <div className="mt-3 text-sm text-gray-800 space-y-2">
                      {(() => {
                        const rules = buildDisqualifyingRuleExplanations(
                          selectedProduct.ruleResults ?? null
                        );

                        if (rules.length === 0) {
                          return (
                            <div className="text-gray-600 italic">
                              No disqualifying eligibility rules found for this
                              product.
                            </div>
                          );
                        }

                        return rules.map((rule, idx) => (
                          <div
                            key={idx}
                            className="border-b border-gray-200 pb-2 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">
                              {rule.ruleName}
                            </div>
                            <div className="text-xs text-gray-600">
                              {rule.categoryLabel}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              <span className="font-medium">
                                Inherited Category:
                              </span>{" "}
                              {rule.ruleInheritedName || "(none)"}{" "}
                              &middot;{" "}
                              <span className="font-medium">Path:</span>{" "}
                              <code className="px-1 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs">
                                {rule.jsonPath}
                              </code>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </details>
                </section>
              )}

              {/* INVALID VIEW */}
              {selectedIsInvalid && (
                <section className="space-y-4">
                  <div className="bg-red-50 border border-red-200 p-4 rounded text-sm text-gray-800">
                    <div className="font-semibold mb-1">
                      Why This Product Is Invalid
                    </div>
                    <p className="leading-snug mb-1">
                      This product is <strong>invalid</strong> because PPE could
                      not generate a usable pricing scenario. Typically this
                      occurs when no investors, price rows, or configurations
                      can be evaluated.
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>
                        <code className="bg-white border px-1 rounded text-xs">
                          $.data.results[x].isValidResult == false
                        </code>
                      </li>
                      <li>
                        Prices are usually empty:{" "}
                        <code className="bg-white border px-1 rounded text-xs">
                          $.data.results[x].prices.length == 0
                        </code>
                      </li>
                      <li>
                        Often{" "}
                        <code className="bg-white border px-1 rounded text-xs">
                          $.data.results[x].uniqueInvestorCount == 0
                        </code>
                        , meaning no investors could price this scenario.
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
