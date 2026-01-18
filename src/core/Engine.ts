/**
 * @mikesaintsg/rater
 *
 * Rating engine implementation.
 */

import type {
	AggregationMethod,
	MathematicalOperation,
	RateCondition,
	RateConditionResult,
	RateFactor,
	RateFactorGroup,
	RateFactorResult,
	RateGroupResult,
	RaterErrorCallback,
	RateCallback,
	RateSubject,
	RatingEngineInterface,
	RatingEngineOptions,
	RatingResult,
} from '../types.js'

import {
	DEFAULT_BASE_RATE,
	DEFAULT_CONTINUE_ON_ERROR,
	DEFAULT_DECIMAL_PLACES,
	DEFAULT_GROUP_AGGREGATION_METHOD,
} from '../constants.js'

import {
	clamp,
	createRaterError,
	evaluateRateCondition,
	getNestedValue,
	roundToDecimalPlaces,
	toLookupKey,
	toNumber,
	validateGroup,
} from '../helpers.js'

import type { Unsubscribe } from '@mikesaintsg/core'

/**
 * Rating engine implementation.
 */
export class RatingEngine implements RatingEngineInterface {
	readonly #baseRate: number
	readonly #groupAggregationMethod: AggregationMethod
	readonly #minimumRate: number | undefined
	readonly #maximumRate: number | undefined
	readonly #decimalPlaces: number
	readonly #continueOnError: boolean

	#rateListeners = new Set<RateCallback>()
	#errorListeners = new Set<RaterErrorCallback>()
	#isDestroyed = false

	constructor(options?:  RatingEngineOptions) {
		this.#baseRate = options?.baseRate ?? DEFAULT_BASE_RATE
		this.#groupAggregationMethod = options?. groupAggregationMethod ?? DEFAULT_GROUP_AGGREGATION_METHOD
		this.#minimumRate = options?.minimumRate
		this.#maximumRate = options?.maximumRate
		this.#decimalPlaces = options?.decimalPlaces ?? DEFAULT_DECIMAL_PLACES
		this.#continueOnError = options?.continueOnError ?? DEFAULT_CONTINUE_ON_ERROR

		// Wire up initial hooks from options
		if (options?.onRate) {
			this.#rateListeners.add(options.onRate)
		}
		if (options?.onError) {
			this.#errorListeners.add(options.onError)
		}
	}

	// ---- Property Accessors ----

	getBaseRate(): number {
		return this.#baseRate
	}

	getMinimumRate(): number | undefined {
		return this.#minimumRate
	}

	getMaximumRate(): number | undefined {
		return this.#maximumRate
	}

	getDecimalPlaces(): number {
		return this.#decimalPlaces
	}

	isContinueOnError(): boolean {
		return this.#continueOnError
	}

	// ---- Subscription Methods ----

	onRate(callback: RateCallback): Unsubscribe {
		this.#rateListeners. add(callback)
		return () => {
			this.#rateListeners.delete(callback)
		}
	}

	onError(callback: RaterErrorCallback): Unsubscribe {
		this.#errorListeners.add(callback)
		return () => {
			this.#errorListeners.delete(callback)
		}
	}

	// ---- Calculation Methods ----

	rate(
		subject: RateSubject,
		groups: readonly RateFactorGroup[],
	): RatingResult {
		this.#assertNotDestroyed()

		const groupResults:  RateGroupResult[] = []
		const allFactorResults: RateFactorResult[] = []
		const breakdown: string[] = []
		const errors: string[] = []

		breakdown.push(`Starting with base rate: ${this.#baseRate}`)

		// Calculate each group
		for (const group of groups) {
			try {
				const groupResult = this.rateGroup(subject, group)
				groupResults.push(groupResult)
				allFactorResults.push(...groupResult.factorResults)

				if (groupResult.isApplied) {
					breakdown.push(`Group "${group.label}": ${groupResult.rate}`)
				}

				// Collect errors from factors
				for (const factorResult of groupResult.factorResults) {
					if (factorResult.error) {
						errors.push(factorResult. error)
					}
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err. message : 'Unknown error'
				errors.push(`Group "${group.id}": ${errorMessage}`)

				if (! this.#continueOnError) {
					this.#emitError(createRaterError(errorMessage, 'CALCULATION_FAILED', { groupId: group.id }))
					break
				}
			}
		}

		// Aggregate group rates
		const appliedGroupRates = groupResults
			.filter(r => r.isApplied)
			.map(r => r.rate)

		let finalRate:  number
		if (appliedGroupRates.length === 0) {
			finalRate = this.#baseRate
		} else {
			finalRate = this.aggregate(appliedGroupRates, this.#groupAggregationMethod)
		}

		// Apply rounding and clamping
		finalRate = roundToDecimalPlaces(finalRate, this.#decimalPlaces)
		finalRate = clamp(finalRate, this.#minimumRate, this.#maximumRate)

		breakdown.push(`Final rate: ${finalRate}`)

		const factorsApplied = allFactorResults.filter(r => r.isApplied).length

		const result: RatingResult = {
			finalRate,
			isSuccessful: errors.length === 0,
			factorsApplied,
			groupResults,
			allFactorResults,
			breakdown,
			errors,
		}

		this.#emitRate(result)

		return result
	}

	rateFactor(
		subject: RateSubject,
		factor: RateFactor,
	): RateFactorResult {
		this. #assertNotDestroyed()

		// Check if factor is enabled
		if (factor.enabled === false) {
			return {
				factor,
				isApplied: false,
				rate: 0,
			}
		}

		// Evaluate conditions
		let conditionResults: RateConditionResult[] | undefined
		if (factor.conditions && factor.conditions.length > 0) {
			conditionResults = factor.conditions.map(c => this.evaluateCondition(subject, c))

			// All conditions must be met
			const allMet = conditionResults.every(r => r.isMet)
			if (!allMet) {
				return {
					factor,
					isApplied: false,
					rate: 0,
					conditionResults,
				}
			}
		}

		// Determine base rate
		let rate = this.#resolveFactorRate(subject, factor)

		// Apply operation if specified
		if (factor.operation && factor.operand !== undefined) {
			rate = this.applyOperation(rate, factor.operation, factor.operand)
		}

		// Apply factor-level clamping
		rate = clamp(rate, factor.minimumRate, factor.maximumRate)

		// Return with or without conditionResults based on whether conditions exist
		if (conditionResults !== undefined) {
			return {
				factor,
				isApplied: true,
				rate,
				conditionResults,
			}
		}

		return {
			factor,
			isApplied: true,
			rate,
		}
	}

	rateGroup(
		subject: RateSubject,
		group: RateFactorGroup,
	): RateGroupResult {
		this.#assertNotDestroyed()

		// Sort factors by priority
		const sortedFactors = [... group.factors].sort((a, b) => {
			const priorityA = a.priority ??  0
			const priorityB = b.priority ?? 0
			return priorityA - priorityB
		})

		// Calculate each factor
		const factorResults: RateFactorResult[] = []
		for (const factor of sortedFactors) {
			try {
				const result = this.rateFactor(subject, factor)
				factorResults.push(result)
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error'
				factorResults.push({
					factor,
					isApplied: false,
					rate: 0,
					error:  errorMessage,
				})

				if (!this.#continueOnError) {
					throw err
				}
			}
		}

		// Check requireAll constraint
		if (group.requireAll) {
			const allApplied = factorResults.every(r => r.isApplied || r.factor.required !== true)
			if (!allApplied) {
				return {
					group,
					isApplied: false,
					rate: 0,
					factorResults,
				}
			}
		}

		// Aggregate applied factor rates
		const appliedRates = factorResults.filter(r => r.isApplied).map(r => r.rate)

		let rate: number
		if (appliedRates.length === 0) {
			rate = group.baseRate ??  0
		} else {
			rate = this.aggregate(appliedRates, group.aggregationMethod)
			if (group.baseRate !== undefined) {
				// Apply base rate as starting point for aggregation
				rate = this. aggregate([group.baseRate, rate], group.aggregationMethod)
			}
		}

		return {
			group,
			isApplied: appliedRates.length > 0,
			rate,
			factorResults,
		}
	}

	// ---- Evaluation Methods ----

	evaluateCondition(
		subject:  RateSubject,
		condition: RateCondition,
	): RateConditionResult {
		this.#assertNotDestroyed()
		return evaluateRateCondition(subject, condition)
	}

	// ---- Mathematical Methods ----

	applyOperation(
		rate: number,
		operation: MathematicalOperation,
		operand:  number,
	): number {
		switch (operation) {
			case 'add':
				return rate + operand
			case 'subtract':
				return rate - operand
			case 'multiply':
				return rate * operand
			case 'divide':
				return operand !== 0 ? rate / operand : rate
			case 'percentage':
				return rate * (1 + operand / 100)
			case 'percentageOf':
				return rate * (operand / 100)
			case 'minimum':
				return Math.min(rate, operand)
			case 'maximum':
				return Math.max(rate, operand)
			case 'average':
				return (rate + operand) / 2
			case 'power':
				return Math.pow(rate, operand)
			case 'round':
				return Math.round(rate)
			case 'ceil':
				return Math.ceil(rate)
			case 'floor':
				return Math.floor(rate)
			default:
				return rate
		}
	}

	aggregate(
		rates: readonly number[],
		method: AggregationMethod,
	): number {
		if (rates.length === 0) {
			return 0
		}

		switch (method) {
			case 'sum':
				return rates.reduce((sum, rate) => sum + rate, 0)
			case 'product':
				return rates.reduce((product, rate) => product * rate, 1)
			case 'average':
				return rates.reduce((sum, rate) => sum + rate, 0) / rates.length
			case 'minimum':
				return Math.min(...rates)
			case 'maximum':
				return Math.max(...rates)
			default: {
				const first = rates[0]
				return first ?? 0
			}
		}
	}

	// ---- Validation Methods ----

	validateGroups(groups: readonly RateFactorGroup[]): readonly string[] {
		this.#assertNotDestroyed()

		const errors: string[] = []
		for (const group of groups) {
			const groupErrors = validateGroup(group)
			errors.push(...groupErrors)
		}
		return errors
	}

	// ---- Lifecycle Methods ----

	destroy(): void {
		this.#isDestroyed = true
		this.#rateListeners.clear()
		this.#errorListeners.clear()
	}

	// ---- Private Methods ----

	#assertNotDestroyed(): void {
		if (this.#isDestroyed) {
			throw createRaterError('Rating engine has been destroyed', 'UNKNOWN')
		}
	}

	#resolveFactorRate(subject: RateSubject, factor: RateFactor): number {
		// Priority:  fieldPath > lookupTable > rangeTable > baseRate
		if (factor.fieldPath) {
			const value = getNestedValue(subject, factor.fieldPath)
			const numValue = toNumber(value)
			if (numValue !== undefined) {
				return numValue
			}
		}

		if (factor.lookupTable) {
			const keyValue = getNestedValue(subject, factor. lookupTable.field)
			const key = toLookupKey(keyValue)
			const rate = factor.lookupTable.values[key]
			if (rate !== undefined) {
				return rate
			}
			if (factor.lookupTable.defaultValue !== undefined) {
				return factor.lookupTable.defaultValue
			}
		}

		if (factor.rangeTable) {
			const fieldValue = getNestedValue(subject, factor.rangeTable.field)
			const numValue = toNumber(fieldValue)
			if (numValue !== undefined) {
				for (const range of factor.rangeTable.ranges) {
					const minOk = range.minimum === undefined || numValue >= range.minimum
					const maxOk = range.maximum === undefined || numValue <= range.maximum
					if (minOk && maxOk) {
						return range.rate
					}
				}
			}
			if (factor.rangeTable. defaultRate !== undefined) {
				return factor.rangeTable.defaultRate
			}
		}

		return factor.baseRate ??  0
	}

	#emitRate(result: RatingResult): void {
		for (const listener of this.#rateListeners) {
			try {
				listener(result)
			} catch {
				// Ignore listener errors
			}
		}
	}

	#emitError(error: Error): void {
		for (const listener of this. #errorListeners) {
			try {
				listener(error)
			} catch {
				// Ignore listener errors
			}
		}
	}
}
