import { EnumOption, RawTemplate, ValuePrimitive } from "./types";

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Return the object at the parent of `path`, creating nothing. */
function parentAt(raw: RawTemplate, path: string[]): Record<string, unknown> | undefined {
  let node: unknown = raw;
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[path[i]];
  }
  return typeof node === "object" && node !== null
    ? (node as Record<string, unknown>)
    : undefined;
}

function nodeAt(raw: RawTemplate, path: string[]): unknown {
  let node: unknown = raw;
  for (const seg of path) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[seg];
  }
  return node;
}

/** Set a FieldControl flag (visible/disabled/required) on a clone of `raw`. */
export function setFieldFlag(
  raw: RawTemplate,
  path: string[],
  flag: "visible" | "disabled" | "required",
  value: boolean,
): RawTemplate {
  const next = deepClone(raw);
  const parent = parentAt(next, path);
  if (!parent) return next;
  const field = parent[path[path.length - 1]];
  if (typeof field === "object" && field !== null) {
    (field as Record<string, unknown>)[flag] = value;
  }
  return next;
}

/** Set (or clear) a FieldControl's `value` on a clone of `raw`. */
export function setFieldValue(
  raw: RawTemplate,
  path: string[],
  value: ValuePrimitive | undefined,
): RawTemplate {
  const next = deepClone(raw);
  const parent = parentAt(next, path);
  if (!parent) return next;
  const field = parent[path[path.length - 1]];
  if (typeof field === "object" && field !== null) {
    const f = field as Record<string, unknown>;
    if (value === undefined || value === "") delete f.value;
    else f.value = value;
  }
  return next;
}

/** Replace an enum array's options on a clone of `raw`. */
export function setEnumOptions(
  raw: RawTemplate,
  path: string[],
  options: EnumOption[],
): RawTemplate {
  const next = deepClone(raw);
  const parent = parentAt(next, path);
  if (!parent) return next;
  parent[path[path.length - 1]] = options;
  return next;
}

export function getEnumOptions(raw: RawTemplate, path: string[]): EnumOption[] {
  const node = nodeAt(raw, path);
  return Array.isArray(node) ? (node as EnumOption[]) : [];
}

/** Whether a node exists at a path. */
export function existsAt(raw: RawTemplate, path: string[]): boolean {
  return nodeAt(raw, path) !== undefined;
}

/** Set a value at a path on a clone, creating intermediate objects as needed. */
export function setAt(raw: RawTemplate, path: string[], value: unknown): RawTemplate {
  const next = deepClone(raw);
  let node: Record<string, unknown> = next;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    const child = node[seg];
    if (typeof child !== "object" || child === null || Array.isArray(child)) {
      node[seg] = {};
    }
    node = node[seg] as Record<string, unknown>;
  }
  node[path[path.length - 1]] = value;
  return next;
}

/** Delete the node at a path on a clone. */
export function deleteAt(raw: RawTemplate, path: string[]): RawTemplate {
  const next = deepClone(raw);
  const parent = parentAt(next, path);
  if (parent) delete parent[path[path.length - 1]];
  return next;
}

export type DataType = "string" | "number" | "boolean";

/** Read a field control's current `value` at a path. */
export function getControlValue(raw: RawTemplate, path: string[]): ValuePrimitive | undefined {
  const node = nodeAt(raw, path);
  if (typeof node === "object" && node !== null && "value" in node) {
    return (node as { value?: ValuePrimitive }).value;
  }
  return undefined;
}

/** Infer the datatype of a value (undefined when there is no value). */
export function inferType(v: ValuePrimitive | undefined): DataType | undefined {
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return "number";
  if (typeof v === "string") return "string";
  return undefined;
}

/** Coerce a value into the target datatype. */
export function coerceValue(v: ValuePrimitive | undefined, type: DataType): ValuePrimitive {
  switch (type) {
    case "boolean": {
      if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        return !(s === "" || s === "false" || s === "0" || s === "no");
      }
      return Boolean(v);
    }
    case "number": {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    case "string":
    default:
      return v === undefined ? "" : String(v);
  }
}
