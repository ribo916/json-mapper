"use client";

import React from "react";
import { NormalizedField, ValuePrimitive } from "@/lib/template/types";
import { DataType, inferType } from "@/lib/template/edit";
import { useStore } from "@/state/store";
import { Badge, Switch, cn } from "./ui";

function ToggleChip({
  label,
  checked,
  onChange,
  tone,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tone: "sky" | "amber" | "rose";
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Switch checked={checked} onChange={onChange} tone={tone} label={label} />
      <span className={cn("text-[10px]", checked ? "text-fg" : "text-faint")}>{label}</span>
    </span>
  );
}

function ValueEditor({
  type,
  value,
  onChange,
}: {
  type: DataType;
  value: ValuePrimitive | undefined;
  onChange: (v: ValuePrimitive | undefined) => void;
}) {
  if (type === "boolean") {
    return (
      <div className="flex items-center gap-1.5">
        <Switch checked={value === true} onChange={(v) => onChange(v)} tone="emerald" label="value" />
        <span className="text-[10px] text-faint">{value === true ? "true" : "false"}</span>
      </div>
    );
  }
  if (type === "number") {
    return (
      <input
        inputMode="decimal"
        value={value === undefined ? "" : String(value)}
        placeholder="—"
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") return onChange(undefined);
          const n = Number(v);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-24 rounded border border-border2 bg-surface px-1.5 py-0.5 text-right text-xs text-fg"
      />
    );
  }
  return (
    <input
      value={value === undefined ? "" : String(value)}
      placeholder="—"
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className="w-28 rounded border border-border2 bg-surface px-1.5 py-0.5 text-xs text-fg"
    />
  );
}

export function FieldCard({
  templateId,
  field,
}: {
  templateId: string;
  field: NormalizedField;
}) {
  const updateFlag = useStore((s) => s.updateFlag);
  const updateValue = useStore((s) => s.updateValue);
  const setFieldType = useStore((s) => s.setFieldType);
  const removeField = useStore((s) => s.removeField);
  const override = useStore((s) => s.typeOverrides[`${templateId}:${field.id}`]);

  const c = field.control;
  const type: DataType = override ?? inferType(c.value) ?? "string";

  return (
    <div className="group rounded-md border border-border bg-surface p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-mono text-xs text-fg" title={field.id}>
            {field.key}
          </span>
          {field.subGroup && <Badge tone="slate">{field.subGroup}</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <select
            value={type}
            onChange={(e) => setFieldType(templateId, field.id, field.path, e.target.value as DataType)}
            className="rounded border border-border2 bg-surface2 px-1 py-0.5 text-[11px] text-muted"
            title="Datatype"
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
          </select>
          <button
            onClick={() => removeField(templateId, field.path)}
            title="Delete field"
            className="text-faint opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <ToggleChip
          label="visible"
          tone="sky"
          checked={!!c.visible}
          onChange={(v) => updateFlag(templateId, field.path, "visible", v)}
        />
        <ToggleChip
          label="disabled"
          tone="amber"
          checked={!!c.disabled}
          onChange={(v) => updateFlag(templateId, field.path, "disabled", v)}
        />
        <ToggleChip
          label="required"
          tone="rose"
          checked={!!c.required}
          onChange={(v) => updateFlag(templateId, field.path, "required", v)}
        />
        <div className="ml-auto">
          <ValueEditor
            type={type}
            value={c.value}
            onChange={(v) => updateValue(templateId, field.path, v)}
          />
        </div>
      </div>
    </div>
  );
}
