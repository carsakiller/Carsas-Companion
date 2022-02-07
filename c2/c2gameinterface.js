const C2GameHttpHandler = require('./C2GameHttpHandler.js')
const C2Interface = require('./utility.js').C2Interface

module.exports = class C2GameInterface extends C2Interface {

	/* events:
		message callback({type: [string], data: [string,number,object,...]})

		(only the first registered callback can respond to a message, either by returing a promise in the callback (which will be resolveed/rejected later) or by returning the data directly from the callback)
	*/

	constructor(loglevel, app){
		super(loglevel)

		this.isGameAvailable = false
		this.lastGameMessage = 0

		this.SERVER_HEARTBEAT_MAX_TIME_UNTIL_TIMEOUT = 1000 * 5 //if we do not get any message for 20s (game heartbeats should happen every 1s)

		setInterval(()=>{
			if(Date.now() - this.lastGameMessage > this.SERVER_HEARTBEAT_MAX_TIME_UNTIL_TIMEOUT && this.lastGameMessage > 0){
				if(this.isGameAvailable){
					this.info('Game is not available anymore')
					this.isGameAvailable = false

					this.c2GameHttpHandler.failAllPendingCommandResponses()

					this.dispatch('game-disconnected')
				}
			}
		}, 100)

		this.c2GameHttpHandler = new C2GameHttpHandler(loglevel, this.SERVER_HEARTBEAT_MAX_TIME_UNTIL_TIMEOUT)

		app.use('/game-api', (req, res)=>{
			if(!this.isGameAvailable){
				this.info('Game is available again')

				this.isGameAvailable = true
				this.dispatch('game-connected')
			}

			this.lastGameMessage = Date.now()

			this.c2GameHttpHandler.onGameHTTP(req,res)
		});

		app.finishSetup()

		this.c2GameHttpHandler.setMessageCallback((message)=>{
			if(message.type !== 'heartbeat'){
				this.info('<- ', 'got game message', message.type)
			}
			let promise = this.dispatch('message', message)

			if(promise instanceof Promise){
				return promise
			} else {
				return new Promise((resolve, reject)=>{
					resolve(promise)
				})
			}
		})
	}
	
	sendMessage(token, messageType, data){
		if(!this.isGameAvailable){
			return new Promise((resolve, reject)=>{
				reject('Game not available')
			})
		}

		this.info(' ->', 'sending messageType', messageType)
		this.log(data)
		this.debug(token)
		return new Promise((resolve, reject)=>{
			this.c2GameHttpHandler.sendCommandToGame(token, messageType, data).then((res)=>{
				this.info('received result from messageType ', messageType, res)

				resolve(res)
			}).catch((err)=>{
				reject(err)
			})
		})
	}

	cloneObject(obj){
		return JSON.parse(JSON.stringify(obj));
	}
}