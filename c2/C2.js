const Logger = require('./C2_ConsoleLogger.js')
global.ConsoleLogger = new Logger()

const C2GameInterface = require('./C2GameInterface.js')
const C2WebInterface = require('./C2WebInterface.js')
const C2Module_Core = require('./C2Module_Core.js')
const C2Module_Test = require('./C2Module_Test.js')
const C2Module_Map = require('./C2Module_Map.js')
const C2Module_Gameserver = require('./C2Module_Gameserver.js')

const C2LoggingUtility = require('./C2_Utility.js').C2LoggingUtility

const gameApp = require('./C2GameWebServer.js')

const os = require('os')
const ipLib = require('ip')

const axios = require('axios')


module.exports = class C2 extends C2LoggingUtility {

	constructor(loglevel, app){
		super(loglevel)

		this.gameMessageHandlers = {}
		this.webClientMessageHandlers = {}

		this.c2GameInterface = new C2GameInterface(loglevel, gameApp)
		this.c2WebInterface = new C2WebInterface(loglevel, app)

		this.c2Module_Core = new C2Module_Core(loglevel, this)
		this.c2Module_Test = new C2Module_Test(loglevel, this)
		this.c2Module_Map = new C2Module_Map(loglevel, this)
		this.c2Module_Gameserver = new C2Module_Gameserver(loglevel, this)


		this.appWebServerPort = '?'
		this.gameWebServerPort = '?'
		this.myPublicIp = '?'

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
			this.c2WebInterface.sendMessageTo('all', 'game-connection', true)

			//request initial sync after some time
			setTimeout(()=>{
				this.info('triggering initial sync ...')
				this.sendMessageToGame(undefined, 'command-sync-all').catch(err => {
					this.error('initial sync failed', err)
				})
			}, 1000 * 5)
		})

		this.c2GameInterface.on('game-disconnected', ()=>{
			this.c2WebInterface.sendMessageTo('all', 'game-connection', false)
		})

		axios.get('https://c2.flaffipony.rocks/c2-my-ip').then((res)=>{
			this.myPublicIp = res.data

			let companionAddress = this.getCompanionUrl()

			console.logAlways(`\ncompanion website: ${companionAddress}  or  http://localhost:${this.appWebServerPort}\n`)
		}).catch(err => {
			this.warn('unable to detect my ip', err)
		})


		//do something when app is closing
		process.on('exit', this.handleExit.bind(this));

		//catches ctrl+c event
		process.on('SIGINT', this.handleExit.bind(this));

		// catches "kill pid" (for example: nodemon restart)
		process.on('SIGUSR1', this.handleExit.bind(this));
		process.on('SIGUSR2', this.handleExit.bind(this));

		//catches uncaught exceptions
		process.on('uncaughtException', this.handleExit.bind(this));
	}

	onAppWebServerListening(port){
		this.appWebServerPort = port
  		console.logAlways(`  listening at port :${port} (App Web Server)`)
	}

	onGameWebServerListening(port){
		this.gameWebServerPort = port
  		console.logAlways(`  listening at port :${port} (Game Web Server)`)
	}

	handleExit() {
		try {
	    	this.c2Module_Gameserver.forceExit()
	    } catch (_){}

	    process.exit()
	}

	sendMessageToGame(...args){
		return this.c2GameInterface.sendMessage.apply(this.c2GameInterface, args)
	}

	sendMessageToWebClient(...args){
		return this.c2WebInterface.sendMessageTo.apply(this.c2WebInterface, args)
	}

	handleWebClientMessage(client, message){

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
					return new Promise((resolve, reject)=>{
						resolve(promiseOrResult)
					})
				}
			} catch (ex){
				return new Promise((resolve, reject)=>{
					this.error('error calling webclient messagehandler', ex)
					reject('Error: check server logs')
				})
			}
		} else{
			this.error('unsupported webclient message type', message.type)
			return new Promise((resolve, reject)=>{
				reject('unsupported webclient message type', message.type)
			})
		}
	}

	handleGameMessage(message){
		if(message.type === 'heartbeat'){
			this.log('♥')
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
					promiseOrResult.then(res => {
						this.debug('result for "', message.type, '" (promise):', res)
					})
					return promiseOrResult
				} else {
					this.debug('result for "', message.type, '" :', promiseOrResult)
					return new Promise((resolve, reject)=>{
						resolve(promiseOrResult)
					})
				}
			} catch (ex){
				return new Promise((resolve, reject)=>{
					reject(ex)
				})
			}
		} else{
			this.error('unsupported game message type', message.type)
			return new Promise((resolve, reject)=>{
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

	getMyIpv4Interfaces(){
		let interfaces = os.networkInterfaces()

		let ret = []

		if(interfaces){
			for(let name of Object.keys(interfaces)){
				for(let iface of interfaces[name]){
					if(iface.family === 'IPv4'){
						ret.push({
							ip: iface.address,
							mask: iface.netmask
						})
					}
				}
			}
		}

		return ret
	}

	isAccessAllowedForIp(ip){
		if(this.c2Module_Core.getCurrentServerSetting('allow-external-access') === true){
			return true
		} else {

			//check for localhost
			if(ipLib.isPrivate(ip)){
				return true
			}

			let myInterfaces = this.getMyIpv4Interfaces()

			//check for same network
			for(let iface of myInterfaces){
				if(ipLib.isEqual(ipLib.mask(ip, iface.mask), ipLib.mask(iface.ip, iface.mask))){
					return true
				}
			}
		}

		return false
	}


	getCompanionUrl(){
		let myIp = '?'

		if(this.c2Module_Core.getCurrentServerSetting('allow-external-access') === true){
			myIp = this.myPublicIp
		} else {
			let myInterfaces = this.getMyIpv4Interfaces()

			if(myInterfaces[0]){
				myIp = myInterfaces[0].ip
			} else {
				this.warn('no IPv4 interface available (cannot make CompanionAddress)')
			}
		}

		return `http://${myIp}:${this.appWebServerPort}`
	}
}
