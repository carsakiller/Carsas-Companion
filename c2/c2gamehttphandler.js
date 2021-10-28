module.exports = (()=>{

	let commandIdCounter = 0;
	let commandsToTransferToGame = []
	let pendingCommandResponses = []

	let messageCallback

	let ongoingMessageTransfers = {};

	function onGameHTTP(req, res){
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
			ongoingMessageTransfers[parsed.packetId] = [];
		}

		if(ongoingMessageTransfers[parsed.packetId].length > parsed.packetPart){
			warn('packetPart count is invalid, will corrup existing packet parts!')
		}
		
		ongoingMessageTransfers[parsed.packetId].push(parsed.data);

		let packetPart = parsed.packetPart;

		log('<- ', 'content part arrived #' + parsed.packetId + ':' + packetPart)

		if(packetPart === 0){//the signal, that this is the last part (yes we count upside down mate!)
			let content = ongoingMessageTransfers[parsed.packetId].join('');
			delete ongoingMessageTransfers[parsed.packetId]
		
			log('final message part arrived for #' + parsed.packetId, content)

			let parsedContent

			if(content === undefined || content === null || content === ''){
				parsedContent = undefined
			} else {
				try {
					parsedContent = JSON.parse(content)
				} catch (ex){
					log('error parsing content "' + content + '"', ex)
					answer(ex)
					return
				}
			}

			if(parsed.type === 'command-response'){
				let result = handleCommandResponse(parsed.commandId, parsedContent)
				if(result === undefined){
					warn('you probably forgot to return "ok" or similar inside c2.handleCommandResponse()!')
				}
				return result
			} else {

				let promise = handleMessage(parsed.type, parsedContent)

				//TODO: check how data is expected to arrive at the game httpReply() and what keywords for successful transmissions are / flags
				if(promise instanceof Promise){
					promise.then((res)=>{
						answer(res)
					}).catch((err)=>{
						error('error in callback promise', err)
						answer('Error: check server logs')
					})
				} else {
					answer('')
				}

				function answer(result){

					let nextCommand = getNextCommandToTransfer()

					let resp = {
				    	result: result
				    }

				    if(nextCommand){
				    	resp.command = nextCommand.command;
				    	resp.commandId = nextCommand.id;
				    	resp.commandContent = nextCommand.content;
				    }

				    if(pendingCommandResponses > 0){
				    	resp.hasMoreCommands = true
				    }

				    res.json(resp);
				}
			}
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
				answer('Error: check server logs')
			}
		})
	}

	function handleCommandResponse(commandId, content){
		for(let i in pendingCommandResponses){
			let p = pendingCommandResponses[i];

			if(p.id === commandId){
				log('CommandResponseTiming: ', p.timeSent - p.timeScheduled, 'ms until sent | ', new Date().getTime() - p.timeScheduled, 'ms until answered')
				let ret
				if(typeof p.callback === 'function'){
					ret = p.callback(content);
				}
				delete pendingCommandResponses[i];
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

	function log(...args){
		console.log.apply(null, ['\x1b[34m[C2GameHTTPHandler]\x1b[37m'].concat(args))
	}


	return {
		onGameHTTP: onGameHTTP,
		setMessageCallback: setMessageCallback,
		sendCommandToGame: sendCommandToGame
	}
})()
