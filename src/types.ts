/**
 * @mikesaintsg/rater
 *
 * Type definitions for the rater library.
 * All public types and interfaces are defined here as the SOURCE OF TRUTH.
 */

import type { Unsubscribe, SubscriptionToHook, PackageErrorData } from '@mikesaintsg/core'

// ============================================================================
// Mathematical Types
// ============================================================================

/** Mathematical operation for rate calculations */
export type MathematicalOperation =
	| 'add'
	| 'subtract'
	| 'multiply'
	| 'divide'
	| 'percentage'
	| 'percentageOf'
	| 'minimum'
	| 'maximum'
	| 'average'
	| 'power'
	| 'round'
	| 'ceil'
	| 'floor'

/** Aggregation method for combining multiple rates */
export type AggregationMethod = 'sum' | 'product' | 'average' | 'minimum' | 'maximum'

/** Conditional operator for rate rules */
export type ConditionalOperator =
	| 'equals'
	| 'notEquals'
	| 'greaterThan'
	| 'lessThan'
	| 'greaterThanOrEqual'
	| 'lessThanOrEqual'
	| 'in'
	| 'notIn'
	| 'between'
	| 'notBetween'

// ============================================================================
// Condition Types
// ============================================================================

/** A condition to determine if a rate factor applies */
export interface RateCondition {
	/** Field path to evaluate (supports dot notation) */
	readonly field: string
	/** Conditional operator */
	readonly operator: ConditionalOperator
	/** Value(s) to compare against */
	readonly value: unknown
}

// ============================================================================
// Table Types
// ============================================================================

/** A lookup table for rate values */
export interface RateLookupTable {
	/** Field to use as lookup key */
	readonly field:  string
	/** Map of key to rate value */
	readonly values:  Readonly<Record<string, number>>
	/** Default value if key not found */
	readonly defaultValue?:  number
}

/** A range definition with rate */
export interface RateRange {
	readonly minimum?:  number
	readonly maximum?: number
	readonly rate:  number
}

/** A range-based rate table */
export interface RateRangeTable {
	/** Field to evaluate */
	readonly field: string
	/** Array of ranges with rates */
	readonly ranges: readonly RateRange[]
	/** Default rate if no range matches */
	readonly defaultRate?: number
}

// ============================================================================
// Factor Types
// ============================================================================

/** A single rate factor that contributes to final rate */
export interface RateFactor {
	/** Unique identifier for this factor */
	readonly id: string
	/** Human-readable label */
	readonly label: string
	/** Optional description */
	readonly description?: string
	/** Conditions that must be met for this factor to apply */
	readonly conditions?:  readonly RateCondition[]
	/** Base rate value (if static) */
	readonly baseRate?: number
	/** Lookup table (if using table-based rates) */
	readonly lookupTable?: RateLookupTable
	/** Range table (if using range-based rates) */
	readonly rangeTable?:  RateRangeTable
	/** Field path to get rate value from subject */
	readonly fieldPath?:  string
	/** Mathematical operation to apply */
	readonly operation?: MathematicalOperation
	/** Operand for mathematical operation */
	readonly operand?:  number
	/** Whether this factor is required */
	readonly required?: boolean
	/** Whether this factor is enabled */
	readonly enabled?: boolean
	/** Minimum allowed rate for this factor */
	readonly minimumRate?: number
	/** Maximum allowed rate for this factor */
	readonly maximumRate?: number
	/** Order/priority for applying factors */
	readonly priority?: number
}

/** A group of rate factors with aggregation method */
export interface RateFactorGroup {
	/** Unique identifier */
	readonly id: string
	/** Human-readable label */
	readonly label: string
	/** Rate factors in this group */
	readonly factors:  readonly RateFactor[]
	/** How to aggregate rates in this group */
	readonly aggregationMethod:  AggregationMethod
	/** Base rate for this group */
	readonly baseRate?: number
	/** Whether all factors in group must apply */
	readonly requireAll?: boolean
}

// ============================================================================
// Subject Types
// ============================================================================

/** Subject to be rated */
export type RateSubject = Readonly<Record<string, unknown>>

// ============================================================================
// Result Types
// ============================================================================

/** Result of evaluating a single rate condition */
export interface RateConditionResult {
	/** The condition evaluated */
	readonly condition: RateCondition
	/** Whether condition was met */
	readonly isMet: boolean
	/** Actual value from subject */
	readonly actualValue: unknown
	/** Error if evaluation failed */
	readonly error?: string
}

/** Result of calculating a rate factor */
export interface RateFactorResult {
	/** The factor that was calculated */
	readonly factor: RateFactor
	/** Whether this factor applied */
	readonly isApplied: boolean
	/** Calculated rate value */
	readonly rate: number
	/** Condition evaluation results */
	readonly conditionResults?:  readonly RateConditionResult[]
	/** Error if calculation failed */
	readonly error?: string
}

/** Result of calculating a rate group */
export interface RateGroupResult {
	/** The group that was calculated */
	readonly group: RateFactorGroup
	/** Whether this group applied */
	readonly isApplied: boolean
	/** Aggregated rate for this group */
	readonly rate: number
	/** Individual factor results */
	readonly factorResults:  readonly RateFactorResult[]
}

/** Final rating result */
export interface RatingResult {
	/** Final calculated rate */
	readonly finalRate:  number
	/** Whether rating was successful */
	readonly isSuccessful: boolean
	/** Total number of factors applied */
	readonly factorsApplied: number
	/** Results for each group */
	readonly groupResults:  readonly RateGroupResult[]
	/** All factor results across groups */
	readonly allFactorResults: readonly RateFactorResult[]
	/** Breakdown of rate calculation steps */
	readonly breakdown:  readonly string[]
	/** Errors encountered during rating */
	readonly errors:  readonly string[]
}

// ============================================================================
// Callback Types
// ============================================================================

/** Rate calculation callback */
export type RateCallback = (result: RatingResult) => void

/** Error callback */
export type RaterErrorCallback = (error: Error) => void

// ============================================================================
// Subscription Interfaces
// ============================================================================

/** Rating engine subscription methods */
export interface RatingEngineSubscriptions {
	/** Subscribe to rating completion events */
	onRate(callback: RateCallback): Unsubscribe
	/** Subscribe to error events */
	onError(callback: RaterErrorCallback): Unsubscribe
}

// ============================================================================
// Options Interfaces
// ============================================================================

/** Rating engine options */
export interface RatingEngineOptions
	extends SubscriptionToHook<RatingEngineSubscriptions> {
	/** Base rate to start from (default: 0) */
	readonly baseRate?: number
	/** How to aggregate rates across groups */
	readonly groupAggregationMethod?: AggregationMethod
	/** Minimum allowed final rate */
	readonly minimumRate?: number
	/** Maximum allowed final rate */
	readonly maximumRate?: number
	/** Number of decimal places for rounding (default: 2) */
	readonly decimalPlaces?: number
	/** Whether to continue on errors (default: true) */
	readonly continueOnError?: boolean
}

// ============================================================================
// Error Types
// ============================================================================

/** Rater error codes */
export type RaterErrorCode =
	| 'INVALID_CONDITION'
	| 'INVALID_FACTOR'
	| 'INVALID_GROUP'
	| 'EVALUATION_FAILED'
	| 'CALCULATION_FAILED'
	| 'VALIDATION_FAILED'
	| 'UNKNOWN'

/** Rater error data interface */
export interface RaterErrorData extends PackageErrorData<RaterErrorCode> {
	readonly factorId?:  string
	readonly groupId?: string
	readonly field?: string
}

// ============================================================================
// Behavioral Interfaces
// ============================================================================

/**
 * Rating engine interface - main entry point for rate calculations.
 *
 * Provides factor-based rate calculation with conditions, lookups,
 * ranges, and mathematical operations.
 */
export interface RatingEngineInterface extends RatingEngineSubscriptions {
	// ---- Property Accessors ----

	/** Get the base rate */
	getBaseRate(): number

	/** Get the minimum allowed rate */
	getMinimumRate(): number | undefined

	/** Get the maximum allowed rate */
	getMaximumRate(): number | undefined

	/** Get the decimal places for rounding */
	getDecimalPlaces(): number

	/** Check if engine continues on errors */
	isContinueOnError(): boolean

	// ---- Calculation Methods ----

	/**
	 * Calculate rate for a subject.
	 * @param subject - Subject to rate
	 * @param groups - Rate factor groups
	 * @returns Rating result
	 */
	rate(
		subject: RateSubject,
		groups: readonly RateFactorGroup[]
	): RatingResult

	/**
	 * Calculate rate for a single factor.
	 * @param subject - Subject to rate
	 * @param factor - Rate factor to calculate
	 * @returns Rate factor result
	 */
	rateFactor(
		subject: RateSubject,
		factor:  RateFactor
	): RateFactorResult

	/**
	 * Calculate rate for a group.
	 * @param subject - Subject to rate
	 * @param group - Rate factor group
	 * @returns Rate group result
	 */
	rateGroup(
		subject: RateSubject,
		group: RateFactorGroup
	): RateGroupResult

	// ---- Evaluation Methods ----

	/**
	 * Evaluate a rate condition.
	 * @param subject - Subject to evaluate
	 * @param condition - Condition to evaluate
	 * @returns Condition result
	 */
	evaluateCondition(
		subject: RateSubject,
		condition:  RateCondition
	): RateConditionResult

	// ---- Mathematical Methods ----

	/**
	 * Apply mathematical operation to a rate.
	 * @param rate - Current rate
	 * @param operation - Operation to apply
	 * @param operand - Operand value
	 * @returns Calculated rate
	 */
	applyOperation(
		rate:  number,
		operation: MathematicalOperation,
		operand: number
	): number

	/**
	 * Aggregate multiple rates.
	 * @param rates - Array of rates to aggregate
	 * @param method - Aggregation method
	 * @returns Aggregated rate
	 */
	aggregate(
		rates: readonly number[],
		method: AggregationMethod
	): number

	// ---- Validation Methods ----

	/**
	 * Validate rate factor groups.
	 * @param groups - Groups to validate
	 * @returns Array of validation errors
	 */
	validateGroups(groups: readonly RateFactorGroup[]): readonly string[]

	// ---- Lifecycle Methods ----

	/** Destroy engine and cleanup resources */
	destroy(): void
}

// ============================================================================
// Factory Function Types
// ============================================================================

/**
 * Factory function for creating rating engine.
 *
 * @param options - Optional configuration
 * @returns Rating engine interface
 *
 * @example
 * ```ts
 * import { createRatingEngine } from '@mikesaintsg/rater'
 *
 * const engine = createRatingEngine({
 *   baseRate: 100,
 *   minimumRate: 50,
 *   maximumRate: 500
 * })
 * ```
 */
export type CreateRatingEngine = (
	options?: RatingEngineOptions
) => RatingEngineInterface
