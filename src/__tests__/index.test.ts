import * as index from '../index'
import { SecretsCache } from '../secrets-cache'

describe('index', () => {
  it('exports SecretsCache', () => {
    expect(index.SecretsCache).toEqual(SecretsCache)
  })
})
