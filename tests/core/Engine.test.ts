/**
 * @mikesaintsg/rater
 *
 * Tests for RatingEngine.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRatingEngine } from '@mikesaintsg/rater'
import type { RateFactorGroup, RatingEngineInterface } from '@mikesaintsg/rater'

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
})
