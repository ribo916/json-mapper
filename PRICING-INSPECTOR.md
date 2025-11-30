# 🚀 Pricing Scenario Inspector — README

## Overview

The **Pricing Scenario Inspector** is an internal developer tool designed to help analyze and interpret results returned from **Polly’s PPE (Pricing & Eligibility Engine)**. Its purpose is to provide a **human‑friendly, developer‑friendly** view of:

* What products were returned
* Their classification
* Why they are (or are not) eligible or valid
* Which rules disqualified them
* How to consistently parse PPE payloads in downstream systems

This tool also educates developers and product teams on **how PPE determines eligibility**, how rules fire, and how to debug unexpected pricing behavior.

---

## 🎯 Project Goals

### 1. Help developers understand the structure of a PPE result

Break down the large PPE response into:

* Eligible products
* Ineligible products
* Invalid products

### 2. Provide a consistent and transparent classification method

Deterministic logic ensures all engineers understand **why** a product is categorized a certain way.

### 3. Generate human‑readable rule explanations

Translate complex eligibility rules into clear descriptions.

### 4. Make all assumptions explicit

Because PPE responses can vary across investors/orgs, assumptions are documented to avoid ambiguity.

### 5. Serve as a debugging companion

Reveal how PPE evaluated rules, investors, price rows, and validity.

---

## 🧩 PPE Data Structure Assumptions

For each `$.data.results[x]`, the tool depends on these fields:

```
isValidResult
isEligible
prices[]
ruleResults[]
uniqueInvestorCount
invalidResultReason
excludedInvestors[]
```

These reflect real fields observed in PPE responses.

---

## 🏷 Product Classification Logic

### ✔ **Eligible Product**

A product is **eligible** when:

```
isValidResult == true
isEligible == true
prices.length > 0
```

This means PPE successfully evaluated the scenario **and** provided price rows.

---

### ✔ **Ineligible Product**

A product is **ineligible** when:

```
isValidResult == true
isEligible == false
prices.length == 0
```

The engine evaluated the request, but **eligibility rules disqualified** the scenario.

---

### ✔ **Invalid Product**

A product is **invalid** when:

```
isValidResult == false
```

Supporting signals:

* `prices.length == 0`
* `uniqueInvestorCount == 0`
* `invalidResultReason` may contain the explanation

Invalid = PPE could **not** evaluate the scenario.

Ineligible = PPE **did** evaluate it, but rules failed.

---

## ⚠ Classification Assumptions

These assumptions help interpret PPE behavior consistently:

* **Validity comes before eligibility.** If `isValidResult` is false, eligibility is irrelevant.
* Invalid products may not have `ruleResults` populated.
* Ineligible products use `ruleResults[]` to explain what failed.
* For ineligible products, we rely on `booleanEquationValue == true` to identify failing rules.
* The inspector does not re‑evaluate rule logic, matrix lookups, or boolean expressions.

---

## 🧠 Interpreting Ineligible Products

Ineligible products are the most nuanced category.

### Key assumptions:

#### 1. `isValidResult == true`

The request was well‑formed and understood by PPE.

#### 2. `isEligible == false`

A rule or combination of rules disqualified the scenario.

#### 3. `prices.length == 0`

No priceable rows remained after eligibility filters.

#### 4. `ruleResults[]` tells us **why**

Fields we rely on:

```
category
subCategory
ruleName
ruleInheritedName
booleanEquationValue
```

#### 5. Failing rules have `booleanEquationValue == true`

This is how PPE indicates an eligibility rule **fired negatively**.

#### 6. Human‑readable rule breakdown

Rules are grouped into conceptual domains such as:

* Loan Amount ranges
* Credit score thresholds
* LTV / CLTV / HCLTV
* Property eligibility
* Occupancy
* Channel restrictions
* AUS requirements
* Geographic overlays
* Investor restrictions
* Lock Desk rules

These are mapped into readable sentences.

---

## 🧩 Interpreting Invalid Products

Invalid means PPE could not evaluate the scenario.

Typical indicators:

```
isValidResult == false
uniqueInvestorCount == 0
prices.length == 0
invalidResultReason != null
```

**Invalid ≠ Ineligible**:

* Invalid → PPE could not process the product.
* Ineligible → PPE processed it but eligibility rules failed.

---

## 🧪 Examples

### Invalid Example

```
isValidResult: false
prices: []
uniqueInvestorCount: 0
invalidResultReason: "No investors available for this scenario."
```

### Ineligible Example (rules failed)

```
isValidResult: true
isEligible: false
prices: []
> At least one rule with booleanEquationValue == true
```

### Ineligible Example (no rules explicitly failed)

```
isValidResult: true
isEligible: false
prices: []
ruleResults all booleanEquationValue == false
→ Likely due to no matching matrix/investor rows
```

### Eligible Example

```
isValidResult: true
isEligible: true
prices.length > 0
```

---

## 📊 Price & Adjustment Calculations – Detailed Assumptions

This tool does **not** try to perfectly re-implement PPE’s pricing math. Instead, it surfaces **derived summaries** from the payload with clearly documented assumptions.

### 1. Price stack statistics (rates & prices)

For an eligible product, we compute basic statistics from:

```text
$.data.results[x].prices[]
```

**Assumptions:**

* `prices[]` contains one row per rate/price combination after PPE has applied all internal logic.
* We treat `prices[].rate` and `prices[].price` as numeric fields (strings are parsed via `parseFloat`).
* **Min / max rate** are computed as:

  * `minRate = Math.min(...allNumericRates)`
  * `maxRate = Math.max(...allNumericRates)`
* **Best / worst price** are computed purely by numeric comparison of `prices[].price`:

  * `bestPrice = Math.max(...allNumericPrices)`
  * `worstPrice = Math.min(...allNumericPrices)`
* **Par-ish rate** is determined as the rate whose price is **closest to zero** (|price| is minimized).

**Important caveats:**

* We **do not** know which rate/price row the borrower will actually lock.
* We do **not** adjust or normalize prices; we simply reflect what PPE returned.
* If `prices[]` is empty or non-numeric, all stats gracefully fall back to `null`.

---

### 2. Product-level adjustment totals

We rely on aggregate fields surfaced by PPE at the product level:

```text
$.data.results[x].totalBasePriceAdjustments
$.data.results[x].totalSRPAdjustments
$.data.results[x].totalRateAdjustments
$.data.results[x].totalAdjustments
```

**Assumptions:**

* These totals represent **PPE’s own aggregation** of all applicable adjustments.
* We **do not** recompute them from rule buckets; we **trust** PPE’s numbers.
* If any field is `null` or missing, we treat it as `0` for display purposes.
* Display values are formatted to 4 decimal places for consistency.

**Implications:**

* There may be adjustments that **do not appear** as individual fee or rule records but are still included in totals.
* The inspector shows these totals as a **read-only summary**, not as recalculated math.

---

### 3. Fee totals

We derive a simple fee total from:

```text
$.data.results[x].feeResults[]
```

**Assumptions:**

* We look for `amount` or `feeAmount` on each fee entry.
* Numeric parsing uses a best-effort `parseFloat` approach; invalid values are treated as `0`.
* `feeTotal` is calculated as the sum of all parsed fee amounts.
* Only a subset (e.g., the first few fees) may be shown in the UI to save space, but the total uses **all** fees.

**Limitations:**

* We do not differentiate between financed vs paid-in-cash fees.
* We do not reconcile fee totals back into price or APR – this is a high-level indication only.

---

### 4. Rule buckets used for pricing (eligible)

For eligible products, we surface **rule buckets that contributed to pricing**, based on:

```text
$.data.results[x].ruleResults[]
```

**Key behavioral assumption:**

* For **pricing rules**, a `booleanEquationValue == false` is interpreted as:

  * Rule condition **evaluated and passed** (i.e., it applied cleanly to the scenario).
* For **eligibility rules**, a `booleanEquationValue == true` indicates a **failure** (handled in the Ineligible view, not here).

**Grouping logic:**

* Rules are grouped by a key derived from:

  * `category` (e.g., "Loan Amount", "Broker Compensation")
  * Optional `subCategory` when present (e.g., specific bracket or dimension)
* Display label format when `subCategory` exists:

  * `"{category} · {subCategory}"`
* Each group is collapsible to avoid overwhelming the UI.

**What we do *not* do here:**

* We do **not** determine which exact bucket drove a specific rate/price row.
* We do **not** recompute final price from these rules; they are shown as **context**, not executable math.

---

### 5. Eligibility vs pricing rules

The same `ruleResults[]` array may contain **eligibility rules** and **pricing rules**. The Inspector treats them differently depending on the view:

* **Ineligible view**

  * Focuses on **eligibility failures** where `booleanEquationValue == true`.
  * Uses `buildDisqualifyingRuleExplanations` to produce human-readable explanations.
* **Eligible view**

  * Focuses on **pricing context** where `booleanEquationValue == false` for rules that applied.
  * These rules are shown as part of the pricing explanation, not as failures.

We do **not** attempt to classify each rule as strictly "eligibility" or "pricing" beyond these behavioral patterns.

---

### 6. Hidden vs visible adjustments

At this stage, the inspector:

* Does **not** explicitly label individual adjustments as "hidden" vs "visible".
* Treats all pricing-related rules and totals as **neutral data** coming from PPE.
* May later introduce labels once a stable and test-backed mapping exists between rule categories and UI-visible adjustments.

Until then, any interpretation of "hidden" vs "visible" adjustments remains an assumption and is **not** baked into the tool’s logic.

---

### 7. Known consequences & edge cases

* It is possible for all displayed buckets to show zero values while totals still show non-zero (or vice versa), depending on how PPE aggregates rules internally.
* Missing or new fields introduced by PPE will appear only in raw JSON views until the Inspector is explicitly updated to surface them.
* When numeric parsing fails (unexpected formats), we default to `0` to avoid crashing the UI, and the raw JSON remains available for deeper inspection.

---

## 🧱 Current Limitations

* Does not evaluate boolean equations.
* Does not compute rule thresholds.
* Does not interpret matrix row filtering.
* Geographic logic is not deeply parsed.
* Lock Desk workflows not yet visualized.

---

## 🔮 Future Enhancements

* Smart evaluation mode (evaluate rules using loan inputs)
* Visual matrix debugging (row eliminations)
* Clamp & price adjustment waterfall UI
* Investor contribution graph
* Rule inheritance tree

---

## 🎉 Summary

The Pricing Scenario Inspector is designed to:

* Provide a transparent, structured explanation of PPE output
* Help developers and integrators understand and debug pricing scenarios
* Offer consistent interpretation rules
* Make all price, fee, and rule-based summaries **explicitly assumption-driven**, never opaque
* Grow as PPE evolves and as more test cases validate (or challenge) current assumptions

This README documents the **core logic, data dependencies, and calculation assumptions** that the Inspector uses to classify results and explain eligibility and pricing context. It serves as a foundation for future expansion and guarantees consistency across all environments and test cases.

The Pricing Scenario Inspector is designed to:

* Provide a transparent, structured explanation of PPE output
* Help developers and integrators understand and debug pricing scenarios
* Offer consistent interpretation rules
* Grow as PPE evolves

This README documents all **core logic and assumptions** that the Inspector uses to classify results and explain eligibility. It serves as a foundation for future expansion and guarantees consistency across all environments and test cases.
