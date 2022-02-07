const axios = require('axios')
const fs = require('fs')
const path = require('path')

const C2LoggingUtility = require('./utility.js').C2LoggingUtility

module.exports = class C2Module_Core extends C2LoggingUtility {
	
	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.companionTokens = {}
		this.roles = {}

		this.SCRIPT_VERSION = undefined

		this.notificationsForSteamId = {}

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
				if(this.tokenHasRole(client.token, 'Owner')){
					return resolve(this.PERMISSIONS.Owner)
				} else {
					return resolve(this.PERMISSIONS.Default)
				}
			})
		})

		this.c2.registerWebClientMessageHandler('check-notifications', (client, steamId)=>{

			if(this.companionTokens[steamId] !== client.token){
				return new Promise((resolve, reject)=>{
					reject('steamId and token mismatch')
				})
			}

			return this.getNotificationsFor(steamId)
		})

		this.c2.registerGameMessageHandler('check-notifications', (steamId)=>{
			return this.getNotificationsFor(steamId)
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
				if(this.tokenHasRole(client.token, 'Owner')){
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
					} else if(messageType === 'sync-SCRIPT_VERSION'){
						this.SCRIPT_VERSION = data
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

	tokenHasRole(token, roleName){
		if(!token){
			return false
		}

		for(let steamId of Object.keys(this.companionTokens)){
			if(this.companionTokens[steamId] === token){
				return this.steamIdHasRole(steamId, roleName)
			}
		}

		return false
	}

	steamIdHasRole(steamId, roleName){
		if(!steamId){
			return false
		}

		if(this.roles[roleName] && this.roles[roleName].members[steamId] === true){
			return true
		}

		return false
	}

	addNotificationFor(steamId, title, text){
		if(!this.notificationsForSteamId[steamId]){
			this.notificationsForSteamId[steamId] = []
		}

		this.notificationsForSteamId[steamId].push({
			title: title,
			text: text
		})
	}

	getNotificationsFor(steamId){
		return new Promise( (resolve, reject)=>{

			//TODO: a bit hacky to generate notification in here, but does the trick

			if(this.steamIdHasRole(steamId, 'Owner') || this.steamIdHasRole(steamId, 'Supervisor')){

				this.getLatestCompanionVersion().then(latestCompanionVersion => {
					let currentCompanionVersion = this.getCurrentCompanionVersion()
					if(latestCompanionVersion !== undefined && currentCompanionVersion !== undefined && latestCompanionVersion !== currentCompanionVersion){
						this.addNotificationFor(steamId, 'Update available', 'New Carsa\'s Companion version available: ' + latestCompanionVersion)
					}

					this.getLatestScriptVersion().then(latestScriptVersion => {
						let currentScriptVersion = this.getCurrentScriptVersion()
						if(latestScriptVersion !== undefined && currentScriptVersion !== undefined && latestScriptVersion !== currentScriptVersion){
							this.addNotificationFor(steamId, 'Update available', 'New Carsa\'s Commands version available: ' + latestScriptVersion)
						}

						this.warn('currentCompanionVersion', currentCompanionVersion, 'latestCompanionVersion', latestCompanionVersion)
						this.warn('currentScriptVersion', currentScriptVersion, 'latestScriptVersion', latestScriptVersion)

						resolve(this.popNotifications(steamId))
					})
				})
			} else {
				resolve(this.popNotifications(steamId))
			}
		})
	}

	popNotifications(steamId){
		if(this.notificationsForSteamId[steamId]){
			let myNotifications = this.notificationsForSteamId[steamId]
			this.notificationsForSteamId[steamId] = undefined
			return myNotifications
		}
	}

	/* returns undefined on error */
	getLatestCompanionVersion(){
		return new Promise((resolve, reject)=>{
			axios.get('https://raw.githubusercontent.com/carsakiller/Carsas-Companion/master/public_static/version.txt?token=GHSAT0AAAAAABOFVQHQYRL2RCSUKWVJSGYUYQBIZSQ',
					{ headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0'}}).then(res => {
				let remoteVersionCompanion = '' + res.data

				resolve(remoteVersionCompanion)
			}).catch(err=>{
				this.error('unable to check for companion updates', err)
				resolve()
			})
		})
	}

	/* returns undefined on error */
	getLatestScriptVersion(){
		return new Promise((resolve, reject)=>{
			axios.get('https://raw.githubusercontent.com/carsakiller/Carsas-CommandsV2/main/src/script.lua?token=GHSAT0AAAAAABOFVQHQGVQELRQ3XNKEIUFEYQBIZRQ',
					{ headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0'}}).then(res => {
				let script = '' + res.data
				let matches = script.match(/local[\s]*ScriptVersion[\s]*=[\s]*"([^"]*)"/)

				if(!matches || !matches[1]){
					throw new Error('unable to read scriptVersion from github file')
				}

				let remoteVersionScript = matches[1]
				this.info('latest script version', remoteVersionScript)

				resolve(remoteVersionScript)
			}).catch(err=>{
				this.error('unable to check for script updates', err)
				resolve()
			})
		})
	}

	/* returns undefined on error */
	getCurrentCompanionVersion(){
		return fs.readFileSync(path.join(__dirname, '../public_static/version.txt'), {encoding: 'utf-8'})
	}

	/* returns undefined on error */
	getCurrentScriptVersion(){
		return this.SCRIPT_VERSION
	}

}
