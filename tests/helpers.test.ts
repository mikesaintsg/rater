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
import type { RateCondition, RateFactor, RateFactorGroup, RaterErrorCode } from '@mikesaintsg/rater'

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

	// ============================================================================
	// Additional Edge Case Tests
	// ============================================================================

	describe('isNumber edge cases', () => {
		it('handles Infinity correctly', () => {
			expect(isNumber(Infinity)).toBe(true)
			expect(isNumber(-Infinity)).toBe(true)
		})

		it('handles -0 correctly', () => {
			expect(isNumber(-0)).toBe(true)
		})

		it('handles MAX_VALUE and MIN_VALUE', () => {
			expect(isNumber(Number.MAX_VALUE)).toBe(true)
			expect(isNumber(Number.MIN_VALUE)).toBe(true)
		})

		it('handles MAX_SAFE_INTEGER', () => {
			expect(isNumber(Number.MAX_SAFE_INTEGER)).toBe(true)
			expect(isNumber(Number.MIN_SAFE_INTEGER)).toBe(true)
		})
	})

	describe('toNumber edge cases', () => {
		it('handles negative zero', () => {
			expect(toNumber(-0)).toBe(-0)
		})

		it('handles scientific notation strings', () => {
			expect(toNumber('1e5')).toBe(100000)
			expect(toNumber('1e-5')).toBe(0.00001)
		})

		it('handles whitespace strings', () => {
			expect(toNumber('  42  ')).toBe(42)
		})

		it('handles empty string', () => {
			expect(toNumber('')).toBe(undefined)
		})

		it('handles Infinity strings', () => {
			expect(toNumber('Infinity')).toBe(Infinity)
			expect(toNumber('-Infinity')).toBe(-Infinity)
		})

		it('handles hexadecimal strings', () => {
			// parseFloat doesn't parse hex, so '0xFF' returns 0 (parsing stops at 'x')
			expect(toNumber('0xFF')).toBe(0)
		})
	})

	describe('roundToDecimalPlaces edge cases', () => {
		it('handles negative decimal places', () => {
			expect(roundToDecimalPlaces(12345, -2)).toBe(12300)
		})

		it('handles very large decimal places', () => {
			expect(roundToDecimalPlaces(3.14159265358979, 10)).toBeCloseTo(3.1415926536, 10)
		})

		it('handles negative numbers', () => {
			expect(roundToDecimalPlaces(-3.14159, 2)).toBe(-3.14)
		})

		it('handles rounding up at 0.5', () => {
			expect(roundToDecimalPlaces(2.5, 0)).toBe(3)
			expect(roundToDecimalPlaces(2.45, 1)).toBe(2.5)
		})

		it('handles very small numbers', () => {
			expect(roundToDecimalPlaces(0.00001, 4)).toBe(0)
			expect(roundToDecimalPlaces(0.00005, 4)).toBe(0.0001)
		})
	})

	describe('clamp edge cases', () => {
		it('handles equal min and max', () => {
			expect(clamp(50, 100, 100)).toBe(100)
			expect(clamp(150, 100, 100)).toBe(100)
		})

		it('handles negative values', () => {
			expect(clamp(-50, -100, -10)).toBe(-50)
			expect(clamp(-150, -100, -10)).toBe(-100)
			expect(clamp(0, -100, -10)).toBe(-10)
		})

		it('handles Infinity', () => {
			expect(clamp(50, -Infinity, Infinity)).toBe(50)
			expect(clamp(Infinity, 0, 100)).toBe(100)
			expect(clamp(-Infinity, 0, 100)).toBe(0)
		})
	})

	describe('getNestedValue edge cases', () => {
		it('handles empty path', () => {
			expect(getNestedValue({ key: 'value' }, '')).toBe(undefined)
		})

		it('handles array indices in path', () => {
			// Current implementation uses isRecord which excludes arrays
			// Arrays accessed via numeric index won't work with current implementation
			const obj = { items: [{ name: 'first' }, { name: 'second' }] }
			// This returns undefined because arrays are not treated as records
			expect(getNestedValue(obj, 'items.0.name')).toBe(undefined)
			expect(getNestedValue(obj, 'items.1.name')).toBe(undefined)
		})

		it('handles paths with special characters', () => {
			const obj = { 'key-with-dash': 'value' }
			expect(getNestedValue(obj, 'key-with-dash')).toBe('value')
		})

		it('handles deeply nested objects', () => {
			const obj = { a: { b: { c: { d: { e: 'deep' } } } } }
			expect(getNestedValue(obj, 'a.b.c.d.e')).toBe('deep')
		})

		it('handles properties with undefined values', () => {
			const obj = { key: undefined }
			expect(getNestedValue(obj, 'key')).toBe(undefined)
		})

		it('handles null values in path', () => {
			const obj = { a: { b: null } }
			expect(getNestedValue(obj, 'a.b.c')).toBe(undefined)
		})
	})

	describe('toLookupKey edge cases', () => {
		it('handles symbols', () => {
			const sym = Symbol('test')
			expect(toLookupKey(sym)).toBe('Symbol(test)')
		})

		it('handles bigint', () => {
			expect(toLookupKey(BigInt(9007199254740991))).toBe('9007199254740991')
		})

		it('handles arrays', () => {
			expect(toLookupKey([1, 2, 3])).toBe('[1,2,3]')
		})

		it('handles nested objects', () => {
			expect(toLookupKey({ a: { b: 1 } })).toBe('{"a":{"b":1}}')
		})

		it('handles empty objects', () => {
			expect(toLookupKey({})).toBe('{}')
		})

		it('handles empty arrays', () => {
			expect(toLookupKey([])).toBe('[]')
		})
	})

	describe('evaluateRateCondition edge cases', () => {
		it('handles undefined field values', () => {
			const condition: RateCondition = { field: 'missing', operator: 'equals', value: undefined }
			expect(evaluateRateCondition({}, condition).isMet).toBe(true)
		})

		it('handles null values', () => {
			const condition: RateCondition = { field: 'value', operator: 'equals', value: null }
			expect(evaluateRateCondition({ value: null }, condition).isMet).toBe(true)
		})

		it('handles type coercion in equals', () => {
			// Strict equality - string "1" is not equal to number 1
			const condition: RateCondition = { field: 'value', operator: 'equals', value: '1' }
			expect(evaluateRateCondition({ value: 1 }, condition).isMet).toBe(false)
		})

		it('handles numeric comparison with string numbers', () => {
			const condition: RateCondition = { field: 'value', operator: 'greaterThan', value: 10 }
			expect(evaluateRateCondition({ value: '15' }, condition).isMet).toBe(true)
		})

		it('handles in operator with empty array', () => {
			const condition: RateCondition = { field: 'value', operator: 'in', value: [] }
			expect(evaluateRateCondition({ value: 'test' }, condition).isMet).toBe(false)
		})

		it('handles notIn operator with empty array', () => {
			const condition: RateCondition = { field: 'value', operator: 'notIn', value: [] }
			expect(evaluateRateCondition({ value: 'test' }, condition).isMet).toBe(true)
		})

		it('handles between with reversed bounds', () => {
			// The actual value 75 is between 50 and 100, but bounds are [100, 50]
			const condition: RateCondition = { field: 'score', operator: 'between', value: [100, 50] }
			// With reversed bounds, 75 is >= 100 (false) AND <= 50 (false), so should be false
			expect(evaluateRateCondition({ score: 75 }, condition).isMet).toBe(false)
		})

		it('handles between with equal bounds', () => {
			const condition: RateCondition = { field: 'score', operator: 'between', value: [50, 50] }
			expect(evaluateRateCondition({ score: 50 }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ score: 51 }, condition).isMet).toBe(false)
		})

		it('handles non-numeric values in numeric comparisons', () => {
			const condition: RateCondition = { field: 'value', operator: 'greaterThan', value: 10 }
			expect(evaluateRateCondition({ value: 'not a number' }, condition).isMet).toBe(false)
		})

		it('handles nested field in condition', () => {
			const condition: RateCondition = { field: 'user.age', operator: 'greaterThan', value: 18 }
			expect(evaluateRateCondition({ user: { age: 25 } }, condition).isMet).toBe(true)
			expect(evaluateRateCondition({ user: { age: 15 } }, condition).isMet).toBe(false)
		})

		it('handles in operator with non-array value', () => {
			const condition: RateCondition = { field: 'tier', operator: 'in', value: 'gold' }
			// Should not match when value is not an array
			expect(evaluateRateCondition({ tier: 'gold' }, condition).isMet).toBe(false)
		})

		it('handles between with non-array value', () => {
			const condition: RateCondition = { field: 'score', operator: 'between', value: 50 }
			// Should not match when value is not a proper array
			expect(evaluateRateCondition({ score: 50 }, condition).isMet).toBe(false)
		})

		it('handles between with array of wrong length', () => {
			const condition: RateCondition = { field: 'score', operator: 'between', value: [50] }
			expect(evaluateRateCondition({ score: 50 }, condition).isMet).toBe(false)
		})

		it('handles notBetween with non-numeric values in bounds', () => {
			const condition: RateCondition = { field: 'score', operator: 'notBetween', value: ['a', 'b'] }
			// With invalid bounds, should default to true (outside range)
			expect(evaluateRateCondition({ score: 50 }, condition).isMet).toBe(true)
		})
	})

	describe('validateFactor edge cases', () => {
		it('handles factor with all optional fields', () => {
			const factor: RateFactor = {
				id: 'test',
				label: 'Test',
				baseRate: 100,
				description: 'Description',
				enabled: true,
				required: false,
				priority: 1,
				minimumRate: 0,
				maximumRate: 200,
			}
			expect(validateFactor(factor)).toEqual([])
		})

		it('handles factor with both lookupTable and rangeTable (valid as rate source)', () => {
			const factor = {
				id: 'test',
				label: 'Test',
				lookupTable: { field: 'tier', values: { gold: 1 } },
				rangeTable: { field: 'age', ranges: [{ minimum: 0, rate: 1 }] },
			} as RateFactor
			// Having multiple rate sources is allowed - first found is used
			expect(validateFactor(factor)).toEqual([])
		})

		it('handles factor with fieldPath as rate source', () => {
			const factor: RateFactor = {
				id: 'test',
				label: 'Test',
				fieldPath: 'customRate',
			}
			expect(validateFactor(factor)).toEqual([])
		})

		it('handles factor with whitespace-only id', () => {
			const factor = { id: '   ', label: 'Test', baseRate: 100 } as RateFactor
			const errors = validateFactor(factor)
			expect(errors.some(e => e.includes('id'))).toBe(true)
		})

		it('handles factor with whitespace-only label', () => {
			const factor = { id: 'test', label: '   ', baseRate: 100 } as RateFactor
			const errors = validateFactor(factor)
			expect(errors.some(e => e.includes('label'))).toBe(true)
		})
	})

	describe('validateGroup edge cases', () => {
		it('handles group with multiple invalid factors', () => {
			const group = {
				id: 'test',
				label: 'Test',
				aggregationMethod: 'sum',
				factors: [
					{ id: '', label: 'F1', baseRate: 100 },
					{ id: 'f2', label: '', baseRate: 100 },
					{ id: 'f3', label: 'F3' }, // missing rate source
				],
			} as RateFactorGroup
			const errors = validateGroup(group)
			expect(errors.length).toBeGreaterThanOrEqual(3)
		})

		it('handles group with all valid properties', () => {
			const group: RateFactorGroup = {
				id: 'test',
				label: 'Test',
				aggregationMethod: 'product',
				baseRate: 1.0,
				requireAll: true,
				factors: [
					{ id: 'f1', label: 'Factor 1', baseRate: 1.5 },
					{ id: 'f2', label: 'Factor 2', baseRate: 0.9 },
				],
			}
			expect(validateGroup(group)).toEqual([])
		})
	})

	describe('createRaterError edge cases', () => {
		it('creates error with all optional data', () => {
			const error = createRaterError('Test error', 'CALCULATION_FAILED', {
				factorId: 'f1',
				groupId: 'g1',
				field: 'age',
			})
			expect(error.data.factorId).toBe('f1')
			expect(error.data.groupId).toBe('g1')
			expect(error.data.field).toBe('age')
		})

		it('creates error without optional data', () => {
			const error = createRaterError('Test error', 'UNKNOWN')
			expect(error.data.factorId).toBe(undefined)
			expect(error.data.groupId).toBe(undefined)
		})

		it('preserves error code in data', () => {
			const codes: RaterErrorCode[] = [
				'INVALID_CONDITION',
				'INVALID_FACTOR',
				'INVALID_GROUP',
				'EVALUATION_FAILED',
				'CALCULATION_FAILED',
				'VALIDATION_FAILED',
				'UNKNOWN',
			]
			for (const code of codes) {
				const error = createRaterError('Test', code)
				expect(error.data.code).toBe(code)
			}
		})
	})
})
