"use client";

import React, { useState } from "react";
import Link from "next/link";
import { activeTemplate, useStore } from "@/state/store";
import { FileTray } from "./FileTray";
import { TemplateEditor } from "./TemplateEditor";
import { CompareMatrix } from "./CompareMatrix";
import { RawJsonEditor } from "./RawJsonEditor";
import { JsonDiffViewer } from "./JsonDiffViewer";
import { ValidationPanel } from "./ValidationPanel";
import { ThemeMenu } from "./ThemeMenu";
import { Button, Segmented } from "./ui";

export function WorkspaceShell() {
  const templates = useStore((s) => s.templates);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const active = useStore(activeTemplate);
  const [showIssues, setShowIssues] = useState(false);

  const compareSet = templates;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
        <Link
          href="/"
          title="Back to Data Tools Suite"
          className="text-xs font-medium text-faint hover:text-accent-text"
        >
          ←
        </Link>
        <h1 className="text-sm font-bold tracking-tight text-fg">
          PricerUITemplate <span className="text-accent-text">Studio</span>
        </h1>
        <div className="ml-2">
          <Segmented
            value={view}
            onChange={(v) => setView(v)}
            options={[
              { value: "editor", label: "Editor" },
              { value: "compare", label: "Compare", disabled: templates.length < 2 },
              { value: "json", label: "Raw JSON", disabled: templates.length === 0 },
              { value: "jsonDiff", label: "JSON Diff", disabled: templates.length < 2 },
            ]}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {view === "editor" && active && (
            <Button size="sm" variant="ghost" onClick={() => setShowIssues((v) => !v)}>
              {showIssues ? "Hide issues" : "Issues"}
            </Button>
          )}
          <ThemeMenu />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left tray */}
        <aside className="w-64 shrink-0 border-r border-border bg-surface p-3">
          <FileTray />
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 bg-bg">
          {templates.length === 0 ? (
            <EmptyState />
          ) : view === "compare" && compareSet.length >= 2 ? (
            <CompareMatrix templates={compareSet} />
          ) : view === "jsonDiff" && compareSet.length >= 2 ? (
            <JsonDiffViewer templates={compareSet} />
          ) : view === "json" && active ? (
            <RawJsonEditor template={active} />
          ) : active ? (
            <TemplateEditor template={active} />
          ) : (
            <EmptyState />
          )}
        </main>

        {/* Right issues drawer */}
        {showIssues && view === "editor" && active && (
          <aside className="w-80 shrink-0 overflow-auto border-l border-border bg-surface p-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
              Validation
            </h2>
            <ValidationPanel template={active} />
          </aside>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-2">
        <p className="text-lg font-semibold text-fg">Load a template to begin</p>
        <p className="text-sm text-muted">
          Drop a PricerUITemplate JSON, paste one, or click{" "}
          <span className="font-medium text-fg">Load samples</span> in the left panel. Select
          one file to edit it, or two or more to compare.
        </p>
      </div>
    </div>
  );
}
