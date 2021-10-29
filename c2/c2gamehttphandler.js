module.exports = (()=>{

	let commandIdCounter = 0;
	let commandsToTransferToGame = []
	let pendingCommandResponses = []

	let messageCallback

	let ongoingMessageTransfers = {};

	let lastPacketTimes = [] // just for debugging reason
	let lastPacketTimesMaxEntries = 100

	setInterval(()=>{
		if(lastPacketTimes.length > 1){
			let timeTotal = lastPacketTimes[0] - lastPacketTimes[lastPacketTimes.length - 1]
			let averageTimeBetweenPackets = timeTotal / lastPacketTimes.length
			info('Average averageTimeBetweenPackets:', averageTimeBetweenPackets, timeTotal, lastPacketTimes.length)
			let averagePacketsPerSecond = 1000 / averageTimeBetweenPackets
			info('Average received packets per second:', Math.floor(averagePacketsPerSecond * 10) / 10)
		}
	}, 1000 * 5)

	function onGameHTTP(req, res){
		try {
			lastPacketTimes.splice(0, 0, new Date().getTime())
			if(lastPacketTimes.length > lastPacketTimesMaxEntries){
				lastPacketTimes.pop()
			}

			let data = req.query.data;
			let parsed
			try {
				parsed = JSON.parse(data);
			} catch (ex){
				log('user json has bad format', data, ex)
				return res.json({
					result: false
				});
			}

			if(!ongoingMessageTransfers[parsed.packetId]){
				ongoingMessageTransfers[parsed.packetId] = {}
			}
			let omt = ongoingMessageTransfers[parsed.packetId]

			if(omt[parsed.packetPart]){
				warn('packetPart count is duplicate, will corrupt existing packet parts!')
			}
			
			omt[parsed.packetPart] = parsed.data;

			if(parsed.morePackets === 0){
				omt.max = parsed.packetPart
			}

			/* parts could arrive here asynchronously, but normally they arrive synchronously */

			let maxPartsKnown = typeof omt.max === 'number'
			let allPartsArrived = false
			if(maxPartsKnown){
				allPartsArrived = true
				for(let i = 1; i<=omt.max; i++){
					if(!omt[i]){
						allPartsArrived = false
					}
				}
			}

			log('<- ', 'content part arrived #' + parsed.packetId + ':' + parsed.packetPart, 'of', maxPartsKnown ? omt.max : 'unknown')

			if(maxPartsKnown && allPartsArrived){//the signal, that this is the last part (yes we count upside down mate!)
				log('final message part arrived for #' + parsed.packetId)

				if(!allPartsArrived){
					warn('missing content part:', i)
					return answer(false, 'missing content part')
				}

				let parts = []

				let content = ""

				for(let i = 1; i<=omt.max; i++){
					if(omt[i]){
						content += omt[i]
					} else {
						warn('missing content part:', i)
						return answer(false, 'missing content part')
					}
				}

				delete ongoingMessageTransfers[parsed.packetId]
			
				log('final message content (', content.length, ' chars)', content)

				let parsedContent

				if(content === undefined || content === null || content === ''){
					parsedContent = undefined
				} else {
					try {
						parsedContent = JSON.parse(content)
					} catch (ex){
						log('error parsing content "' + content + '"', ex)
						answer(false, 'Error: check server logs')
						return
					}
				}

				if(parsed.type === 'command-response'){
					let result = handleCommandResponse(parsed.commandId, parsedContent)
					if(result === undefined){
						warn('you probably forgot to return "ok" or similar inside handleCommandResponse()!')
					}
					answer(result === 'ok', 'ok')
				} else {

					let promise = handleMessage(parsed.type, parsedContent)

					if(promise instanceof Promise){
						promise.then((res)=>{
							answer(true, res)
						}).catch((err)=>{
							error('error in callback promise', err)
							answer(false, 'Error: check server logs')
						})
					} else {
						answer(true, 'ok')
					}

					
				}
			} else {
				log('waiting for remaining message parts', maxPartsKnown, allPartsArrived, omt)
				 answer(true, undefined, true)
			}

			function answer(success, result, ignoreHasMoreCommands){

				let nextCommand = getNextCommandToTransfer()

				let resp = {
					packetId: parsed.packetId,
					packetPart: parsed.packetPart,
					success: success,
			    	result: result
			    }

			    if(nextCommand){
			    	resp.command = nextCommand.command;
			    	resp.commandId = nextCommand.id;
			    	resp.commandContent = nextCommand.content;
			    }

			    if(ignoreHasMoreCommands !== true && pendingCommandResponses.length > 0){
			    	log("pendingCommandResponses", pendingCommandResponses.length)
			    	resp.hasMoreCommands = true
			    }

			    res.json(resp);
			}

		} catch (ex){
			error(ex)
			res.json({
				success: false,
				result: 'Error: check server logs'
			})
		}
	}

	function sendCommandToGame(command, content, callback){
		const myCommandId = commandIdCounter++;

		commandsToTransferToGame.push({
			id: myCommandId,
			command: command,
			content: content
		})

		pendingCommandResponses.push({
			id: myCommandId,
			callback: callback,
			timeScheduled: new Date().getTime(),
			parts: []
		})
	}

	function handleMessage(messageType, parsedContent){		
		return new Promise((fulfill, reject)=>{

			if(typeof messageCallback === 'function'){
				let promise = messageCallback({
					type: messageType,
					data: parsedContent
				})

				if(promise instanceof Promise === false){
					error('messageCallback must return a promise!')
					return reject('Error: check server logs')
				} else {
					promise.then((result)=>{
						fulfill(result)
					}).catch((err)=>{
						reject(err)
					})
				}
			} else {
				warn('received game message but no messageCallback set')
				reject('Error: check server logs')
			}
		})
	}

	function handleCommandResponse(commandId, content){
		for(let i in pendingCommandResponses){
			let p = pendingCommandResponses[i];

			if(p.id === commandId){
				log('CommandResponseTiming: ', p.timeSent - p.timeScheduled, 'ms until sent | ', new Date().getTime() - p.timeScheduled, 'ms until answered')
				
				pendingCommandResponses.splice(i,1);

				let ret
				if(typeof p.callback === 'function'){
					ret = p.callback(content);
				}
				return ret
			}
		}

		warn('game sent a response for an unknown commandId', commandId, content)
		return 'ok'
	}

	function getNextCommandToTransfer(){
		let toSend = commandsToTransferToGame.splice(0, 1)[0];
		if(toSend){
			for(let p of pendingCommandResponses){
				if(p && p.id === toSend.id){
					p.timeSent = new Date().getTime();
				}
			}
		}

		if(toSend){
			log(' ->', 'transmitting command to game', toSend)
		}

		return toSend;
	}

	/* 
		Responding to a game message:

		c2gamehttphandler.setMessageCallback((data)=>{
			return new Promise((fulfill, reject)=>{
				//do Something
				fulfill('result')
			})
		})

		The promise is optional. If you don't return a promise, the client will be sent a sucess response once callback() finished execution
	*/
	function setMessageCallback(callback){
		if(typeof callback !== 'function'){
			error('callback must be a function')
		}
		messageCallback = callback
	}

	function error(...args){
		console.error.apply(null, ['\x1b[34m[C2GameHTTPHandler] \x1b[31mError:\x1b[37m'].concat(args))
	}

	function warn(...args){
		console.warn.apply(null, ['\x1b[34m[C2GameHTTPHandler] \x1b[33mWarning:\x1b[37m'].concat(args))
	}

	function info(...args){
		console.info.apply(null, ['\x1b[34m[C2GameHTTPHandler] \x1b[35mInfo:\x1b[37m'].concat(args))
	}

	function log(...args){
		console.log.apply(null, ['\x1b[34m[C2GameHTTPHandler]\x1b[37m'].concat(args))
	}


	return {
		onGameHTTP: onGameHTTP,
		setMessageCallback: setMessageCallback,
		sendCommandToGame: sendCommandToGame
	}
})()
