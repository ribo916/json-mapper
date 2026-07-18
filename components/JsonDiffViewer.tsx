"use client";

import React, { useMemo, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { LoadedTemplate } from "@/lib/template/types";
import { serialize } from "@/lib/template/serialize";
import { EDITOR_OPTIONS, useMonacoTheme } from "./monaco/setup";
import { Button, Checkbox, Segmented } from "./ui";

function FilePicker({
  label,
  value,
  templates,
  onChange,
}: {
  label: string;
  value: string;
  templates: LoadedTemplate[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[200px] rounded border border-border2 bg-surface px-2 py-1 text-xs text-fg"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function JsonDiffViewer({ templates }: { templates: LoadedTemplate[] }) {
  const theme = useMonacoTheme();
  const [leftId, setLeftId] = useState(templates[0]?.id);
  const [rightId, setRightId] = useState(templates[1]?.id ?? templates[0]?.id);
  const [layout, setLayout] = useState<"side" | "inline">("side");
  const [ignoreWs, setIgnoreWs] = useState(false);

  const left = templates.find((t) => t.id === leftId) ?? templates[0];
  const right = templates.find((t) => t.id === rightId) ?? templates[1] ?? templates[0];

  const original = useMemo(() => serialize(left.raw), [left]);
  const modified = useMemo(() => serialize(right.raw), [right]);

  function swap() {
    setLeftId(right.id);
    setRightId(left.id);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
        <FilePicker label="Left" value={left.id} templates={templates} onChange={setLeftId} />
        <Button size="sm" variant="ghost" onClick={swap} title="Swap sides">
          ⇄
        </Button>
        <FilePicker label="Right" value={right.id} templates={templates} onChange={setRightId} />
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Checkbox label="ignore whitespace" checked={ignoreWs} onChange={setIgnoreWs} />
          <Segmented
            value={layout}
            onChange={(v) => setLayout(v)}
            options={[
              { value: "side", label: "Side by side" },
              { value: "inline", label: "Inline" },
            ]}
          />
        </div>
      </div>

      {left.id === right.id && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Left and right are the same file — pick two different files to see a diff.
        </div>
      )}

      {/* Which two files, and which side is which */}
      <div className="flex border-b border-border bg-surface2 text-xs text-fg">
        {layout === "side" ? (
          <>
            <div className="flex-1 truncate px-3 py-1.5">
              <span className="mr-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
                original
              </span>
              <span className="font-mono font-medium">{left.name}</span>
            </div>
            <div className="flex-1 truncate border-l border-border px-3 py-1.5">
              <span className="mr-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                modified
              </span>
              <span className="font-mono font-medium">{right.name}</span>
            </div>
          </>
        ) : (
          <div className="px-3 py-1.5">
            <span className="font-mono font-medium">{left.name}</span>
            <span className="mx-1.5 text-rose-600 dark:text-rose-300">(original)</span>
            <span className="text-faint">→</span>
            <span className="ml-1.5 font-mono font-medium">{right.name}</span>
            <span className="ml-1.5 text-emerald-700 dark:text-emerald-300">(modified)</span>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <DiffEditor
          height="100%"
          language="json"
          theme={theme}
          original={original}
          modified={modified}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          options={{
            ...EDITOR_OPTIONS,
            readOnly: true,
            originalEditable: false,
            renderSideBySide: layout === "side",
            ignoreTrimWhitespace: ignoreWs,
            renderOverviewRuler: true,
          }}
          loading={<div className="p-4 text-sm text-faint">Loading diff…</div>}
        />
      </div>

      <div className="border-t border-border px-3 py-1.5 text-[11px] text-faint">
        Read-only line-level diff (VS Code engine). Left = original, right = modified; removed lines in
        red, added in green. Edit values in the Raw JSON or Editor tabs.
      </div>
    </div>
  );
}
