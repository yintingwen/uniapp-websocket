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