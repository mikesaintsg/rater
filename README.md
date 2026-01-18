# @mikesaintsg/rater

> Factor-based rating engine with conditions, lookups, ranges, and mathematical operations for calculating dynamic rates.

[![npm version](https://img.shields.io/npm/v/@mikesaintsg/rater.svg)](https://www.npmjs.com/package/@mikesaintsg/rater)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Declarative Rate Factors** — Define complex rating logic with simple data structures
- **Conditional Application** — Apply factors only when specific conditions are met
- **Flexible Rate Sources** — Use static values, lookup tables, range tables, or field paths
- **Mathematical Operations** — Transform rates with add, multiply, percentage, and more
- **Composable Groups** — Organize factors into groups with customizable aggregation
- **Full TypeScript Support** — Complete type safety with strict mode
- **Zero Dependencies** — Built entirely on native JavaScript APIs

## Installation

```bash
npm install @mikesaintsg/rater
```

## Quick Start

```typescript
import { createRatingEngine } from '@mikesaintsg/rater'
import type { RateFactorGroup, RateSubject } from '@mikesaintsg/rater'

// 1. Create the rating engine
const engine = createRatingEngine({
  baseRate: 100,
  minimumRate: 50,
  maximumRate: 500,
  decimalPlaces: 2,
  onRate: (result) => {
    console.log(`Final rate: ${result.finalRate}`)
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
          field: 'membershipTier',
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

console.log(result.finalRate) // 90 (100 * 1.0 * 0.9)
console.log(result.breakdown) // Step-by-step calculation

// 4. Cleanup
engine.destroy()
```

## Rate Sources

Each factor can use one of four rate sources:

| Source | Description | Example |
|--------|-------------|---------|
| `baseRate` | Fixed static value | `{ baseRate: 100 }` |
| `lookupTable` | Category-based rates | `{ lookupTable: { field: 'tier', values: { gold: 1.5 } } }` |
| `rangeTable` | Range-based rates | `{ rangeTable: { field: 'age', ranges: [...] } }` |
| `fieldPath` | Value from subject | `{ fieldPath: 'customRate' }` |

## Conditional Operators

| Operator | Description |
|----------|-------------|
| `equals` | Exact match |
| `notEquals` | Not equal |
| `greaterThan` | Greater than |
| `lessThan` | Less than |
| `greaterThanOrEqual` | Greater or equal |
| `lessThanOrEqual` | Less or equal |
| `in` | Value in array |
| `notIn` | Value not in array |
| `between` | Within range (inclusive) |
| `notBetween` | Outside range |

## Mathematical Operations

| Operation | Formula |
|-----------|---------|
| `add` | `rate + operand` |
| `subtract` | `rate - operand` |
| `multiply` | `rate × operand` |
| `divide` | `rate ÷ operand` |
| `percentage` | `rate × (1 + operand/100)` |
| `percentageOf` | `rate × (operand/100)` |
| `minimum` | `min(rate, operand)` |
| `maximum` | `max(rate, operand)` |
| `average` | `(rate + operand) / 2` |
| `power` | `rate^operand` |
| `round` | `round(rate)` |
| `ceil` | `ceil(rate)` |
| `floor` | `floor(rate)` |

## Aggregation Methods

| Method | Formula |
|--------|---------|
| `sum` | `a + b + c` |
| `product` | `a × b × c` |
| `average` | `(a + b + c) / n` |
| `minimum` | `min(a, b, c)` |
| `maximum` | `max(a, b, c)` |

## API Reference

### Factory Function

```typescript
createRatingEngine(options?: RatingEngineOptions): RatingEngineInterface
```

### RatingEngineInterface

| Method | Returns | Description |
|--------|---------|-------------|
| `getBaseRate()` | `number` | Get engine base rate |
| `getMinimumRate()` | `number \| undefined` | Get minimum allowed rate |
| `getMaximumRate()` | `number \| undefined` | Get maximum allowed rate |
| `getDecimalPlaces()` | `number` | Get rounding decimal places |
| `isContinueOnError()` | `boolean` | Get error handling mode |
| `rate(subject, groups)` | `RatingResult` | Calculate full rate |
| `rateFactor(subject, factor)` | `RateFactorResult` | Calculate single factor |
| `rateGroup(subject, group)` | `RateGroupResult` | Calculate single group |
| `evaluateCondition(subject, condition)` | `RateConditionResult` | Evaluate condition |
| `applyOperation(rate, operation, operand)` | `number` | Apply operation |
| `aggregate(rates, method)` | `number` | Aggregate rates |
| `validateGroups(groups)` | `readonly string[]` | Validate configuration |
| `onRate(callback)` | `Unsubscribe` | Subscribe to rate events |
| `onError(callback)` | `Unsubscribe` | Subscribe to error events |
| `destroy()` | `void` | Cleanup resources |

## Documentation

For complete API documentation, see [guides/rater.md](./guides/rater.md).

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for development)

## License

MIT
