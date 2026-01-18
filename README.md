# @mikesaintsg/rater

> **Factor-based rating engine with conditions, lookups, ranges, and mathematical operations for calculating dynamic rates.**

[![npm version](https://img.shields.io/npm/v/@mikesaintsg/rater.svg)](https://www.npmjs.com/package/@mikesaintsg/rater)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mikesaintsg/rater)](https://bundlephobia.com/package/@mikesaintsg/rater)
[![license](https://img.shields.io/npm/l/@mikesaintsg/rater.svg)](LICENSE)

---

## Features

- ✅ **Declarative Rate Factors** — Define complex rating logic with simple data structures
- ✅ **Conditional Application** — Apply factors only when specific conditions are met
- ✅ **Flexible Rate Sources** — Use static values, lookup tables, range tables, or field paths
- ✅ **Mathematical Operations** — Transform rates with add, multiply, percentage, and more
- ✅ **Composable Groups** — Organize factors into groups with customizable aggregation
- ✅ **Zero dependencies** — Built on native JavaScript APIs
- ✅ **TypeScript first** — Full type safety with generics
- ✅ **Tree-shakeable** — ESM-only, import what you need

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

// Create instance
const engine = createRatingEngine({
	baseRate: 100,
	minimumRate: 50,
	maximumRate: 500,
	decimalPlaces: 2,
})

// Define rate factor groups
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
]

// Calculate rate
const subject: RateSubject = { age: 30 }
const result = engine.rate(subject, groups)

console.log(result.finalRate) // 100 (base * 1.0)

// Cleanup when done
engine.destroy()
```

---

## Documentation

📚 **[Full API Guide](./guides/rater.md)** — Comprehensive documentation with examples

### Key Sections

- [Introduction](./guides/rater.md#introduction) — Value proposition and use cases
- [Quick Start](./guides/rater.md#quick-start) — Get started in minutes
- [Core Concepts](./guides/rater.md#core-concepts) — Understand the fundamentals
- [Error Handling](./guides/rater.md#error-handling) — Error codes and recovery
- [API Reference](./guides/rater.md#api-reference) — Complete API documentation

---

## API Overview

### Factory Functions

| Function                            | Description                      |
|-------------------------------------|----------------------------------|
| `createRatingEngine(options?)`      | Create a rating engine instance  |

### Main Interface

| Method                                    | Returns                  | Description                    |
|-------------------------------------------|--------------------------|--------------------------------|
| `getBaseRate()`                           | `number`                 | Get engine base rate           |
| `getMinimumRate()`                        | `number \| undefined`    | Get minimum allowed rate       |
| `getMaximumRate()`                        | `number \| undefined`    | Get maximum allowed rate       |
| `getDecimalPlaces()`                      | `number`                 | Get rounding decimal places    |
| `isContinueOnError()`                     | `boolean`                | Get error handling mode        |
| `rate(subject, groups)`                   | `RatingResult`           | Calculate full rate            |
| `rateFactor(subject, factor)`             | `RateFactorResult`       | Calculate single factor        |
| `rateGroup(subject, group)`               | `RateGroupResult`        | Calculate single group         |
| `evaluateCondition(subject, condition)`   | `RateConditionResult`    | Evaluate condition             |
| `applyOperation(rate, operation, operand)`| `number`                 | Apply mathematical operation   |
| `aggregate(rates, method)`                | `number`                 | Aggregate rates                |
| `validateGroups(groups)`                  | `readonly string[]`      | Validate configuration         |
| `onRate(callback)`                        | `Unsubscribe`            | Subscribe to rate events       |
| `onError(callback)`                       | `Unsubscribe`            | Subscribe to error events      |
| `destroy()`                               | `void`                   | Cleanup resources              |

---

## Examples

### Basic Usage

```ts
import { createRatingEngine } from '@mikesaintsg/rater'

const engine = createRatingEngine({
	baseRate: 100,
})

// Calculate rate with lookup table
const groups = [
	{
		id: 'tier',
		label: 'Tier Discount',
		aggregationMethod: 'multiply',
		factors: [
			{
				id: 'tierFactor',
				label: 'Tier Factor',
				lookupTable: {
					field: 'tier',
					values: { gold: 0.9, silver: 0.95, bronze: 1.0 },
					defaultValue: 1.0,
				},
			},
		],
	},
]

const result = engine.rate({ tier: 'gold' }, groups)
console.log(result.finalRate) // 90 (100 * 0.9)
```

### With TypeScript

```ts
import { createRatingEngine } from '@mikesaintsg/rater'
import type { RateFactorGroup, RateSubject } from '@mikesaintsg/rater'

interface InsuranceSubject {
	readonly age: number
	readonly vehicleType: string
	readonly creditScore: number
}

const groups: readonly RateFactorGroup[] = [
	{
		id: 'demographics',
		label: 'Demographics',
		aggregationMethod: 'product',
		factors: [
			{
				id: 'age',
				label: 'Age Factor',
				rangeTable: {
					field: 'age',
					ranges: [
						{ minimum: 16, maximum: 25, rate: 1.5 },
						{ minimum: 26, maximum: 65, rate: 1.0 },
						{ minimum: 66, rate: 1.2 },
					],
				},
			},
		],
	},
]

const subject: InsuranceSubject = {
	age: 35,
	vehicleType: 'sedan',
	creditScore: 750,
}

const result = engine.rate(subject as RateSubject, groups)
```

### Error Handling

```ts
import { createRatingEngine, isRaterError } from '@mikesaintsg/rater'

const engine = createRatingEngine({
	baseRate: 100,
	continueOnError: true,
	onError: (error) => {
		console.error('Rating error:', error.message)
	},
})

try {
	const result = engine.rate(subject, groups)
	if (!result.isSuccessful) {
		console.error('Errors:', result.errors)
	}
} catch (error) {
	if (isRaterError(error)) {
		console.error(`[${error.data.code}]: ${error.message}`)
	}
}
```

---

## Ecosystem Integration

| Package                    | Integration                |
|----------------------------|----------------------------|
| `@mikesaintsg/core`        | Shared types and utilities |
| `@mikesaintsg/storage`     | Persist rating configurations |
| `@mikesaintsg/indexeddb`   | Store rating history       |
| `@mikesaintsg/form`        | Build rate configuration forms |

See [Integration with Ecosystem](./guides/rater.md#integration-with-ecosystem) for details.

---

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome  | 60+             |
| Firefox | 55+             |
| Safari  | 11+             |
| Edge    | 79+             |
| Node.js | 14+             |

---

## Contributing

Contributions are welcome! Please read the [contributing guidelines](CONTRIBUTING.md) first.

---

## License

MIT © [mikesaintsg](https://github.com/mikesaintsg)
