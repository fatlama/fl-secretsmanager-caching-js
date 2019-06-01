import { SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { CacheConfig } from './types'
import { randomlyChooseTtl } from './util'

interface CachedSecretVersionArgs {
  client: Pick<SecretsManager, 'getSecretValue'>
  config: CacheConfig
  secretId: string
  versionId: string
}

/**
 * This is a cache for a particular VersionId of a secret
 *
 * VersionIds contain the actual value for a particular GetSecretValue response
 */
export class CachedSecretVersion {
  private _config: CacheConfig
  private _client: Pick<SecretsManager, 'getSecretValue'>

  private _secretId: string
  private _versionId?: string

  private _secretValue?: GetSecretValueResponse
  private _nextRefreshTime: number

  public constructor(args: CachedSecretVersionArgs) {
    this._client = args.client
    this._config = args.config
    this._secretId = args.secretId
    this._versionId = args.versionId

    this._nextRefreshTime = Date.now() - 1
  }

  /**
   * Checks the cache for a non-stale secret value and, failing that, fetches a new copy
   */
  public async getSecretValue(): Promise<GetSecretValueResponse | null> {
    if (Date.now() > this._nextRefreshTime) {
      await this._refreshSecretValue()
    }

    if (!this._secretValue) {
      return null
    }
    return { ...this._secretValue }
  }

  /**
   * Calls SecretsManager.GetSecretValue, caches the result, and resets the next refresh time
   *
   * TODO Implement retry/backoff logic
   */
  private async _refreshSecretValue(): Promise<void> {
    const result = await this._client
      .getSecretValue({
        SecretId: this._secretId,
        VersionId: this._versionId
      })
      .promise()
    this._secretValue = result

    this._resetRefreshTime()
  }

  /**
   * Sets _nextRefreshTime to a random time somewhere in the latter half of the interval set in
   * config.secretRefreshInterval
   */
  private _resetRefreshTime(): void {
    const maxTtl = this._config.secretRefreshInterval
    const ttl = randomlyChooseTtl(maxTtl)
    this._nextRefreshTime = Date.now() + ttl
  }
}
