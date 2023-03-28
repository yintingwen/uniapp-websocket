import { describe, expect, it, test } from 'vitest'
import WebscoketClientInterceptor from '../src/WebscoketClientInterceptor'
import WebsocketClientTemplate from '../src/WebsocketClientTemplate';

test('set', () => {
  function subTemplate (id: string) {
    console.log({
      id: 'sub',
      topic: id
    });
    
    return {
      id: 'sub',
      topic: id
    }
  }

  const template = new WebsocketClientTemplate()
  template.add('sub', subTemplate)

  expect(template.get('sub')).toBe(subTemplate)
})

test('genaretor', () => {
  function subTemplate (id: string) {
    return {
      id: 'sub',
      topic: id
    }
  }

  const template = new WebsocketClientTemplate()
  template.add('sub', subTemplate)

  expect(template.generate('sub', 'btc-001')).toEqual({
    id: 'sub',
    topic: 'btc-001'
  })
})