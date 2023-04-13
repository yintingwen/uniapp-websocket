// 重连状态
export enum WebsocketClientReconnectorState {
  INIT,          // 初始化
  WAITING,       // 等待重连
  START,         // 开始重连
  END            // 结束重连
}

export interface WebsocketClientReconnectorOptions {
  maxCount?: number;
  interval?: number;
  tasks?: WebsocketClientReconnectorTasks;
}

export type WebsocketClientReconnectorTasks = Record<string, (...args: any[]) => any>;

export default class WebsocketClientReconnector {
  private initOptions!: Required<WebsocketClientReconnectorOptions>; // 初始化参数
  private state!: WebsocketClientReconnectorState; // 重连状态
  private count!: number; // 重连次数
  private maxCount!: number; // 最大重连次数
  private interval!: number; // 重连间隔
  private timer!: any; // 重连计时器
  private tasks!: WebsocketClientReconnectorTasks; // 重连任务

  constructor(options: WebsocketClientReconnectorOptions = {}) {
    const nOptions = normalizeOptions(options)
    this.initOptions = nOptions
    this.reset()
  }

  /**
   * 重置重连器
   */
  public reset() {
    this.clearDelay()
    this.state = WebsocketClientReconnectorState.INIT
    this.timer = null
    this.count = 0
    this.maxCount = this.initOptions.maxCount
    this.interval = this.initOptions.interval
    this.tasks = this.initOptions.tasks
  }

  /**
   * 立刻重连
   */
  public run(task: string = "run") {
    if (this.state === WebsocketClientReconnectorState.START) return
    if (this.state === WebsocketClientReconnectorState.WAITING) this.clearDelay()
    this.state = WebsocketClientReconnectorState.START
    this.runRecconectTask(task)
  }

  /**
   * 延迟重连
   */
  public delayRun(task: string = "delayRun") {
    if (this.state === WebsocketClientReconnectorState.WAITING) return
    this.state = WebsocketClientReconnectorState.WAITING
    this.clearDelay()
    this.timer = setTimeout(() => { this.runRecconectTask(task) }, this.interval)
  }

  /**
   * 执行重连任务
   */
  public runRecconectTask(task: string) {
    if (this.count >= this.maxCount) {
      throw new Error('reconnect max count')
    }
    this.maxCount++
    const targetTask = this.tasks[task]
    if (!targetTask) throw new Error('task is not exist')
    return targetTask(this)
  }

  /**
   * 结束重连
   */
  public end() {
    this.state = WebsocketClientReconnectorState.END
    this.clearDelay()
  }

  public clearDelay() {
    this.timer && clearTimeout(this.timer)
    this.timer = null
  }
}

function normalizeOptions(options: WebsocketClientReconnectorOptions) {
  return {
    maxCount: options.maxCount ?? 5,
    interval: options.interval ?? 500,
    tasks: options.tasks ?? {}
  }
}