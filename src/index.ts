/**
 * @mikesaintsg/rater
 *
 * Factor-based rating engine with conditions, lookups, and mathematical operations.
 */

// Factory functions
export { createRatingEngine } from './factories.js'

// Types
export type {
	// Mathematical types
	MathematicalOperation,
	AggregationMethod,
	ConditionalOperator,
	// Condition types
	RateCondition,
	// Table types
	RateLookupTable,
	RateRange,
	RateRangeTable,
	// Factor types
	RateFactor,
	RateFactorGroup,
	// Subject types
	RateSubject,
	// Result types
	RateConditionResult,
	RateFactorResult,
	RateGroupResult,
	RatingResult,
	// Callback types
	RateCallback,
	RaterErrorCallback,
	// Subscription types
	RatingEngineSubscriptions,
	// Options types
	RatingEngineOptions,
	// Error types
	RaterErrorCode,
	RaterErrorData,
	// Interface types
	RatingEngineInterface,
	// Factory types
	CreateRatingEngine,
} from './types.js'

// Helpers (for advanced use)
export {
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
} from './helpers.js'

// Constants
export {
	DEFAULT_BASE_RATE,
	DEFAULT_DECIMAL_PLACES,
	DEFAULT_CONTINUE_ON_ERROR,
	DEFAULT_GROUP_AGGREGATION_METHOD,
} from './constants.js'
