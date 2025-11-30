# 🚀 Pricing Scenario Inspector — README

## Overview

The **Pricing Scenario Inspector** is an internal developer tool designed to help analyze and understand results returned from **Polly’s PPE (Pricing & Eligibility Engine)**. Its purpose is to provide a **human-friendly, developer-friendly** view of:

* What products were returned
* Their classification
* Why they are (or are not) eligible or valid
* The rules that disqualified them
* How to parse the payload consistently in downstream systems

This tool also helps educate internal and external developers on **how to interpret the PPE response**, how to reason about eligibility, and how to debug unexpected pricing behavior.

---

## 🎯 Project Goals

### 1. Help developers understand the structure of a PPE result

Break down the large, deeply nested PPE response into:

* Eligible products
* Ineligible products
* Invalid products

### 2. Provide a consistent method of classification

Establish deterministic logic for deciding the correct classification.

### 3. Generate human-readable explanations

Transform complex ruleSets into developer-facing descriptions.

### 4. Be explicit about assumptions

Document all assumptions to ensure transparency.

### 5. Serve as a debugging companion

Help diagnose unexpected pricing behavior by showing how PPE evaluated the product.

---

## 🧩 PPE Data Structure Assumptions

For each `$.data.results[x]`, we rely on:

```
isValidResult
isEligible
prices[]
ruleResults[]
uniqueInvestorCount
invalidResultReason
excludedInvestors
```

These assumptions reflect the structure observed in real PPE responses.

---

## 🏷 Product Classification Logic

### ✔ Eligible

A product is eligible when:

```
isValidResult == true
isEligible == true
prices.length > 0
```

### ✔ Ineligible

A product is ineligible when:

```
isValidResult == true
isEligible == false
prices.length == 0
```

### ✔ Invalid

A product is invalid when:

```
isValidResult == false
```

Supporting signals:

* `prices.length == 0`
* `uniqueInvestorCount == 0`
* `invalidResultReason` may include a description

---

## ⚠ Classification Assumptions

* Eligibility rules fire **after** validity checks.
* Invalid products may not have ruleResults.
* Ineligible products rely heavily on ruleResults and categories.
* The inspector does not evaluate numeric thresholds, boolean equations, or matrix logic.

---

## 🧠 Ineligible Product Interpretation

Ineligible products are the most nuanced category. Assumptions:

### 1. isValidResult == true

The engine understood the request.

### 2. isEligible == false

One or more qualifying rules failed.

### 3. prices.length == 0

Indicates no permissible pricing rows applied.

### 4. ruleResults[] explains the failure

We rely on:

```
category
ruleName
ruleInheritedName
booleanEquationValue
```

### 5. Human-readable explanations

Rules are grouped into buckets such as:

* Loan Amount Eligibility
* Credit Score Eligibility
* LTV / CLTV / HCLTV
* Geographic
* Channel Restrictions
* AUS / DU / LPA
* Occupancy
* Property Type
* Purpose
* Investor / Lock Desk constraints

Then mapped to descriptive text.

---

## 🧩 Invalid Product Interpretation

Invalid means PPE could not produce a viable scenario.

### Key indicators:

```
isValidResult == false
uniqueInvestorCount == 0
prices.length == 0
invalidResultReason != null (usually)
```

### Distinction from ineligible:

* **invalid** = engine could not evaluate the scenario
* **ineligible** = engine evaluated scenario but eligibility conditions failed

---

## 🧪 Examples

### Invalid Example

```
isValidResult: false
prices: []
uniqueInvestorCount: 0
invalidResultReason: "No rates for product found."
```

### Ineligible Example (rule failure)

```
isValidResult: true
isEligible: false
prices: []
ruleResults: at least one BooleanEquationValue == true
```

### Ineligible Example (no rules fired)

```
isValidResult: true
isEligible: false
prices: []
ruleResults: all BooleanEquationValue == false
```

### Eligible Example

```
isValidResult: true
isEligible: true
prices.length > 0
```

---

## 🧱 Current Limitations

* Does not interpret booleanEquation expressions.
* Does not compute actual values vs rule thresholds.
* Does not interpret geographic overlays fully.
* Matrix rules are not resolved.
* LockDeskWorkflowResults not fully parsed.

---

## 🔮 Future Enhancements

* "Smart mode" using loan input values.
* Matrix rule visualization.
* Clamp breakdown analysis.
* Richer rule inheritance viewer.
* Full price stack drilldown.

---

## 🎉 Summary

The Pricing Scenario Inspector aims to:

* Provide a structured, human-friendly classifier for PPE results.
* Help developers debug and understand product eligibility.
* Offer transparency via documented assumptions.
* Serve as an evolving tool as PPE grows in complexity.

It forms the foundation for deeper visualization of PPE behavior and will expand significantly as more dataset variants are tested.
