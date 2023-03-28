import { describe, expect, it } from 'vitest'
import { normalizeOptions } from '../WebsocketClient'

describe('normalize', () => {
  it('should normalize the options', () => {
    const options = {
      url: 'ws://localhost:8080',
    }

    normalizeOptions(options)

    console.log(options);
    

    expect(options).toEqual({
      url: 'ws://localhost:8080',
      reconnect: true,
      reconnectMaxCount: 10,
      reconnectInterval: 1000,
    })
  })
})