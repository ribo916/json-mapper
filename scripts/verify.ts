import fs from "node:fs";
import path from "node:path";
import { classify, isPlainObject } from "../lib/template/classify";
import { diffTemplates } from "../lib/template/diff";
import { validate } from "../lib/template/validate";
import { serialize } from "../lib/template/serialize";
import { setAt, deleteAt, coerceValue } from "../lib/template/edit";

const dir = path.resolve(__dirname, "..", "public", "samples");
const files = ["lock_rms.json", "scenario_rms.json", "scenario_movement.json"];
const raws = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  cond ? pass++ : fail++;
}

// 1. Classification
const nLock = classify(raws[0]);
check("lock_rms classifies fields", nLock.fields.length > 50);
check("lock_rms classifies enums (6 top-level + 1 nested = 7)", nLock.enums.length === 7);
check("nested armPrograms fields captured", nLock.fields.some((f) => f.id.startsWith("criteria.armPrograms.")));
check("nested pricingTableColumns enum captured", nLock.enums.some((e) => e.name === "pricingTableColumns.refinancePurposeOptions"));
check("options.visible scalar captured", nLock.scalars.some((s) => s.id === "options.visible"));

// 2. Round-trip stability
const roundtrip = serialize(raws[0]).trimEnd();
const original = fs.readFileSync(path.join(dir, files[0]), "utf8").trimEnd();
check("lock_rms round-trips byte-stable", roundtrip === original);

// 3. Diff known differences
const loaded = files.map((f, i) => ({ id: `t${i}`, name: f, raw: raws[i] }));
const diff = diffTemplates(loaded);
const termRow = diff.standardFields.find((r) => r.id === "loan.term");
check("loan.term present only in lock_rms", !!termRow && termRow.cells[0].present && !termRow.cells[1].present && !termRow.cells[2].present);
const c40 = diff.standardFields.find((r) => r.id === "criteria.C40");
check("criteria.C40 in rms files, not movement", !!c40 && c40.cells[0].present && c40.cells[1].present && !c40.cells[2].present);
const lockPeriods = diff.enums.find((e) => e.name === "lockPeriodOptions");
check("lockPeriodOptions counts 6/6/16", !!lockPeriods && lockPeriods.cells[0].count === 6 && lockPeriods.cells[1].count === 6 && lockPeriods.cells[2].count === 16);
// Per-attribute diff detail
const lenderFee = diff.standardFields.find((r) => r.id === "loan.lenderFee");
check("loan.lenderFee flags visible+disabled as differing", !!lenderFee && lenderFee.diffAttrs.includes("visible") && lenderFee.diffAttrs.includes("disabled"));
check("loan.term flags presence as differing", !!termRow && termRow.diffAttrs.includes("presence"));
check("loan.term absent cells marked deviating on presence", !!termRow && termRow.cells[1].deviating.includes("presence") && !termRow.cells[0].deviating.includes("presence"));
const waive = diff.standardFields.find((r) => r.id === "loan.waiveEscrow");
check("loan.waiveEscrow flags value as differing", !!waive && waive.diffAttrs.includes("value"));
check("customParameters segregated as freeform", diff.freeformFields.length > 0 && diff.freeformFields.every((r) => r.section === "customParameters"));
check("customParameters NOT in standard fields", !diff.standardFields.some((r) => r.section === "customParameters"));

// 4. Validation catches duplicate enum id
const moveFindings = validate(raws[2]);
check("duplicate enum id flagged in scenario_movement.loanPurposeOptions", moveFindings.some((f) => f.category === "duplicate-enum-id" && f.target === "loanPurposeOptions"));

// ---- WCAG contrast checks for every theme's token pairs ----
function luminance([r, g, b]: number[]): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a: number[], b: number[]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const css = fs.readFileSync(path.resolve(__dirname, "..", "app", "globals.css"), "utf8");
function themeTokens(id: string): Record<string, number[]> {
  const block = new RegExp(`data-theme="${id}"[^{]*\\{([^}]*)\\}`).exec(css);
  const tokens: Record<string, number[]> = {};
  if (!block) return tokens;
  const re = /--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[1]))) tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return tokens;
}
// pair: [text token, bg token, min ratio]
const PAIRS: [string, string, number][] = [
  ["fg", "surface", 4.5],
  ["fg", "bg", 4.5],
  ["muted", "surface", 4.5],
  ["muted", "bg", 4.5],
  ["faint", "surface", 4.5],
  ["accent-fg", "accent", 4.5],
  ["accent-text", "surface", 4.5],
  ["accent-subtle-fg", "accent-subtle", 4.5],
];
for (const id of ["daylight", "paper", "midnight", "ocean", "nord"]) {
  const t = themeTokens(id);
  for (const [fgTok, bgTok, min] of PAIRS) {
    const ratio = contrast(t[fgTok], t[bgTok]);
    check(`[${id}] ${fgTok} on ${bgTok} = ${ratio.toFixed(2)}:1 (>= ${min})`, ratio >= min);
  }
}

// 5. Add / remove structure helpers
const base = JSON.parse(JSON.stringify(raws[0]));
const withField = setAt(base, ["loan", "myNewField"], { visible: true, disabled: false });
check("addField inserts a new field", classify(withField).fields.some((f) => f.id === "loan.myNewField"));
const withoutField = deleteAt(withField, ["loan", "myNewField"]);
check("deleteAt removes a field", !classify(withoutField).fields.some((f) => f.id === "loan.myNewField"));
const withEnum = setAt(base, ["loanTypeOptions"], [{ id: "", text: "" }]);
check("addEnum inserts a new enum array", classify(withEnum).enums.some((e) => e.name === "loanTypeOptions"));
const withSection = setAt(base, ["compliance"], {});
check("addSection inserts an empty object section", isPlainObject((withSection as Record<string, unknown>)["compliance"]));

// 6. Value coercion for datatype changes
check("coerce string '0' -> boolean false", coerceValue("0", "boolean") === false);
check("coerce string '300000' -> number", coerceValue("300000", "number") === 300000);
check("coerce number 30 -> string", coerceValue(30, "string") === "30");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
