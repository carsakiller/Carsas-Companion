module.exports = ((app)=>{

	let C2GameHttpHandler = require('./c2gamehttphandler.js')

	app.use('/game-api', (req, res)=>{
		C2GameHttpHandler.onGameHTTP(req,res)
	});


	function sendCommand(command, data){
		log(' ->', 'sending command', command, data)
		return new Promise((fulfill, reject)=>{
			C2GameHttpHandler.sendCommandToGame(command, data, (res)=>{
				log('received result from command ', command, res)

				if(res === 'ok'){
					fulfill(res)
				} else {
					reject(res)
				}

				return 'ok'
			})
		})
	}

	C2GameHttpHandler.setMessageCallback((message)=>{
		log('<- ', 'got game message', message)
		let promise = _dispatch('message', message)

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
		message callback({type: [string], data: [string,number,object,...]})

		(only the first registered callback can respond to a message, either by returing a promise in the callback (which will be fulfilled/rejected later) or by returning the data directly from the callback)
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

	function cloneObject(obj){
		return JSON.parse(JSON.stringify(obj));
	}

	function error(...args){
		console.error.apply(null, ['\x1b[34m[C2GameInterface] \x1b[31mError:\x1b[37m'].concat(args))
	}

	function warn(...args){
		console.warn.apply(null, ['\x1b[34m[C2GameInterface] \x1b[33mWarning:\x1b[37m'].concat(args))
	}

	function info(...args){
		console.info.apply(null, ['\x1b[34m[C2GameHTTPHandler] \x1b[35mInfo:\x1b[37m'].concat(args))
	}

	function log(...args){
		console.log.apply(null, ['\x1b[34m[C2GameInterface]\x1b[37m'].concat(args))
	}

	return {
		sendCommand: sendCommand,
		on: on
	}
})