const C2Handler = require('./utility.js').C2Handler

module.exports = class C2WebSocketHandler extends C2Handler {

	/* 
		Responding to a client message:

		webSocks.setMessageCallback((clientToken, data)=>{
			return new Promise((fulfill, reject)=>{
				//do Something
				fulfill('result')
			})
		})

		The promise is optional. If you don't return a promise, the client will be sent a sucess response once callback() finished execution
	*/

	constructor(loglevel){
		super(loglevel)

		this.instantiatedTime = Date.now()

		this.clientIdCounter = 0
		this.clients = []

		this.messageIdCounter = 0
		this.pendingMessageResponses = []

		this.PENDING_MESSAGE_RESPONSE_TIMEOUT = 1000 * 20

		setInterval(()=>{
			this.checkPendingMessageResponsesForTimeout()
		}, 100)
	}

	checkPendingMessageResponsesForTimeout(){
		for(let i in this.pendingMessageResponses){
			let pm = this.pendingMessageResponses[i]

			let timePassed = new Date().getTime() - pm.timeSent

			if( timePassed > this.PENDING_MESSAGE_RESPONSE_TIMEOUT){
				this.warn('pending message (', pm.id, ') response from webclient #' + pm.clientId + ' timed out after', this.PENDING_MESSAGE_RESPONSE_TIMEOUT, 'ms')
				pm.reject({
					success: false,
					result: 'Timeout: WebClient not responding'
				})

				this.pendingMessageResponses.splice(i, 1)

				break
			}
		}
	}

	addClient(ws, req){
		let client = {
			id: this.clientIdCounter++,
			ip: req.ip,
			ws: ws,
			token: undefined,
			req: req
		}

		this.clients.push(client)

		ws.on('message', (msg)=>{
			if(msg === '*RELOAD_PAGE?*'){
				if( (process.env.NODE_ENV || 'development') === 'development'){
					// if we restarted and a client is reconnecting, tell him to reload the page
					if(Date.now() - this.instantiatedTime < 2000){
						ws.send('*RELOAD_PAGE*')
					}
				}
			} else {
				this.handleMessage(client, msg)
			}
		})

		ws.on('error', (err)=>{this.handleError(client, err)})

		ws.on('close', ()=>{this.handleClose(client)})

		this.info('new client #' + client.id, '@', req.ip)

		this.dispatch('new-client', client)
	}

	sendToClient(client, data){
		if(client.closed){
			return new Promise((resolve, reject) => {
				reject('client is already closed')
			})
		}

		return this.send(client, data)
	}

	sendToClientToken(clientToken, data){
		for(let c of this.clients){
			if(c.token === clientToken){
				return this.send(c, data)
			}
		}

		return new Promise((fulfill, reject)=>{
			reject('client with token ' + clientToken + ' not found')
		})
	}

	//fails if fails for a single client, skips disconnected clients
	sendToAllClients(data){
		let promises = []
		for(let c of this.clients){
			if(c.closed){
				continue
			}

			promises.push(this.sendToClient(c, data))
		}
		return Promise.all(promises)
	}

	handleMessage(client, msg){
		try {
			let parsed = JSON.parse(msg)

			client.token = parsed.token

			if(typeof parsed.serverId === 'number'){
				this.log('received response to server message', parsed.serverId)
				this.debug(parsed.data)

				for(let i in this.pendingMessageResponses){
					let pm = this.pendingMessageResponses[i]

					if(pm.id === parsed.serverId){
						if(parsed.success === true){
							pm.fulfill(parsed.data)
						} else {
							pm.reject(parsed.data)
						}

						this.pendingMessageResponses.splice(i, 1)

						break
					}
				}
			} else if (typeof parsed.clientId === 'number'){
				this.log('received new message from webclient #' + client.id, parsed.clientId)
				this.debug(parsed.data)

				if(typeof this.messageCallback !== 'function'){
					this.warn('received a message but no messageCallback was set')
					return
				}

				let promise

				let that = this

				try {
					let parsedInternalData = JSON.parse(parsed.data)
					promise = this.messageCallback(client, parsedInternalData)
				} catch (ex){
					answer(false, ex.toString())
					return
				}

				if(promise instanceof Promise === false){
					this.error('messageCallback must return a promise!')
					answer(false, 'Error: check server logs')
				} else {
					promise.then((result)=>{
						answer(true, result)
					}).catch((err)=>{
						answer(false, err)
					})
				}

				function answer(success, result){
					that.log('responding to message from client', parsed.clientId)
					that.debug(success, result)
					client.ws.send(JSON.stringify({
						clientId: parsed.clientId,
						success: success,
						data: JSON.stringify(result)
					}))
				}

			} else {
				return this.handleError(client, 'client message did not contain an id')
			}

		} catch (ex){
			this.handleError(client, 'Error parsing message: ' + ex)
		}
	}

	handleError(client, err){
		this.error('client #', client.id, client.req.ip, err)
	}

	handleClose(client){//TODO: remove all pending messsages for this client (requires us to keep track of which pendingMessageId belongs to which client). Right now it just runs into a timeout
		this.info('client closed connection: client #', client.id, client.req.ip)
		client.closed = true
	}

	send(client, data){
		return new Promise((fulfill, reject)=>{
			let validClient = false
			for(let c of this.clients){
				if(c === client){
					validClient = true
				}
			}

			if(!validClient){
				return reject('Client not connected')
			}

			const myMessageId = this.messageIdCounter++

			this.pendingMessageResponses.push({
				clientId: client.id,
				id: myMessageId,
				fulfill: fulfill,
				reject: reject,
				timeSent: new Date().getTime()
			})

			this.log(' ->', 'sending data to', client.id)
			this.debug(data)

			client.ws.send(JSON.stringify({
				serverId: myMessageId,
				data: JSON.stringify(data)
			}))
		})
	}

	forceReloadAll(){
		for(let client of this.clients){
			client.ws.send('*FORCE_RELOAD*')
		}
	}
}