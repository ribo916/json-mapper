// Core domain types for PricerUITemplate files.
//
// A raw template is arbitrary JSON. Its top-level keys are one of:
//   - field-control section: an object whose leaves are FieldControls
//     (possibly with nested sub-groups), e.g. `loan`, `borrower`, `criteria`.
//   - enum array: `[{ id, text }]`, e.g. `lockPeriodOptions`.
//   - scalar: a bare primitive, e.g. `options.visible`.
//
// We never fully reconstruct a template from the normalized view: edits are
// applied by path onto a clone of the raw object and serialized back, which
// guarantees round-trip fidelity and preserves any structure we don't model.

export type ValuePrimitive = string | number | boolean;

/** The flags that drive a single UI field. */
export interface FieldControl {
  visible?: boolean;
  disabled?: boolean;
  required?: boolean;
  value?: ValuePrimitive;
}

/** Keys that may appear inside a FieldControl. Used to classify leaves. */
export const FIELD_CONTROL_KEYS = ["visible", "disabled", "required", "value"] as const;

export interface EnumOption {
  id: string | number;
  text: string;
}

/** A raw, unparsed template object. */
export type RawTemplate = Record<string, unknown>;

/** A single field control located at a path within a template. */
export interface NormalizedField {
  /** Path segments from the root, e.g. ["criteria", "armPrograms", "120"]. */
  path: string[];
  /** Dotted path used as a stable id / for display, e.g. "criteria.armPrograms.120". */
  id: string;
  /** Top-level section key, e.g. "criteria". */
  section: string;
  /** Sub-group key when nested more than one level deep, e.g. "armPrograms". */
  subGroup?: string;
  /** Leaf key, e.g. "120". */
  key: string;
  control: FieldControl;
}

/** An enum option array located at a path within a template. */
export interface NormalizedEnum {
  /** Dotted name, e.g. "lockPeriodOptions" or "pricingTableColumns.refinancePurposeOptions". */
  name: string;
  path: string[];
  options: EnumOption[];
}

/** A bare primitive value located at a path, e.g. options.visible === true. */
export interface NormalizedScalar {
  path: string[];
  id: string;
  section: string;
  value: ValuePrimitive;
}

/** A file loaded into the workspace. */
export interface LoadedTemplate {
  /** Stable internal id. */
  id: string;
  /** Filename or user-supplied name shown in the tray. */
  name: string;
  /** The editable raw object (edits mutate a clone of this). */
  raw: RawTemplate;
}

/** The section key that is treated as free-form / org-specific (its keys differ
 * per org), so it is segregated in the compare view. */
export const FREEFORM_SECTION = "customParameters";

export function isFreeform(section: string): boolean {
  return section === FREEFORM_SECTION;
}
