module.exports = (()=>{

	let webSocks

	function setWebSocks(_webSocks){
		webSocks = _webSocks
		webSocks.setMessageCallback(handleClientMessage)
	}

	function handleClientMessage(client, message){
		return new Promise((fulfill, reject)=>{
			console.log('c2 client message (', client.token, ')', message)

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
						console.log('rtt-response success:', res)
					}).catch((err)=>{
						console.warn('rtt-response unsuccessful:', err)
					})
				}; break;

				default: {
					console.error('unsupported requestType by client', parsed.requestType)
					reject('unsupported requestType', parsed.requestType)
				}
			}
		})
	}

	function error(...args){
		console.error.apply(null, ['C2Companion Error:'].concat(args))
	}

	return {
		setWebSocks: setWebSocks
	}
})()