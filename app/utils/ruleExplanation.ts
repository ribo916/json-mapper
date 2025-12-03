export interface RuleResult {
  category: string;
  subCategory?: string | null;
  ruleName?: string | null;
  ruleInheritedName?: string | null;
  booleanEquationValue?: boolean;
  index: number;

  // New (optional) pricing fields – match PPE response shape
  target?: string | null; // "Price" | "Rate" | etc.
  isHiddenAdjustment?: boolean;
  resultEquationValue?: number;
}

export interface RuleExplanation {
  ruleName: string;
  ruleInheritedName?: string;
  explanation: string;
  categoryLabel: string;
  jsonPath: string;
}

/* ------------------------------------------------------------ */
/* Normalization helpers                                        */
/* ------------------------------------------------------------ */
function normalizeCategory(category: string | null | undefined): string {
  if (!category) return "Uncategorized";
  return category;
}

/* ------------------------------------------------------------ */
/* Human readable explanation builder                           */
/* ------------------------------------------------------------ */
function buildExplanation(rule: RuleResult): string {
  const name = rule.ruleName ?? "(unnamed rule)";
  const inherited = rule.ruleInheritedName ?? "(none)";

  if (rule.booleanEquationValue === true) {
    return `This rule was triggered as a FAIL condition: ${name}. The inherited category is ${inherited}.`;
  }

  return `This rule evaluated normally: ${name}.`;
}

/* ------------------------------------------------------------ */
/* Main public function                                         */
/* ------------------------------------------------------------ */
export function buildDisqualifyingRuleExplanations(
  ruleResults: RuleResult[] | null | undefined
): RuleExplanation[] {
  if (!ruleResults || !Array.isArray(ruleResults)) return [];

  // failing = eligibility failure → booleanEquationValue == true
  const failingRules = ruleResults
    .map((r, i) => ({ ...r, index: i }))
    .filter((r) => r.booleanEquationValue === true);

  return failingRules.map((rule) => {
    const ruleName = rule.ruleName ?? "(unnamed rule)";
    const ruleInheritedName = rule.ruleInheritedName ?? "(none)";
    const explanation = buildExplanation(rule);
    const categoryLabel = normalizeCategory(rule.category);
    const jsonPath = `$.data.results[x].ruleResults[${rule.index}]`;

    const result: RuleExplanation = {
      ruleName,
      ruleInheritedName,
      explanation,
      categoryLabel,
      jsonPath,
    };

    return result;
  });
}
