import { describe, expect, it } from 'vitest'
import WebscoketClientInterceptor from '../WebscoketClientInterceptor'

describe('interceptors', () => {
  it('should work', async () => {
    const interceptors = new WebscoketClientInterceptor()
    interceptors.use('send', (data) => {
      return data + '1'
    })
    interceptors.use('send', (data) => {
      return data + '2'
    })
    interceptors.use('send', (data) => {
      return data + '3'
    })
    interceptors.use('send', (data) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(data + '4')
        }, 2000)
      })
    })
    const data = await interceptors.run('send', 'data')
    
    expect(data).toEqual('data1234')
  })
})