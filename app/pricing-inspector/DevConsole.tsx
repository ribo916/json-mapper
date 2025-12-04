"use client";

import React, { useEffect, useRef, useState } from "react";
import "jsoneditor/dist/jsoneditor.css";

interface Product {
  code?: string | null;
  name?: string | null;
  isValidResult?: boolean | null;
  isEligible?: boolean | null;
  prices?: unknown[] | null;
  uniqueInvestorCount?: number | null;
  excludedInvestors?: unknown[] | null;
  feeResults?: unknown[] | null;
}

interface PriceRow {
  rate?: unknown;
  price?: unknown;
  netPrice?: unknown;
  ruleResults?: unknown[] | null;
  clampResults?: unknown[] | null;
}

interface DevConsoleProps {
  raw: unknown;                     // selectedProduct (entire product JSON)
  product: Product;
  priceRow: PriceRow;
  breakdown: unknown;
  ruleResults: unknown[] | null | undefined;
}

export default function DevConsole({
  raw,
  product,
  priceRow,
  breakdown,
  ruleResults,
}: DevConsoleProps) {
  const [tab, setTab] = useState("product");

  // Editor refs and instances
  const productEditorRef = useRef<HTMLDivElement | null>(null);
  const pricesEditorRef = useRef<HTMLDivElement | null>(null);
  const feesEditorRef = useRef<HTMLDivElement | null>(null);
  const priceEditorRef = useRef<HTMLDivElement | null>(null);
  const rulesEditorRef = useRef<HTMLDivElement | null>(null);
  const clampsEditorRef = useRef<HTMLDivElement | null>(null);

  const productEditor = useRef<any>(null);
  const pricesEditor = useRef<any>(null);
  const feesEditor = useRef<any>(null);
  const priceEditor = useRef<any>(null);
  const rulesEditor = useRef<any>(null);
  const clampsEditor = useRef<any>(null);

  const Tabs = [
    { id: "product", label: "Product" },
    { id: "prices", label: "Prices" },
    { id: "fees", label: "FeeResults" },
    { id: "rules", label: "Rules" },
    { id: "clamps", label: "Clamps" },
    { id: "price", label: "Price Math" },
  ];

  // Initialize editors and update content when data changes
  useEffect(() => {
    let cancelled = false;

    async function initOrUpdateEditors() {
      if (typeof window === "undefined") return;

      const mod = await import("jsoneditor");
      if (cancelled) return;

      const JSONEditor = (mod as any).default ?? mod;

      const editorConfigs = [
        // Entire product JSON (what you pass as `raw`)
        { ref: productEditorRef, editor: productEditor, data: raw },

        // Prices: mirror the parent container in the PPE product
        {
          ref: pricesEditorRef,
          editor: pricesEditor,
          data: {
            prices: product?.prices ?? [],
          },
        },

        // FeeResults: also mirror the parent container
        {
          ref: feesEditorRef,
          editor: feesEditor,
          data: {
            feeResults: product?.feeResults ?? [],
          },
        },

        // Price math breakdown (selected row)
        {
          ref: priceEditorRef,
          editor: priceEditor,
          data: {
            selectedRate: priceRow?.rate,
            selectedPrice: priceRow?.price,
            selectedNetPrice: priceRow?.netPrice,
            breakdown,
          },
        },

        // Rules: result-level + row-level, both under their parent keys
        {
          ref: rulesEditorRef,
          editor: rulesEditor,
          data: {
            resultRules: ruleResults ?? [],
            rowRules: priceRow?.ruleResults ?? [],
          },
        },

        // Clamps: parent container clampResults
        {
          ref: clampsEditorRef,
          editor: clampsEditor,
          data: {
            clampResults: priceRow?.clampResults ?? [],
          },
        },
      ];

      editorConfigs.forEach(({ ref, editor, data }) => {
        if (ref.current) {
          if (!editor.current) {
            editor.current = new JSONEditor(ref.current, {
              mode: "code",             // CODE mode only (no tree)
              mainMenuBar: false,
              navigationBar: false,
              statusBar: false,
              onEditable: () => false,  // read-only
            });
          }
          editor.current.set(data);
        }
      });
    }

    initOrUpdateEditors();

    return () => {
      cancelled = true;
    };
  }, [raw, product, priceRow, breakdown, ruleResults]);

  // Cleanup editors on unmount
  useEffect(() => {
    return () => {
      [
        productEditor,
        pricesEditor,
        feesEditor,
        priceEditor,
        rulesEditor,
        clampsEditor,
      ].forEach((editor) => {
        if (editor.current) {
          editor.current.destroy();
          editor.current = null;
        }
      });
    };
  }, []);

  return (
    <div className="border border-yellow-500 rounded mt-6 p-3 bg-[#1a1a1a] text-gray-200">
      <h2 className="font-bold text-yellow-400 mb-2">Developer Console</h2>

      <div className="flex gap-2 mb-4">
        {Tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded ${
              tab === t.id
                ? "bg-yellow-500 text-black"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Product (entire product JSON) */}
      <div className={tab === "product" ? "block" : "hidden"}>
        <div
          ref={productEditorRef}
          className="h-[500px] border border-gray-600 rounded"
        />
      </div>

      {/* Prices: { prices: [...] } */}
      <div className={tab === "prices" ? "block" : "hidden"}>
        <div
          ref={pricesEditorRef}
          className="h-[500px] border border-gray-600 rounded"
        />
      </div>

      {/* FeeResults: { feeResults: [...] } */}
      <div className={tab === "fees" ? "block" : "hidden"}>
        <div
          ref={feesEditorRef}
          className="h-[500px] border border-gray-600 rounded"
        />
      </div>

      {/* Rules */}
      <div className={tab === "rules" ? "block" : "hidden"}>
        <div
          ref={rulesEditorRef}
          className="h-[500px] border border-gray-600 rounded"
        />
      </div>

      {/* Clamps */}
      <div className={tab === "clamps" ? "block" : "hidden"}>
        <div
          ref={clampsEditorRef}
          className="h-[500px] border border-gray-600 rounded"
        />
      </div>

      {/* Price Math (last tab) */}
      <div className={tab === "price" ? "block" : "hidden"}>
        <div
          ref={priceEditorRef}
          className="h-[500px] border border-gray-600 rounded"
        />
      </div>
    </div>
  );
}
