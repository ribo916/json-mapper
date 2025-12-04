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
}

interface PriceRow {
  rate?: unknown;
  price?: unknown;
  netPrice?: unknown;
  ruleResults?: unknown[] | null;
  clampResults?: unknown[] | null;
}

interface DevConsoleProps {
  raw: unknown;
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
  const [tab, setTab] = useState("raw");

  // Editor refs and instances
  const rawEditorRef = useRef<HTMLDivElement | null>(null);
  const normalizedEditorRef = useRef<HTMLDivElement | null>(null);
  const priceEditorRef = useRef<HTMLDivElement | null>(null);
  const rulesEditorRef = useRef<HTMLDivElement | null>(null);
  const clampsEditorRef = useRef<HTMLDivElement | null>(null);

  const rawEditor = useRef<any>(null);
  const normalizedEditor = useRef<any>(null);
  const priceEditor = useRef<any>(null);
  const rulesEditor = useRef<any>(null);
  const clampsEditor = useRef<any>(null);

  const Tabs = [
    { id: "raw", label: "Raw PPE JSON" },
    { id: "normalized", label: "Normalized Product" },
    { id: "price", label: "Price Math" },
    { id: "rules", label: "Rules" },
    { id: "clamps", label: "Clamps" },
  ];

  // Initialize editors and update content when data changes
  useEffect(() => {
    let cancelled = false;

    async function initOrUpdateEditors() {
      if (typeof window === "undefined") return;

      const mod = await import("jsoneditor");
      if (cancelled) return;

      const JSONEditor = (mod as any).default ?? mod;

      // Initialize each editor if needed and set data
      const editorConfigs = [
        { ref: rawEditorRef, editor: rawEditor, data: raw },
        { ref: normalizedEditorRef, editor: normalizedEditor, data: {
          code: product?.code,
          name: product?.name,
          isValid: product?.isValidResult,
          isEligible: product?.isEligible,
          prices: (product?.prices || []).length,
          investors: product?.uniqueInvestorCount,
          excludedInvestors: product?.excludedInvestors?.length || 0,
        }},
        { ref: priceEditorRef, editor: priceEditor, data: {
          selectedRate: priceRow?.rate,
          selectedPrice: priceRow?.price,
          selectedNetPrice: priceRow?.netPrice,
          breakdown,
        }},
        { ref: rulesEditorRef, editor: rulesEditor, data: {
          resultRules: ruleResults ?? [],
          rowRules: priceRow?.ruleResults ?? [],
        }},
        { ref: clampsEditorRef, editor: clampsEditor, data: {
          clampResults: priceRow?.clampResults ?? [],
        }},
      ];

      editorConfigs.forEach(({ ref, editor, data }) => {
        if (ref.current) {
          if (!editor.current) {
            // Initialize editor
            editor.current = new JSONEditor(ref.current, {
              mode: "code",
              mainMenuBar: false,
              navigationBar: false,
              statusBar: false,
              onEditable: () => false, // read-only
            });
          }
          // Set/update data
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
      [rawEditor, normalizedEditor, priceEditor, rulesEditor, clampsEditor].forEach(editor => {
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

      <div className={tab === "raw" ? "block" : "hidden"}>
        <div ref={rawEditorRef} className="h-[500px] border border-gray-600 rounded" />
      </div>

      <div className={tab === "normalized" ? "block" : "hidden"}>
        <div ref={normalizedEditorRef} className="h-[500px] border border-gray-600 rounded" />
      </div>

      <div className={tab === "price" ? "block" : "hidden"}>
        <div ref={priceEditorRef} className="h-[500px] border border-gray-600 rounded" />
      </div>

      <div className={tab === "rules" ? "block" : "hidden"}>
        <div ref={rulesEditorRef} className="h-[500px] border border-gray-600 rounded" />
      </div>

      <div className={tab === "clamps" ? "block" : "hidden"}>
        <div ref={clampsEditorRef} className="h-[500px] border border-gray-600 rounded" />
      </div>
    </div>
  );
}
