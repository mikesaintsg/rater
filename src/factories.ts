/**
 * @mikesaintsg/rater
 *
 * Factory functions for the rater library.
 */

import type { RatingEngineInterface, RatingEngineOptions } from './types.js'
import { RatingEngine } from './core/Engine.js'

/**
 * Create a rating engine. 
 *
 * @param options - Engine configuration options
 * @returns Rating engine instance
 *
 * @example
 * ```ts
 * const engine = createRatingEngine({
 *   baseRate: 100,
 *   minimumRate: 50,
 *   maximumRate: 500
 * })
 *
 * const groups = [{
 *   id: 'base',
 *   label: 'Base Factors',
 *   aggregationMethod: 'multiply',
 *   factors: [{
 *     id: 'age',
 *     label: 'Age Factor',
 *     rangeTable: {
 *       field: 'age',
 *       ranges: [
 *         { minimum: 18, maximum: 25, rate: 1.5 },
 *         { minimum: 26, maximum: 65, rate: 1.0 },
 *         { minimum: 66, rate: 1.3 }
 *       ]
 *     }
 *   }]
 * }]
 *
 * const result = engine.rate({ age: 30 }, groups)
 * console.log(result.finalRate)
 * engine.destroy()
 * ```
 */
export function createRatingEngine(
	options?: RatingEngineOptions
): RatingEngineInterface {
	return new RatingEngine(options)
}
