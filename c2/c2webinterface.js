const WebSocks = require('./c2websockethandler.js')
const C2Interface = require('./c2utility.js').C2Interface

module.exports = class C2WebInterface extends C2Interface {


	/* events:
		message (only the first registered callback can respond to an message, either by returing a promise in the callback (which will be fulfilled/rejected later) or by returning the data directly from the callback)
	*/

	constructor(app){
		super()

		this.webSocks = new WebSocks()

		app.ws('/ws', (ws, req) => {
		 	this.webSocks.addClient(ws, req)
		});

		this.webSocks.setMessageCallback((client, message)=>{
			this.log('<- ', 'got web client message #' + client.id, message)
			let promise = this.dispatch('message', client, message)

			if(promise instanceof Promise){
				return promise
			} else {
				return new Promise((fulfill, reject)=>{
					fulfill(promise)
				})
			}
		})
	}

	/*
		@clientOrClients: 'all' or a clientToken 'XYZ' or an array of clientTokens ['XYZ', 'abc']
	*/
	sendDataTo(clientOrClients, datatype, data){
		this.log(' ->', 'sending data to', clientOrClients, datatype, data)
		const dataToSend = {
			type: datatype,
			data: data
		}

		if(clientOrClients === 'all'){
			return this.webSocks.sendToAllClients(dataToSend)
		} else if(clientOrClients instanceof Array){
			let promises = []
			for(let cT of clientOrClients){
				promises.push(this.webSocks.sendToClientToken(cT, dataToSend))
			}
			return Promise.all(promises)
		} else if(typeof clientOrClients === 'string'){
			return this.webSocks.sendToClientToken(clientOrClients, dataToSend)
		} else {
			this.error('unsupported clientOrClients type!')
			return reject('unsupported clientOrClients type!')
		}
	}
}