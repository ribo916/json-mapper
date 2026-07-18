"use client";

import React, { useMemo, useState } from "react";
import { classify, isPlainObject } from "@/lib/template/classify";
import { LoadedTemplate, NormalizedField, isFreeform } from "@/lib/template/types";
import { downloadJson } from "@/lib/template/serialize";
import { useStore } from "@/state/store";
import { FieldCard } from "./ConfigTable";
import { EnumTable } from "./EnumTable";
import { Badge, Button, InlineAdder, Segmented, cn } from "./ui";

type Filter = "all" | "hidden" | "required";
const ENUM_SECTION = "__enums__";

export function TemplateEditor({ template }: { template: LoadedTemplate }) {
  const addField = useStore((s) => s.addField);
  const addEnum = useStore((s) => s.addEnum);
  const addSection = useStore((s) => s.addSection);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const n = useMemo(() => classify(template.raw), [template.raw]);
  const q = query.trim().toLowerCase();
  const filtering = q !== "" || filter !== "all";

  // Field sections = top-level keys whose value is a plain object (so new/empty
  // sections still render, letting you add fields into them).
  const sections = useMemo(() => {
    const byId = new Map<string, NormalizedField[]>();
    for (const f of n.fields) {
      const list = byId.get(f.section) ?? [];
      list.push(f);
      byId.set(f.section, list);
    }
    const names = n.sectionOrder.filter((k) =>
      isPlainObject((template.raw as Record<string, unknown>)[k]),
    );
    return names
      .map((section) => {
        const all = byId.get(section) ?? [];
        const fields = all.filter((f) => {
          if (q && !f.id.toLowerCase().includes(q) && !f.key.toLowerCase().includes(q))
            return false;
          if (filter === "hidden" && f.control.visible !== false) return false;
          if (filter === "required" && f.control.required !== true) return false;
          return true;
        });
        return { section, fields, total: all.length };
      })
      .filter((s) => (filtering ? s.fields.length > 0 : true));
  }, [n, template.raw, q, filter, filtering]);

  const showEnums = n.enums.length > 0 && !filtering;
  const allSectionKeys = [
    ...sections.map((s) => s.section),
    ...(showEnums ? [ENUM_SECTION] : []),
  ];
  const allCollapsed = allSectionKeys.length > 0 && allSectionKeys.every((k) => collapsed.has(k));

  function toggle(section: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  }
  function setAll(collapse: boolean) {
    setCollapsed(collapse ? new Set(allSectionKeys) : new Set());
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-fg">{template.name}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fields…"
            className="w-40 rounded border border-border2 bg-surface px-2 py-1 text-xs text-fg"
          />
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v)}
            options={[
              { value: "all", label: "All" },
              { value: "hidden", label: "Hidden" },
              { value: "required", label: "Required" },
            ]}
          />
          <Button size="sm" variant="ghost" onClick={() => setAll(!allCollapsed)}>
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
          <Button size="sm" variant="primary" onClick={() => downloadJson(template.name, template.raw)}>
            Export
          </Button>
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto p-3">
        {sections.map(({ section, fields, total }) => {
          const isOpen = !collapsed.has(section);
          return (
            <div
              key={section}
              className="mb-3 overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
            >
              <SectionHeader
                open={isOpen}
                onClick={() => toggle(section)}
                title={section}
                count={total}
                freeform={isFreeform(section)}
              />
              {isOpen && (
                <div className="bg-bg">
                  {fields.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 p-2 xl:grid-cols-2">
                      {fields.map((f) => (
                        <FieldCard key={f.id} templateId={template.id} field={f} />
                      ))}
                    </div>
                  )}
                  {!filtering && (
                    <div className="flex items-center gap-2 px-2 pb-2 pt-1">
                      <InlineAdder
                        label="+ add field"
                        placeholder="new field key…"
                        onAdd={(key) => addField(template.id, [section], key)}
                      />
                      {total === 0 && (
                        <span className="text-[11px] text-faint">empty section</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {showEnums && (
          <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeader
              open={!collapsed.has(ENUM_SECTION)}
              onClick={() => toggle(ENUM_SECTION)}
              title="Enumerations"
              count={n.enums.length}
            />
            {!collapsed.has(ENUM_SECTION) && (
              <div className="space-y-3 bg-bg p-3">
                {n.enums.map((e) => (
                  <EnumTable key={e.name} templateId={template.id} en={e} />
                ))}
                <InlineAdder
                  label="+ add enumeration"
                  placeholder="new enum name (e.g. loanTypeOptions)…"
                  onAdd={(name) => addEnum(template.id, name)}
                />
              </div>
            )}
          </div>
        )}

        {!filtering && (
          <div className="mb-3 flex items-center gap-2 px-1">
            <InlineAdder
              label="+ add section"
              placeholder="new section key (e.g. compliance)…"
              onAdd={(name) => addSection(template.id, name)}
            />
          </div>
        )}

        {filtering && sections.length === 0 && (
          <p className="px-1 text-xs text-faint">No fields match the current filter.</p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  open,
  onClick,
  title,
  count,
  freeform,
}: {
  open: boolean;
  onClick: () => void;
  title: string;
  count: number;
  freeform?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 border-b border-border bg-surface2 px-3 py-2 text-left hover:bg-border"
    >
      <span className={cn("text-faint transition-transform", open && "rotate-90")}>▸</span>
      <h3 className="font-mono text-sm font-semibold">{title}</h3>
      {freeform && <Badge tone="violet">free-form / org-specific</Badge>}
      <Badge tone="slate">{count}</Badge>
    </button>
  );
}
