export const AWSCURRENT = 'AWSCURRENT'
export const AWSPENDING = 'AWSPENDING'
export const AWSPREVIOUS = 'AWSPREVIOUS'

export interface CacheConfig {
  maxCacheSize: number
  secretRefreshInterval: number
  defaultVersionStage: 'AWSCURRENT'
  // TODO implement retry/backoff logic
  exceptionRetryDelayBase: number
  exceptionRetryDelayMax: number
  exceptionRetryGrowthFactor: number
}

// https://github.com/aws/aws-secretsmanager-caching-python/blob/master/src/aws_secretsmanager_caching/config.py
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxCacheSize: 1024,
  exceptionRetryDelayBase: 1,
  exceptionRetryGrowthFactor: 2,
  exceptionRetryDelayMax: 3600,
  defaultVersionStage: AWSCURRENT,
  secretRefreshInterval: 60 * 60 * 1000 // 1 hour
}
