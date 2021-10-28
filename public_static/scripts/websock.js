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

class WebSock {

	constructor(url, token){
		console.log('new WebSock', url)
		this.listeners = {}

		this.messageIdCounter = 0
		this.pendingMessages = []

		this.token = token

		this.PENDIMG_MESSAGES_TIMEOUT = 1000 * 20
		setInterval(()=>{
			// check if pendingMessages run into a timeout
			for(let pm of this.pendingMessages){
				if(pm && new Date().getTime() - pm.timeSent > this.PENDIMG_MESSAGES_TIMEOUT){
					pm.reject('timed out')
				}
			}
		}, 500)

		this.websocket = new WebSocket(url)

		this.websocket.onopen = (evt)=>{this._dispatch('open', evt)}

		this.websocket.onmessage = (evt)=>{
			try{
				let parsed = JSON.parse(evt.data)

				if(typeof parsed.clientId === 'number'){
					// response to client message
					for(let i in this.pendingMessages){
						let pm = this.pendingMessages[i]

						if(pm && pm.id === parsed.clientId){
							if(parsed.success === true){
								pm.fulfill(parsed.data)
							} else {
								pm.reject(parsed.data)
							}
							delete this.pendingMessages[i]
							return
						}
					}

					//not found
					this._error('did not find message with id', parsed.clientId, 'in pendingMessages!')

				} else if (typeof parsed.serverId === 'number'){
					// message from the server

					let promise

					try {
						let parsedInternalData = JSON.parse(parsed.data)
						promise = this._dispatch('message', parsedInternalData)
					} catch (ex){
						this.websocket.send(JSON.stringify({
							serverId: parsed.serverId,
							token: this.token,
							success: false,
							data: JSON.stringify(ex.toString())
						}))
						return
					}

					if(promise instanceof Promise){
						promise.then((result)=>{
							this.websocket.send(JSON.stringify({
								serverId: parsed.serverId,
								token: this.token,
								success: true,
								data: JSON.stringify(result)
							}))
						}).catch((err)=>{
							this._error('Error in message callback promise:', err)
							this.websocket.send(JSON.stringify({
								serverId: parsed.serverId,
								token: this.token,
								success: false,
								data: JSON.stringify('Error: check browser logs')
							}))
						})
					} else {
						this.websocket.send(JSON.stringify({
							serverId: parsed.serverId,
							token: this.token,
							success: true,
							data: JSON.stringify(undefined)
						}))
					}

				} else {
					return this._error('server message did not contain an id')
				}
			} catch (ex){
				this._error('Error parsing websocket message', ex)
			}
		}

		this.websocket.onclose = (evt)=>{
			for(let p of this.pendingMessages){
				if(p){
					p.reject('WebSocket Connection closed')
				}
			}
			this.pendingMessages = []

			this._dispatch('close', evt)
		}

		this.websocket.onerror = (evt)=>{
			this._error(evt)
			this._dispatch('error', evt)
		}
	}

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
	on(eventname, callback){
		if(! this.listeners[eventname]){
			this.listeners[eventname] = []
		}

		if(typeof eventname !== 'string'){
			throw new Error('eventname is not a string')
		}

		if(typeof callback === 'function'){
			this.listeners[eventname].push(callback)
		} else {
			throw new Error('callback is not a function')
		}
	}

	_dispatch(eventname, data){
		if(this.listeners[eventname]){
			for(let l of this.listeners[eventname]){
				return l(data)
			}
		}
	}

	/* promise will be fulfilled when the server returns success=true, and rejected if server returns success=false or the pending message runs into connection close */
	send(data){
		return new Promise((fulfill, reject)=>{
			if(this.isOpen() === false){
				return reject('WebSocket not open')
			}

			const myMessageId = this.messageIdCounter++

			this.pendingMessages.push({
				id: myMessageId,
				timeSent: new Date().getTime,
				fulfill: fulfill,
				reject: reject
			})

			this.websocket.send(JSON.stringify({
				clientId: myMessageId,
				token: this.token,
				data: JSON.stringify(data)
			}))
		})
	}

	_error(...args){
		console.error.apply(null, ['WebSock Error:'].concat(args))
	}

	isOpen(){
		return this.websocket.readyState === 1
	}

	close(){
		this.websocket.close()
	}
}