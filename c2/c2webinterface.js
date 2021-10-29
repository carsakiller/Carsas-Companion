module.exports = ((app)=>{

	let webSocks = require('./websocks.js')

	app.ws('/ws', (ws, req) => {
	  webSocks.addClient(ws, req)
	});

	webSocks.setMessageCallback((client, message)=>{
		log('<- ', 'got web client message #' + client.id, message)
		let promise = _dispatch('message', client, message)

		if(promise instanceof Promise){
			return promise
		} else {
			return new Promise((fulfill, reject)=>{
				fulfill(promise)
			})
		}
	})


	let eventListeners = {}

	/* events:
		message (only the first registered callback can respond to an message, either by returing a promise in the callback (which will be fulfilled/rejected later) or by returning the data directly from the callback)
	*/
	function on(eventname, callback){
		if(! eventListeners[eventname]){
			eventListeners[eventname] = []
		}

		if(typeof eventname !== 'string'){
			throw new Error('eventname is not a string')
		}

		if(typeof callback === 'function'){
			eventListeners[eventname].push(callback)
		} else {
			throw new Error('callback is not a function')
		}
	}

	function _dispatch(eventname, ...data){
		if(eventListeners[eventname]){
			for(let l of eventListeners[eventname]){
				return l.apply(null, data)
			}
		}
	}

	/*
		@clientOrClients: 'all' or a clientToken 'XYZ' or an array of clientTokens ['XYZ', 'abc']
	*/
	function sendDataTo(clientOrClients, datatype, data){
		log(' ->', 'sending data to', clientOrClients, datatype, data)
		const dataToSend = {
			type: datatype,
			data: data
		}

		if(clientOrClients === 'all'){
			return webSocks.sendToAllClients(dataToSend)
		} else if(clientOrClients instanceof Array){
			let promises = []
			for(let cT of clientOrClients){
				promises.push(webSocks.sendToClientToken(cT, dataToSend))
			}
			return Promise.all(promises)
		} else if(typeof clientOrClients === 'string'){
			return webSocks.sendToClientToken(clientOrClients, dataToSend)
		} else {
			error('unsupported clientOrClients type!')
			return reject('unsupported clientOrClients type!')
		}
	}

	function error(...args){
		console.error.apply(null, ['\x1b[34m[C2WebInterface] \x1b[31mError:\x1b[37m'].concat(args))
	}

	function warn(...args){
		console.warn.apply(null, ['\x1b[34m[C2WebInterface] \x1b[33mWarning:\x1b[37m'].concat(args))
	}

	function info(...args){
		console.info.apply(null, ['\x1b[34m[C2GameHTTPHandler] \x1b[35mInfo:\x1b[37m'].concat(args))
	}

	function log(...args){
		console.log.apply(null, ['\x1b[34m[C2WebInterface]\x1b[37m'].concat(args))
	}

	return {
		sendDataTo: sendDataTo,
		on: on
	}
})