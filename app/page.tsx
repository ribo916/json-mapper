"use client";

import { useEffect, useRef, useState } from "react";
import "jsoneditor/dist/jsoneditor.css";

export default function Home() {
  const leftEditorRef = useRef<HTMLDivElement | null>(null);
  const rightEditorRef = useRef<HTMLDivElement | null>(null);
  const mappingEditorContainerRef = useRef<HTMLDivElement | null>(null);

  const leftEditor = useRef<any>(null);
  const rightEditor = useRef<any>(null);
  const mappingViewEditor = useRef<any>(null);
  const JSONEditorCtor = useRef<any>(null);

  // Editor modes
  const [leftMode, setLeftMode] = useState<"tree" | "code">("code");
  const [rightMode, setRightMode] = useState<"tree" | "code">("code");
  const [viewMode, setViewMode] = useState<"tree" | "code">("tree");

  // Mappings
  const [mappingList, setMappingList] = useState<string[]>([]);
  const [mappingName, setMappingName] = useState<string>("");

  // Toast + log
  const [toast, setToast] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  // Mapping modal
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingJson, setMappingJson] = useState<any>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  /* ------------------------------------------------------------- */
  /* Load JSONEditor (client only)                                 */
  /* ------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function initEditors() {
      if (typeof window === "undefined") return;
      if (!leftEditorRef.current || !rightEditorRef.current) return;

      const mod = await import("jsoneditor");
      if (cancelled) return;

      const JSONEditor = (mod as any).default ?? mod;
      JSONEditorCtor.current = JSONEditor;

      if (!leftEditor.current) {
        leftEditor.current = new JSONEditor(leftEditorRef.current, {
          mode: leftMode,
          mainMenuBar: false,
        });
        leftEditor.current.set({});
      }

      if (!rightEditor.current) {
        rightEditor.current = new JSONEditor(rightEditorRef.current, {
          mode: rightMode,
          mainMenuBar: false,
          navigationBar: false,
          statusBar: false,
        });
        rightEditor.current.set({});
      }
    }

    initEditors();

    return () => {
      cancelled = true;
      if (leftEditor.current) {
        leftEditor.current.destroy();
        leftEditor.current = null;
      }
      if (rightEditor.current) {
        rightEditor.current.destroy();
        rightEditor.current = null;
      }
      if (mappingViewEditor.current) {
        mappingViewEditor.current.destroy();
        mappingViewEditor.current = null;
      }
    };
  }, []);

  /* ------------------------------------------------------------- */
  /* Load mappings list from API                                   */
  /* ------------------------------------------------------------- */
  useEffect(() => {
    async function loadMappings() {
      try {
        const res = await fetch("/api/mappings/list");
        const data = await res.json();

        if (Array.isArray(data.files) && data.files.length > 0) {
          setMappingList(data.files);
          setMappingName(data.files[0]); // default = first mapping
        }
      } catch {
        showToast("Failed to load mappings");
      }
    }

    loadMappings();
  }, []);

  /* ------------------------------------------------------------- */
  /* React to left mode changes                                    */
  /* ------------------------------------------------------------- */
  useEffect(() => {
    if (!JSONEditorCtor.current || !leftEditor.current || !leftEditorRef.current) return;

    const JSONEditor = JSONEditorCtor.current;
    const val = leftEditor.current.get();

    leftEditor.current.destroy();
    leftEditor.current = new JSONEditor(leftEditorRef.current, {
      mode: leftMode,
      mainMenuBar: false,
    });
    leftEditor.current.set(val);
  }, [leftMode]);

  /* ------------------------------------------------------------- */
  /* React to right mode changes                                   */
  /* ------------------------------------------------------------- */
  useEffect(() => {
    if (!JSONEditorCtor.current || !rightEditor.current || !rightEditorRef.current) return;

    const JSONEditor = JSONEditorCtor.current;
    const val = rightEditor.current.get();

    rightEditor.current.destroy();
    rightEditor.current = new JSONEditor(rightEditorRef.current, {
      mode: rightMode,
      mainMenuBar: false,
      navigationBar: false,
      statusBar: false,
    });
    rightEditor.current.set(val);
  }, [rightMode]);

  /* ------------------------------------------------------------- */
  /* React to mapping modal / view mode / mappingJson              */
  /* ------------------------------------------------------------- */
  useEffect(() => {
    if (!showMappingModal) return;
    if (!JSONEditorCtor.current) return;
    if (!mappingEditorContainerRef.current) return;

    const JSONEditor = JSONEditorCtor.current;

    if (mappingViewEditor.current) {
      mappingViewEditor.current.destroy();
      mappingViewEditor.current = null;
    }

    mappingViewEditor.current = new JSONEditor(mappingEditorContainerRef.current, {
      mode: viewMode,
      mainMenuBar: false,
      navigationBar: false,
      statusBar: false,
      onEditable: () => false, // read-only
    });

    mappingViewEditor.current.set(mappingJson ?? {});
  }, [showMappingModal, viewMode, mappingJson]);

  /* ------------------------------------------------------------- */
  /* Convert                                                       */
  /* ------------------------------------------------------------- */
  const handleConvert = async () => {
    try {
      if (!mappingName) {
        showToast("No mapping selected");
        return;
      }
      if (!leftEditor.current) return;

      const inputData = leftEditor.current.get();
      setLogLines([]);

      const res = await fetch(`/api/convert?map=${mappingName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputData),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("Conversion failed");
        console.error(data);
        return;
      }

      rightEditor.current?.set(data.result);
      setLogLines(Array.isArray(data.log) ? data.log : []);
      showToast("Converted!");
    } catch {
      showToast("Invalid JSON");
    }
  };

  /* ------------------------------------------------------------- */
  /* Copy                                                          */
  /* ------------------------------------------------------------- */
  const handleCopy = () => {
    try {
      if (!rightEditor.current) {
        showToast("Nothing to copy");
        return;
      }

      const val = rightEditor.current.get();
      if (val === undefined || val === null) {
        showToast("Nothing to copy");
        return;
      }

      const text = typeof val === "string" ? val : JSON.stringify(val, null, 2);
      navigator.clipboard.writeText(text);
      showToast("Copied!");
    } catch {
      showToast("Copy failed");
    }
  };

  /* ------------------------------------------------------------- */
  /* View mapping (open modal)                                     */
  /* ------------------------------------------------------------- */
  const handleViewMapping = async () => {
    try {
      if (!mappingName) {
        showToast("No mapping selected");
        return;
      }

      const res = await fetch(`/api/mappings/get?file=${encodeURIComponent(mappingName)}`);
      const data = await res.json();

      if (!res.ok || !data.content) {
        showToast("Failed to load mapping");
        return;
      }

      setMappingJson(data.content);
      setShowMappingModal(true);
    } catch {
      showToast("Could not load mapping");
    }
  };

  /* ------------------------------------------------------------- */
  /* Shared button styles                                          */
  /* ------------------------------------------------------------- */
  const modeBtn = (active: boolean) =>
    active
      ? "px-3 py-1 rounded bg-blue-600 text-white shadow-sm"
      : "px-3 py-1 rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-100";

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">

      {/* Header */}
      <div className="p-3 border-b bg-white shadow-sm flex items-center justify-between">

        {/* LEFT — Logo + Title */}
        <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white border border-gray-300 flex items-center justify-center rounded-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563eb"  // blue-600 stroke
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

          <span className="text-gray-900 tracking-tight text-lg font-semibold">
            JSON Translator
          </span>
        </div>

        {/* RIGHT — Dropdown + Eye button */}
        <div className="flex items-center gap-3">

          {/* Dropdown */}
          <select
            value={mappingName}
            onChange={(e) => setMappingName(e.target.value)}
            className="border border-gray-300 bg-white text-gray-800 px-3 py-1.5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-auto"
          >
            {mappingList.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {/* Eye */}
          <button
            onClick={handleViewMapping}
            disabled={!mappingName}
            className={`flex items-center justify-center px-3 py-1.5 rounded-md text-sm shadow-sm w-auto ${
              mappingName
                ? "bg-white border border-black text-black hover:bg-gray-100"
                : "bg-gray-200 border border-gray-400 text-gray-500 cursor-not-allowed"
            }`}
            style={{ width: "40px" }}
          >
            👁
          </button>

        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left editor */}
        <div className="w-1/2 flex flex-col border-r bg-white">
          <div className="p-2 border-b flex gap-2 bg-gray-50">
            <button
              className={modeBtn(leftMode === "tree")}
              onClick={() => setLeftMode("tree")}
            >
              Tree
            </button>
            <button
              className={modeBtn(leftMode === "code")}
              onClick={() => setLeftMode("code")}
            >
              Code
            </button>
          </div>
          <div ref={leftEditorRef} className="flex-1 overflow-auto" />
        </div>

        {/* Center buttons */}
        <div className="w-20 flex flex-col items-center justify-center gap-4">
          <button
            onClick={handleConvert}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            →
          </button>

          <button
            onClick={handleCopy}
            className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded shadow"
          >
            Copy
          </button>

          <button
            onClick={() => setShowLog((prev) => !prev)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded shadow text-sm"
          >
            {showLog ? "Hide Log" : "Log"}
          </button>
        </div>

        {/* Right editor */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="p-2 border-b flex gap-2 bg-gray-50">
            <button
              className={modeBtn(rightMode === "tree")}
              onClick={() => setRightMode("tree")}
            >
              Tree
            </button>
            <button
              className={modeBtn(rightMode === "code")}
              onClick={() => setRightMode("code")}
            >
              Code
            </button>
          </div>
          <div ref={rightEditorRef} className="flex-1 overflow-auto" />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white shadow-lg px-4 py-2 rounded-md border border-black/20 animate-fade z-50">
          {toast}
        </div>
      )}

      {/* Log panel */}
      {showLog && (
        <div className="fixed bottom-0 left-0 right-0 h-60 bg-black text-green-200 text-sm font-mono border-t border-gray-700 shadow-lg flex flex-col z-40">
          <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="font-semibold">Conversion Log</span>
            <button
              className="text-xs text-gray-300 hover:text-white"
              onClick={() => setShowLog(false)}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto px-4 py-2 space-y-1">
            {logLines.length === 0 ? (
              <div className="text-gray-400 italic">
                No logs yet. Run a conversion to see details.
              </div>
            ) : (
              logLines.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mapping viewer modal */}
      {showMappingModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[75vh] flex flex-col">
            {/* Modal header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
              <div className="text-sm">
                <span className="font-semibold">Mapping:</span>{" "}
                <span className="font-mono text-xs">{mappingName}.json</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className={modeBtn(viewMode === "tree")}
                  onClick={() => setViewMode("tree")}
                >
                  Tree
                </button>
                <button
                  className={modeBtn(viewMode === "code")}
                  onClick={() => setViewMode("code")}
                >
                  Code
                </button>
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="text-gray-500 hover:text-black text-xl leading-none px-2"
                  aria-label="Close mapping viewer"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-hidden">
              <div
                ref={mappingEditorContainerRef}
                className="w-full h-full overflow-auto"
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-fade {
          animation: fadeOut 2s forwards;
        }
        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
