module.exports = (()=>{

	let webSocks

	let syncedData = {}

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
					webSocks.sendToClient(client, {
						requestType: 'rtt-response',
						data: parsed.data
					}).then((res)=>{
						log('rtt-response success:', res)
					}).catch((err)=>{
						warn('rtt-response unsuccessful:', err)
					})
				}; break;

				case 'sync-players': {
					updateSyncedData('players', parsed.data)
				}; break;

				default: {
					error('unsupported requestType by client', parsed.requestType)
					reject('unsupported requestType', parsed.requestType)
				}
			}
		})
	}

	function updateSyncedData(dataname, data){
		syncedData[dataname] = parsed.data
		syncClients(dataname)		
	}

	function syncClients(dataname){
		webSocks.sendToAllClients({
			requestType: 'sync-' + dataname,
			data: syncedData[dataname]
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