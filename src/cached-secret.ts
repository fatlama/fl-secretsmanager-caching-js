import LRU from 'lru-cache'
import { SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { CacheConfig } from './types'
import { CachedSecretVersion } from './cached-secret-version'
import { randomlyChooseTtl } from './util'

const MAX_VERSIONS_CACHE = 10

interface CachedSecretArgs {
  secretId: string
  client: Pick<SecretsManager, 'describeSecret' | 'getSecretValue'>
  config: CacheConfig
}

interface GetSecretValueOpts {
  versionId?: string
  versionStage?: string
}

interface StringHashMap {
  [key: string]: string
}

/**
 * A CachedSecret represents a single SecretId in AWS SecretsManager
 *
 * == Rules
 *
 * * Secrets can have many versions
 * * Secrets can have many stages (AWSCURRENT, AWSPREVIOUS, AWSPENDING, etc)
 * * A stage maps to one version
 * * A version can map to many stages
 *
 * == Basic Example
 *
 * > const cachedSecret = new CachedSecret({
 *     secretId: 'mySuperTopSecret',
 *     client: new AWS.SecretsManager(),
 *     config: {
 *       secretRefreshInterval: 60 * 5 * 1000,
 *       ...
 *     }
 *   })
 * // Fetch the default AWSCURRENT value
 * > const secretValue = await cachedSecret.getSecretValue()
 * {
 *   SecretString: '{"username":"myUsername","password":"s00perSekret"}',
 *   ...
 * }
 */
export class CachedSecret {
  private _secretId: string
  private _client: Pick<SecretsManager, 'describeSecret' | 'getSecretValue'>
  private _config: CacheConfig

  private _versionIdsByStage: StringHashMap
  private _nextRefreshTime: number

  private _versionCache: LRU<string, CachedSecretVersion>

  public constructor(args: CachedSecretArgs) {
    this._config = args.config
    this._client = args.client
    this._secretId = args.secretId

    this._versionIdsByStage = {}
    this._versionCache = new LRU<string, CachedSecretVersion>(MAX_VERSIONS_CACHE)
    this._nextRefreshTime = Date.now() - 1
  }

  /**
   * Fetch the current value, optionally for the provided versionStage or versionId
   *
   * // Fetch for versionStage AWSCURRENT
   * > const secretValue = await cachedSecret.getSecretValue()
   *
   * // Fetch a specific versionStage
   * > const secretValue = await cachedSecret.getSecretValue({ versionStage: 'AWSCURRENT' })
   *
   * // Fetch a specific versionId
   * > const secretValue = await cachedSecret.getSecretValue({ versionId: '123456' })
   */
  public async getSecretValue(
    opts: GetSecretValueOpts = {}
  ): Promise<GetSecretValueResponse | null> {
    const { versionId, versionStage } = opts
    if (versionId) {
      const version = await this._getVersionById(versionId)

      return version.getSecretValue()
    }

    const version = await this._getVersionForStage(versionStage || this._config.defaultVersionStage)
    if (!version) {
      return null
    }

    return version.getSecretValue()
  }

  private async _getVersionForStage(versionStage: string): Promise<CachedSecretVersion | null> {
    const versionId = await this._getVersionIdForStage(versionStage)

    if (!versionId) {
      return null
    }

    return this._getVersionById(versionId)
  }

  private async _getVersionById(versionId: string): Promise<CachedSecretVersion> {
    const existing = this._versionCache.get(versionId)
    if (existing) {
      return existing
    }

    // The versionId is new to us, meaning a rotation is probably scheduled to happen soon
    const version = new CachedSecretVersion({
      client: this._client,
      config: this._config,
      secretId: this._secretId,
      versionId
    })

    this._versionCache.set(versionId, version)

    return version
  }

  private async _getVersionIdForStage(versionStage: string): Promise<string | null> {
    if (Date.now() > this._nextRefreshTime) {
      await this._refreshVersions()
    }

    return this._versionIdsByStage[versionStage] || null
  }

  private async _refreshVersions(): Promise<void> {
    const result = await this._client.describeSecret({ SecretId: this._secretId }).promise()

    if (!result.VersionIdsToStages) {
      // This secret has no versions attached to it
      // TODO Decide if we should _resetRefreshTime here
      // TODO Decide if we should be throwing an exception here
      this._versionIdsByStage = {}
      return
    }

    const versionIdsByStage: StringHashMap = {}

    Object.keys(result.VersionIdsToStages).forEach(
      (versionId): void => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const stages = result.VersionIdsToStages![versionId]
        if (!stages) {
          return
        }

        stages.forEach(
          (stage): void => {
            versionIdsByStage[stage] = versionId
          }
        )
      }
    )

    this._versionIdsByStage = versionIdsByStage
    this._resetRefreshTime()
  }

  private _resetRefreshTime(): void {
    const maxTtl = this._config.secretRefreshInterval
    const ttl = randomlyChooseTtl(maxTtl)
    this._nextRefreshTime = Date.now() + ttl
  }
}
