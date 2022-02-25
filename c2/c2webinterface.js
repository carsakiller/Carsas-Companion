const C2WebSocketHandler = require('./C2WebSocketHandler.js')
const C2Interface = require('./C2_Utility.js').C2Interface

module.exports = class C2WebInterface extends C2Interface {


	/* events:
		message (only the first registered callback can respond to an message, either by returing a promise in the callback (which will be resolveed/rejected later) or by returning the data directly from the callback)
	*/

	constructor(loglevel, app){
		super(loglevel)

		this.c2WebSocketHandler = new C2WebSocketHandler(loglevel)

		app.ws('/ws', (ws, req) => {
		 	this.c2WebSocketHandler.addClient(ws, req)
		});

		this.c2WebSocketHandler.on('new-client', (client)=>{
			this.dispatch('new-client', client)
		})

		this.c2WebSocketHandler.setMessageCallback((client, message)=>{
			this.info('<- ', 'got web client message #' + client.id)
			this.log(message)
			let promise = this.dispatch('message', client, message)

			if(promise instanceof Promise){
				return promise
			} else {
				return new Promise((resolve, reject)=>{
					resolve(promise)
				})
			}
		})
	}

	/*
		@clientOrClients: 'all' or a clientToken 'XYZ' or an array of clientTokens ['XYZ', 'abc']
	*/
	sendMessageTo(clientOrClients, messageType, data){
		if(!clientOrClients){
			this.error('clientOrClients is undefined, ignoring send')
			return new Promise((resolve, reject)=>{
				reject('clientOrClients is undefined')
			})
		}

		const dataToSend = {
			type: messageType,
			data: data
		}

		if(clientOrClients === 'all'){
			if(messageType === 'heartbeat' || messageType === 'stream-map'){
				this.debug(' ->', 'sending data to all', messageType)
			} else {
				this.info(' ->', 'sending data to all', messageType)
			}

			return this.c2WebSocketHandler.sendToAllClients(dataToSend)
		} else if(clientOrClients instanceof Array){
			if(messageType === 'heartbeat' || messageType === 'stream-map'){
				this.debug(' ->', 'sending data to', clientOrClients, messageType)
			} else {
				this.info(' ->', 'sending data to', clientOrClients, messageType)
			}
			this.log(data)

			let promises = []
			for(let cT of clientOrClients){
				promises.push(this.c2WebSocketHandler.sendToClientToken(cT, dataToSend))
			}
			return new Promise((resolve, reject)=>{
				Promise.all(promises).finally(resolve)
			})
		} else if(typeof clientOrClients === 'string'){
			if(messageType === 'heartbeat' || messageType === 'stream-map'){
				this.debug(' ->', 'sending data to', clientOrClients, messageType)
			} else {
				this.info(' ->', 'sending data to', clientOrClients, messageType)
			}
			this.log(data)

			return this.c2WebSocketHandler.sendToClientToken(clientOrClients, dataToSend)
		} else if(clientOrClients.ws){
			if(messageType === 'heartbeat' || messageType === 'stream-map'){
				this.debug(' ->', 'sending data to $' + (clientOrClients.token || 'unknown'),'#' + clientOrClients.id, messageType)
			} else {
				this.info(' ->', 'sending data to $' + (clientOrClients.token || 'unknown'),'#' + clientOrClients.id, messageType)
			}
			this.log(data)

			return this.c2WebSocketHandler.sendToClient(clientOrClients, dataToSend)
		} else {
			this.error('unsupported clientOrClients type!', clientOrClients)
			return new Promise((resolve, reject)=>{
				reject('unsupported clientOrClients type!')
			})
		}
	}
}