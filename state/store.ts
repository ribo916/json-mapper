import { create } from "zustand";
import { classify } from "@/lib/template/classify";
import {
  coerceValue,
  DataType,
  deepClone,
  deleteAt,
  existsAt,
  getControlValue,
  setAt,
  setEnumOptions,
  setFieldFlag,
  setFieldValue,
} from "@/lib/template/edit";
import { EnumOption, LoadedTemplate, RawTemplate, ValuePrimitive } from "@/lib/template/types";

export type MainView = "editor" | "compare" | "json" | "jsonDiff";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

interface WorkspaceState {
  templates: LoadedTemplate[];
  /** The single file being viewed/edited in the Editor. */
  activeId: string | null;
  view: MainView;
  /** Chosen datatype per field, keyed by `${templateId}:${fieldId}`. Lets a
   * field's value editor be a toggle/number/text even before a value exists.
   * Session-only; the value's own type is the source of truth once set. */
  typeOverrides: Record<string, DataType>;

  // ---- file management ----
  addTemplate: (name: string, raw: RawTemplate) => void;
  removeTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;
  cloneTemplate: (id: string) => void;

  // ---- selection / view ----
  setActive: (id: string) => void;
  setView: (view: MainView) => void;

  // ---- template edits (Editor only, single active file) ----
  updateFlag: (
    id: string,
    path: string[],
    flag: "visible" | "disabled" | "required",
    value: boolean,
  ) => void;
  updateValue: (id: string, path: string[], value: ValuePrimitive | undefined) => void;
  updateEnum: (id: string, path: string[], options: EnumOption[]) => void;
  setFieldType: (id: string, fieldId: string, path: string[], type: DataType) => void;

  // ---- structure edits (add/remove) ----
  addField: (id: string, containerPath: string[], key: string) => void;
  removeField: (id: string, path: string[]) => void;
  addEnum: (id: string, name: string) => void;
  addSection: (id: string, name: string) => void;

  /** Replace a template's entire raw object (used by the Raw JSON editor). */
  replaceRaw: (id: string, raw: RawTemplate) => void;
}

const NEW_FIELD = { visible: true, disabled: false };

/** Map a raw-mutating fn over the template with matching id. */
function mapRaw(
  s: WorkspaceState,
  id: string,
  fn: (raw: RawTemplate) => RawTemplate,
): Pick<WorkspaceState, "templates"> {
  return {
    templates: s.templates.map((t) => (t.id === id ? { ...t, raw: fn(t.raw) } : t)),
  };
}

export const useStore = create<WorkspaceState>((set) => ({
  templates: [],
  activeId: null,
  view: "editor",
  typeOverrides: {},

  addTemplate: (name, raw) =>
    set((s) => {
      const template: LoadedTemplate = { id: nextId("tpl"), name, raw };
      return {
        templates: [...s.templates, template],
        activeId: s.activeId ?? template.id,
      };
    }),

  removeTemplate: (id) =>
    set((s) => {
      const templates = s.templates.filter((t) => t.id !== id);
      const activeId =
        s.activeId === id ? (templates[0]?.id ?? null) : s.activeId;
      const view = templates.length < 2 && s.view === "compare" ? "editor" : s.view;
      return { templates, activeId, view };
    }),

  renameTemplate: (id, name) =>
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, name } : t)),
    })),

  cloneTemplate: (id) =>
    set((s) => {
      const src = s.templates.find((t) => t.id === id);
      if (!src) return s;
      const base = src.name.replace(/\.json$/i, "");
      const clone: LoadedTemplate = {
        id: nextId("tpl"),
        name: `${base}-copy.json`,
        raw: deepClone(src.raw),
      };
      return { templates: [...s.templates, clone], activeId: clone.id, view: "editor" };
    }),

  setActive: (id) =>
    // Keep single-file views (Raw JSON stays Raw JSON, Editor stays Editor);
    // from a multi-file view (Compare / JSON Diff), selecting one file opens it
    // in the Editor.
    set((s) => ({ activeId: id, view: s.view === "json" ? "json" : "editor" })),

  setView: (view) => set(() => ({ view })),

  updateFlag: (id, path, flag, value) =>
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id ? { ...t, raw: setFieldFlag(t.raw, path, flag, value) } : t,
      ),
    })),

  updateValue: (id, path, value) =>
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id ? { ...t, raw: setFieldValue(t.raw, path, value) } : t,
      ),
    })),

  updateEnum: (id, path, options) =>
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id ? { ...t, raw: setEnumOptions(t.raw, path, options) } : t,
      ),
    })),

  setFieldType: (id, fieldId, path, type) =>
    set((s) => {
      const key = `${id}:${fieldId}`;
      const typeOverrides = { ...s.typeOverrides, [key]: type };
      // If a value already exists, coerce it to the new type so the data matches.
      const template = s.templates.find((t) => t.id === id);
      const current = template ? getControlValue(template.raw, path) : undefined;
      if (current === undefined) return { typeOverrides };
      const coerced = coerceValue(current, type);
      return {
        typeOverrides,
        templates: s.templates.map((t) =>
          t.id === id ? { ...t, raw: setFieldValue(t.raw, path, coerced) } : t,
        ),
      };
    }),

  addField: (id, containerPath, key) =>
    set((s) => {
      const trimmed = key.trim();
      if (!trimmed) return s;
      const template = s.templates.find((t) => t.id === id);
      const path = [...containerPath, trimmed];
      if (!template || existsAt(template.raw, path)) return s; // no overwrite
      return mapRaw(s, id, (raw) => setAt(raw, path, { ...NEW_FIELD }));
    }),

  removeField: (id, path) => set((s) => mapRaw(s, id, (raw) => deleteAt(raw, path))),

  addEnum: (id, name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed) return s;
      const template = s.templates.find((t) => t.id === id);
      if (!template || existsAt(template.raw, [trimmed])) return s;
      return mapRaw(s, id, (raw) => setAt(raw, [trimmed], [{ id: "", text: "" }]));
    }),

  addSection: (id, name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed) return s;
      const template = s.templates.find((t) => t.id === id);
      if (!template || existsAt(template.raw, [trimmed])) return s;
      return mapRaw(s, id, (raw) => setAt(raw, [trimmed], {}));
    }),

  replaceRaw: (id, raw) => set((s) => mapRaw(s, id, () => raw)),
}));

/** The single active template for the editor. */
export function activeTemplate(s: WorkspaceState): LoadedTemplate | undefined {
  return s.templates.find((t) => t.id === s.activeId) ?? s.templates[0];
}

export { classify };
