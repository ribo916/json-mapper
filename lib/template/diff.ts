import { classify, NormalizedTemplate } from "./classify";
import { FieldControl, FREEFORM_SECTION, LoadedTemplate } from "./types";

/** Attributes we diff on, besides presence. */
export const DIFF_ATTRS = ["visible", "disabled", "required", "value"] as const;
export type DiffAttr = (typeof DIFF_ATTRS)[number] | "presence";

export interface FieldCell {
  present: boolean;
  control?: FieldControl;
  /** Attributes where THIS cell deviates from the row's majority (or is absent). */
  deviating: DiffAttr[];
}

export interface FieldRow {
  id: string; // dotted path
  section: string;
  key: string;
  freeform: boolean; // customParameters
  cells: FieldCell[]; // one per template, in column order
  differs: boolean;
  /** Which attributes vary across the row (drives the "differs on" tags). */
  diffAttrs: DiffAttr[];
}

export interface EnumCell {
  present: boolean;
  count: number;
  byId: Record<string, string>;
}

export interface EnumRow {
  name: string;
  cells: EnumCell[];
  differs: boolean;
}

export interface DiffResult {
  columns: { id: string; name: string }[];
  standardFields: FieldRow[];
  freeformFields: FieldRow[];
  enums: EnumRow[];
}

/** Normalized comparable value for one attribute of a control. */
function attrValue(c: FieldControl, attr: (typeof DIFF_ATTRS)[number]): string | boolean | number | null {
  switch (attr) {
    case "visible":
      return c.visible !== false; // absent == visible
    case "disabled":
      return c.disabled === true;
    case "required":
      return c.required === true;
    case "value":
      return c.value === undefined ? null : c.value;
  }
}

function majority<T>(vals: T[]): T {
  const counts = new Map<string, { v: T; n: number }>();
  for (const v of vals) {
    const k = JSON.stringify(v);
    const e = counts.get(k);
    if (e) e.n += 1;
    else counts.set(k, { v, n: 1 });
  }
  let best: { v: T; n: number } | undefined;
  for (const e of counts.values()) if (!best || e.n > best.n) best = e;
  return best!.v;
}

function enumsEqual(a: EnumCell, b: EnumCell): boolean {
  if (!a.present || !b.present) return false;
  const aKeys = Object.keys(a.byId);
  const bKeys = Object.keys(b.byId);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => b.byId[k] === a.byId[k]);
}

export function diffTemplates(templates: LoadedTemplate[]): DiffResult {
  const columns = templates.map((t) => ({ id: t.id, name: t.name }));
  const normalized: NormalizedTemplate[] = templates.map((t) => classify(t.raw));

  // ---- Fields --------------------------------------------------------------
  const fieldMeta = new Map<string, { section: string; key: string }>();
  const fieldOrder: string[] = [];
  const perTemplateFields = normalized.map((n) => {
    const map = new Map<string, FieldControl>();
    for (const f of n.fields) {
      if (!fieldMeta.has(f.id)) {
        fieldMeta.set(f.id, { section: f.section, key: f.key });
        fieldOrder.push(f.id);
      }
      map.set(f.id, f.control);
    }
    return map;
  });

  const standardFields: FieldRow[] = [];
  const freeformFields: FieldRow[] = [];
  for (const id of fieldOrder) {
    const meta = fieldMeta.get(id)!;
    const cells: FieldCell[] = perTemplateFields.map((m) => {
      const control = m.get(id);
      return { present: control !== undefined, control, deviating: [] as DiffAttr[] };
    });

    const presentCells = cells.filter((c) => c.present);
    const diffAttrs: DiffAttr[] = [];

    // Presence
    const anyAbsent = cells.some((c) => !c.present);
    if (anyAbsent && presentCells.length > 0) {
      diffAttrs.push("presence");
      for (const c of cells) if (!c.present) c.deviating.push("presence");
    }

    // Per-attribute
    for (const attr of DIFF_ATTRS) {
      const vals = presentCells.map((c) => attrValue(c.control!, attr));
      const allSame = vals.every((v) => JSON.stringify(v) === JSON.stringify(vals[0]));
      if (!allSame) {
        diffAttrs.push(attr);
        const maj = majority(vals);
        for (const c of presentCells) {
          if (JSON.stringify(attrValue(c.control!, attr)) !== JSON.stringify(maj)) {
            c.deviating.push(attr);
          }
        }
      }
    }

    const row: FieldRow = {
      id,
      section: meta.section,
      key: meta.key,
      freeform: meta.section === FREEFORM_SECTION,
      cells,
      differs: diffAttrs.length > 0,
      diffAttrs,
    };
    (row.freeform ? freeformFields : standardFields).push(row);
  }

  // ---- Enums ---------------------------------------------------------------
  const enumOrder: string[] = [];
  const perTemplateEnums = normalized.map((n) => {
    const map = new Map<string, EnumCell>();
    for (const e of n.enums) {
      if (!enumOrder.includes(e.name)) enumOrder.push(e.name);
      const byId: Record<string, string> = {};
      for (const o of e.options) byId[String(o.id)] = o.text;
      map.set(e.name, { present: true, count: e.options.length, byId });
    }
    return map;
  });

  const enums: EnumRow[] = enumOrder.map((name) => {
    const cells: EnumCell[] = perTemplateEnums.map(
      (m) => m.get(name) ?? { present: false, count: 0, byId: {} },
    );
    let differs = false;
    for (let i = 1; i < cells.length; i++) {
      if (!enumsEqual(cells[0], cells[i])) {
        differs = true;
        break;
      }
    }
    if (cells.some((c) => !c.present) && cells.some((c) => c.present)) differs = true;
    return { name, cells, differs };
  });

  return { columns, standardFields, freeformFields, enums };
}
