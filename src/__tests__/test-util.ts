import * as AWS from 'aws-sdk-mock'

interface MockArgs {
  versions: { [key: string]: string[] }
  versionResponse: {
    SecretString: string
  }
}

export function mockSecretsManager({ versions, versionResponse }: MockArgs): void {
  AWS.mock('SecretsManager', 'describeSecret', {
    VersionIdsToStages: versions
  })
  AWS.mock('SecretsManager', 'getSecretValue', versionResponse)
}

export function restoreAll(): void {
  AWS.restore()
}
