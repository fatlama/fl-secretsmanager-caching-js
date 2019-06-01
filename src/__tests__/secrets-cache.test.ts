import { SecretsManager } from 'aws-sdk'
import { SecretsCache } from '../secrets-cache'
import { mockSecretsManager, restoreAll } from './test-util'

const exampleVersions = {
  '01234567890123456789012345678901': ['AWSCURRENT']
}

const exampleVersionResponse = {
  SecretString: 'test'
}

describe('SecretsCache', () => {
  afterEach(() => {
    restoreAll()
  })

  it('uses the specified client', async () => {
    mockSecretsManager({
      versions: exampleVersions,
      versionResponse: exampleVersionResponse
    })
    const client = new SecretsManager()
    const cache = new SecretsCache({ client })

    const describeSpy = jest.spyOn(client, 'describeSecret')
    const getSpy = jest.spyOn(client, 'getSecretValue')

    await cache.getSecretValue('mysecret')

    expect(describeSpy).toBeCalledTimes(1)
    expect(getSpy).toBeCalledTimes(1)
  })

  it('fetches the current stage by default', async () => {
    mockSecretsManager({
      versions: exampleVersions,
      versionResponse: exampleVersionResponse
    })
    const cache = new SecretsCache()

    const response = await cache.getSecretValue('mySecret')

    expect(response).toEqual(exampleVersionResponse)
  })

  it('fetches the specified stage', async () => {
    mockSecretsManager({
      versions: { '01234567890123456789012345678901': ['NOTCURRENT'] },
      versionResponse: exampleVersionResponse
    })
    const cache = new SecretsCache()

    const response = await cache.getSecretValue('mySecret', { versionStage: 'NOTCURRENT' })

    expect(response).toEqual(exampleVersionResponse)
  })

  it('returns null if the requested VersionStage does not exist', async () => {
    mockSecretsManager({
      versions: { '01234567890123456789012345678901': ['NOTCURRENT'] },
      versionResponse: exampleVersionResponse
    })
    const cache = new SecretsCache()

    const response = await cache.getSecretValue('mySecret')

    expect(response).toBe(null)
  })

  it('returns null if there are no versions', async () => {
    mockSecretsManager({
      versions: {},
      versionResponse: exampleVersionResponse
    })
    const cache = new SecretsCache()

    const response = await cache.getSecretValue('mySecret')

    expect(response).toBe(null)
  })

  it('reuses the cached version', async () => {
    mockSecretsManager({
      versions: exampleVersions,
      versionResponse: exampleVersionResponse
    })
    const client = new SecretsManager()
    const cache = new SecretsCache({ client })

    const describeSpy = jest.spyOn(client, 'describeSecret')
    const getSpy = jest.spyOn(client, 'getSecretValue')

    for (let i = 0; i < 10; i++) {
      const response = await cache.getSecretValue('mySecret')

      expect(response).toEqual(exampleVersionResponse)
    }

    expect(describeSpy).toBeCalledTimes(1)
    expect(getSpy).toBeCalledTimes(1)
  })
})
