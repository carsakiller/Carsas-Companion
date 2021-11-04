const C2GameHttpHandler = require('./c2gamehttphandler.js')
const C2Interface = require('./c2utility.js').C2Interface

module.exports = class C2GameInterface extends C2Interface {

	/* events:
		message callback({type: [string], data: [string,number,object,...]})

		(only the first registered callback can respond to a message, either by returing a promise in the callback (which will be fulfilled/rejected later) or by returning the data directly from the callback)
	*/

	constructor(loglevel, app){
		super(loglevel)

		this.isGameAvailable = false
		this.lastGameMessage = 0

		this.SERVER_HEARTBEAT_MAX_TIME_UNTIL_TIMEOUT = 1000 * 6 //if we do not get any message for 20s (game heartbeats should happen every 3s)

		setInterval(()=>{
			if(Date.now() - this.lastGameMessage > this.SERVER_HEARTBEAT_MAX_TIME_UNTIL_TIMEOUT && this.lastGameMessage > 0){
				if(this.isGameAvailable){
					this.warn('Game is not available anymore')
					this.isGameAvailable = false

					this.c2GameHttpHandler.failAllPendingCommandResponses()

					this.dispatch('game-disconnected')
				}
			}
		}, 100)

		this.c2GameHttpHandler = new C2GameHttpHandler(loglevel)

		app.use('/game-api', (req, res)=>{
			if(!this.isGameAvailable){
				this.info('Game is available again')
				this.dispatch('game-connected')
			}
			this.isGameAvailable = true
			this.lastGameMessage = Date.now()

			this.c2GameHttpHandler.onGameHTTP(req,res)
		});

		app.finishSetup()

		this.c2GameHttpHandler.setMessageCallback((message)=>{
			this.info('<- ', 'got game message', message.type)
			let promise = this.dispatch('message', message)

			if(promise instanceof Promise){
				return promise
			} else {
				return new Promise((fulfill, reject)=>{
					fulfill(promise)
				})
			}
		})
	}
	
	sendMessage(messageType, data){
		if(!this.isGameAvailable){
			return new Promise((fulfill, reject)=>{
				reject('Game not available')
			})
		}

		this.info(' ->', 'sending messageType', messageType)
		this.log(data)
		return new Promise((fulfill, reject)=>{
			this.c2GameHttpHandler.sendCommand(messageType, data).then((res)=>{
				this.info('received result from messageType ', messageType, res)

				fulfill(res)
			}).catch((err)=>{
				reject(err)
			})
		})
	}

	cloneObject(obj){
		return JSON.parse(JSON.stringify(obj));
	}
}