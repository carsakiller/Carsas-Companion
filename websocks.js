module.exports = (()=>{

	let clientIdCounter = 0
	let clients = []

	let messageIdCounter = 0
	let pendingMessages = []

	let messageCallback

	function addClient(ws, req){
		let client = {
			id: clientIdCounter++,
			ws: ws,
			req: req,
			time: Date.now()
		}

		clients.push(client)


		ws.on('message', (msg)=>{_handleMessage(client, msg)})

		ws.on('error', (err)=>{_handleError(client, err)})

		ws.on('close', ()=>{_handleClose(client)})

		console.log('WebSocks new client #' + client.id, '@', req.ip)
	}

	function _handleMessage(client, msg){
		try {
			let parsed = JSON.parse(msg)

			if(typeof parsed.token === 'string'){
				client.token = parsed.token
			}

			if(typeof parsed.serverId === 'number'){
				// response to server message
				if(pendingMessages[parsed.serverId]){
					if(parsed.success === true){
						pendingMessages[parsed.serverId].fulfill(parsed.data)
					} else {
						pendingMessages[parsed.serverId].reject(parsed.data)
					}
					delete pendingMessages[parsed.serverId]
				}
			} else if (typeof parsed.clientId === 'number'){
				// message from the client

				if(typeof messageCallback !== 'function'){
					console.error('\x1b[31mWebSocks received a message but no messageCallback was set\x1b[37m')
					return
				}


				let promise

				try {
					promise = messageCallback(client, parsed.data)
				} catch (ex){
					client.ws.send(JSON.stringify({
						clientId: parsed.clientId,
						success: false,
						data: ex.toString()
					}))
					return
				}

				if(promise instanceof Promise){
					promise.then((result)=>{
						client.ws.send(JSON.stringify({
							clientId: parsed.clientId,
							success: true,
							data: result
						}))
					}).catch((err)=>{
						client.ws.send(JSON.stringify({
							clientId: parsed.clientId,
							success: false,
							data: err
						}))
					})
				} else {
					client.ws.send(JSON.stringify({
						clientId: parsed.clientId,
						success: true,
						data: undefined
					}))
				}

			} else {
				return _handleError(client, 'client message did not contain an id')
			}

		} catch (ex){
			_handleError(client, 'Error parsing message: ' + ex)
		}
	}

	function _handleError(client, err){
		console.error('WebSocks \x1b[31mError\x1b[37m: client #', client.id, client.req.ip, err)
	}

	function _handleClose(client){
		console.log('WebSocks client closed connection: client #', client.id, client.req.ip)
	}

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
	function setMessageCallback(callback){
		if(typeof callback !== 'function'){
			throw new Error('callback must be a function')
		}
		messageCallback = callback
	}

	function send(client, data){
		return new Promise((fulfill, reject)=>{
			let validClient = false
			for(let c of clients){
				if(c === client){
					validClient = true
				}
			}

			if(!validClient){
				return reject('Client not connected')
			}

			const myMessageId = messageIdCounter++

			pendingMessages.push({
				id: myMessageId,
				fulfill: fulfill,
				reject: reject
			})

			client.ws.send(JSON.stringify({
				serverId: myMessageId,
				data: data
			}))
		})
	}

	return {
		addClient: addClient,
		setMessageCallback: setMessageCallback,
		send: send
	}
})()