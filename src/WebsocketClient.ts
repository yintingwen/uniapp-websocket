import EventEmitter from 'eventemitter3'
import WebscoketClientInterceptor from './WebscoketClientInterceptor';
import WebsocketClientReconnector from './WebsocketClientReconnector';
import WebsocketClientTemplate from './WebsocketClientTemplate';

interface WebsocketClientOptions {
  url: string;
  reconnect?: boolean;
  reconnectMaxCount?: number;
  reconnectInterval?: number;
  subKey?: string | ((data: any) => string);
}

export type WebsocketClientHooks = 'send' | 'open' | 'message' | 'error' | 'close' | 'sub' | 'unsub'
export type WebsocketClientCallbackVoid = (...args: any[]) => void
export type WebsocketClientCallbackAny = (...args: any[]) => any

enum WebsocketClientStatusEnum {
  INIT, // 未初始化
  CONNECTED, // 已连接
  ERROR, // 连接错误
  CLOSED, // 已断开连接
}

export default class WebsocketClient {
  private networkIsConnected!: boolean; // 网络是否在线
  private url!: string; // 连接地址
  private socket: UniNamespace.SocketTask | null = null // 连接实例
  private subCollection: Record<string, number>; // 订阅列表
  private reconnectOpen!: boolean; // 是否需要重连
  private reconnectMaxCount!: number; // 最大重连次数
  private reconnectInterval!: number; // 重连间隔
  private reconnectLock: boolean = false; // 重连锁
  private initOptions!: Required<WebsocketClientOptions>; // 初始化参数
  private subKey!: string | ((data: any) => string); // 订阅key

  status: WebsocketClientStatusEnum; // 连接状态
  reconnector: WebsocketClientReconnector; // 重连器
  template: WebsocketClientTemplate; // 模板仓库
  event: EventEmitter; // 事件中心
  interceptor: WebscoketClientInterceptor; // 拦截器

  /**
   * 构造函数
   */
  constructor(options: WebsocketClientOptions) {
    if (!options) throw new Error('options is required')
    if (!options.url) throw new Error('url is required')

    const nOptions = normalizeOptions(options)

    this.initOptions = nOptions
    this.url = nOptions.url
    this.subCollection = {}
    this.reconnectOpen = nOptions.reconnect as boolean
    this.reconnectMaxCount = nOptions.reconnectMaxCount as number
    this.reconnectInterval = nOptions.reconnectInterval as number
    this.status = WebsocketClientStatusEnum.INIT

    this.template = new WebsocketClientTemplate()
    this.event = new EventEmitter()
    this.interceptor = new WebscoketClientInterceptor()
    this.reconnector = new WebsocketClientReconnector({
      maxCount: this.reconnectMaxCount,
      interval: this.reconnectInterval,
      tasks: {
        run: () => this.createConnect(),
        delayRun: () => this.connect()
      }
    })

    uni.onNetworkStatusChange((e) => {
      if (this.networkIsConnected === e.isConnected) return // 状态未改变，不做处理
      if (this.networkIsConnected && !e.isConnected) { // 原本为true，现在为false，说明网络断开
        this.networkIsConnected = false
      } else if (!this.networkIsConnected && e.isConnected) { // 原本为false，现在为true，说明网络断开后恢复
        this.networkIsConnected = true
        this.reconnector.run()
      }
    })
  }

  /**
   * 事件监听
   */
  addListener(name: WebsocketClientHooks, callback: WebsocketClientCallbackVoid) {
    this.event.addListener(name, callback, this)
  }
  removeListener(name: WebsocketClientHooks, callback: WebsocketClientCallbackVoid) {
    this.event.removeListener(name, callback, this)
  }

  /**
   * 开启连接
   */
  async connect() {
    if ([WebsocketClientStatusEnum.CONNECTED, WebsocketClientStatusEnum.ERROR].includes(this.status)) {
      throw new Error('socket is already connected')
    }
    await this.getNetworkOnline()
    if (!this.networkIsConnected) {
      throw new Error('network is offline')
    }
    this.createConnect()
  }

  /**
   * 创建连接
   */
  private createConnect() {
    if (this.reconnectLock) return
    this.socket = uni.connectSocket({
      url: this.url,
      success: () => console.log("connect success"),
      fail: () => console.log("connect fail")
    })
    this.initOptions.reconnect && (this.reconnectOpen = true)
    this.socket.onOpen(this.handleOpen.bind(this))
    this.socket.onMessage(this.handelMessage.bind(this))
    this.socket.onError(this.handleError.bind(this))
    this.socket.onClose(this.handleClose.bind(this))
  }

  /**
   * 关闭连接
   */
  close() {
    this.status = WebsocketClientStatusEnum.CLOSED
    this.reconnectOpen = false // 禁止重连
    this.socket && this.socket.close({}) // 关闭
  }

  /**
   * 重新连接
   */
  reconnect() {
    this.close()
    this.connect()
  }

  /**
   * 发送数据
   * @param {*} data
   */
  async send(data: any) {
    if (!this.socket || this.status !== WebsocketClientStatusEnum.CONNECTED) {
      throw new Error('socket is not connected')
    }

    data = await this.interceptor.run('send', data, this)
    // 如果是对象，但不是ArrayBuffer，则转为json字符串
    if (typeof data === 'object' && !(data instanceof ArrayBuffer)) {
      data = JSON.stringify(data)
    }
    this.socket.send({ data })
  }

  /**
   * 基于模板发送数据
   * @param templateId 模板ID
   * @param data 数据
   */
  async sendByTemplate(templateId: string, data: any) {
    const templateData = this.template.generate(templateId, data)
    this.send(templateData)
  }

  /**
   * @param {*} topic 订阅主题
   * @param {*} listener 监听函数
   */
  sub(topic: string, listener: (...args: any[]) => void) {
    this.subCollection[topic] = this.subCollection[topic] ? this.subCollection[topic] + 1 : 1
    this.event.addListener(topic, listener, this)
    this.sendSub('sub', topic)
  }

  /**
   * 取消订阅
   * @param {*} topic 订阅主题
   * @param {*} listener 监听函数
   */
  unsub(topic: string, listener: (...args: any[]) => void) {
    if (!this.subCollection[topic]) return

    this.subCollection[topic]--
    this.event.removeListener(topic, listener, this)
    this.sendSub('sub', topic)
  }

  /**
   * 发送订阅模板消息
   */
  private async sendSub(action: 'sub' | 'unsub', topic: string) {
    if (!this.socket || this.status !== WebsocketClientStatusEnum.CONNECTED) return
    let data = topic
    if (this.template.get(action)) {
      data = this.template.generate(action, topic)
    }
    const sendData = await this.interceptor.run(action, data, this)
    this.send(sendData)
  }

  /**
   * socket连接成功
   */
  private handleOpen() {
    this.reconnector.reset()
    this.status = WebsocketClientStatusEnum.CONNECTED
    this.event.emit('open', this)

    for (const key in this.subCollection) {
      !!key && this.sendSub('sub', key)
    }
  }

  /**
   * socket收到消息
   * @param {*} msg 数据
   */
  private handelMessage(msg: any) {
    let { data } = msg
    if (!(data instanceof ArrayBuffer)) {
      try {
        data = JSON.parse(data)
      } catch (error) { }
    }

    data = this.interceptor.run('message', data, this)
    this.event.emit('message', data)
  }

  /**
   * socket发生错误
   * @param {*} err 错误对象
   */
  private handleError(err: any) {
    this.status = WebsocketClientStatusEnum.ERROR
    this.event.emit('error', err)
  }

  /**
   * socket连接断开
   */
  private async handleClose() {
    this.status = WebsocketClientStatusEnum.CLOSED // 设置状态
    this.event.emit('close')
    this.socket = null // 重置_socket
    if (this.reconnectOpen) { // 自动重连
      this.reconnector.delayRun()
    }
  }

  /**
   * 获取网络是否在线
   */
  private getNetworkOnline() {
    return new Promise((resolve, reject) => {
      uni.getNetworkType({
        success: (res) => {
          const isOnline = res.networkType !== 'none'
          resolve(this.networkIsConnected = isOnline)
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }
}

export function normalizeOptions(options: WebsocketClientOptions): Required<WebsocketClientOptions> {
  const { reconnect, reconnectMaxCount, reconnectInterval, subKey } = options
  options.reconnect = reconnect === undefined ? true : !!reconnect
  options.reconnectMaxCount = reconnectMaxCount === undefined ? 5 : reconnectMaxCount
  options.reconnectInterval = reconnectInterval === undefined ? 500 : reconnectInterval
  options.subKey = subKey === undefined ? 'topic' : subKey

  return options as Required<WebsocketClientOptions>
}