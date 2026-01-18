# @mikesaintsg/rater API Guide

> **Factor-based rating engine with conditions, lookups, ranges, and mathematical operations for calculating dynamic rates.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Rate Factors](#rate-factors)
6. [Conditions](#conditions)
7. [Lookup Tables](#lookup-tables)
8. [Range Tables](#range-tables)
9. [Mathematical Operations](#mathematical-operations)
10. [Aggregation](#aggregation)
11. [Factor Groups](#factor-groups)
12. [Validation](#validation)
13. [Error Handling](#error-handling)
14. [TypeScript Integration](#typescript-integration)
15. [Performance Tips](#performance-tips)
16. [Browser Compatibility](#browser-compatibility)
17. [Integration with Ecosystem](#integration-with-ecosystem)
18. [API Reference](#api-reference)
19. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/rater` provides: 

- **Declarative Rate Factors** — Define complex rating logic with simple data structures
- **Conditional Application** — Apply factors only when specific conditions are met
- **Flexible Rate Sources** — Use static values, lookup tables, range tables, or field paths
- **Mathematical Operations** — Transform rates with add, multiply, percentage, and more
- **Composable Groups** — Organize factors into groups with customizable aggregation
- **Zero dependencies** — Built entirely on native JavaScript APIs

### Use Cases

| Use Case | Feature |
|----------|---------|
| Insurance premium calculation | Range tables, conditions, aggregation |
| Dynamic pricing | Lookup tables, mathematical operations |
| Loan interest rates | Conditions, factor groups |
| Shipping cost calculation | Range tables, aggregation |
| Subscription tier pricing | Lookup tables, conditions |
| Risk scoring | Weighted factors, conditions |

### When to Use rater vs Custom Logic

| Scenario | Use rater | Use Custom Logic |
|----------|-----------|------------------|
| Complex multi-factor calculations | ✅ | |
| Configurable business rules | ✅ | |
| Auditable rate breakdowns | ✅ | |
| Runtime-changeable formulas | ✅ | |
| Simple fixed calculations | | ✅ |
| Performance-critical hot paths | | ✅ |
| Single-step transformations | | ✅ |

---

## Installation

```bash
npm install @mikesaintsg/rater
```

---

## Quick Start

```ts
import { createRatingEngine } from '@mikesaintsg/rater'
import type { RateFactorGroup, RateSubject } from '@mikesaintsg/rater'

// 1. Create the rating engine
const engine = createRatingEngine({
	baseRate: 100,
	minimumRate: 50,
	maximumRate: 500,
	decimalPlaces: 2,
	onRate: (result) => {
		console.log(`Final rate: ${result. finalRate}`)
	},
})

// 2. Define rate factor groups
const groups: readonly RateFactorGroup[] = [
	{
		id: 'age',
		label: 'Age Factors',
		aggregationMethod: 'multiply',
		factors: [
			{
				id: 'ageFactor',
				label: 'Age Factor',
				rangeTable: {
					field: 'age',
					ranges: [
						{ minimum: 18, maximum: 25, rate: 1.5 },
						{ minimum: 26, maximum: 65, rate: 1.0 },
						{ minimum: 66, rate: 1.3 },
					],
					defaultRate: 2.0,
				},
			},
		],
	},
	{
		id: 'tier',
		label: 'Tier Factors',
		aggregationMethod: 'multiply',
		factors: [
			{
				id: 'tierDiscount',
				label: 'Tier Discount',
				lookupTable: {
					field:  'membershipTier',
					values: {
						platinum: 0.8,
						gold: 0.9,
						silver: 0.95,
						bronze: 1.0,
					},
					defaultValue: 1.0,
				},
			},
		],
	},
]

// 3. Calculate rate for a subject
const subject: RateSubject = {
	age: 30,
	membershipTier: 'gold',
}

const result = engine.rate(subject, groups)

console.log(result. finalRate) // 90 (100 * 1.0 * 0.9)
console.log(result.breakdown) // Step-by-step calculation

// 4. Cleanup
engine.destroy()
```

---

## Core Concepts

### Subjects and Factors

A **subject** is the entity being rated — an object containing properties that factors evaluate against.  A **factor** is a single rate component that contributes to the final calculation.

```ts
// Subject:  the thing being rated
const subject: RateSubject = {
	age: 35,
	location: 'urban',
	riskScore: 720,
	isPremium: true,
}

// Factor: one component of the rate
const factor: RateFactor = {
	id:  'locationFactor',
	label: 'Location Factor',
	lookupTable: {
		field:  'location',
		values:  {
			urban: 1.2,
			suburban: 1.0,
			rural: 0.9,
		},
	},
}
```

### Rate Sources

Each factor must have exactly one rate source:

| Source | Use When |
|--------|----------|
| `baseRate` | Fixed static value |
| `lookupTable` | Discrete category mapping |
| `rangeTable` | Continuous numeric ranges |
| `fieldPath` | Direct value from subject |

```ts
// Static base rate
{ baseRate: 100 }

// Lookup table for categories
{ lookupTable: { field: 'tier', values: { gold: 1.5, silver: 1.2 } } }

// Range table for numbers
{ rangeTable: { field: 'age', ranges: [{ minimum: 18, maximum:  25, rate: 1.5 }] } }

// Direct field value
{ fieldPath: 'customRate' }
```

### Calculation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     RatingEngineInterface                    │
│  rate(subject, groups) → RatingResult                        │
├─────────────────────────────────────────────────────────────┤
│  For Each Group:                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 1. Sort factors by priority                             ││
│  │ 2. Evaluate conditions for each factor                  ││
│  │ 3. Resolve rate from source (lookup/range/base/field)   ││
│  │ 4. Apply mathematical operation if specified            ││
│  │ 5. Clamp to factor min/max                              ││
│  │ 6. Aggregate factor rates using group method            ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Final Steps:                                                │
│  1.  Aggregate group rates using engine method               │
│  2. Round to decimal places                                  │
│  3. Clamp to engine min/max                                  │
│  4. Emit onRate callback                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Rate Factors

### Basic Factor Structure

Every factor requires an `id` and `label`, plus at least one rate source:

```ts
const factor: RateFactor = {
	// Required
	id: 'basePremium',
	label: 'Base Premium',
	
	// Rate source (one required)
	baseRate: 100,
	
	// Optional
	description: 'Starting premium before adjustments',
	enabled: true,
	required: false,
	priority: 0,
	minimumRate: 50,
	maximumRate: 200,
}
```

### Factor Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | — | Unique identifier (required) |
| `label` | `string` | — | Human-readable name (required) |
| `description` | `string` | — | Detailed description |
| `conditions` | `RateCondition[]` | — | Conditions for applying |
| `baseRate` | `number` | — | Static rate value |
| `lookupTable` | `RateLookupTable` | — | Category-based rates |
| `rangeTable` | `RateRangeTable` | — | Range-based rates |
| `fieldPath` | `string` | — | Path to rate in subject |
| `operation` | `MathematicalOperation` | — | Transform operation |
| `operand` | `number` | — | Operand for operation |
| `enabled` | `boolean` | `true` | Whether factor is active |
| `required` | `boolean` | `false` | Must apply for group |
| `priority` | `number` | `0` | Evaluation order |
| `minimumRate` | `number` | — | Floor for this factor |
| `maximumRate` | `number` | — | Ceiling for this factor |

### Disabled Factors

Factors can be disabled at runtime:

```ts
const factor: RateFactor = {
	id: 'seasonalBonus',
	label: 'Seasonal Bonus',
	baseRate: 0. 9,
	enabled: false, // Won't be applied
}
```

### Factor Priority

Lower priority values are evaluated first:

```ts
const factors: readonly RateFactor[] = [
	{ id: 'base', label: 'Base', baseRate: 100, priority: 0 },
	{ id: 'adjustment', label: 'Adjustment', baseRate: 1. 1, priority: 10 },
	{ id: 'discount', label: 'Discount', baseRate: 0.95, priority: 20 },
]
// Evaluated in order: base → adjustment → discount
```

---

## Conditions

### Condition Structure

Conditions determine whether a factor applies to a subject:

```ts
const condition: RateCondition = {
	field: 'age',
	operator: 'greaterThanOrEqual',
	value: 21,
}
```

### Conditional Operators

| Operator | Description | Value Type |
|----------|-------------|------------|
| `equals` | Exact match | Any |
| `notEquals` | Not equal | Any |
| `greaterThan` | Greater than | Number |
| `lessThan` | Less than | Number |
| `greaterThanOrEqual` | Greater or equal | Number |
| `lessThanOrEqual` | Less or equal | Number |
| `in` | Value in array | Array |
| `notIn` | Value not in array | Array |
| `between` | Within range (inclusive) | `[min, max]` |
| `notBetween` | Outside range | `[min, max]` |

### Multiple Conditions

All conditions must be met for a factor to apply (AND logic):

```ts
const factor: RateFactor = {
	id: 'premiumDiscount',
	label:  'Premium Member Discount',
	baseRate: 0.85,
	conditions: [
		{ field: 'isPremium', operator: 'equals', value: true },
		{ field:  'yearsActive', operator: 'greaterThanOrEqual', value: 2 },
		{ field: 'region', operator: 'in', value: ['NA', 'EU'] },
	],
}
```

### Nested Field Paths

Access nested properties using dot notation:

```ts
const condition: RateCondition = {
	field: 'user.profile.verified',
	operator: 'equals',
	value: true,
}

const subject: RateSubject = {
	user: {
		profile: {
			verified: true,
		},
	},
}
```

### Evaluating Conditions Manually

```ts
const result = engine.evaluateCondition(
	{ age: 30, tier: 'gold' },
	{ field: 'age', operator: 'between', value: [25, 35] }
)

console.log(result.isMet) // true
console.log(result.actualValue) // 30
```

---

## Lookup Tables

### Basic Lookup Table

Map discrete categories to rates:

```ts
const factor: RateFactor = {
	id: 'vehicleType',
	label: 'Vehicle Type Factor',
	lookupTable: {
		field: 'vehicleType',
		values: {
			sedan: 1.0,
			suv: 1.2,
			truck: 1.3,
			sports: 1.5,
			motorcycle: 0.8,
		},
		defaultValue: 1.1,
	},
}

// Subject with vehicleType:  'suv' → rate: 1.2
// Subject with vehicleType: 'van' → rate: 1.1 (default)
```

### Lookup Table Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `field` | `string` | ✅ | Subject field to use as key |
| `values` | `Record<string, number>` | ✅ | Key-to-rate mapping |
| `defaultValue` | `number` | | Fallback if key not found |

### Numeric Keys

Lookup keys are converted to strings:

```ts
const factor: RateFactor = {
	id: 'creditTier',
	label: 'Credit Tier',
	lookupTable: {
		field: 'creditTier',
		values: {
			'1': 0.9,
			'2': 1.0,
			'3':  1.1,
			'4': 1.2,
		},
	},
}

// Subject with creditTier: 2 → looks up '2' → rate: 1.0
```

---

## Range Tables

### Basic Range Table

Map numeric ranges to rates:

```ts
const factor: RateFactor = {
	id: 'ageRange',
	label: 'Age Range Factor',
	rangeTable: {
		field:  'age',
		ranges:  [
			{ maximum: 17, rate: 2.0 },           // Under 18
			{ minimum: 18, maximum: 25, rate: 1.5 }, // 18-25
			{ minimum: 26, maximum: 65, rate: 1.0 }, // 26-65
			{ minimum: 66, rate: 1.3 },           // 66+
		],
		defaultRate: 1.5,
	},
}
```

### Range Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `minimum` | `number` | | Lower bound (inclusive) |
| `maximum` | `number` | | Upper bound (inclusive) |
| `rate` | `number` | ✅ | Rate for this range |

### Range Matching

Ranges are evaluated in order; first match wins:

```ts
const rangeTable: RateRangeTable = {
	field: 'score',
	ranges: [
		{ minimum: 800, rate: 0.8 },  // 800+ (checked first)
		{ minimum: 700, rate: 0.9 },  // 700-799
		{ minimum: 600, rate: 1.0 },  // 600-699
		{ rate: 1.2 },                // Below 600 (no min/max = catch-all)
	],
}
```

### Open-Ended Ranges

Omit `minimum` or `maximum` for open-ended ranges:

```ts
const ranges: readonly RateRange[] = [
	{ maximum: 0, rate: 0 },        // ≤ 0
	{ minimum: 1, maximum: 10, rate: 1. 0 }, // 1-10
	{ minimum: 11, rate: 1.5 },     // ≥ 11
]
```

---

## Mathematical Operations

### Available Operations

| Operation | Formula | Example |
|-----------|---------|---------|
| `add` | `rate + operand` | 100 + 10 = 110 |
| `subtract` | `rate - operand` | 100 - 10 = 90 |
| `multiply` | `rate × operand` | 100 × 1.5 = 150 |
| `divide` | `rate ÷ operand` | 100 ÷ 4 = 25 |
| `percentage` | `rate × (1 + operand/100)` | 100 + 10% = 110 |
| `percentageOf` | `rate × (operand/100)` | 50% of 100 = 50 |
| `minimum` | `min(rate, operand)` | min(100, 80) = 80 |
| `maximum` | `max(rate, operand)` | max(100, 120) = 120 |
| `average` | `(rate + operand) / 2` | avg(100, 50) = 75 |
| `power` | `rate^operand` | 10² = 100 |
| `round` | `round(rate)` | round(99.6) = 100 |
| `ceil` | `ceil(rate)` | ceil(99.1) = 100 |
| `floor` | `floor(rate)` | floor(99.9) = 99 |

### Applying Operations

Operations transform the resolved rate:

```ts
const factor: RateFactor = {
	id: 'inflationAdjustment',
	label:  'Inflation Adjustment',
	baseRate: 100,
	operation: 'percentage',
	operand: 3. 5, // +3.5%
}
// Result: 100 × 1.035 = 103.5
```

### Chaining with Multiple Factors

Operations apply to each factor independently:

```ts
const factors: readonly RateFactor[] = [
	{
		id: 'base',
		label: 'Base Rate',
		baseRate: 1000,
	},
	{
		id:  'discount',
		label: 'Discount',
		baseRate: 1000,
		operation: 'percentage',
		operand: -10, // -10%
	},
]

// With 'sum' aggregation:  1000 + 900 = 1900
// With 'average' aggregation: (1000 + 900) / 2 = 950
```

### Manual Operation Application

```ts
const adjusted = engine.applyOperation(100, 'percentage', 15)
console.log(adjusted) // 115
```

---

## Aggregation

### Aggregation Methods

| Method | Formula | Use Case |
|--------|---------|----------|
| `sum` | `a + b + c` | Additive factors |
| `product` | `a × b × c` | Multiplicative factors |
| `average` | `(a + b + c) / n` | Blended rates |
| `minimum` | `min(a, b, c)` | Floor selection |
| `maximum` | `max(a, b, c)` | Ceiling selection |

### Group-Level Aggregation

Each group aggregates its factors:

```ts
const group: RateFactorGroup = {
	id:  'multipliers',
	label: 'Rate Multipliers',
	aggregationMethod: 'product',
	factors: [
		{ id: 'age', label: 'Age', baseRate: 1.2 },
		{ id: 'location', label: 'Location', baseRate: 1.1 },
		{ id: 'history', label: 'History', baseRate: 0.9 },
	],
}
// Group rate: 1.2 × 1.1 × 0.9 = 1.188
```

### Engine-Level Aggregation

Groups are aggregated by the engine:

```ts
const engine = createRatingEngine({
	baseRate: 100,
	groupAggregationMethod: 'product', // Default:  'sum'
})

// Group 1 rate: 1.5
// Group 2 rate: 0.8
// Final:  100 × 1.5 × 0.8 = 120 (with 'product')
// Final: 1.5 + 0.8 = 2.3 (with 'sum')
```

### Manual Aggregation

```ts
const rates = [1.2, 1.1, 0.9]

console.log(engine.aggregate(rates, 'sum'))     // 3.2
console.log(engine.aggregate(rates, 'product')) // 1.188
console.log(engine.aggregate(rates, 'average')) // 1.067
console.log(engine.aggregate(rates, 'minimum')) // 0.9
console.log(engine.aggregate(rates, 'maximum')) // 1.2
```

---

## Factor Groups

### Group Structure

Groups organize related factors:

```ts
const group: RateFactorGroup = {
	id: 'demographics',
	label: 'Demographic Factors',
	aggregationMethod: 'product',
	baseRate: 1. 0,
	requireAll: false,
	factors: [
		// ...  factors
	],
}
```

### Group Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier |
| `label` | `string` | ✅ | Human-readable name |
| `factors` | `RateFactor[]` | ✅ | Factors in this group |
| `aggregationMethod` | `AggregationMethod` | ✅ | How to combine factors |
| `baseRate` | `number` | | Starting rate for group |
| `requireAll` | `boolean` | | All required factors must apply |

### Group Base Rate

The group's `baseRate` is included in aggregation:

```ts
const group: RateFactorGroup = {
	id: 'adjustments',
	label: 'Adjustments',
	aggregationMethod:  'sum',
	baseRate: 50, // Starting point
	factors: [
		{ id: 'addon1', label: 'Add-on 1', baseRate:  10 },
		{ id: 'addon2', label:  'Add-on 2', baseRate: 15 },
	],
}
// Rate: 50 + 10 + 15 = 75 (with sum aggregation)
```

### Required Factors

When `requireAll: true`, the group only applies if all required factors apply:

```ts
const group: RateFactorGroup = {
	id: 'eligibility',
	label: 'Eligibility Check',
	aggregationMethod: 'product',
	requireAll: true,
	factors:  [
		{
			id: 'ageCheck',
			label: 'Age Requirement',
			required: true,
			baseRate:  1.0,
			conditions: [{ field: 'age', operator:  'greaterThanOrEqual', value: 18 }],
		},
		{
			id: 'creditCheck',
			label: 'Credit Requirement',
			required: true,
			baseRate: 1.0,
			conditions: [{ field: 'creditScore', operator: 'greaterThanOrEqual', value: 600 }],
		},
	],
}
// If either condition fails, group rate is 0
```

---

## Validation

### Validating Groups

Validate group configurations before use:

```ts
const groups: readonly RateFactorGroup[] = [
	{
		id: 'test',
		label: 'Test Group',
		aggregationMethod:  'sum',
		factors: [
			{
				id: 'invalid',
				label: '',
				// Missing rate source! 
			},
		],
	},
]

const errors = engine.validateGroups(groups)

if (errors.length > 0) {
	console.error('Validation errors:', errors)
	// [
	//   'Factor invalid: must have a label',
	//   'Factor invalid: must have baseRate, lookupTable, rangeTable, or fieldPath'
	// ]
}
```

### Validation Rules

| Rule | Description |
|------|-------------|
| Group must have `id` | Non-empty string required |
| Group must have `label` | Non-empty string required |
| Group must have factors | At least one factor required |
| Factor must have `id` | Non-empty string required |
| Factor must have `label` | Non-empty string required |
| Factor must have rate source | One of: `baseRate`, `lookupTable`, `rangeTable`, `fieldPath` |
| Lookup table must have `field` | Required for lookup |
| Lookup table must have `values` | Non-empty object required |
| Range table must have `field` | Required for ranges |
| Range table must have `ranges` | Non-empty array required |
| Operation requires `operand` | If `operation` is set |

---

## Error Handling

### Error Classes

All errors include a code and optional context:

```ts
import { isRaterError, createRaterError } from '@mikesaintsg/rater'

try {
	const result = engine.rate(subject, groups)
} catch (error) {
	if (isRaterError(error)) {
		console.error(`[${error.data.code}]: ${error.message}`)
		if (error.data.factorId) {
			console.error(`Factor: ${error.data.factorId}`)
		}
	}
}
```

### Error Codes

| Code | Description | Common Cause | Recovery |
|------|-------------|--------------|----------|
| `INVALID_CONDITION` | Condition evaluation failed | Unknown operator | Check operator spelling |
| `INVALID_FACTOR` | Factor configuration invalid | Missing rate source | Add baseRate/lookupTable/rangeTable |
| `INVALID_GROUP` | Group configuration invalid | Empty factors array | Add at least one factor |
| `EVALUATION_FAILED` | Condition evaluation error | Invalid field path | Check nested paths |
| `CALCULATION_FAILED` | Rate calculation error | Division by zero | Add guards for operands |
| `VALIDATION_FAILED` | Validation check failed | Multiple issues | Check validateGroups() output |
| `UNKNOWN` | Unexpected error | Bug or edge case | Check logs, report issue |

### Error Callbacks

Handle errors via subscription:

```ts
const engine = createRatingEngine({
	continueOnError: true,
	onError: (error) => {
		console.error('Rating error:', error. message)
		// Log to monitoring service
	},
})
```

### Continue on Error

Control whether calculation stops on first error:

```ts
// Stop on first error (strict mode)
const strictEngine = createRatingEngine({
	continueOnError: false,
})

// Continue and collect all errors (lenient mode)
const lenientEngine = createRatingEngine({
	continueOnError: true, // Default
})

const result = lenientEngine.rate(subject, groups)
if (result.errors.length > 0) {
	console.warn('Errors during calculation:', result.errors)
}
```

---

## TypeScript Integration

### Type Imports

```ts
import type {
	// Core types
	RateFactor,
	RateFactorGroup,
	RateSubject,
	RatingResult,
	// Table types
	RateLookupTable,
	RateRangeTable,
	RateRange,
	// Condition types
	RateCondition,
	ConditionalOperator,
	// Operation types
	MathematicalOperation,
	AggregationMethod,
	// Result types
	RateFactorResult,
	RateGroupResult,
	RateConditionResult,
	// Interface types
	RatingEngineInterface,
	RatingEngineOptions,
	// Error types
	RaterErrorCode,
	RaterErrorData,
} from '@mikesaintsg/rater'
```

### Readonly by Default

All input types use `readonly` modifiers:

```ts
// Groups are readonly arrays
const groups: readonly RateFactorGroup[] = [...]

// Subjects are readonly records
const subject: RateSubject = { ... } // Readonly<Record<string, unknown>>

// Results are fully readonly
const result: RatingResult = engine.rate(subject, groups)
result.finalRate // readonly number
result.breakdown // readonly string[]
```

### Type-Safe Subjects

Create domain-specific subject types:

```ts
interface InsuranceSubject {
	readonly age: number
	readonly vehicleType: string
	readonly zipCode: string
	readonly accidentHistory: readonly { year: number; severity: string }[]
}

// Cast to RateSubject for the engine
const subject = {
	age: 35,
	vehicleType: 'sedan',
	zipCode: '90210',
	accidentHistory:  [],
} satisfies InsuranceSubject

engine.rate(subject as RateSubject, groups)
```

---

## Performance Tips

1. **Validate Once, Rate Many** — Call `validateGroups()` during setup, not every calculation: 

```ts
// ✅ Validate at startup
const errors = engine.validateGroups(groups)
if (errors.length > 0) throw new Error('Invalid configuration')

// Then rate without validation
for (const subject of subjects) {
	engine.rate(subject, groups)
}
```

2. **Use Priority for Short-Circuit Conditions** — Put failing conditions early:

```ts
// ✅ Check eligibility first (priority:  0)
{
	id: 'eligibility',
	priority: 0, // Evaluated first
	conditions: [{ field: 'eligible', operator: 'equals', value: true }],
	baseRate: 1.0,
}
```

3. **Prefer Lookup Tables Over Conditions** — Lookups are O(1), many conditions are O(n):

```ts
// ❌ Slower:  multiple conditions
conditions: [
	{ field: 'tier', operator: 'equals', value: 'gold' },
]

// ✅ Faster: single lookup
lookupTable: { field: 'tier', values:  { gold: 1.5, silver: 1.2 } }
```

4. **Minimize Nested Field Access** — Flatten subjects when possible:

```ts
// ❌ Deep nesting
{ field: 'user.profile. preferences.tier' }

// ✅ Flattened
{ field: 'userTier' }
```

5. **Batch Similar Calculations** — Reuse engine instances:

```ts
// ✅ Create once, use many times
const engine = createRatingEngine({ baseRate: 100 })

const results = subjects.map(subject => engine.rate(subject, groups))

engine.destroy() // Cleanup when done
```

---

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 60+ | Full support |
| Firefox | 55+ | Full support |
| Safari | 11+ | Full support |
| Edge | 79+ | Full support |
| Node.js | 14+ | Full support |

### No Feature Detection Required

The rater uses only standard JavaScript features (no DOM or platform APIs).

---

## Integration with Ecosystem

### With @mikesaintsg/storage

Persist rating configurations:

```ts
import { createRatingEngine } from '@mikesaintsg/rater'
import { createStorage } from '@mikesaintsg/storage'

interface RaterConfig {
	groups: readonly RateFactorGroup[]
	baseRate: number
}

const storage = createStorage<RaterConfig>('localStorage', {
	prefix: 'rater: ',
})

// Load configuration
const config = await storage.get('config')

const engine = createRatingEngine({
	baseRate: config?. baseRate ?? 100,
})

// Save updated configuration
await storage.set('config', { groups, baseRate: 100 })
```

### With @mikesaintsg/indexeddb

Store rating history:

```ts
import { createRatingEngine } from '@mikesaintsg/rater'
import { createDatabase } from '@mikesaintsg/indexeddb'

interface RatingRecord {
	id: string
	subjectId: string
	finalRate: number
	breakdown: readonly string[]
	timestamp: number
}

const db = await createDatabase({
	name: 'ratings',
	version: 1,
	stores: {
		history: { keyPath: 'id' },
	},
})

const engine = createRatingEngine({
	onRate: async (result) => {
		await db.store('history').set({
			id: crypto.randomUUID(),
			subjectId: currentSubjectId,
			finalRate: result.finalRate,
			breakdown: result.breakdown,
			timestamp: Date.now(),
		})
	},
})
```

### With @mikesaintsg/form

Build rate configuration forms:

```ts
import { createRatingEngine } from '@mikesaintsg/rater'
import { createForm } from '@mikesaintsg/form'

interface RateFactorForm {
	id: string
	label: string
	baseRate: number
}

const form = createForm<RateFactorForm>(formElement, {
	values: { id: '', label: '', baseRate: 0 },
	onSubmit: (values) => {
		const newFactor:  RateFactor = {
			id: values.id,
			label: values.label,
			baseRate: values.baseRate,
		}
		// Add to groups
	},
})
```

---

## API Reference

### Factory Functions

#### createRatingEngine(options? ): RatingEngineInterface

Creates a rating engine instance. 

```ts
const engine = createRatingEngine({
	baseRate: 100,
	minimumRate: 50,
	maximumRate: 500,
	groupAggregationMethod: 'product',
	decimalPlaces: 2,
	continueOnError: true,
	onRate: (result) => { /* ... */ },
	onError: (error) => { /* ... */ },
})
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `baseRate` | `number` | | `0` | Starting rate |
| `minimumRate` | `number` | | — | Floor for final rate |
| `maximumRate` | `number` | | — | Ceiling for final rate |
| `groupAggregationMethod` | `AggregationMethod` | | `'sum'` | How to combine groups |
| `decimalPlaces` | `number` | | `2` | Rounding precision |
| `continueOnError` | `boolean` | | `true` | Continue on errors |
| `onRate` | `(result) => void` | | — | Rate callback |
| `onError` | `(error) => void` | | — | Error callback |

**Returns:** `RatingEngineInterface`

### RatingEngineInterface

#### Property Accessors

| Method | Returns | Description |
|--------|---------|-------------|
| `getBaseRate()` | `number` | Engine base rate |
| `getMinimumRate()` | `number \| undefined` | Minimum allowed rate |
| `getMaximumRate()` | `number \| undefined` | Maximum allowed rate |
| `getDecimalPlaces()` | `number` | Rounding decimal places |
| `isContinueOnError()` | `boolean` | Error handling mode |

#### Calculation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `rate(subject, groups)` | `RatingResult` | Calculate full rate |
| `rateFactor(subject, factor)` | `RateFactorResult` | Calculate single factor |
| `rateGroup(subject, group)` | `RateGroupResult` | Calculate single group |

#### Evaluation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `evaluateCondition(subject, condition)` | `RateConditionResult` | Evaluate condition |

#### Mathematical Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `applyOperation(rate, operation, operand)` | `number` | Apply operation |
| `aggregate(rates, method)` | `number` | Aggregate rates |

#### Validation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `validateGroups(groups)` | `readonly string[]` | Validate configuration |

#### Event Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `onRate(callback)` | `Unsubscribe` | Subscribe to rate events |
| `onError(callback)` | `Unsubscribe` | Subscribe to error events |

#### Lifecycle Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `destroy()` | `void` | Cleanup resources |

### Types

```ts
/** Mathematical operation for rate calculations */
type MathematicalOperation =
	| 'add' | 'subtract' | 'multiply' | 'divide'
	| 'percentage' | 'percentageOf'
	| 'minimum' | 'maximum' | 'average'
	| 'power' | 'round' | 'ceil' | 'floor'

/** Aggregation method for combining rates */
type AggregationMethod = 'sum' | 'product' | 'average' | 'minimum' | 'maximum'

/** Conditional operator for rate rules */
type ConditionalOperator =
	| 'equals' | 'notEquals'
	| 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual'
	| 'in' | 'notIn' | 'between' | 'notBetween'

/** Condition for applying a factor */
interface RateCondition {
	readonly field: string
	readonly operator:  ConditionalOperator
	readonly value: unknown
}

/** Lookup table for category-based rates */
interface RateLookupTable {
	readonly field: string
	readonly values:  Readonly<Record<string, number>>
	readonly defaultValue?:  number
}

/** Range definition */
interface RateRange {
	readonly minimum?:  number
	readonly maximum?: number
	readonly rate:  number
}

/** Range table for numeric-based rates */
interface RateRangeTable {
	readonly field: string
	readonly ranges: readonly RateRange[]
	readonly defaultRate?: number
}

/** Single rate factor */
interface RateFactor {
	readonly id: string
	readonly label: string
	readonly description?: string
	readonly conditions?:  readonly RateCondition[]
	readonly baseRate?:  number
	readonly lookupTable?:  RateLookupTable
	readonly rangeTable?: RateRangeTable
	readonly fieldPath?: string
	readonly operation?: MathematicalOperation
	readonly operand?: number
	readonly enabled?:  boolean
	readonly required?: boolean
	readonly priority?: number
	readonly minimumRate?: number
	readonly maximumRate?: number
}

/** Group of rate factors */
interface RateFactorGroup {
	readonly id: string
	readonly label: string
	readonly factors: readonly RateFactor[]
	readonly aggregationMethod:  AggregationMethod
	readonly baseRate?: number
	readonly requireAll?: boolean
}

/** Subject being rated */
type RateSubject = Readonly<Record<string, unknown>>

/** Condition evaluation result */
interface RateConditionResult {
	readonly condition: RateCondition
	readonly isMet: boolean
	readonly actualValue:  unknown
	readonly error?: string
}

/** Factor calculation result */
interface RateFactorResult {
	readonly factor: RateFactor
	readonly isApplied: boolean
	readonly rate: number
	readonly conditionResults?:  readonly RateConditionResult[]
	readonly error?: string
}

/** Group calculation result */
interface RateGroupResult {
	readonly group: RateFactorGroup
	readonly isApplied: boolean
	readonly rate: number
	readonly factorResults:  readonly RateFactorResult[]
}

/** Final rating result */
interface RatingResult {
	readonly finalRate: number
	readonly isSuccessful: boolean
	readonly factorsApplied: number
	readonly groupResults: readonly RateGroupResult[]
	readonly allFactorResults: readonly RateFactorResult[]
	readonly breakdown:  readonly string[]
	readonly errors: readonly string[]
}
```

### Error Types

```ts
/** Rater error codes */
type RaterErrorCode =
	| 'INVALID_CONDITION'
	| 'INVALID_FACTOR'
	| 'INVALID_GROUP'
	| 'EVALUATION_FAILED'
	| 'CALCULATION_FAILED'
	| 'VALIDATION_FAILED'
	| 'UNKNOWN'

/** Rater error data */
interface RaterErrorData {
	readonly code: RaterErrorCode
	readonly factorId?: string
	readonly groupId?: string
	readonly field?: string
	readonly cause?: Error
}
```

---

## License

MIT
