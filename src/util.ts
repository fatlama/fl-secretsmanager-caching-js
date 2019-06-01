/**
 * Randomly chooses a future timestamp in ms based on the ttl provided
 *
 * The value chosen should have enough jitter to it that not all instances of an application hammer
 * the AWS endpoint at the same time
 *
 * Rules
 * * the lower interval bound must be no more than about half the max value
 * * the upper interval bound must be no more than the ttl provided
 *
 * @param ttl The upper bound of milliseconds permitted
 * @return the ttl chosen
 */
export function randomlyChooseTtl(ttl: number): number {
  // Aim to have the refresh happen in the latter half between now and the TTL
  const midTtl = Math.floor(ttl / 2)
  return midTtl + Math.random() * midTtl
}
