/**
 * @mikesaintsg/rater
 *
 * Tests for helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
	isNumber,
	isString,
	isArray,
	isRecord,
	isRaterError,
	getNestedValue,
	toNumber,
	toLookupKey,
	roundToDecimalPlaces,
	clamp,
	evaluateRateCondition,
	validateFactor,
	validateGroup,
	createRaterError,
} from '@mikesaintsg/rater'
import type { RateCondition, RateFactor, RateFactorGroup } from '@mikesaintsg/rater'

describe('helpers', () => {
	describe('isNumber', () => {
		it('returns true for valid numbers', () => {
			expect(isNumber(42)).toBe(true)
			expect(isNumber(0)).toBe(true)
			expect(isNumber(-5)).toBe(true)
			expect(isNumber(3.14)).toBe(true)
		})

		it('returns false for NaN', () => {
			expect(isNumber(NaN)).toBe(false)
		})

		it('returns false for non-numbers', () => {
			expect(isNumber('42')).toBe(false)
			expect(isNumber(null)).toBe(false)
			expect(isNumber(undefined)).toBe(false)
			expect(isNumber({})).toBe(false)
		})
	})

	describe('isString', () => {
		it('returns true for strings', () => {
			expect(isString('hello')).toBe(true)
			expect(isString('')).toBe(true)
		})

		it('returns false for non-strings', () => {
			expect(isString(42)).toBe(false)
			expect(isString(null)).toBe(false)
			expect(isString(undefined)).toBe(false)
		})
	})

	describe('isArray', () => {
		it('returns true for arrays', () => {
			expect(isArray([])).toBe(true)
			expect(isArray([1, 2, 3])).toBe(true)
		})

		it('returns false for non-arrays', () => {
			expect(isArray({})).toBe(false)
			expect(isArray('array')).toBe(false)
			expect(isArray(null)).toBe(false)
		})
	})

	describe('isRecord', () => {
		it('returns true for plain objects', () => {
			expect(isRecord({})).toBe(true)
			expect(isRecord({ key: 'value' })).toBe(true)
		})

		it('returns false for arrays', () => {
			expect(isRecord([])).toBe(false)
		})

		it('returns false for null', () => {
			expect(isRecord(null)).toBe(false)
		})

		it('returns false for primitives', () => {
			expect(isRecord('string')).toBe(false)
			expect(isRecord(42)).toBe(false)
		})
	})

	describe('getNestedValue', () => {
		it('gets top-level properties', () => {
			expect(getNestedValue({ name: 'test' }, 'name')).toBe('test')
		})

		it('gets nested properties', () => {
			const obj = { user: { profile: { name: 'John' } } }
			expect(getNestedValue(obj, 'user.profile.name')).toBe('John')
		})

		it('returns undefined for missing properties', () => {
			expect(getNestedValue({ name: 'test' }, 'missing')).toBe(undefined)
			expect(getNestedValue({ user: {} }, 'user.profile.name')).toBe(undefined)
		})

		it('handles null/undefined input', () => {
			expect(getNestedValue(null, 'key')).toBe(undefined)
			expect(getNestedValue(undefined, 'key')).toBe(undefined)
		})
	})

	describe('toNumber', () => {
		it('returns number for numbers', () => {
			expect(toNumber(42)).toBe(42)
			expect(toNumber(3.14)).toBe(3.14)
		})

		it('parses string numbers', () => {
			expect(toNumber('42')).toBe(42)
			expect(toNumber('3.14')).toBe(3.14)
		})

		it('returns undefined for invalid values', () => {
			expect(toNumber('not a number')).toBe(undefined)
			expect(toNumber(null)).toBe(undefined)
			expect(toNumber({})).toBe(undefined)
		})
	})

	describe('toLookupKey', () => {
		it('returns string as-is', () => {
			expect(toLookupKey('key')).toBe('key')
		})

		it('converts numbers to strings', () => {
			expect(toLookupKey(42)).toBe('42')
		})

		it('handles null and undefined', () => {
			expect(toLookupKey(null)).toBe('null')
			expect(toLookupKey(undefined)).toBe('undefined')
		})

		it('handles booleans', () => {
			expect(toLookupKey(true)).toBe('true')
			expect(toLookupKey(false)).toBe('false')
		})

		it('handles objects', () => {
			expect(toLookupKey({ key: 'value' })).toBe('{"key":"value"}')
		})
	})

	describe('roundToDecimalPlaces', () => {
		it('rounds to specified decimal places', () => {
			expect(roundToDecimalPlaces(3.14159, 2)).toBe(3.14)
			expect(roundToDecimalPlaces(3.145, 2)).toBe(3.15)
			expect(roundToDecimalPlaces(3.14159, 0)).toBe(3)
		})
	})

	describe('clamp', () => {
		it('returns value when within range', () => {
			expect(clamp(50, 0, 100)).toBe(50)
		})

		it('clamps to minimum', () => {
			expect(clamp(-10, 0, 100)).toBe(0)
		})

		it('clamps to maximum', () => {
			expect(clamp(150, 0, 100)).toBe(100)
		})

		it('handles undefined bounds', () => {
			expect(clamp(50, undefined, undefined)).toBe(50)
			expect(clamp(-10, undefined, 100)).toBe(-10)
			expect(clamp(150, 0, undefined)).toBe(150)
		})
	})

	describe('evaluateRateCondition', () => {
		it('evaluates equals correctly', () => {
			const condition: RateCondition = { field: 'status', operator: 'equals', value: 'active' }
			expect(evaluateRateCondition({ status: 'active' }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ status: 'inactive' }, condition).isMet).toBe(false)
		})

		it('evaluates notEquals correctly', () => {
			const condition: RateCondition = { field: 'status', operator: 'notEquals', value: 'active' }
			expect(evaluateRateCondition({ status: 'inactive' }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ status: 'active' }, condition).isMet).toBe(false)
		})

		it('evaluates greaterThan correctly', () => {
			const condition: RateCondition = { field: 'age', operator: 'greaterThan', value: 25 }
			expect(evaluateRateCondition({ age: 30 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ age: 20 }, condition).isMet).toBe(false)
			expect(evaluateRateCondition({ age: 25 }, condition).isMet).toBe(false)
		})

		it('evaluates lessThan correctly', () => {
			const condition: RateCondition = { field: 'age', operator: 'lessThan', value: 25 }
			expect(evaluateRateCondition({ age: 20 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ age: 30 }, condition).isMet).toBe(false)
		})

		it('evaluates greaterThanOrEqual correctly', () => {
			const condition: RateCondition = { field: 'age', operator: 'greaterThanOrEqual', value: 25 }
			expect(evaluateRateCondition({ age: 25 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ age: 30 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ age: 20 }, condition).isMet).toBe(false)
		})

		it('evaluates lessThanOrEqual correctly', () => {
			const condition: RateCondition = { field: 'age', operator: 'lessThanOrEqual', value: 25 }
			expect(evaluateRateCondition({ age: 25 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ age: 20 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ age: 30 }, condition).isMet).toBe(false)
		})

		it('evaluates in correctly', () => {
			const condition: RateCondition = { field: 'tier', operator: 'in', value: ['gold', 'platinum'] }
			expect(evaluateRateCondition({ tier: 'gold' }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ tier: 'silver' }, condition).isMet).toBe(false)
		})

		it('evaluates notIn correctly', () => {
			const condition: RateCondition = { field: 'tier', operator: 'notIn', value: ['gold', 'platinum'] }
			expect(evaluateRateCondition({ tier: 'silver' }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ tier: 'gold' }, condition).isMet).toBe(false)
		})

		it('evaluates between correctly', () => {
			const condition: RateCondition = { field: 'score', operator: 'between', value: [50, 100] }
			expect(evaluateRateCondition({ score: 75 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ score: 50 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ score: 100 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ score: 30 }, condition).isMet).toBe(false)
		})

		it('evaluates notBetween correctly', () => {
			const condition: RateCondition = { field: 'score', operator: 'notBetween', value: [50, 100] }
			expect(evaluateRateCondition({ score: 30 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ score: 75 }, condition).isMet).toBe(false)
		})

		it('returns actualValue in result', () => {
			const condition: RateCondition = { field: 'age', operator: 'equals', value: 30 }
			const result = evaluateRateCondition({ age: 30 }, condition)
			expect(result.actualValue).toBe(30)
		})
	})

	describe('validateFactor', () => {
		it('returns error for missing id', () => {
			const factor = { id: '', label: 'Test', baseRate: 100 } as RateFactor
			const errors = validateFactor(factor)
			expect(errors.some(e => e.includes('id'))).toBe(true)
		})

		it('returns error for missing label', () => {
			const factor = { id: 'test', label: '', baseRate: 100 } as RateFactor
			const errors = validateFactor(factor)
			expect(errors.some(e => e.includes('label'))).toBe(true)
		})

		it('returns error for missing rate source', () => {
			const factor = { id: 'test', label: 'Test' } as RateFactor
			const errors = validateFactor(factor)
			expect(errors.some(e => e.includes('baseRate') || e.includes('lookupTable'))).toBe(true)
		})

		it('returns no errors for valid factor', () => {
			const factor: RateFactor = { id: 'test', label: 'Test', baseRate: 100 }
			const errors = validateFactor(factor)
			expect(errors).toEqual([])
		})

		it('validates lookupTable requires field and values', () => {
			const factor = {
				id: 'test',
				label: 'Test',
				lookupTable: { field: '', values: {} },
			} as unknown as RateFactor
			const errors = validateFactor(factor)
			expect(errors.length).toBeGreaterThan(0)
		})

		it('validates rangeTable requires field and ranges', () => {
			const factor = {
				id: 'test',
				label: 'Test',
				rangeTable: { field: '', ranges: [] },
			} as unknown as RateFactor
			const errors = validateFactor(factor)
			expect(errors.length).toBeGreaterThan(0)
		})

		it('validates operation requires operand', () => {
			const factor = {
				id: 'test',
				label: 'Test',
				baseRate: 100,
				operation: 'add',
			} as RateFactor
			const errors = validateFactor(factor)
			expect(errors.some(e => e.includes('operand'))).toBe(true)
		})
	})

	describe('validateGroup', () => {
		it('returns error for missing id', () => {
			const group = {
				id: '',
				label: 'Test',
				aggregationMethod: 'sum',
				factors: [{ id: 'f1', label: 'F1', baseRate: 100 }],
			} as RateFactorGroup
			const errors = validateGroup(group)
			expect(errors.some(e => e.includes('id'))).toBe(true)
		})

		it('returns error for missing label', () => {
			const group = {
				id: 'test',
				label: '',
				aggregationMethod: 'sum',
				factors: [{ id: 'f1', label: 'F1', baseRate: 100 }],
			} as RateFactorGroup
			const errors = validateGroup(group)
			expect(errors.some(e => e.includes('label'))).toBe(true)
		})

		it('returns error for empty factors', () => {
			const group = {
				id: 'test',
				label: 'Test',
				aggregationMethod: 'sum',
				factors: [],
			} as RateFactorGroup
			const errors = validateGroup(group)
			expect(errors.some(e => e.includes('factor'))).toBe(true)
		})

		it('validates factors within group', () => {
			const group = {
				id: 'test',
				label: 'Test',
				aggregationMethod: 'sum',
				factors: [{ id: '', label: '', baseRate: 100 }],
			} as RateFactorGroup
			const errors = validateGroup(group)
			expect(errors.length).toBeGreaterThan(0)
		})

		it('returns no errors for valid group', () => {
			const group: RateFactorGroup = {
				id: 'test',
				label: 'Test',
				aggregationMethod: 'sum',
				factors: [{ id: 'f1', label: 'F1', baseRate: 100 }],
			}
			const errors = validateGroup(group)
			expect(errors).toEqual([])
		})
	})

	describe('createRaterError', () => {
		it('creates error with correct properties', () => {
			const error = createRaterError('Test error', 'INVALID_FACTOR', { factorId: 'f1' })
			expect(error.message).toBe('Test error')
			expect(error.name).toBe('RaterError')
			expect(error.data.code).toBe('INVALID_FACTOR')
			expect(error.data.factorId).toBe('f1')
		})
	})

	describe('isRaterError', () => {
		it('returns true for RaterError', () => {
			const error = createRaterError('Test', 'UNKNOWN')
			expect(isRaterError(error)).toBe(true)
		})

		it('returns false for regular Error', () => {
			expect(isRaterError(new Error('Test'))).toBe(false)
		})

		it('returns false for non-errors', () => {
			expect(isRaterError('string')).toBe(false)
			expect(isRaterError(null)).toBe(false)
		})
	})
})
