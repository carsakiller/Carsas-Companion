const C2Handler = require('./c2utility.js').C2Handler

module.exports = class C2GameHttpHandler extends C2Handler {

	constructor(){
		super()

		this.commandIdCounter = 0;
		this.commandsToTransferToGame = []
		this.pendingCommandResponses = []

		this.messageCallback = undefined

		this.ongoingMessageTransfers = {}

		this.lastPacketTimes = [] // just for debugging reason
		this.lastPacketTimesMaxEntries = 100


		setInterval(()=>{
			if(this.lastPacketTimes.length > 1){
				let timeTotal = this.lastPacketTimes[0] - this.lastPacketTimes[this.lastPacketTimes.length - 1]
				let averageTimeBetweenPackets = timeTotal / this.lastPacketTimes.length
				this.info('Average averageTimeBetweenPackets:', averageTimeBetweenPackets, timeTotal, this.lastPacketTimes.length)
				let averagePacketsPerSecond = 1000 / averageTimeBetweenPackets
				this.info('Average received packets per second:', Math.floor(averagePacketsPerSecond * 10) / 10)
			}
		}, 1000 * 5)
	}

	onGameHTTP(req, res){
		try {
			let that = this

			this.lastPacketTimes.splice(0, 0, new Date().getTime())
			if(this.lastPacketTimes.length > this.lastPacketTimesMaxEntries){
				this.lastPacketTimes.pop()
			}

			let data = req.query.data;
			let parsed
			try {
				parsed = JSON.parse(data);
			} catch (ex){
				this.log('user json has bad format', data, ex)
				return res.json({
					result: false
				});
			}

			if(!this.ongoingMessageTransfers[parsed.packetId]){
				this.ongoingMessageTransfers[parsed.packetId] = {}
			}
			let omt = this.ongoingMessageTransfers[parsed.packetId]

			if(omt[parsed.packetPart]){
				this.warn('packetPart count is duplicate, will corrupt existing packet parts!')
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

			this.log('<- ', 'content part arrived #' + parsed.packetId + ':' + parsed.packetPart, 'of', maxPartsKnown ? omt.max : 'unknown')

			if(maxPartsKnown && allPartsArrived){//the signal, that this is the last part (yes we count upside down mate!)
				this.log('final message part arrived for #' + parsed.packetId)

				if(!allPartsArrived){
					this.warn('missing content part:', i)
					return answer(false, 'missing content part')
				}

				let parts = []

				let content = ""

				for(let i = 1; i<=omt.max; i++){
					if(omt[i]){
						content += omt[i]
					} else {
						this.warn('missing content part:', i)
						return answer(false, 'missing content part')
					}
				}

				delete this.ongoingMessageTransfers[parsed.packetId]
			
				this.log('final message content (', content.length, ' chars)', content)

				let parsedContent

				if(content === undefined || content === null || content === ''){
					parsedContent = undefined
				} else {
					try {
						parsedContent = JSON.parse(content)
					} catch (ex){
						this.log('error parsing content "' + content + '"', ex)
						answer(false, 'Error: check server logs')
						return
					}
				}

				if(parsed.type === 'command-response'){
					let result = this.handleCommandResponse(parsed.commandId, parsedContent)
					if(result === undefined){
						this.warn('you probably forgot to return "ok" or similar inside handleCommandResponse()!')
					}
					answer(result === 'ok', 'ok')
				} else {

					let promise = this.handleMessage(parsed.type, parsedContent)

					if(promise instanceof Promise){
						promise.then((res)=>{
							answer(true, res)
						}).catch((err)=>{
							this.error('error in callback promise', err)
							answer(false, 'Error: check server logs')
						})
					} else {
						answer(true, 'ok')
					}

					
				}
			} else {
				this.log('waiting for remaining message parts', maxPartsKnown, allPartsArrived, omt)
				answer(true, undefined, true)
			}

			function answer(success, result, ignoreHasMoreCommands){

				let nextCommand = that.getNextCommandToTransfer()

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

			    if(ignoreHasMoreCommands !== true && that.pendingCommandResponses.length > 0){
			    	that.log("pendingCommandResponses", that.pendingCommandResponses.length)
			    	resp.hasMoreCommands = true
			    }

			    res.json(resp);
			}

		} catch (ex){
			this.error(ex)
			res.json({
				success: false,
				result: 'Error: check server logs'
			})
		}
	}

	sendCommandToGame(command, content, callback){
		const myCommandId = this.commandIdCounter++;

		this.commandsToTransferToGame.push({
			id: myCommandId,
			command: command,
			content: content
		})

		this.pendingCommandResponses.push({
			id: myCommandId,
			callback: callback,
			timeScheduled: new Date().getTime(),
			parts: []
		})
	}

	handleMessage(messageType, parsedContent){		
		return new Promise((fulfill, reject)=>{

			if(typeof this.messageCallback === 'function'){
				let promise = this.messageCallback({
					type: messageType,
					data: parsedContent
				})

				if(promise instanceof Promise === false){
					this.error('messageCallback must return a promise!')
					return reject('Error: check server logs')
				} else {
					promise.then((result)=>{
						fulfill(result)
					}).catch((err)=>{
						reject(err)
					})
				}
			} else {
				this.warn('received game message but no messageCallback set')
				reject('Error: check server logs')
			}
		})
	}

	handleCommandResponse(commandId, content){
		for(let i in this.pendingCommandResponses){
			let p = this.pendingCommandResponses[i];

			if(p.id === commandId){
				this.log('CommandResponseTiming: ', p.timeSent - p.timeScheduled, 'ms until sent | ', new Date().getTime() - p.timeScheduled, 'ms until answered')
				
				this.pendingCommandResponses.splice(i,1);

				let ret
				if(typeof p.callback === 'function'){
					ret = p.callback(content);
				}
				return ret
			}
		}

		this.warn('game sent a response for an unknown commandId', commandId, content)
		return 'ok'
	}

	getNextCommandToTransfer(){
		let toSend = this.commandsToTransferToGame.splice(0, 1)[0];
		if(toSend){
			for(let p of this.pendingCommandResponses){
				if(p && p.id === toSend.id){
					p.timeSent = new Date().getTime();
				}
			}
		}

		if(toSend){
			this.log(' ->', 'transmitting command to game', toSend)
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
	setMessageCallback(callback){
		if(typeof callback !== 'function'){
			this.error('callback must be a function')
		}
		this.messageCallback = callback
	}
}
