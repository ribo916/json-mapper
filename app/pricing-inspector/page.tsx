"use client";

import { useState } from "react";

type PpeResult = {
  code?: string;
  name?: string;
  isEligible?: boolean;
  isValidResult?: boolean;
};

export default function PricingInspector() {
  const [rawResults, setRawResults] = useState<PpeResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [selectedEligible, setSelectedEligible] = useState<string | null>(null);
  const [selectedIneligible, setSelectedIneligible] = useState<string | null>(null);
  const [selectedInvalid, setSelectedInvalid] = useState<string | null>(null);

  /* -------------------------------------------------------------
     UPLOAD + PARSE
  ------------------------------------------------------------- */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const results = json?.data?.results;
      if (!Array.isArray(results)) {
        setError("Missing $.data.results[]");
        setRawResults([]);
        return;
      }

      setRawResults(results);
      setError(null);
    } catch {
      setError("Invalid JSON");
      setRawResults([]);
    }
  };

  /* -------------------------------------------------------------
     CLASSIFICATION GROUPS
  ------------------------------------------------------------- */
  const eligible = rawResults.filter(
    (r) => r.isEligible === true && r.isValidResult === true
  );
  const ineligible = rawResults.filter(
    (r) => r.isEligible === false && r.isValidResult === true
  );
  const invalid = rawResults.filter(
    (r) => r.isValidResult === false
  );

  /* -------------------------------------------------------------
     SELECTED PRODUCT
  ------------------------------------------------------------- */
  const findSelected = () => {
    if (selectedEligible) return eligible.find((p) => p.code === selectedEligible);
    if (selectedIneligible) return ineligible.find((p) => p.code === selectedIneligible);
    if (selectedInvalid) return invalid.find((p) => p.code === selectedInvalid);
    return null;
  };
  const selectedProduct = findSelected();

  /* -------------------------------------------------------------
     RENDER
  ------------------------------------------------------------- */
  return (
    <div className="inspector-page">

      {/* HEADER */}
      <div className="inspector-header flex items-center justify-between mb-8 pb-4 border-b">

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white border border-gray-300 flex items-center justify-center rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="#2563eb" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5"
            >
              <circle cx="6" cy="12" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="18" cy="18" r="2" />
              <line x1="8" y1="12" x2="16" y2="6" />
              <line x1="8" y1="12" x2="16" y2="18" />
            </svg>
          </div>

          <span className="text-gray-900 tracking-tight text-lg font-semibold">
            Pricing Scenario Inspector
          </span>
        </div>

        {/* Upload icon + filename */}
        <div className="flex items-center gap-3">
          {fileName && (
            <span className="text-gray-700 text-sm">{fileName}</span>
          )}

          <input
            id="fileInput"
            type="file"
            accept=".json"
            onChange={handleUpload}
            className="hidden"
          />

          <button
            onClick={() => document.getElementById("fileInput")?.click()}
            className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-gray-300 hover:bg-gray-100"
            title="Upload JSON"
          >
            📁
          </button>
        </div>
      </div>

      {/* ERRORS */}
      {error && (
        <div className="text-red-600 text-sm mb-6">{error}</div>
      )}

      {/* ============================================================
         HIGH LEVEL RESULTS
      ============================================================ */}
      <h2 className="text-xl font-semibold mb-4">Products Returned</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

        {/* Eligible */}
        <div className="flex flex-col">
          <div className="text-xs text-gray-600 mb-1 leading-tight min-h-[40px]">
            <div className="whitespace-nowrap">
              $.data.results[x].isEligible == true
            </div>
            <div className="whitespace-nowrap">
              $.data.results[x].isValidResult == true
            </div>
          </div>

          <div className="font-semibold mb-1">
            Eligible ({eligible.length})
          </div>

          <select
            className="border px-3 py-2 rounded w-full"
            value={selectedEligible ?? ""}
            onChange={(e) => {
              setSelectedEligible(e.target.value || null);
              setSelectedIneligible(null);
              setSelectedInvalid(null);
            }}
          >
            <option value="">Select</option>
            {eligible.map((p) => (
              <option key={p.code} value={p.code}>{p.code}</option>
            ))}
          </select>
        </div>

        {/* Ineligible */}
        <div className="flex flex-col">
          <div className="text-xs text-gray-600 mb-1 leading-tight min-h-[40px]">
            <div className="whitespace-nowrap">
              $.data.results[x].isEligible == false
            </div>
            <div className="whitespace-nowrap">
              $.data.results[x].isValidResult == true
            </div>
          </div>

          <div className="font-semibold mb-1">
            Ineligible ({ineligible.length})
          </div>

          <select
            className="border px-3 py-2 rounded w-full"
            value={selectedIneligible ?? ""}
            onChange={(e) => {
              setSelectedIneligible(e.target.value || null);
              setSelectedEligible(null);
              setSelectedInvalid(null);
            }}
          >
            <option value="">Select</option>
            {ineligible.map((p) => (
              <option key={p.code} value={p.code}>{p.code}</option>
            ))}
          </select>
        </div>

        {/* Invalid */}
        <div className="flex flex-col">
          <div className="text-xs text-gray-600 mb-1 leading-tight min-h-[40px]">
            <div className="whitespace-nowrap">
              $.data.results[x].isValidResult == false
            </div>
          </div>

          <div className="font-semibold mb-1">
            Invalid ({invalid.length})
          </div>

          <select
            className="border px-3 py-2 rounded w-full"
            value={selectedInvalid ?? ""}
            onChange={(e) => {
              setSelectedInvalid(e.target.value || null);
              setSelectedEligible(null);
              setSelectedIneligible(null);
            }}
          >
            <option value="">Select</option>
            {invalid.map((p) => (
              <option key={p.code} value={p.code}>{p.code}</option>
            ))}
          </select>
        </div>
      </div>
      
      <hr className="my-6 border-gray-300" />

    {/* ============================================================
    DETAILED RESULTS (DYNAMIC PER PRODUCT CATEGORY)
    ============================================================ */}
    <h2 className="text-xl font-semibold mb-4">
    {selectedEligible
        ? "Eligible Results"
        : selectedIneligible
        ? "Ineligible Results"
        : selectedInvalid
        ? "Invalid Results"
        : "Detailed Results"}
    </h2>

    {!selectedProduct && (
    <div className="text-gray-600 text-sm">
        Select a product above to view details.
    </div>
    )}

    {selectedProduct && (
    <div className="text-sm text-gray-800 space-y-8">

        {/* ---------------------------------------------------------
        ELIGIBLE VIEW
        (Only shown when the product is eligible + valid)
        Future home of pricing stack analysis, rate grids, etc.
        --------------------------------------------------------- */}
        {selectedEligible && (
        <section className="space-y-4">

            <div><strong>code:</strong> {selectedProduct.code}</div>
            <div><strong>name:</strong> {selectedProduct.name ?? "(none)"}</div>
            <div><strong>isEligible:</strong> {String(selectedProduct.isEligible)}</div>
            <div><strong>isValidResult:</strong> {String(selectedProduct.isValidResult)}</div>

            {/* Placeholder for future eligible-specific features */}
            {/* -----------------------------------------------------
            - Price/rate stack breakdown
            - Clamp explanation
            - Adjustment visibility logic
            - Calc chain viewer
            - Pricing grids
            ----------------------------------------------------- */}
        </section>
        )}

        {/* ---------------------------------------------------------
        INELIGIBLE VIEW
        (Valid result, but pricing rules disqualified product)
        Future home for ruleResults parsing, UX-friendly rule tree
        --------------------------------------------------------- */}
        {selectedIneligible && (
        <section className="space-y-4">

            <div><strong>code:</strong> {selectedProduct.code}</div>
            <div><strong>name:</strong> {selectedProduct.name ?? "(none)"}</div>
            <div><strong>isEligible:</strong> {String(selectedProduct.isEligible)}</div>
            <div><strong>isValidResult:</strong> {String(selectedProduct.isValidResult)}</div>

            {/* Placeholder for future ineligible-specific features */}
            {/* -----------------------------------------------------
            - ruleResults[] deep parser
            - grouped disqualifying rules
            - requirement tree viewer
            - missing/failed inputs
            ----------------------------------------------------- */}
        </section>
        )}

        {/* ---------------------------------------------------------
        INVALID VIEW
        (Product failed before pricing — missing params, etc.)
        Future home for diagnostics, missing fields, exceptions
        --------------------------------------------------------- */}
        {selectedInvalid && (
        <section className="space-y-4">

            <div><strong>code:</strong> {selectedProduct.code}</div>
            <div><strong>name:</strong> {selectedProduct.name ?? "(none)"}</div>
            <div><strong>isValidResult:</strong> {String(selectedProduct.isValidResult)}</div>

            {/* Placeholder for future invalid-specific features */}
            {/* -----------------------------------------------------
            - invalid reason messages
            - missing required loan fields
            - internal error messages (if exposed)
            - mismatch diagnostics
            ----------------------------------------------------- */}
        </section>
        )}

    </div>
    )}


    </div>
  );
}
