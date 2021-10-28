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

			switch(message.requestType){
				case 'rtt': {
					webSocks.sendToClient(client, {
						requestType: 'rtt-response',
						data: message.data
					}).then((res)=>{
						log('rtt-response success:', res)
					}).catch((err)=>{
						log('rtt-response unsuccessful:', err)
					})
				}; break;

				case 'sync-players': {
					updateSyncedData('players', message.data)
				}; break;

				default: {
					error('unsupported requestType by client', message.requestType)
					reject('unsupported requestType', message.requestType)
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