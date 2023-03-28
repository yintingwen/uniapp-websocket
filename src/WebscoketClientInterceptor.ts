export type WebscoketClientInterceptorsName = 'send' | 'message' | 'sub' | 'unsub'
export const WEBSOCKET_CLIENT_INTERCEPTOR_NAMES: WebscoketClientInterceptorsName[] = ['send', 'message', 'sub', 'unsub']
export type WebsocketClientInterceptorsCallback =  (...args: any[]) => any

export default class WebscoketClientInterceptor {
  interceptorNames: WebscoketClientInterceptorsName[] = WEBSOCKET_CLIENT_INTERCEPTOR_NAMES
  interceptors: Record<WebscoketClientInterceptorsName, WebsocketClientInterceptorsCallback[]> = {} as Record<WebscoketClientInterceptorsName, any[]>

  constructor() {
    this.interceptorNames.forEach((name) => {
      this.interceptors[name] = []
    })
  }

  use(name: WebscoketClientInterceptorsName, interceptor: WebsocketClientInterceptorsCallback) {
    if (typeof interceptor !== 'function') {
      throw new Error('interceptor must be a function')
    }
    if (this.interceptorNames.includes(name)) {
      this.interceptors[name].push(interceptor)
    }
  }

  eject(name: WebscoketClientInterceptorsName, interceptor: WebsocketClientInterceptorsCallback) {
    if (!this.interceptorNames.includes(name)) return
    const index = this.interceptors[name].indexOf(interceptor)
    if (index === -1) return
    this.interceptors[name].splice(index, 1)
  }

  async run (name: WebscoketClientInterceptorsName, data: any, content: any) {
    const interceptors = this.interceptors[name]
    if (interceptors.length) {
      for (const interceptor of interceptors) {
        data = await interceptor.call(content, data)
      }
    }
    return data
  }
}