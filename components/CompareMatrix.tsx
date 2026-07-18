"use client";

import React, { useMemo, useState } from "react";
import { LoadedTemplate } from "@/lib/template/types";
import { diffTemplates, FieldRow, FieldCell, EnumCell } from "@/lib/template/diff";
import { Badge, Button, Checkbox, cn } from "./ui";

function Pill({
  children,
  tone,
  highlight,
}: {
  children: React.ReactNode;
  tone: "sky" | "slate" | "amber" | "rose" | "violet";
  highlight?: boolean;
}) {
  const tones = {
    sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    slate: "bg-surface2 text-muted",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    violet: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  };
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
        tones[tone],
        highlight && "font-bold ring-2 ring-amber-400 ring-offset-1 ring-offset-surface",
      )}
    >
      {children}
    </span>
  );
}

/** A clear red ✕ meaning the field/enum is not present in that file. */
function AbsentMark() {
  return (
    <span className="font-bold text-rose-600 dark:text-rose-400" title="not present in this file">
      ✕
    </span>
  );
}

function Cell({ cell }: { cell: FieldCell }) {
  if (!cell.present) return <AbsentMark />;
  const c = cell.control!;
  const dev = new Set(cell.deviating);
  const chips: React.ReactNode[] = [];

  chips.push(
    <Pill key="vis" tone={c.visible === false ? "slate" : "sky"} highlight={dev.has("visible")}>
      {c.visible === false ? "hidden" : "shown"}
    </Pill>,
  );
  if (c.disabled === true || dev.has("disabled")) {
    chips.push(
      <Pill key="dis" tone="amber" highlight={dev.has("disabled")}>
        {c.disabled ? "disabled" : "not disabled"}
      </Pill>,
    );
  }
  if (c.required === true || dev.has("required")) {
    chips.push(
      <Pill key="req" tone="rose" highlight={dev.has("required")}>
        {c.required ? "required" : "not required"}
      </Pill>,
    );
  }
  if (c.value !== undefined) {
    chips.push(
      <Pill key="val" tone="violet" highlight={dev.has("value")}>
        = {String(c.value)}
      </Pill>,
    );
  } else if (dev.has("value")) {
    chips.push(
      <Pill key="val" tone="violet" highlight>
        no value
      </Pill>,
    );
  }
  return <div className="flex flex-wrap gap-1">{chips}</div>;
}

function FieldRowView({ row }: { row: FieldRow }) {
  return (
    <tr className={cn(row.differs ? "bg-amber-50/60 dark:bg-amber-950/15" : undefined)}>
      <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-1.5 align-top">
        <span className="font-mono text-xs text-fg">{row.key}</span>
      </td>
      {row.cells.map((cell, i) => (
        <td key={i} className="border-l border-border px-3 py-1.5 align-top">
          <Cell cell={cell} />
        </td>
      ))}
    </tr>
  );
}

function SectionRow({
  title,
  open,
  onClick,
  span,
  shown,
  differ,
  tone = "slate",
}: {
  title: string;
  open: boolean;
  onClick: () => void;
  span: number;
  shown: number;
  differ: number;
  tone?: "slate" | "violet";
}) {
  return (
    <tr>
      <td
        colSpan={span}
        onClick={onClick}
        className={cn(
          "sticky left-0 cursor-pointer select-none",
          tone === "violet"
            ? "bg-violet-100 hover:bg-violet-200/70 dark:bg-violet-950/40 dark:hover:bg-violet-900/40"
            : "bg-surface2 hover:bg-border",
        )}
      >
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className={cn("text-faint transition-transform", open && "rotate-90")}>▸</span>
          <span
            className={cn(
              "font-mono text-xs font-semibold text-fg",
              tone === "violet" && "text-violet-800 dark:text-violet-200",
            )}
          >
            {title}
          </span>
          <Badge tone="slate">{shown}</Badge>
          {differ > 0 && <Badge tone="amber">{differ} differ</Badge>}
          {tone === "violet" && (
            <span className="text-[10px] text-violet-700 dark:text-violet-300">
              free-form / org-specific — differences expected
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function enumSignature(cell: EnumCell): string {
  if (!cell.present) return "__absent__";
  return cell.count + "|" + Object.keys(cell.byId).sort().map((k) => `${k}:${cell.byId[k]}`).join(",");
}

function groupBySection(rows: FieldRow[]): { section: string; rows: FieldRow[] }[] {
  const order: string[] = [];
  const map = new Map<string, FieldRow[]>();
  for (const r of rows) {
    if (!map.has(r.section)) {
      map.set(r.section, []);
      order.push(r.section);
    }
    map.get(r.section)!.push(r);
  }
  return order.map((section) => ({ section, rows: map.get(section)! }));
}

const ENUM_KEY = "__enums__";

export function CompareMatrix({ templates }: { templates: LoadedTemplate[] }) {
  const [diffOnly, setDiffOnly] = useState(true);
  const [hideFreeform, setHideFreeform] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const diff = useMemo(() => diffTemplates(templates), [templates]);
  const colCount = diff.columns.length;
  const span = colCount + 1;

  const standardSections = useMemo(() => groupBySection(diff.standardFields), [diff.standardFields]);

  const sections = useMemo(() => {
    const out: { key: string; title: string; tone: "slate" | "violet"; rows: FieldRow[] }[] = [];
    for (const g of standardSections) {
      const rows = diffOnly ? g.rows.filter((r) => r.differs) : g.rows;
      if (rows.length > 0) out.push({ key: g.section, title: g.section, tone: "slate", rows });
    }
    if (!hideFreeform) {
      const rows = diffOnly ? diff.freeformFields.filter((r) => r.differs) : diff.freeformFields;
      if (rows.length > 0)
        out.push({ key: "customParameters", title: "customParameters", tone: "violet", rows });
    }
    return out;
  }, [standardSections, diff.freeformFields, diffOnly, hideFreeform]);

  const enumRows = diffOnly ? diff.enums.filter((e) => e.differs) : diff.enums;

  const diffCount =
    diff.standardFields.filter((r) => r.differs).length +
    diff.freeformFields.filter((r) => r.differs).length +
    diff.enums.filter((r) => r.differs).length;

  const allKeys = [...sections.map((s) => s.key), ...(enumRows.length > 0 ? [ENUM_KEY] : [])];
  const allCollapsed = allKeys.length > 0 && allKeys.every((k) => collapsed.has(k));

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  function setAll(collapse: boolean) {
    setCollapsed(collapse ? new Set(allKeys) : new Set());
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-fg">Compare · {colCount} files</span>
        <Badge tone={diffCount > 0 ? "amber" : "emerald"}>
          {diffCount} {diffCount === 1 ? "difference" : "differences"}
        </Badge>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Checkbox label="differences only" checked={diffOnly} onChange={setDiffOnly} />
          <Checkbox label="hide customParameters" checked={hideFreeform} onChange={setHideFreeform} />
          <Button size="sm" variant="ghost" onClick={() => setAll(!allCollapsed)}>
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface2 px-3 py-1.5 text-[10px] text-muted">
        <span>Legend:</span>
        <Pill tone="sky">shown</Pill>
        <Pill tone="slate">hidden</Pill>
        <Pill tone="amber">disabled</Pill>
        <Pill tone="rose">required</Pill>
        <Pill tone="violet">= value</Pill>
        <span className="inline-flex items-center gap-1">
          <AbsentMark /> not in file
        </span>
        <span className="ml-1 inline-flex items-center gap-1">
          <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ring-2 ring-amber-400">
            outlined
          </span>
          = the one that differs
        </span>
      </div>

      <div className="scroll-thin flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-surface shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 border-r border-border bg-surface px-3 py-2 text-left text-xs font-semibold text-fg">
                Field
              </th>
              {diff.columns.map((c) => (
                <th
                  key={c.id}
                  className="border-l border-border px-3 py-2 text-left text-xs font-semibold text-fg"
                  title={c.name}
                >
                  <span className="block max-w-[160px] truncate">{c.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const open = !collapsed.has(s.key);
              const differ = s.rows.filter((r) => r.differs).length;
              return (
                <React.Fragment key={s.key}>
                  <SectionRow
                    title={s.title}
                    open={open}
                    onClick={() => toggle(s.key)}
                    span={span}
                    shown={s.rows.length}
                    differ={differ}
                    tone={s.tone}
                  />
                  {open && s.rows.map((row) => <FieldRowView key={row.id} row={row} />)}
                </React.Fragment>
              );
            })}

            {enumRows.length > 0 && (
              <>
                <SectionRow
                  title="Enumerations"
                  open={!collapsed.has(ENUM_KEY)}
                  onClick={() => toggle(ENUM_KEY)}
                  span={span}
                  shown={enumRows.length}
                  differ={enumRows.filter((e) => e.differs).length}
                />
                {!collapsed.has(ENUM_KEY) &&
                  enumRows.map((row) => {
                    const sigs = row.cells.map(enumSignature);
                    const majoritySig = mode(sigs);
                    return (
                      <tr key={row.name} className={cn(row.differs && "bg-amber-50/60 dark:bg-amber-950/15")}>
                        <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-1.5 align-top">
                          <span className="font-mono text-xs text-fg">{row.name}</span>
                        </td>
                        {row.cells.map((cell, i) => (
                          <td key={i} className="border-l border-border px-3 py-1.5 align-top">
                            {cell.present ? (
                              <Pill tone="violet" highlight={row.differs && sigs[i] !== majoritySig}>
                                {cell.count} options
                              </Pill>
                            ) : (
                              <AbsentMark />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </>
            )}
          </tbody>
        </table>

        {diffOnly && diffCount === 0 && (
          <p className="p-6 text-center text-sm text-emerald-700 dark:text-emerald-300">
            No differences — these {colCount} files are identical across all fields and enumerations.
          </p>
        )}
      </div>
    </div>
  );
}

function mode(vals: string[]): string {
  const counts = new Map<string, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = vals[0];
  let bestN = 0;
  for (const [v, n] of counts)
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  return best;
}
