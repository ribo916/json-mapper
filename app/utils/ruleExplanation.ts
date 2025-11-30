/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Raw rule result coming out of PPE `.ruleResults[]`
 * We intentionally keep this narrow because the PPE
 * response can vary and we only rely on the fields we know exist.
 */
export interface RuleResult {
  ruleName: string;
  ruleInheritedName?: string | null;
  category: string; // Required because TS error complained earlier
  booleanEquationValue: boolean;
}

/**
 * Normalized + human-readable rule explanation returned to UI.
 */
export interface RuleExplanation {
  ruleName: string;
  ruleInheritedName?: string;
  explanation: string;
  categoryLabel: string;
  jsonPath: string;
}

/* -------------------------------------------------------------------------- */
/* CATEGORY NORMALIZATION                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Maps raw PPE rule categories into user-facing category buckets.
 *
 * You can safely extend this — the inspector UI treats this as a label only.
 */
const CATEGORY_LABEL_MAP: Record<string, string> = {
  LoanAmount: "Loan Amount",
  Fico: "FICO",
  Dti: "Debt-to-Income",
  Ltv: "LTV / CLTV / HCLTV / TLTV",
  Property: "Property / Collateral",
  Occupancy: "Occupancy",
  LoanPurpose: "Loan Purpose",
  Geography: "Geography / State / County",
  Channel: "Channel",
  Arm: "ARM",
  Income: "Income",
  Assets: "Assets",
  Credit: "Credit",
  MortgageInsurance: "Mortgage Insurance",
  LockDesk: "Lock Desk",
};

/**
 * Fallback category if PPE sends unknown category names.
 */
function normalizeCategory(category: string): string {
  if (CATEGORY_LABEL_MAP[category]) return CATEGORY_LABEL_MAP[category];
  return category || "Other";
}

/* -------------------------------------------------------------------------- */
/* EXPLANATION TEMPLATES                                                     */
/* -------------------------------------------------------------------------- */

/**
 * These templates are intentionally simple and predictable.
 * PPE rule names differ across orgs so we do NOT attempt
 * “smart” interpretation. We only use general fallback language.
 */
function buildExplanation(rule: RuleResult): string {
  // PPE sometimes sets ruleName to something like:
  //   "Loan Amount (275k < Bal <= 300k) (Total)"
  // We do NOT parse inside this string — we present a simple readable message.

  return (
    `This rule (${rule.ruleName}) evaluated as true, ` +
    `meaning the loan scenario did not satisfy this eligibility requirement.`
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN EXPLANATION ENGINE                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Convert PPE ruleResults[] into normalized, UI-ready list
 * of explanations. We only return rules where booleanEquationValue == true.
 */
export function buildDisqualifyingRuleExplanations(
  rawRules: RuleResult[] | null | undefined
): RuleExplanation[] {
  if (!rawRules || rawRules.length === 0) return [];

  const failingRules = rawRules.filter(
    (r) => r.booleanEquationValue === true
  );

  return failingRules.map((rule) => {
    const categoryLabel = normalizeCategory(rule.category);

    return {
      ruleName: rule.ruleName,
      ruleInheritedName: rule.ruleInheritedName ?? undefined,
      explanation: buildExplanation(rule),
      categoryLabel,
      jsonPath: "$.data.results[x].ruleResults[]",
    };
  });
}
