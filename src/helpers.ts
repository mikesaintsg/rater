/**
 * @mikesaintsg/rater
 *
 * Helper functions and type guards for the rater library.
 */

import type {
	RateCondition,
	RateConditionResult,
	RateFactor,
	RateFactorGroup,
	RaterErrorCode,
	RaterErrorData,
} from './types.js'

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a number.
 * @param value - Value to check
 */
export function isNumber(value:  unknown): value is number {
	return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Check if value is a string.
 * @param value - Value to check
 */
export function isString(value: unknown): value is string {
	return typeof value === 'string'
}

/**
 * Check if value is an array.
 * @param value - Value to check
 */
export function isArray(value: unknown): value is readonly unknown[] {
	return Array. isArray(value)
}

/**
 * Check if value is a record object.
 * @param value - Value to check
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if error is a RaterError.
 * @param error - Error to check
 */
export function isRaterError(error:  unknown): error is Error & { data: RaterErrorData } {
	return (
		error instanceof Error &&
		'data' in error &&
		isRecord(error.data) &&
		'code' in error.data
	)
}

// ============================================================================
// Value Helpers
// ============================================================================

/**
 * Get nested property value from object using dot notation.
 * @param obj - Object to traverse
 * @param path - Dot-notation path
 */
export function getNestedValue(obj: unknown, path: string): unknown {
	if (obj === null || obj === undefined) {
		return undefined
	}

	const parts = path.split('.')
	let current:  unknown = obj

	for (const part of parts) {
		if (current === null || current === undefined || ! isRecord(current)) {
			return undefined
		}
		current = current[part]
	}

	return current
}

/**
 * Convert value to number if possible.
 * @param value - Value to convert
 */
export function toNumber(value: unknown): number | undefined {
	if (isNumber(value)) {
		return value
	}
	if (isString(value)) {
		const parsed = Number. parseFloat(value)
		return Number.isNaN(parsed) ? undefined : parsed
	}
	return undefined
}

/**
 * Convert value to string for lookup.
 * @param value - Value to convert
 */
export function toLookupKey(value: unknown): string {
	if (isString(value)) {
		return value
	}
	if (isNumber(value)) {
		return String(value)
	}
	if (value === null) {
		return 'null'
	}
	if (value === undefined) {
		return 'undefined'
	}
	if (typeof value === 'boolean') {
		return String(value)
	}
	if (typeof value === 'bigint') {
		return String(value)
	}
	if (typeof value === 'object') {
		return JSON.stringify(value)
	}
	// For symbols and functions - use a safe string representation
	return typeof value === 'symbol' ? value.toString() : 'unknown'
}

// ============================================================================
// Math Helpers
// ============================================================================

/**
 * Round a number to specified decimal places.
 * @param value - Number to round
 * @param decimalPlaces - Number of decimal places
 */
export function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
	const multiplier = Math.pow(10, decimalPlaces)
	return Math.round(value * multiplier) / multiplier
}

/**
 * Clamp a value between minimum and maximum.
 * @param value - Value to clamp
 * @param minimum - Minimum allowed value
 * @param maximum - Maximum allowed value
 */
export function clamp(
	value: number,
	minimum: number | undefined,
	maximum: number | undefined,
): number {
	let result = value
	if (minimum !== undefined && result < minimum) {
		result = minimum
	}
	if (maximum !== undefined && result > maximum) {
		result = maximum
	}
	return result
}

// ============================================================================
// Condition Evaluation
// ============================================================================

/**
 * Evaluate a rate condition against a subject.
 * @param subject - Subject to evaluate
 * @param condition - Condition to evaluate
 */
export function evaluateRateCondition(
	subject:  Readonly<Record<string, unknown>>,
	condition: RateCondition,
): RateConditionResult {
	const actualValue = getNestedValue(subject, condition. field)
	let isMet = false
	let error: string | undefined

	try {
		switch (condition.operator) {
			case 'equals':
				isMet = actualValue === condition.value
				break

			case 'notEquals':
				isMet = actualValue !== condition.value
				break

			case 'greaterThan':  {
				const numValue = toNumber(actualValue)
				const numCondition = toNumber(condition.value)
				if (numValue !== undefined && numCondition !== undefined) {
					isMet = numValue > numCondition
				}
				break
			}

			case 'lessThan': {
				const numValue = toNumber(actualValue)
				const numCondition = toNumber(condition.value)
				if (numValue !== undefined && numCondition !== undefined) {
					isMet = numValue < numCondition
				}
				break
			}

			case 'greaterThanOrEqual': {
				const numValue = toNumber(actualValue)
				const numCondition = toNumber(condition.value)
				if (numValue !== undefined && numCondition !== undefined) {
					isMet = numValue >= numCondition
				}
				break
			}

			case 'lessThanOrEqual': {
				const numValue = toNumber(actualValue)
				const numCondition = toNumber(condition.value)
				if (numValue !== undefined && numCondition !== undefined) {
					isMet = numValue <= numCondition
				}
				break
			}

			case 'in':
				if (isArray(condition.value)) {
					isMet = condition.value.includes(actualValue)
				}
				break

			case 'notIn':
				if (isArray(condition.value)) {
					isMet = !condition. value.includes(actualValue)
				} else {
					isMet = true
				}
				break

			case 'between':  {
				if (isArray(condition.value) && condition.value.length === 2) {
					const numValue = toNumber(actualValue)
					const minimum = toNumber(condition.value[0])
					const maximum = toNumber(condition.value[1])
					if (numValue !== undefined && minimum !== undefined && maximum !== undefined) {
						isMet = numValue >= minimum && numValue <= maximum
					}
				}
				break
			}

			case 'notBetween': {
				if (isArray(condition.value) && condition.value. length === 2) {
					const numValue = toNumber(actualValue)
					const minimum = toNumber(condition.value[0])
					const maximum = toNumber(condition.value[1])
					if (numValue !== undefined && minimum !== undefined && maximum !== undefined) {
						isMet = numValue < minimum || numValue > maximum
					} else {
						isMet = true
					}
				}
				break
			}

			default:
				error = `Unknown operator: ${String(condition.operator)}`
		}
	} catch (err) {
		error = err instanceof Error ? err.message : 'Evaluation error'
	}

	if (error !== undefined) {
		return {
			condition,
			isMet,
			actualValue,
			error,
		}
	}

	return {
		condition,
		isMet,
		actualValue,
	}
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a rate factor.
 * @param factor - Factor to validate
 */
export function validateFactor(factor: RateFactor): readonly string[] {
	const errors: string[] = []

	if (!factor.id || factor.id. trim() === '') {
		errors.push('Factor must have an id')
	}

	if (!factor.label || factor.label. trim() === '') {
		errors.push(`Factor ${factor.id}:  must have a label`)
	}

	// Must have at least one rate source
	const hasRateSource =
		factor.baseRate !== undefined ||
		factor. lookupTable !== undefined ||
		factor.rangeTable !== undefined ||
		factor.fieldPath !== undefined

	if (!hasRateSource) {
		errors.push(`Factor ${factor.id}: must have baseRate, lookupTable, rangeTable, or fieldPath`)
	}

	// Validate lookup table
	if (factor.lookupTable) {
		if (!factor.lookupTable.field) {
			errors.push(`Factor ${factor.id}: lookupTable must have a field`)
		}
		if (!factor.lookupTable.values || Object.keys(factor.lookupTable.values).length === 0) {
			errors.push(`Factor ${factor.id}: lookupTable must have values`)
		}
	}

	// Validate range table
	if (factor.rangeTable) {
		if (!factor.rangeTable.field) {
			errors.push(`Factor ${factor.id}: rangeTable must have a field`)
		}
		if (!factor.rangeTable.ranges || factor.rangeTable.ranges.length === 0) {
			errors.push(`Factor ${factor.id}: rangeTable must have ranges`)
		}
	}

	// Validate operation requires operand
	if (factor.operation && factor.operand === undefined) {
		errors.push(`Factor ${factor.id}: operation requires an operand`)
	}

	return errors
}

/**
 * Validate a rate factor group.
 * @param group - Group to validate
 */
export function validateGroup(group: RateFactorGroup): readonly string[] {
	const errors: string[] = []

	if (!group.id || group.id.trim() === '') {
		errors.push('Group must have an id')
	}

	if (!group.label || group.label.trim() === '') {
		errors.push(`Group ${group.id}: must have a label`)
	}

	if (!group.factors || group.factors.length === 0) {
		errors.push(`Group ${group.id}: must have at least one factor`)
	}

	// Validate each factor
	for (const factor of group.factors) {
		const factorErrors = validateFactor(factor)
		errors.push(...factorErrors)
	}

	return errors
}

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Create a rater error.
 * @param message - Error message
 * @param code - Error code
 * @param data - Additional error data
 */
export function createRaterError(
	message: string,
	code: RaterErrorCode,
	data?:  Partial<Omit<RaterErrorData, 'code'>>,
): Error & { data: RaterErrorData } {
	const error = new Error(message) as Error & { data: RaterErrorData }
	error.name = 'RaterError'
	error.data = {
		code,
		...data,
	}
	return error
}
