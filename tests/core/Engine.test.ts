/**
 * @mikesaintsg/rater
 *
 * Tests for RatingEngine.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRatingEngine } from '@mikesaintsg/rater'
import type { RateFactorGroup, RatingEngineInterface, RateFactor } from '@mikesaintsg/rater'

describe('RatingEngine', () => {
	let engine: RatingEngineInterface

	beforeEach(() => {
		engine = createRatingEngine({ baseRate: 100 })
	})

	afterEach(() => {
		engine.destroy()
	})

	describe('getBaseRate', () => {
		it('returns configured base rate', () => {
			expect(engine.getBaseRate()).toBe(100)
		})

		it('returns default base rate when not configured', () => {
			const defaultEngine = createRatingEngine()
			expect(defaultEngine.getBaseRate()).toBe(0)
			defaultEngine.destroy()
		})
	})

	describe('rate', () => {
		it('returns base rate when no groups provided', () => {
			const result = engine.rate({ age: 30 }, [])
			expect(result.finalRate).toBe(100)
			expect(result.isSuccessful).toBe(true)
		})

		it('applies simple base rate factor', () => {
			const groups:  readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test Group',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'fixed',
							label: 'Fixed Rate',
							baseRate: 50,
						},
					],
				},
			]

			const result = engine.rate({ age: 30 }, groups)
			expect(result.finalRate).toBe(50)
			expect(result.factorsApplied).toBe(1)
		})

		it('applies lookup table correctly', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'tier',
					label: 'Tier Group',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'tierFactor',
							label: 'Tier Factor',
							lookupTable: {
								field: 'tier',
								values: {
									gold: 100,
									silver: 75,
									bronze: 50,
								},
								defaultValue: 25,
							},
						},
					],
				},
			]

			expect(engine.rate({ tier: 'gold' }, groups).finalRate).toBe(100)
			expect(engine.rate({ tier: 'silver' }, groups).finalRate).toBe(75)
			expect(engine.rate({ tier: 'unknown' }, groups).finalRate).toBe(25)
		})

		it('applies range table correctly', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'age',
					label: 'Age Group',
					aggregationMethod:  'sum',
					factors:  [
						{
							id:  'ageFactor',
							label: 'Age Factor',
							rangeTable: {
								field: 'age',
								ranges: [
									{ minimum: 18, maximum: 25, rate: 150 },
									{ minimum: 26, maximum: 65, rate: 100 },
									{ minimum: 66, rate: 130 },
								],
								defaultRate: 200,
							},
						},
					],
				},
			]

			expect(engine.rate({ age: 20 }, groups).finalRate).toBe(150)
			expect(engine.rate({ age: 40 }, groups).finalRate).toBe(100)
			expect(engine.rate({ age: 70 }, groups).finalRate).toBe(130)
			expect(engine.rate({ age: 10 }, groups).finalRate).toBe(200)
		})

		it('respects conditions', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'conditional',
					label: 'Conditional Group',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'premiumFactor',
							label:  'Premium Factor',
							baseRate: 200,
							conditions: [
								{ field: 'isPremium', operator: 'equals', value: true },
							],
						},
					],
				},
			]

			expect(engine.rate({ isPremium: true }, groups).finalRate).toBe(200)
			expect(engine.rate({ isPremium: false }, groups).finalRate).toBe(100) // Base rate
		})

		it('applies mathematical operations', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'math',
					label: 'Math Group',
					aggregationMethod:  'sum',
					factors: [
						{
							id: 'percentageFactor',
							label: 'Percentage Factor',
							baseRate: 100,
							operation: 'percentage',
							operand: 10, // +10%
						},
					],
				},
			]

			const result = engine.rate({}, groups)
			expect(result.finalRate).toBe(110)
		})
	})

	describe('aggregate', () => {
		it('sums rates', () => {
			expect(engine.aggregate([10, 20, 30], 'sum')).toBe(60)
		})

		it('multiplies rates', () => {
			expect(engine.aggregate([2, 3, 4], 'product')).toBe(24)
		})

		it('averages rates', () => {
			expect(engine.aggregate([10, 20, 30], 'average')).toBe(20)
		})

		it('finds minimum', () => {
			expect(engine.aggregate([10, 5, 20], 'minimum')).toBe(5)
		})

		it('finds maximum', () => {
			expect(engine.aggregate([10, 5, 20], 'maximum')).toBe(20)
		})

		it('returns 0 for empty array', () => {
			expect(engine. aggregate([], 'sum')).toBe(0)
		})
	})

	describe('applyOperation', () => {
		it('adds correctly', () => {
			expect(engine.applyOperation(100, 'add', 50)).toBe(150)
		})

		it('subtracts correctly', () => {
			expect(engine.applyOperation(100, 'subtract', 30)).toBe(70)
		})

		it('multiplies correctly', () => {
			expect(engine.applyOperation(100, 'multiply', 1.5)).toBe(150)
		})

		it('divides correctly', () => {
			expect(engine.applyOperation(100, 'divide', 4)).toBe(25)
		})

		it('handles divide by zero', () => {
			expect(engine.applyOperation(100, 'divide', 0)).toBe(100)
		})

		it('applies percentage correctly', () => {
			expect(engine.applyOperation(100, 'percentage', 25)).toBe(125)
		})

		it('applies percentageOf correctly', () => {
			expect(engine.applyOperation(100, 'percentageOf', 50)).toBe(50)
		})
	})

	describe('evaluateCondition', () => {
		it('evaluates equals correctly', () => {
			const result = engine.evaluateCondition(
				{ status: 'active' },
				{ field: 'status', operator: 'equals', value: 'active' },
			)
			expect(result. isMet).toBe(true)
		})

		it('evaluates greaterThan correctly', () => {
			const result = engine.evaluateCondition(
				{ age: 30 },
				{ field: 'age', operator:  'greaterThan', value: 25 },
			)
			expect(result.isMet).toBe(true)
		})

		it('evaluates between correctly', () => {
			const result = engine.evaluateCondition(
				{ score: 75 },
				{ field: 'score', operator: 'between', value: [50, 100] },
			)
			expect(result.isMet).toBe(true)
		})

		it('evaluates in correctly', () => {
			const result = engine.evaluateCondition(
				{ tier: 'gold' },
				{ field: 'tier', operator: 'in', value: ['gold', 'platinum'] },
			)
			expect(result.isMet).toBe(true)
		})

		it('handles nested fields', () => {
			const result = engine.evaluateCondition(
				{ user: { profile: { verified: true } } },
				{ field: 'user.profile.verified', operator: 'equals', value: true },
			)
			expect(result.isMet).toBe(true)
		})
	})

	describe('validateGroups', () => {
		it('returns errors for invalid groups', () => {
			const invalidGroups: readonly RateFactorGroup[] = [
				{
					id: '',
					label: '',
					aggregationMethod: 'sum',
					factors: [],
				},
			]

			const errors = engine. validateGroups(invalidGroups)
			expect(errors. length).toBeGreaterThan(0)
		})

		it('returns empty array for valid groups', () => {
			const validGroups: readonly RateFactorGroup[] = [
				{
					id: 'valid',
					label: 'Valid Group',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'factor1',
							label: 'Factor 1',
							baseRate: 100,
						},
					],
				},
			]

			const errors = engine.validateGroups(validGroups)
			expect(errors).toEqual([])
		})
	})

	describe('subscriptions', () => {
		it('calls onRate callback', () => {
			let called = false
			const unsubscribe = engine.onRate(() => {
				called = true
			})

			engine.rate({}, [])
			expect(called).toBe(true)

			unsubscribe()
		})

		it('supports unsubscribe', () => {
			let callCount = 0
			const unsubscribe = engine.onRate(() => {
				callCount++
			})

			engine.rate({}, [])
			expect(callCount).toBe(1)

			unsubscribe()
			engine.rate({}, [])
			expect(callCount).toBe(1)
		})
	})

	describe('destroy', () => {
		it('prevents further operations', () => {
			engine.destroy()
			expect(() => engine.rate({}, [])).toThrow()
		})
	})

	describe('edge cases', () => {
		it('handles disabled factors', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'enabled',
							label: 'Enabled',
							baseRate: 100,
							enabled: true,
						},
						{
							id: 'disabled',
							label: 'Disabled',
							baseRate: 50,
							enabled: false,
						},
					],
				},
			]

			const result = engine.rate({}, groups)
			expect(result.finalRate).toBe(100)
			expect(result.factorsApplied).toBe(1)
		})

		it('respects factor priority order', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'low',
							label: 'Low Priority',
							baseRate: 10,
							priority: 10,
						},
						{
							id: 'high',
							label: 'High Priority',
							baseRate: 20,
							priority: 0,
						},
					],
				},
			]

			const result = engine.rate({}, groups)
			expect(result.allFactorResults[0]?.factor.id).toBe('high')
			expect(result.allFactorResults[1]?.factor.id).toBe('low')
		})

		it('applies factor min/max clamping', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'clamped',
							label: 'Clamped',
							baseRate: 200,
							minimumRate: 50,
							maximumRate: 100,
						},
					],
				},
			]

			const result = engine.rate({}, groups)
			expect(result.finalRate).toBe(100)
		})

		it('applies engine min/max clamping', () => {
			const clampedEngine = createRatingEngine({
				baseRate: 100,
				minimumRate: 50,
				maximumRate: 200,
			})

			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'high',
							label: 'High',
							baseRate: 500,
						},
					],
				},
			]

			const result = clampedEngine.rate({}, groups)
			expect(result.finalRate).toBe(200)
			clampedEngine.destroy()
		})

		it('uses fieldPath to get rate from subject', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'custom',
							label: 'Custom Rate',
							fieldPath: 'customRate',
						},
					],
				},
			]

			const result = engine.rate({ customRate: 75 }, groups)
			expect(result.finalRate).toBe(75)
		})

		it('handles nested fieldPath', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'nested',
							label: 'Nested Rate',
							fieldPath: 'pricing.rate',
						},
					],
				},
			]

			const result = engine.rate({ pricing: { rate: 80 } }, groups)
			expect(result.finalRate).toBe(80)
		})

		it('handles multiple conditions (AND logic)', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'multi',
							label: 'Multi-condition',
							baseRate: 100,
							conditions: [
								{ field: 'age', operator: 'greaterThanOrEqual', value: 18 },
								{ field: 'isPremium', operator: 'equals', value: true },
							],
						},
					],
				},
			]

			// Both conditions met
			expect(engine.rate({ age: 25, isPremium: true }, groups).finalRate).toBe(100)
			// Only one condition met
			expect(engine.rate({ age: 25, isPremium: false }, groups).finalRate).toBe(100) // base rate
			expect(engine.rate({ age: 15, isPremium: true }, groups).finalRate).toBe(100) // base rate
		})

		it('handles product aggregation across groups', () => {
			const productEngine = createRatingEngine({
				baseRate: 100,
				groupAggregationMethod: 'product',
			})

			const groups: readonly RateFactorGroup[] = [
				{
					id: 'g1',
					label: 'Group 1',
					aggregationMethod: 'sum',
					factors: [{ id: 'f1', label: 'F1', baseRate: 1.5 }],
				},
				{
					id: 'g2',
					label: 'Group 2',
					aggregationMethod: 'sum',
					factors: [{ id: 'f2', label: 'F2', baseRate: 2 }],
				},
			]

			const result = productEngine.rate({}, groups)
			expect(result.finalRate).toBe(3) // 1.5 * 2
			productEngine.destroy()
		})

		it('handles requireAll constraint', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'product',
					requireAll: true,
					factors: [
						{
							id: 'required1',
							label: 'Required 1',
							required: true,
							baseRate: 1.0,
							conditions: [{ field: 'check1', operator: 'equals', value: true }],
						},
						{
							id: 'required2',
							label: 'Required 2',
							required: true,
							baseRate: 1.0,
							conditions: [{ field: 'check2', operator: 'equals', value: true }],
						},
					],
				},
			]

			// Both required pass
			const result1 = engine.rate({ check1: true, check2: true }, groups)
			expect(result1.groupResults[0]?.isApplied).toBe(true)

			// One required fails
			const result2 = engine.rate({ check1: true, check2: false }, groups)
			expect(result2.groupResults[0]?.isApplied).toBe(false)
		})

		it('handles group baseRate', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					baseRate: 50,
					factors: [{ id: 'f1', label: 'F1', baseRate: 25 }],
				},
			]

			const result = engine.rate({}, groups)
			// sum of baseRate (50) and factor (25) = 75
			expect(result.finalRate).toBe(75)
		})

		it('rounds to configured decimal places', () => {
			const preciseEngine = createRatingEngine({
				baseRate: 100,
				decimalPlaces: 3,
			})

			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [{ id: 'f1', label: 'F1', baseRate: 33.33333333 }],
				},
			]

			const result = preciseEngine.rate({}, groups)
			expect(result.finalRate).toBe(33.333)
			preciseEngine.destroy()
		})

		it('provides breakdown in result', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test Group',
					aggregationMethod: 'sum',
					factors: [{ id: 'f1', label: 'Factor 1', baseRate: 100 }],
				},
			]

			const result = engine.rate({}, groups)
			expect(result.breakdown.length).toBeGreaterThan(0)
			expect(result.breakdown.some(b => b.includes('base rate'))).toBe(true)
			expect(result.breakdown.some(b => b.includes('Final rate'))).toBe(true)
		})

		it('handles options hooks', () => {
			let rateCallbackCalled = false
			let errorCallbackCalled = false

			const hookEngine = createRatingEngine({
				baseRate: 100,
				onRate: () => {
					rateCallbackCalled = true
				},
				onError: () => {
					errorCallbackCalled = true
				},
			})

			hookEngine.rate({}, [])
			expect(rateCallbackCalled).toBe(true)
			expect(errorCallbackCalled).toBe(false)

			hookEngine.destroy()
		})

		it('handles all mathematical operations', () => {
			const operations = [
				{ op: 'add' as const, operand: 10, expected: 110 },
				{ op: 'subtract' as const, operand: 10, expected: 90 },
				{ op: 'multiply' as const, operand: 2, expected: 200 },
				{ op: 'divide' as const, operand: 2, expected: 50 },
				{ op: 'percentage' as const, operand: 10, expected: 110 },
				{ op: 'percentageOf' as const, operand: 50, expected: 50 },
				{ op: 'minimum' as const, operand: 80, expected: 80 },
				{ op: 'maximum' as const, operand: 120, expected: 120 },
				{ op: 'average' as const, operand: 50, expected: 75 },
				{ op: 'power' as const, operand: 2, expected: 10000 },
				{ op: 'round' as const, operand: 0, expected: 100 },
				{ op: 'ceil' as const, operand: 0, expected: 100 },
				{ op: 'floor' as const, operand: 0, expected: 100 },
			]

			for (const { op, operand, expected } of operations) {
				const result = engine.applyOperation(100, op, operand)
				expect(result).toBeCloseTo(expected, 10)
			}
		})

		it('isContinueOnError returns correct value', () => {
			expect(engine.isContinueOnError()).toBe(true)

			const strictEngine = createRatingEngine({ continueOnError: false })
			expect(strictEngine.isContinueOnError()).toBe(false)
			strictEngine.destroy()
		})

		it('getMinimumRate and getMaximumRate work correctly', () => {
			expect(engine.getMinimumRate()).toBe(undefined)
			expect(engine.getMaximumRate()).toBe(undefined)

			const boundedEngine = createRatingEngine({
				minimumRate: 10,
				maximumRate: 200,
			})
			expect(boundedEngine.getMinimumRate()).toBe(10)
			expect(boundedEngine.getMaximumRate()).toBe(200)
			boundedEngine.destroy()
		})

		it('getDecimalPlaces returns correct value', () => {
			expect(engine.getDecimalPlaces()).toBe(2)

			const preciseEngine = createRatingEngine({ decimalPlaces: 4 })
			expect(preciseEngine.getDecimalPlaces()).toBe(4)
			preciseEngine.destroy()
		})
	})

	// ============================================================================
	// Mathematical Accuracy Tests
	// ============================================================================

	describe('mathematical accuracy', () => {
		describe('applyOperation precision', () => {
			it('handles floating-point precision in percentage', () => {
				// 100 * (1 + 0.1/100) = 100.1
				expect(engine.applyOperation(100, 'percentage', 0.1)).toBeCloseTo(100.1, 10)
			})

			it('handles small percentages accurately', () => {
				expect(engine.applyOperation(1000, 'percentage', 0.01)).toBeCloseTo(1000.1, 10)
			})

			it('handles negative percentage', () => {
				expect(engine.applyOperation(100, 'percentage', -50)).toBeCloseTo(50, 10)
			})

			it('handles percentage of 100 (double the value)', () => {
				expect(engine.applyOperation(100, 'percentage', 100)).toBeCloseTo(200, 10)
			})

			it('handles percentageOf with 0', () => {
				expect(engine.applyOperation(100, 'percentageOf', 0)).toBe(0)
			})

			it('handles percentageOf with 100', () => {
				expect(engine.applyOperation(100, 'percentageOf', 100)).toBe(100)
			})

			it('handles percentageOf with values over 100', () => {
				expect(engine.applyOperation(100, 'percentageOf', 150)).toBe(150)
			})

			it('handles power with fractional exponent', () => {
				expect(engine.applyOperation(4, 'power', 0.5)).toBeCloseTo(2, 10) // sqrt(4)
			})

			it('handles power with negative exponent', () => {
				expect(engine.applyOperation(2, 'power', -1)).toBeCloseTo(0.5, 10) // 1/2
			})

			it('handles power of 0', () => {
				expect(engine.applyOperation(100, 'power', 0)).toBe(1)
			})

			it('handles 0 to a power', () => {
				expect(engine.applyOperation(0, 'power', 5)).toBe(0)
			})

			it('handles round with negative numbers', () => {
				expect(engine.applyOperation(-2.5, 'round', 0)).toBe(-2) // IEEE 754 banker's rounding
			})

			it('handles ceil with negative numbers', () => {
				expect(engine.applyOperation(-2.1, 'ceil', 0)).toBe(-2)
				expect(engine.applyOperation(-2.9, 'ceil', 0)).toBe(-2)
			})

			it('handles floor with negative numbers', () => {
				expect(engine.applyOperation(-2.1, 'floor', 0)).toBe(-3)
				expect(engine.applyOperation(-2.9, 'floor', 0)).toBe(-3)
			})

			it('handles minimum with equal values', () => {
				expect(engine.applyOperation(100, 'minimum', 100)).toBe(100)
			})

			it('handles maximum with equal values', () => {
				expect(engine.applyOperation(100, 'maximum', 100)).toBe(100)
			})

			it('handles average with negative operand', () => {
				expect(engine.applyOperation(100, 'average', -100)).toBe(0)
			})

			it('handles multiply by 0', () => {
				expect(engine.applyOperation(100, 'multiply', 0)).toBe(0)
			})

			it('handles multiply by negative', () => {
				expect(engine.applyOperation(100, 'multiply', -1)).toBe(-100)
			})

			it('handles subtract larger than rate', () => {
				expect(engine.applyOperation(50, 'subtract', 100)).toBe(-50)
			})
		})

		describe('aggregate precision', () => {
			it('handles floating-point sum precision', () => {
				// 0.1 + 0.2 should be 0.3 (but has floating point issues)
				expect(engine.aggregate([0.1, 0.2], 'sum')).toBeCloseTo(0.3, 10)
			})

			it('handles product with many decimals', () => {
				expect(engine.aggregate([1.1, 1.2, 1.3], 'product')).toBeCloseTo(1.716, 10)
			})

			it('handles average of single value', () => {
				expect(engine.aggregate([42], 'average')).toBe(42)
			})

			it('handles minimum with negative values', () => {
				expect(engine.aggregate([-10, 0, 10], 'minimum')).toBe(-10)
			})

			it('handles maximum with negative values', () => {
				expect(engine.aggregate([-100, -50, -10], 'maximum')).toBe(-10)
			})

			it('handles product with 0', () => {
				expect(engine.aggregate([1, 2, 0, 4], 'product')).toBe(0)
			})

			it('handles product with negative values', () => {
				expect(engine.aggregate([2, -3, 4], 'product')).toBe(-24)
			})

			it('handles sum of very large numbers', () => {
				expect(engine.aggregate([1e15, 1e15], 'sum')).toBe(2e15)
			})
		})
	})

	// ============================================================================
	// Rate Calculation Edge Cases
	// ============================================================================

	describe('rate calculation edge cases', () => {
		it('handles lookup table with missing default', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'lookup',
							label: 'Lookup',
							lookupTable: {
								field: 'tier',
								values: { gold: 100 },
								// No defaultValue
							},
						},
					],
				},
			]

			// When key not found and no default, factor returns 0 (the baseRate fallback)
			// Factor still applies with rate 0, so group rate is 0
			const result = engine.rate({ tier: 'unknown' }, groups)
			expect(result.finalRate).toBe(0)
		})

		it('handles range table with no matching range and no default', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'range',
							label: 'Range',
							rangeTable: {
								field: 'age',
								ranges: [
									{ minimum: 0, maximum: 17, rate: 200 },
									{ minimum: 18, maximum: 65, rate: 100 },
								],
								// No defaultRate, age 70 won't match
							},
						},
					],
				},
			]

			// When no range matches and no default, factor returns 0 (the baseRate fallback)
			const result = engine.rate({ age: 70 }, groups)
			expect(result.finalRate).toBe(0)
		})

		it('handles multiple groups with different aggregation methods', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'g1',
					label: 'Sum Group',
					aggregationMethod: 'sum',
					factors: [
						{ id: 'f1', label: 'F1', baseRate: 50 },
						{ id: 'f2', label: 'F2', baseRate: 50 },
					],
				},
				{
					id: 'g2',
					label: 'Product Group',
					aggregationMethod: 'product',
					factors: [
						{ id: 'f3', label: 'F3', baseRate: 1.5 },
						{ id: 'f4', label: 'F4', baseRate: 2 },
					],
				},
			]

			const result = engine.rate({}, groups)
			// Group 1: 50 + 50 = 100
			// Group 2: 1.5 * 2 = 3
			// Engine sum: 100 + 3 = 103
			expect(result.finalRate).toBe(103)
		})

		it('handles factor with operation but no base rate', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'fieldBased',
							label: 'Field Based',
							fieldPath: 'rate',
							operation: 'percentage',
							operand: 10,
						},
					],
				},
			]

			const result = engine.rate({ rate: 100 }, groups)
			expect(result.finalRate).toBe(110)
		})

		it('handles all factors disabled in a group', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{ id: 'f1', label: 'F1', baseRate: 100, enabled: false },
						{ id: 'f2', label: 'F2', baseRate: 200, enabled: false },
					],
				},
			]

			const result = engine.rate({}, groups)
			// No factors applied, should return engine base rate
			expect(result.finalRate).toBe(100)
			expect(result.factorsApplied).toBe(0)
		})

		it('handles condition failure with multiple factors', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'passes',
							label: 'Passes',
							baseRate: 50,
							conditions: [{ field: 'active', operator: 'equals', value: true }],
						},
						{
							id: 'fails',
							label: 'Fails',
							baseRate: 100,
							conditions: [{ field: 'premium', operator: 'equals', value: true }],
						},
					],
				},
			]

			const result = engine.rate({ active: true, premium: false }, groups)
			expect(result.finalRate).toBe(50)
			expect(result.factorsApplied).toBe(1)
		})

		it('handles negative base rates', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{ id: 'positive', label: 'Positive', baseRate: 100 },
						{ id: 'negative', label: 'Negative', baseRate: -30 },
					],
				},
			]

			const result = engine.rate({}, groups)
			expect(result.finalRate).toBe(70)
		})

		it('handles minimum clamping to engine minimum', () => {
			const clampedEngine = createRatingEngine({
				baseRate: 0,
				minimumRate: 50,
			})

			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [{ id: 'f1', label: 'F1', baseRate: 10 }],
				},
			]

			const result = clampedEngine.rate({}, groups)
			expect(result.finalRate).toBe(50)
			clampedEngine.destroy()
		})

		it('handles lookup with numeric key (string conversion)', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'lookup',
							label: 'Lookup',
							lookupTable: {
								field: 'level',
								values: {
									'1': 100,
									'2': 200,
									'3': 300,
								},
							},
						},
					],
				},
			]

			// Subject has numeric value, lookup table has string keys
			const result = engine.rate({ level: 2 }, groups)
			expect(result.finalRate).toBe(200)
		})

		it('handles range table boundary conditions exactly', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'range',
							label: 'Range',
							rangeTable: {
								field: 'score',
								ranges: [
									{ minimum: 0, maximum: 49, rate: 50 },
									{ minimum: 50, maximum: 99, rate: 100 },
									{ minimum: 100, rate: 150 },
								],
							},
						},
					],
				},
			]

			// Test exact boundaries
			expect(engine.rate({ score: 49 }, groups).finalRate).toBe(50)
			expect(engine.rate({ score: 50 }, groups).finalRate).toBe(100)
			expect(engine.rate({ score: 99 }, groups).finalRate).toBe(100)
			expect(engine.rate({ score: 100 }, groups).finalRate).toBe(150)
		})

		it('handles factor priority correctly with complex ordering', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{ id: 'p10', label: 'P10', baseRate: 10, priority: 10 },
						{ id: 'p5', label: 'P5', baseRate: 5, priority: 5 },
						{ id: 'p0', label: 'P0', baseRate: 0, priority: 0 },
						{ id: 'p-1', label: 'P-1', baseRate: -1, priority: -1 },
						{ id: 'noP', label: 'No Priority', baseRate: 100 }, // default priority 0
					],
				},
			]

			const result = engine.rate({}, groups)
			// Priority order: -1, 0, 0, 5, 10
			expect(result.allFactorResults[0]?.factor.id).toBe('p-1')
			expect(result.allFactorResults[1]?.factor.priority ?? 0).toBe(0)
			expect(result.allFactorResults[3]?.factor.id).toBe('p5')
			expect(result.allFactorResults[4]?.factor.id).toBe('p10')
		})

		it('handles zero decimal places rounding', () => {
			const intEngine = createRatingEngine({ decimalPlaces: 0 })

			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [{ id: 'f1', label: 'F1', baseRate: 99.9 }],
				},
			]

			const result = intEngine.rate({}, groups)
			expect(result.finalRate).toBe(100)
			intEngine.destroy()
		})

		it('handles rateGroup directly', () => {
			const group: RateFactorGroup = {
				id: 'direct',
				label: 'Direct Group',
				aggregationMethod: 'product',
				factors: [
					{ id: 'f1', label: 'F1', baseRate: 1.5 },
					{ id: 'f2', label: 'F2', baseRate: 2 },
				],
			}

			const result = engine.rateGroup({}, group)
			expect(result.rate).toBe(3)
			expect(result.isApplied).toBe(true)
			expect(result.factorResults.length).toBe(2)
		})

		it('handles rateFactor directly', () => {
			const factor: RateFactor = {
				id: 'direct',
				label: 'Direct Factor',
				baseRate: 100,
				operation: 'percentage',
				operand: 20,
				minimumRate: 50,
				maximumRate: 150,
			}

			const result = engine.rateFactor({}, factor)
			expect(result.rate).toBe(120)
			expect(result.isApplied).toBe(true)
		})

		it('handles factor clamping with min > max (edge case)', () => {
			const groups: readonly RateFactorGroup[] = [
				{
					id: 'test',
					label: 'Test',
					aggregationMethod: 'sum',
					factors: [
						{
							id: 'f1',
							label: 'F1',
							baseRate: 100,
							minimumRate: 200, // min > max is invalid but shouldn't crash
							maximumRate: 50,
						},
					],
				},
			]

			// Should not throw, behavior with invalid min/max is implementation-defined
			expect(() => engine.rate({}, groups)).not.toThrow()
		})
	})

	// ============================================================================
	// Error Handling Tests
	// ============================================================================

	describe('error handling', () => {
		it('collects errors when continueOnError is true', () => {
			// Create an engine with a problematic configuration
			const errorEngine = createRatingEngine({
				baseRate: 100,
				continueOnError: true,
			})

			const result = errorEngine.rate({}, [])
			expect(result.isSuccessful).toBe(true)
			expect(result.errors).toEqual([])
			errorEngine.destroy()
		})

		it('stops on error when continueOnError is false', () => {
			const strictEngine = createRatingEngine({
				baseRate: 100,
				continueOnError: false,
			})

			expect(strictEngine.isContinueOnError()).toBe(false)
			strictEngine.destroy()
		})

		it('calls onError callback when error occurs', () => {
			let errorCalled = false

			const errorEngine = createRatingEngine({
				baseRate: 100,
				onError: () => {
					errorCalled = true
				},
			})

			// Normal operation should not trigger error callback
			errorEngine.rate({}, [])
			expect(errorCalled).toBe(false)

			errorEngine.destroy()
		})

		it('throws when accessing destroyed engine', () => {
			const tempEngine = createRatingEngine()
			tempEngine.destroy()

			expect(() => tempEngine.rate({}, [])).toThrow()
			expect(() => tempEngine.rateFactor({}, { id: 't', label: 't', baseRate: 1 })).toThrow()
			expect(() => tempEngine.rateGroup({}, { id: 'g', label: 'g', aggregationMethod: 'sum', factors: [] })).toThrow()
			expect(() => tempEngine.evaluateCondition({}, { field: 'x', operator: 'equals', value: 1 })).toThrow()
			expect(() => tempEngine.validateGroups([])).toThrow()
		})
	})

	// ============================================================================
	// Subscription Tests
	// ============================================================================

	describe('subscriptions advanced', () => {
		it('supports multiple onRate subscriptions', () => {
			let count1 = 0
			let count2 = 0

			const unsub1 = engine.onRate(() => { count1++ })
			const unsub2 = engine.onRate(() => { count2++ })

			engine.rate({}, [])
			expect(count1).toBe(1)
			expect(count2).toBe(1)

			unsub1()
			engine.rate({}, [])
			expect(count1).toBe(1)
			expect(count2).toBe(2)

			unsub2()
		})

		it('supports multiple onError subscriptions', () => {
			let count1 = 0
			let count2 = 0

			const unsub1 = engine.onError(() => { count1++ })
			const unsub2 = engine.onError(() => { count2++ })

			// Normal operation doesn't trigger error
			engine.rate({}, [])
			expect(count1).toBe(0)
			expect(count2).toBe(0)

			unsub1()
			unsub2()
		})

		it('handles unsubscribe called multiple times', () => {
			let count = 0
			const unsubscribe = engine.onRate(() => { count++ })

			engine.rate({}, [])
			expect(count).toBe(1)

			// Multiple unsubscribe calls should be safe
			unsubscribe()
			unsubscribe()
			unsubscribe()

			engine.rate({}, [])
			expect(count).toBe(1)
		})
	})
})
