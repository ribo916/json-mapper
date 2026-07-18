"use client";

import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { RawTemplate } from "@/lib/template/types";
import { Button } from "./ui";

export function FileLoader() {
  const addTemplate = useStore((s) => s.addTemplate);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // `webkitdirectory` isn't in the standard input types; set it imperatively.
  useEffect(() => {
    if (folderInput.current) {
      folderInput.current.setAttribute("webkitdirectory", "");
      folderInput.current.setAttribute("directory", "");
    }
  }, []);
  const [dragging, setDragging] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");

  async function ingest(name: string, text: string) {
    try {
      const raw = JSON.parse(text) as RawTemplate;
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new Error("Top-level JSON must be an object.");
      }
      addTemplate(name, raw);
      setError(null);
    } catch (e) {
      setError(`${name}: ${(e as Error).message}`);
    }
  }

  async function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const text = await file.text();
      await ingest(file.name, text);
    }
  }

  async function handleFolder(files: FileList) {
    const jsons = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith(".json") && f.name !== "index.json",
    );
    if (jsons.length === 0) {
      setError("No .json files found in that folder.");
      return;
    }
    for (const file of jsons) {
      const text = await file.text();
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      await ingest(rel || file.name, text);
    }
  }

  async function loadSamples() {
    let names: string[] = [];
    try {
      const res = await fetch("/samples/index.json", { cache: "no-store" });
      names = (await res.json()) as string[];
    } catch {
      setError("Could not read samples manifest (public/samples/index.json).");
      return;
    }
    if (names.length === 0) {
      setError("No sample files found in public/samples.");
      return;
    }
    for (const name of names) {
      try {
        const res = await fetch(`/samples/${name}`, { cache: "no-store" });
        await ingest(name, await res.text());
      } catch {
        setError(`Failed to load sample ${name}`);
      }
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed p-4 text-center text-xs transition-colors ${
          dragging ? "border-accent bg-selected" : "border-border2"
        }`}
      >
        <p className="mb-2 text-muted">Drop template JSON here</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          <Button size="sm" variant="primary" onClick={() => fileInput.current?.click()}>
            Add files…
          </Button>
          <Button size="sm" variant="primary" onClick={() => folderInput.current?.click()}>
            Add folder…
          </Button>
          <Button size="sm" onClick={() => setPasteOpen((v) => !v)}>
            Paste JSON
          </Button>
          <Button size="sm" variant="ghost" onClick={loadSamples}>
            Load samples
          </Button>
        </div>
        <input
          ref={folderInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFolder(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {pasteOpen && (
        <div className="space-y-1.5 rounded-lg border border-border p-2">
          <input
            value={pasteName}
            onChange={(e) => setPasteName(e.target.value)}
            placeholder="name (e.g. reprice_retail.json)"
            className="w-full rounded border border-border2 bg-surface px-2 py-1 text-xs text-fg"
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="{ … paste template JSON … }"
            rows={5}
            className="scroll-thin w-full rounded border border-border2 bg-surface px-2 py-1 font-mono text-[11px] text-fg"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              ingest(pasteName || `pasted-${Date.now()}.json`, pasteText);
              setPasteText("");
              setPasteName("");
              setPasteOpen(false);
            }}
          >
            Add
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
