import {
  EnumOption,
  FieldControl,
  FIELD_CONTROL_KEYS,
  NormalizedEnum,
  NormalizedField,
  NormalizedScalar,
  RawTemplate,
  ValuePrimitive,
} from "./types";

export interface NormalizedTemplate {
  fields: NormalizedField[];
  enums: NormalizedEnum[];
  scalars: NormalizedScalar[];
  /** Order of top-level sections as they appear in the file. */
  sectionOrder: string[];
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPrimitive(v: unknown): v is ValuePrimitive {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/** A leaf is a FieldControl when it is a non-empty object whose keys are all
 * drawn from the FieldControl key set. */
export function isFieldControl(v: unknown): v is FieldControl {
  if (!isPlainObject(v)) return false;
  const keys = Object.keys(v);
  if (keys.length === 0) return false;
  return keys.every((k) => (FIELD_CONTROL_KEYS as readonly string[]).includes(k));
}

/** An enum array is a non-empty array whose items all have `id` and `text`. */
export function isEnumArray(v: unknown): v is EnumOption[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((item) => isPlainObject(item) && "id" in item && "text" in item)
  );
}

function walk(
  node: Record<string, unknown>,
  path: string[],
  section: string,
  out: NormalizedTemplate,
): void {
  for (const [key, value] of Object.entries(node)) {
    const p = [...path, key];
    if (isEnumArray(value)) {
      out.enums.push({ name: p.join("."), path: p, options: value });
    } else if (isFieldControl(value)) {
      out.fields.push({
        path: p,
        id: p.join("."),
        section,
        subGroup: p.length > 2 ? p[1] : undefined,
        key,
        control: value,
      });
    } else if (isPlainObject(value)) {
      // A nested sub-group (e.g. criteria.armPrograms): recurse.
      walk(value, p, section, out);
    } else if (isPrimitive(value)) {
      out.scalars.push({ path: p, id: p.join("."), section, value });
    }
    // Anything else (null, nested arrays that aren't enums) is left in raw only.
  }
}

/** Build the normalized index (views into the raw object) used by the UI. */
export function classify(raw: RawTemplate): NormalizedTemplate {
  const out: NormalizedTemplate = {
    fields: [],
    enums: [],
    scalars: [],
    sectionOrder: Object.keys(raw),
  };
  for (const [key, value] of Object.entries(raw)) {
    if (isEnumArray(value)) {
      out.enums.push({ name: key, path: [key], options: value });
    } else if (isFieldControl(value)) {
      out.fields.push({ path: [key], id: key, section: key, key, control: value });
    } else if (isPlainObject(value)) {
      walk(value, [key], key, out);
    } else if (isPrimitive(value)) {
      out.scalars.push({ path: [key], id: key, section: key, value });
    }
  }
  return out;
}

/** Fields grouped by top-level section, preserving section order. */
export function fieldsBySection(
  n: NormalizedTemplate,
): { section: string; fields: NormalizedField[] }[] {
  const bySection = new Map<string, NormalizedField[]>();
  for (const f of n.fields) {
    const list = bySection.get(f.section) ?? [];
    list.push(f);
    bySection.set(f.section, list);
  }
  return n.sectionOrder
    .filter((s) => bySection.has(s))
    .map((section) => ({ section, fields: bySection.get(section)! }));
}
