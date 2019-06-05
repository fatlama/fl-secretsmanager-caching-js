import { SecretsManager } from 'aws-sdk'
import { CachedSecret } from '../cached-secret'
import { DEFAULT_CACHE_CONFIG } from '../types'
import { mockSecretsManager, restoreAll } from './test-util'

const exampleVersionId = '01234567890123456789012345678901'
const exampleVersions = {
  '01234567890123456789012345678901': ['AWSCURRENT']
}

const exampleVersionResponse = {
  SecretString: 'test'
}

describe('CachedSecret', () => {
  afterEach(() => {
    restoreAll()
  })

  it('allows one to fetch by VersionId', async () => {
    mockSecretsManager({
      versions: {
        '01234567890123456789012345678901': ['NOTCURRENT']
      },
      versionResponse: exampleVersionResponse
    })
    const client = new SecretsManager()
    const cache = new CachedSecret({
      secretId: 'example',
      client,
      config: DEFAULT_CACHE_CONFIG
    })

    const result = await cache.getSecretValue({ versionId: exampleVersionId })

    expect(result).toEqual(exampleVersionResponse)
  })

  it('allows one to fetch by VersionStage', async () => {
    mockSecretsManager({
      versions: {
        '01234567890123456789012345678901': ['NOTCURRENT']
      },
      versionResponse: exampleVersionResponse
    })
    const client = new SecretsManager()
    const cache = new CachedSecret({
      secretId: 'example',
      client,
      config: DEFAULT_CACHE_CONFIG
    })

    const result = await cache.getSecretValue({ versionStage: 'NOTCURRENT' })

    expect(result).toEqual(exampleVersionResponse)
  })

  it('returns null if the VersionStage is not present', async () => {
    mockSecretsManager({
      versions: exampleVersions,
      versionResponse: exampleVersionResponse
    })
    const client = new SecretsManager()
    const cache = new CachedSecret({
      secretId: 'example',
      client,
      config: DEFAULT_CACHE_CONFIG
    })

    const result = await cache.getSecretValue({ versionStage: 'NOTCURRENT' })

    expect(result).toEqual(null)
  })

  it('caches the response', async () => {
    mockSecretsManager({
      versions: exampleVersions,
      versionResponse: exampleVersionResponse
    })
    const client = new SecretsManager()
    const cache = new CachedSecret({
      secretId: 'example',
      client,
      config: DEFAULT_CACHE_CONFIG
    })

    const describeSpy = jest.spyOn(client, 'describeSecret')
    const getSpy = jest.spyOn(client, 'getSecretValue')

    for (let i = 0; i < 10; i++) {
      const response = await cache.getSecretValue({})

      expect(response).toEqual(exampleVersionResponse)
    }

    expect(describeSpy).toBeCalledTimes(1)
    expect(getSpy).toBeCalledTimes(1)
  })

  it('respects the secretRefreshInterval', async () => {
    mockSecretsManager({
      versions: exampleVersions,
      versionResponse: exampleVersionResponse
    })
    const client = new SecretsManager()
    const cache = new CachedSecret({
      secretId: 'example',
      client,
      config: {
        ...DEFAULT_CACHE_CONFIG,
        secretRefreshInterval: 1 // 1ms
      }
    })

    const describeSpy = jest.spyOn(client, 'describeSecret')
    const getSpy = jest.spyOn(client, 'getSecretValue')

    for (let i = 0; i < 10; i++) {
      const response = await cache.getSecretValue({})

      expect(response).toEqual(exampleVersionResponse)
    }

    expect(describeSpy.mock.calls.length).toBeGreaterThan(1)
    expect(getSpy.mock.calls.length).toBeGreaterThan(1)
  })
})
