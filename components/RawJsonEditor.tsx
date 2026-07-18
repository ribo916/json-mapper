"use client";

import React, { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { LoadedTemplate } from "@/lib/template/types";
import { serialize, downloadJson } from "@/lib/template/serialize";
import { useStore } from "@/state/store";
import { EDITOR_OPTIONS, useMonacoTheme } from "./monaco/setup";
import { Badge, Button } from "./ui";

export function RawJsonEditor({ template }: { template: LoadedTemplate }) {
  const replaceRaw = useStore((s) => s.replaceRaw);
  const theme = useMonacoTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const [text, setText] = useState(() => serialize(template.raw));
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reseed when the active file changes (component may stay mounted).
  useEffect(() => {
    setText(serialize(template.raw));
    setDirty(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  // Live JSON validation.
  useEffect(() => {
    try {
      JSON.parse(text);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [text]);

  function apply() {
    try {
      const raw = JSON.parse(text);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        setError("Top-level JSON must be an object.");
        return;
      }
      replaceRaw(template.id, raw);
      setText(serialize(raw));
      setDirty(false);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function format() {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  }

  function reload() {
    setText(serialize(template.raw));
    setDirty(false);
    setError(null);
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-fg">{template.name}</span>
        {error ? (
          <Badge tone="rose">invalid JSON</Badge>
        ) : dirty ? (
          <Badge tone="amber">unsaved edits</Badge>
        ) : (
          <Badge tone="emerald">valid · saved</Badge>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={format}>Format</Button>
          <Button size="sm" onClick={copy}>{copied ? "Copied!" : "Copy"}</Button>
          <Button size="sm" onClick={reload} disabled={!dirty}>Reload</Button>
          <Button size="sm" onClick={() => downloadJson(template.name, template.raw)}>Download</Button>
          <Button size="sm" variant="primary" onClick={apply} disabled={!!error || !dirty}>
            Apply changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="json"
          theme={theme}
          value={text}
          onChange={(v) => {
            setText(v ?? "");
            setDirty(true);
          }}
          onMount={(ed) => {
            editorRef.current = ed;
          }}
          options={EDITOR_OPTIONS}
          loading={<div className="p-4 text-sm text-faint">Loading editor…</div>}
        />
      </div>

      <div className="border-t border-border px-3 py-1.5 text-[11px] text-faint">
        Edit raw JSON here, then <span className="font-medium text-muted">Apply changes</span> to update
        the file everywhere (Editor and Compare reflect it).{" "}
        <span className="font-medium text-muted">Download</span> exports the last-applied version.
      </div>
    </div>
  );
}
