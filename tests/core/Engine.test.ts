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
				{ field: 'status', operator: 'equals', value: 'active' }
			)
			expect(result. isMet).toBe(true)
		})

		it('evaluates greaterThan correctly', () => {
			const result = engine.evaluateCondition(
				{ age: 30 },
				{ field: 'age', operator:  'greaterThan', value: 25 }
			)
			expect(result.isMet).toBe(true)
		})

		it('evaluates between correctly', () => {
			const result = engine.evaluateCondition(
				{ score: 75 },
				{ field: 'score', operator: 'between', value: [50, 100] }
			)
			expect(result.isMet).toBe(true)
		})

		it('evaluates in correctly', () => {
			const result = engine.evaluateCondition(
				{ tier: 'gold' },
				{ field: 'tier', operator: 'in', value: ['gold', 'platinum'] }
			)
			expect(result.isMet).toBe(true)
		})

		it('handles nested fields', () => {
			const result = engine.evaluateCondition(
				{ user: { profile: { verified: true } } },
				{ field: 'user.profile.verified', operator: 'equals', value: true }
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
})
