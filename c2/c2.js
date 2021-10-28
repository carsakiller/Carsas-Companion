module.exports = ((app)=>{

	let C2WebInterface = require('./c2webinterface.js')(app)

	let C2GameInterface = require('./c2gameinterface.js')(app)


	let syncedData = {}

	C2WebInterface.on('message', handleWebClientMessage)

	C2GameInterface.on('message', handleGameMessage)

	function handleWebClientMessage(client, message){
		log('handleWebClientMessage', client.token, message.type)

		switch(message.type){
			case 'rtt': {
				C2WebInterface.sendDataTo(client.token, 'rtt-response', message.data).then((res)=>{
					log('rtt-response success:', res)
				}).catch((err)=>{
					log('rtt-response unsuccessful:', err)
				})

				return message.data
			}; break;

			case 'test': {
				return new Promise((fulfill, reject)=>{
					C2GameInterface.sendCommand('test', message.data).then((res)=>{
						log('test success:', res)
						fulfill(res)
					}).catch((err)=>{
						log('test unsuccessful:', err)
						reject(err)
					})			
				})
			}; break;

			default: {

				if(message.type.startsWith('command-')){
					return new Promise((fulfill, reject)=>{
						let commandname = message.type.substring('command-'.length)
						log('(?)', 'executing command:', commandname)
						C2GameInterface.sendCommand(commandname, message.data).then((res)=>{
							log('command', commandname, 'success:', res)
							fulfill(res)
						}).catch((err)=>{
							log('command', commandname, 'unsuccessful:', err)
							reject(err)
						})
					})
				} else {
					error('unsupported type by client', message.type)
					return new Promise((fulfill, reject)=>{
						reject('unsupported type', message.type)
					})
				}
			}
		}
	}

	function handleGameMessage(message){
		log('handleGameMessage', message.type)

		switch(message.type){
			case 'heartbeat': {
				C2WebInterface.sendDataTo('all', 'alive').then((res)=>{
					log('alive success:', res)
				}).catch((err)=>{
					log('alive unsuccessful:', err)
				})

				return 'good to know!'
			}; break;

			default: {

				if(message.type.startsWith('sync-')){
					let dataname = message.type.substring('sync-'.length)
					log('(§)', 'syncing data with web clients:', dataname)
					C2WebInterface.sendDataTo('all', message.type, message.data)
				} else {
					error('unsupported type by game', message.type)
					return 'unsupported type:' + message.type
				}
			}
		}
	}

	function error(...args){
		console.error.apply(null, ['\x1b[34m[C2] \x1b[31mError:\x1b[37m'].concat(args))
	}

	function warn(...args){
		console.warn.apply(null, ['\x1b[34m[C2] \x1b[33mWarning:\x1b[37m'].concat(args))
	}

	function log(...args){
		console.log.apply(null, ['\x1b[34m[C2]\x1b[37m'].concat(args))
	}

	return {

	}
})
