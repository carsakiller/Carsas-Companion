const axios = require('axios')

const C2LoggingUtility = require('./utility.js').C2LoggingUtility

module.exports = class C2Module_Core extends C2LoggingUtility {
	
	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.companionTokens = {}
		this.roles = {}

		this.PERMISSIONS = {
			Default:  {
				'page-home': true,
				'page-players': true,
				'page-vehicles': true,
				'page-roles': true,
				'page-rules': true,
				'page-preferences': true,
				'page-gamesettings': true,
				'page-live-map': true
			},
			Owner: {
				'page-home': true,
				'page-players': true,
				'page-vehicles': true,
				'page-roles': true,
				'page-rules': true,
				'page-preferences': true,
				'page-gamesettings': true,
				'page-live-map': true,

				'page-logs': true,
				'page-gameserver-management': true,
				'page-tests': true
			}
		}

		this.steamProfileCache = {}

		this.companionLoginAttemptsFromIP = {}

		this.c2.registerWebClientMessageHandler('*', (client, data, messageType)=>{
			if(messageType.startsWith('command-')){
				return new Promise((fulfill, reject)=>{
					let commandname = messageType.substring('command-'.length)
					this.log('(?)', 'executing command:', commandname, data)
					this.c2.sendMessageToGame(client.token, messageType, data).then((res)=>{
						this.log('command', commandname, 'success:', res)
						fulfill(res)
					}).catch((err)=>{
						this.log('command', commandname, 'unsuccessful:', err)
						reject(err)
					})
				})
			} else {
				this.error('unsupported type by client', messageType)
				return new Promise((fulfill, reject)=>{
					reject('unsupported type: ' + messageType)
				})
			}
		})

		this.c2.registerWebClientMessageHandler('companion-login', (client, data, messageType)=>{
			if(this.companionLoginAttemptsFromIP[client.ip] === undefined){
				this.companionLoginAttemptsFromIP[client.ip] = 0
			}

			this.companionLoginAttemptsFromIP[client.ip]++

			if(this.companionLoginAttemptsFromIP[client.ip] >= 50){
				//rate limit, but pretend token not exists
				if(this.companionLoginAttemptsFromIP[client.ip] == 50){
					this.warn('someone hit the companion-login rate limit:', client.ip)
				}
				return new Promise((resolve, reject)=>{ reject('token not found') })
			} else {
				return this.c2.sendMessageToGame(client.token, messageType, data)
			}
		})

		this.c2.registerWebClientMessageHandler('steam-profile', (client, messageData)=>{
			return new Promise((resolve, reject)=>{
				let steamId = messageData

				if(typeof steamId !== 'string' ||!steamId.match(/^[0-9]{17}$/)){
					return reject('invalid steamId')
				}

				if(this.steamProfileCache[steamId]){
					this.log('serving steam profile from cache')
					return resolve(this.steamProfileCache[steamId])
				}

				let profileUrl = 'http://steamcommunity.com/profiles/' + steamId

				this.log('resolving steam profile', profileUrl)

				axios.get(profileUrl,
					{ headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0'}}
				).then(res=>{
					let html = res.data

					let start = html.indexOf('"', html.indexOf('src', html.indexOf('img', html.indexOf('playerAvatarAutoSizeInner'))))
					let end = html.indexOf('"', start+1)
					let profileImageUrl = html.substring(start+1, end)

					if(typeof profileImageUrl === 'string' && profileImageUrl.length > 0){
						let profile = {
							profileImageUrl: profileImageUrl
						}
						this.steamProfileCache[steamId] = profile
						resolve(profile)
					} else {
						this.warn('invalid html format for steam profile', profileUrl, res.data)
						reject('invalid html format')
					}
				}).catch(err=>{
					this.error(err)
					reject(err)
				})
			})
		})

		this.c2.registerWebClientMessageHandler('user-permissions', (client)=>{
			return new Promise((resolve, reject)=>{
				if(this.tokenIsOwner(client.token)){
					return resolve(this.PERMISSIONS.Owner)
				} else {
					return resolve(this.PERMISSIONS.Default)
				}
			})
		})

		this.c2.registerGameMessageHandler('token-sync', (data)=>{
			this.log('tokensync', data)
			this.companionTokens = data
		})

		this.c2.registerGameMessageHandler('heartbeat', (data, messageType)=>{
			if(data === 'first'){
				//script has just reloaded
				this.info('Game script has restarted, force reloading all webclients ...')
				c2.c2WebInterface.c2WebSocketHandler.forceReloadAll()
			}

			this.c2.sendMessageToWebClient('all', messageType, data)
		})

		this.c2.registerGameMessageHandler('stream-log', (data, messageType)=>{
			for(let client of this.c2.c2WebInterface.c2WebSocketHandler.clients){
				if(this.tokenIsOwner(client.token)){
					this.c2.sendMessageToWebClient(client, messageType, data)
				}
			}
		})

		this.c2.registerGameMessageHandler('*', (data, messageType)=>{
			if(messageType.startsWith('sync-')){
				return new Promise((fulfill, reject)=>{
					let syncname = messageType.substring('sync-'.length)
					this.info('(%)', 'syncing', syncname)
					this.log(data)
					this.c2.sendMessageToWebClient('all', messageType, data).then((res)=>{
						this.log('sync', syncname, 'success:', res)
						fulfill()
					}).catch((err)=>{
						this.log('sync', syncname, 'unsuccessful:', err)
						reject(err)
					})

					if(messageType === 'sync-roles'){
						this.roles = data
					}
				})
			} else {
				this.error('unsupported type by game', messageType)
				return new Promise((fulfill, reject)=>{
					reject('unsupported type: ' + messageType)
				})
			}
		})
	}

	tokenIsOwner(token){
		if(!token){
			return false
		}

		for(let steamId of Object.keys(this.companionTokens)){
			if(this.companionTokens[steamId] === token){
				if(this.roles['Owner'] && this.roles['Owner'].members[steamId] === true){
					return true
				}
			}
		}

		return false
	}
}
