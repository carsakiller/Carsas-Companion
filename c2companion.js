module.exports = (()=>{

	let webSocks

	function setWebSocks(_webSocks){
		webSocks = _webSocks
		webSocks.setMessageCallback(handleClientMessage)
	}

	function handleClientMessage(client, message){
		return new Promise((fulfill, reject)=>{
			log('client message (', client.token, ')', message)

			let parsed
			try {
				parsed = JSON.parse(message)
			} catch (ex){
				error('error parsing client message', ex)
				reject('error parsing message: ' + ex)
				return
			}

			switch(parsed.requestType){
				case 'rtt': {
					webSocks.send(client, JSON.stringify({
						requestType: 'rtt-response',
						data: parsed.data
					})).then((res)=>{
						log('rtt-response success:', res)
					}).catch((err)=>{
						warn('rtt-response unsuccessful:', err)
					})
				}; break;

				default: {
					error('unsupported requestType by client', parsed.requestType)
					reject('unsupported requestType', parsed.requestType)
				}
			}
		})
	}

	function error(...args){
		console.error.apply(null, ['\x1b[34m[C2Companion] \x1b[31mError:\x1b[37m'].concat(args))
	}

	function log(...args){
		console.log.apply(null, ['\x1b[34m[C2Companion]\x1b[37m'].concat(args))
	}

	return {
		setWebSocks: setWebSocks
	}
})()