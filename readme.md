HTML断网
ws断开连接 -> onClose -> 执行autoReconnect -> 挂载计时器connect -> 执行networkstatusChange -> 修改网络状态为false -> connect执行中断

HTML切换网络
两者都开：默认最优先wifi，关闭流量无反应
只开流量：切换为wifi，先断开网络，再回复网络
  onClose ->
  autoReconnect -> 
  onNetworkChange -> 
  networkIsConnected = false ->
  networkIsConnected = true ->
  createConnect -> call success ->
  计时器到期 -> connect -> call success
  
只开wifi：
  打开流量无反应
  打开流量再关闭wifi，先断网，再回复网络为流量

sub订阅使用：
  传入topic，这个topic会作为回调触发的唯一事件名，需要在message事件中主动判断接收数据的类型，并手动调用this.event.emit()去触发事件，并传入数据
  因为响应数据每次都不一样，因此使用这种方式，将定制方式直接开放给使用者

执行逻辑
send：执行send拦截器 -> 数据格式化 -> 执行原始send方法
sub：主题订阅数+1 -> 注册主题事件 -> 判断是否注册模板（有，根据模板生成数据；无，直接使用主题数据） -> 执行sub拦截器 -> 指定send发送
unsub：主题订阅数-1 -> 移除主题事件 -> 判断是否注册模板（有，根据模板生成数据；无，直接使用主题数据） -> 执行unsub拦截器 -> 指定send发送