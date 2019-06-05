import { randomlyChooseTtl } from '../util'

describe('util', () => {
  describe('randomlyChooseTtl', () => {
    it('chooses a ttl no less than half of the maxTtl provided', () => {
      const maxTtl = 20
      const expectedMin = 10
      for (let i = 0; i < 20; i++) {
        expect(randomlyChooseTtl(maxTtl)).toBeGreaterThanOrEqual(expectedMin)
      }
    })
  })
})
