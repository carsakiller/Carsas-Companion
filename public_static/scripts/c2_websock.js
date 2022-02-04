/*

	Messages from client to server:
	{
		clientId: 1,
		token: 'xyz',
		data: "doSomething"
	}

	Response from server:
	{
		clientId: 1,
		success: true,
		data: "Result String"
	}
	OR
	{
		clientId: 1,
		success: false,
		data: "Error: invalid user input"
	}


	Messages from server to client:
	{
		serverId: 1,
		data: "gather this data"
	}

	Response from client:
	{
		serverId: 1,
		token: 'xyz',
		success: true,
		data: "the data you wanted"
	}
	OR
	{
		serverId: 1,
		token: 'xyz',
		success: false,
		data: "Error: can't find the data"
	}

*/

class C2WebSock extends C2EventManagerAndLoggingUtility {

	/* events:
		open
		close
		error
		message (only the first registered callback can respond to the message!)

		Responding to a server message:

		webSock.on('message', (data)=>{
			return new Promise((fulfill, reject)=>{
				//do Something
				fulfill('result')
			})
		})

		The promise is optional. If you don't return a promise, the server will be sent a sucess response once callback() finished execution
	*/

	constructor(loglevel, url){
		super(loglevel)

		this.log('new WebSock', url)

		this.url = url
		this.token = undefined

		this.listeners = {}

		this.messageIdCounter = 0
		this.pendingMessages = []

		this.PENDIMG_MESSAGES_TIMEOUT = 1000 * 20
		setInterval(()=>{
			// check if pendingMessages run into a timeout
			for(let pm of this.pendingMessages){
				if(pm && new Date().getTime() - pm.timeSent > this.PENDIMG_MESSAGES_TIMEOUT){
					pm.reject('timed out')
				}
			}
		}, 500)

		this.preventReconnect = false

		this.createWebSocket()
	}

	createWebSocket(){
		this.websocket = new WebSocket(this.url)

		this.websocket.onopen = (evt)=>this.handleWebsocketOpen(evt)

		this.websocket.onmessage = (evt)=>this.handleWebsocketMessage(evt)

		this.websocket.onclose = (evt)=>this.handleWebsocketClose(evt)

		this.websocket.onerror = (evt)=>this.handleWebsocketError(evt)
	}

	handleWebsocketOpen(evt){
		this.dispatch('open', evt)
	}

	handleWebsocketMessage(evt){
		if(evt.data === '*RELOAD_PAGE*'){
			if(window.NO_MAGIC_PAGE_RELOAD){
				return//ignore
			}
			this.preventReconnect = true
			this.websocket.close()
			setTimeout(()=>{// give the server some time to finish building resources (e.g. compass)
				document.location.reload()
			}, 1000)
			return
		}

		if(evt.data === '*FORCE_RELOAD*'){
			this.preventReconnect = true
			this.websocket.close()
			setTimeout(()=>{
				document.location.reload()
			}, 100)
			return
		}

		try{
			let parsed = JSON.parse(evt.data)

			if(typeof parsed.clientId === 'number'){
				this.info('received response to client message', parsed.clientId)
				this.log(parsed.data)

				for(let i in this.pendingMessages){
					let pm = this.pendingMessages[i]

					if(pm && pm.id === parsed.clientId){
						if(parsed.success === true){
							pm.fulfill(parsed.data)
						} else {
							pm.reject(parsed.data)
						}
						this.pendingMessages.splice(i, 1)
						return
					}
				}

				//not found
				this.error('did not find message with id', parsed.clientId, 'in pendingMessages!')

			} else if (typeof parsed.serverId === 'number'){

				let that = this

				let promise

				try {
					let parsedInternalData = JSON.parse(parsed.data)

					if(parsedInternalData.type === 'heartbeat'){
						this.debug('received new message from the server', parsed.serverId)
					} else {
						this.info('received new message from the server', parsed.serverId)
					}
					promise = this.dispatch('message', parsedInternalData)
				} catch (ex){
					this.info('received new message from the server', parsed.serverId)
					answer(false, ex.toString())
					return
				}

				if(promise instanceof Promise){
					promise.then((result)=>{
						answer(true, result)
					}).catch((err)=>{
						this.error('Error in message callback promise:', err)
						answer(false, 'Error: check browser logs')
					})
				} else {
					answer(true, undefined)
				}

				function answer(success, data){
					that.websocket.send(JSON.stringify({
						serverId: parsed.serverId,
						token: that.token,
						success: success,
						data: JSON.stringify(data)
					}))
				}

			} else {
				return this.error('server message did not contain an id')
			}
		} catch (ex){
			this.error('Error parsing websocket message', ex)
		}
	}

	handleWebsocketClose(evt){
		this.dispatch('close', evt)

		this.on('open', ()=>{
			this.websocket.send('*RELOAD_PAGE?*')
		})

		if(! this.preventReconnect){
			this.createWebSocket()
		}
	}

	handleWebsocketError(evt){
		this.error(evt)
		this.dispatch('error', evt)
	}

	/* promise will be fulfilled when the server returns success=true, and rejected if server returns success=false or the pending message runs into connection close */
	send(data){
		return new Promise((fulfill, reject)=>{
			if(this.isOpen() === false){
				return reject('WebSocket not open')
			}

			const myMessageId = this.messageIdCounter++

			this.info('sending message to server', myMessageId)
			this.log(data)

			this.pendingMessages.push({
				id: myMessageId,
				timeSent: new Date().getTime,
				fulfill: fulfill,
				reject: reject
			})

			this.debug('token', this.token)

			this.websocket.send(JSON.stringify({
				clientId: myMessageId,
				token: this.token,
				data: JSON.stringify(data)
			}))
		})
	}

	close(){
		this.websocket.close()
	}

	isOpen(){
		return this.websocket.readyState === 1
	}

	close(){
		this.websocket.close()
	}
}