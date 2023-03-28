import { WebsocketClientCallbackAny } from "./WebsocketClient"

export default class WebsocketClientTemplate {
  private templates: Record<string, WebsocketClientCallbackAny> = {}

  add(name: string, genaertor: WebsocketClientCallbackAny) {
    this.templates[name] = genaertor
  }

  get(name: string) {
    return this.templates[name]
  }

  generate(name: string, ...args: any[]) {
    return this.templates[name] ? this.templates[name](...args) : args
  }
}