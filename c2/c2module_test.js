const C2LoggingUtility = require('./C2_Utility.js').C2LoggingUtility

module.exports = class C2Module_Test extends C2LoggingUtility {
	
	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		// FRONTEND -> BACKEND TEST (triggered by webclient)
		this.c2.registerWebClientMessageHandler('test-performance-frontend-backend', (client, data)=>{
			return JSON.parse(data)
		})

		// FRONTEND <- BACKEND TEST (triggered by webclient)
		this.c2.registerWebClientMessageHandler('test-performance-backend-frontend', (client, data)=>{
			return this.runWebClientTest(client, 'test-performance-backend-frontend')
		})


		this.currentGameBackendTest = undefined

		// GAME -> BACKEND TEST (triggered see below)
		this.c2.registerGameMessageHandler('test-performance-game-backend', (data)=>{
			if(typeof this.currentGameBackendTest === 'function'){
				this.currentGameBackendTest(JSON.parse(data))
			}
		})
		// GAME -> BACKEND TEST (proxy triggered by webclient)
		this.c2.registerWebClientMessageHandler('test-performance-game-backend-proxy', (client)=>{
			return new Promise((resolve, reject)=>{
				let start = Math.floor(performance.now())

				this.currentGameBackendTest = (data)=>{
					resolve({
						testSuccess: data === start,
						testMessage: 'executed via proxy (companion server)'
					})
				}

				this.c2.sendMessageToGame(client.token, 'test-performance-game-backend-proxy', start).catch(err => {
					this.currentGameBackendTest = undefined
					reject(err)
				})
			})
		})

		// GAME <- BACKEND TEST (triggered by webclient)
		this.c2.registerWebClientMessageHandler('test-performance-backend-game', (client)=>{
			return this.runGameTest('test-performance-backend-game', client)
		})

		// FRONTEND -> GAME TEST (triggered by webclient), just proxying)
		this.c2.registerWebClientMessageHandler('test-performance-frontend-game', (client, data)=>{
			return new Promise((resolve, reject)=>{
				let dat = JSON.parse(JSON.stringify(data)) //simulate the conversion that would normally happen
				this.c2.sendMessageToGame(client.token, 'test-performance-frontend-game', dat).then(res => {
					resolve(JSON.parse(res))
				}).catch(err => {
					reject(err)
				})
			})
		})

		this.c2.registerWebClientMessageHandler('debug-set-companion', (client, data)=>{
			return this.c2.sendMessageToGame(client.token, 'debug-set-companion', data)
		})


		this.c2.registerWebClientMessageHandler('debug-set-companion-detailed', (client, data)=>{
			return this.c2.sendMessageToGame(client.token, 'debug-set-companion-detailed', data)
		})
	}

	runGameTest(testName, client){
		return new Promise((resolve, reject)=>{
			let start = Date.now()

			this.c2.sendMessageToGame(client.token, testName, start).then((data)=>{
				let parsed = JSON.parse(data)

				if(parsed !== start){
					throw new Error('data corrupted: ' + start + ' != ' + parsed)
				}

				let message = 'Game Test "'+ testName + '" finished successful after ' + (Date.now() - start) + 'ms'

				this.info(message)
				resolve({
					testSuccess: true,
					testMessage: message
				})
			}).catch((err)=>{
				this.error('Game Test "', testName, '" failed:', err)
				resolve({
					testSuccess: false,
					testMessage: 'Game Test "' + testName + '" failed: ' + err.toString()
				})
			})
		})
	}

	runWebClientTest(client, testName){
		return new Promise((resolve, reject)=>{
			let start = Date.now()

			this.c2.sendMessageToWebClient(client, testName, start).then((data)=>{
				let parsed = JSON.parse(data)

				if(parsed !== start){
					throw new Error('data corrupted: ' + start + ' != ' + parsed)
				}

				let message = 'WebClient Test "' + testName + '" finished successful after ' + (Date.now() - start) + 'ms'

				this.info(message)
				resolve({
					testSuccess: true,
					testMessage: message
				})
			}).catch((err)=>{
				this.error('WebClient Test "', testName, '" failed:', err)
				resolve({
					testSuccess: false,
					testMessage: 'WebClient Test "' + testName + '" failed: ' + err.toString()
				})
			})
		})
	}
}
