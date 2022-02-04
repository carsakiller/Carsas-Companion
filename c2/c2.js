const C2GameInterface = require('./C2GameInterface.js')
const C2WebInterface = require('./C2WebInterface.js')
const C2Module_Core = require('./C2Module_Core.js')
const C2Module_Test = require('./C2Module_Test.js')
const C2Module_Gameserver = require('./C2Module_Gameserver.js')

const C2LoggingUtility = require('./utility.js').C2LoggingUtility

const gameApp = require('./C2GameWebServer.js')

module.exports = class C2 extends C2LoggingUtility {

	constructor(loglevel, app){
		super(loglevel)

		this.gameMessageHandlers = {}
		this.webClientMessageHandlers = {}

		this.c2GameInterface = new C2GameInterface(loglevel, gameApp)
		this.c2WebInterface = new C2WebInterface(loglevel, app)

		// TODO: only do this when modules are enabled
		this.c2Module_Core = new C2Module_Core(loglevel, this)
		this.c2Module_Test = new C2Module_Test(loglevel, this)
		this.c2Module_Gameserver = new C2Module_Gameserver(0, this)

		// catch any unhandledRejection
		process.on('unhandledRejection', (err) => {
		  	this.error('unhandledRejection', err);
		});

		this.c2WebInterface.on('message', (...args)=>{
			return this.handleWebClientMessage.apply(this, args)
		})

		this.c2WebInterface.on('new-client', (client)=>{
			this.c2WebInterface.sendMessageTo(client, 'game-connection', this.c2GameInterface.isGameAvailable)
		})

		this.c2GameInterface.on('message', (...args)=>{
			return this.handleGameMessage.apply(this, args)
		})

		this.c2GameInterface.on('game-connected', ()=>{
			this.c2WebInterface.sendMessageTo('all', 'game-connection', true).then(()=>{

			}).catch((err)=>{

			})
		})

		this.c2GameInterface.on('game-disconnected', ()=>{
			this.c2WebInterface.sendMessageTo('all', 'game-connection', false).then(()=>{

			}).catch((err)=>{

			})
		})
	}

	sendMessageToGame(...args){
		return this.c2GameInterface.sendMessage.apply(this.c2GameInterface, args)
	}

	sendMessageToWebClient(...args){
		return this.c2WebInterface.sendMessageTo.apply(this.c2WebInterface, args)
	}

	handleWebClientMessage(client, message){
		this.log('handleWebClientMessage client #', client.id, message.type)

		if(! this.webClientMessageHandlers[message.type] && this.webClientMessageHandlers['*']){
			message.originalType = message.type
			message.type = '*'
		}

		if(this.webClientMessageHandlers[message.type]){
			try {
				let promiseOrResult = this.webClientMessageHandlers[message.type](client, message.data, message.originalType ? message.originalType : message.type)

				if(promiseOrResult instanceof Promise){
					return promiseOrResult
				} else {
					return new Promise((fulfill, reject)=>{
						fulfill(promiseOrResult)
					})
				}
			} catch (ex){
				return new Promise((fulfill, reject)=>{
					this.error('error calling webclient messagehandler', ex)
					reject('Error: check server logs')
				})
			}
		} else{
			this.error('unsupported webclient message type', message.type)
			return new Promise((fulfill, reject)=>{
				reject('unsupported webclient message type', message.type)
			})
		}
	}

	handleGameMessage(message){
		if(message.type === 'heartbeat'){
			this.warn('♥')
		} else {
			this.log('handleGameMessage', message.type)
		}

		if(! this.gameMessageHandlers[message.type] && this.gameMessageHandlers['*']){
			message.originalType = message.type
			message.type = '*'
		}

		if(this.gameMessageHandlers[message.type]){
			let promiseOrResult
			try {
				promiseOrResult = this.gameMessageHandlers[message.type](message.data, message.originalType ? message.originalType : message.type)

				if(promiseOrResult instanceof Promise){
					return promiseOrResult
				} else {
					return new Promise((fulfill, reject)=>{
						fulfill(promiseOrResult)
					})
				}
			} catch (ex){
				return new Promise((fulfill, reject)=>{
					reject(ex)
				})
			}
		} else{
			this.error('unsupported game message type', message.type)
			return new Promise((fulfill, reject)=>{
				reject('unsupported game message type', message.type)
			})
		}
	}

	/*
		callback(messageData, messageType)

		you can register for messageType '*' to define a default callback (messageType will still be the original type, not '*')
	*/
	registerGameMessageHandler(messageType, callback){
		if(typeof callback !== 'function'){
			this.error('callback must be a function (game messageType: ', messageType, ')')
		}

		if(this.gameMessageHandlers[messageType]){
			this.warn('overwriting game message handler for', messageType)
		}

		this.gameMessageHandlers[messageType] = callback
	}

	/*
		callback(client, messageData, messageType)

		you can register for messageType '*' to define a default callback (messageType will still be the original type, not '*')
	*/
	registerWebClientMessageHandler(messageType, callback){
		if(typeof callback !== 'function'){
			this.error('callback must be a function (webclient messageType: ', messageType, ')')
		}

		if(this.webClientMessageHandlers[messageType]){
			this.warn('overwriting webclient message handler for', messageType)
		}

		this.webClientMessageHandlers[messageType] = callback
	}
}
