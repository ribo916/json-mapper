"use client";

import React, { useEffect, useRef, useState } from "react";
import "jsoneditor/dist/jsoneditor.css";

interface Product {
  prices?: unknown[] | null;
  feeResults?: unknown[] | null;
  ruleResults?: unknown[] | null;
}

interface PriceRow {
  clampResults?: unknown[] | null;
  ruleResults?: unknown[] | null;
}

interface DevConsoleProps {
  raw: unknown;             // full product
  product: Product;         // product-level JSON
  priceRow: PriceRow | null; // selected price row (raw)
  ruleResults: unknown[] | null | undefined;
  isEligible: boolean;
}

export default function DevConsole({
  raw,
  product,
  priceRow,
  ruleResults,
  isEligible,
}: DevConsoleProps) {
  const [tab, setTab] = useState<string>("product");

  //
  // JSONEditor DOM refs
  //
  const productEditorRef = useRef<HTMLDivElement | null>(null);
  const rulesEditorRef = useRef<HTMLDivElement | null>(null);
  const pricesEditorRef = useRef<HTMLDivElement | null>(null);
  const feesEditorRef = useRef<HTMLDivElement | null>(null);
  const clampsEditorRef = useRef<HTMLDivElement | null>(null);

  //
  // JSONEditor instances
  //
  const productEditor = useRef<any>(null);
  const rulesEditor = useRef<any>(null);
  const pricesEditor = useRef<any>(null);
  const feesEditor = useRef<any>(null);
  const clampsEditor = useRef<any>(null);

  //
  // Tabs — ONLY RAW JSON, NO DERIVED DATA
  //
  const Tabs = [
    { id: "product", label: "Product", show: true },
    { id: "rules", label: "Rules", show: true },

    { id: "prices", label: "Prices", show: isEligible },
    { id: "fees", label: "FeeResults", show: isEligible },
    { id: "clamps", label: "Clamps", show: isEligible },
  ];

  //
  // Ensure active tab is always valid
  //
  useEffect(() => {
    const visible = Tabs.filter((t) => t.show);
    if (!visible.length) return;
    if (!visible.some((t) => t.id === tab)) {
      setTab(visible[0].id);
    }
  }, [isEligible, raw]);

  //
  // jsoneditor load/update
  //
  useEffect(() => {
    let cancelled = false;

    async function initEditors() {
      if (typeof window === "undefined") return;

      const mod = await import("jsoneditor");
      if (cancelled) return;
      const JSONEditor = (mod as any).default ?? mod;

      const editors = [
        { ref: productEditorRef, inst: productEditor, data: raw },
        {
          ref: rulesEditorRef,
          inst: rulesEditor,
          data: { ruleResults: ruleResults ?? [] },
        },
        {
          ref: pricesEditorRef,
          inst: pricesEditor,
          data: { prices: product?.prices ?? [] },
        },
        {
          ref: feesEditorRef,
          inst: feesEditor,
          data: { feeResults: product?.feeResults ?? [] },
        },
        {
          ref: clampsEditorRef,
          inst: clampsEditor,
          data: { clampResults: priceRow?.clampResults ?? [] },
        },
      ];

      editors.forEach(({ ref, inst, data }) => {
        if (!ref.current) return;

        if (!inst.current) {
          inst.current = new JSONEditor(ref.current, {
            mode: "code",
            mainMenuBar: false,
            navigationBar: false,
            statusBar: false,
            onEditable: () => false,
          });
        }

        inst.current.set(data);
      });
    }

    initEditors();
    return () => {
      cancelled = true;
    };
  }, [raw, product, priceRow, ruleResults]);

  //
  // Destroy editors
  //
  useEffect(() => {
    return () => {
      [
        productEditor,
        rulesEditor,
        pricesEditor,
        feesEditor,
        clampsEditor,
      ].forEach((ed) => {
        if (ed.current) {
          ed.current.destroy();
          ed.current = null;
        }
      });
    };
  }, []);

  //
  // Render
  //
  return (
    <div className="border border-yellow-500 rounded mt-6 p-3 bg-[#1a1a1a] text-gray-200">
      <h2 className="font-bold text-yellow-400 mb-3">Developer Console</h2>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded text-sm ${
              tab === t.id
                ? "bg-yellow-500 text-black"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PRODUCT */}
      <div
        ref={productEditorRef}
        className="h-[500px] border border-gray-600 rounded"
        style={{ display: tab === "product" ? "block" : "none" }}
      />

      {/* RULE RESULTS */}
      <div
        ref={rulesEditorRef}
        className="h-[500px] border border-gray-600 rounded"
        style={{ display: tab === "rules" ? "block" : "none" }}
      />

      {/* PRICES */}
      <div
        ref={pricesEditorRef}
        className="h-[500px] border border-gray-600 rounded"
        style={{ display: tab === "prices" && isEligible ? "block" : "none" }}
      />

      {/* FEE RESULTS */}
      <div
        ref={feesEditorRef}
        className="h-[500px] border border-gray-600 rounded"
        style={{ display: tab === "fees" && isEligible ? "block" : "none" }}
      />

      {/* CLAMP RESULTS */}
      <div
        ref={clampsEditorRef}
        className="h-[500px] border border-gray-600 rounded"
        style={{ display: tab === "clamps" && isEligible ? "block" : "none" }}
      />
    </div>
  );
}
