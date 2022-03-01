const axios = require('axios')
const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')

const C2LoggingUtility = require('./C2_Utility.js').C2LoggingUtility

module.exports = class C2Module_Core extends C2LoggingUtility {
	
	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.SETTINGS_FILE_PATH = path.join(__dirname, '..', 'settings.json')

		this.settingsCache = undefined

		this.DEFAULT_SETTINGS = {
			'allow-external-access': {
				type: 'boolean',
				value: false,
				description: 'Allow anyone from the internet access the companion website (if not enabled, only the device you are running the companion on and devices in the same network)'
			},
			'allow-live-map': {
				type: 'boolean',
				value: false,
				description: 'Shows page with live map of players and vehicles for everyone'
			},
			'enable-test-mode': {
				type: 'boolean',
				value: false,
				description: 'Shows page used for testing and debugging the companion and the connection to the game script'
			},
			'gameserver-executable-path': {
				type: 'string',
				value: '',
				description: 'Set the path to the executable of the dedicated stormworks server (required if you want to use the gameserver management)'
			}
		}

		this.companionTokens = {}
		this.roles = {}

		this.SCRIPT_VERSION = undefined

		this.notificationsForSteamId = {}

		//permissions must be inflated (which replaces the functions with actually values) before being used
		this.PERMISSIONS = {
			Default:  {
				'page-home': true,
				'page-players': true,
				'page-vehicles': true,
				'page-roles': true,
				'page-rules': true,
				'page-preferences': true,
				'page-gamesettings': true,
				'page-live-map': ()=>{return this.getCurrentServerSetting('allow-live-map') === true}
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
				'page-tests': ()=>{return this.getCurrentServerSetting('enable-test-mode') === true},
				'page-settings': true
			}
		}

		this.steamProfileCache = {}

		this.companionLoginAttemptsFromIP = {}

		this.c2.registerWebClientMessageHandler('*', (client, data, messageType)=>{
			if(messageType.startsWith('command-')){
				return new Promise((resolve, reject)=>{
					let commandname = messageType.substring('command-'.length)
					this.log('(?)', 'executing command:', commandname, data)
					this.c2.sendMessageToGame(client.token, messageType, data).then((res)=>{
						this.log('command', commandname, 'success:', res)
						resolve(res)
					}).catch((err)=>{
						this.log('command', commandname, 'unsuccessful:', err)
						reject(err)
					})
				})
			} else {
				this.error('unsupported type by client', messageType)
				return new Promise((resolve, reject)=>{
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
				if(this.clientIsOwner(client)){
					return resolve(this.inflatePermissions(this.PERMISSIONS.Owner))
				} else {
					return resolve(this.inflatePermissions(this.PERMISSIONS.Default))
				}
			})
		})

		this.c2.registerWebClientMessageHandler('server-settings', (client)=>{
			if(this.clientIsOwner(client)){
				return this.getServerSettings()
			} else {
				return {}
			}
		})

		this.c2.registerWebClientMessageHandler('set-server-setting', (client, data)=>{
			if(this.clientIsOwner(client)){
				try {
					let parsed = JSON.parse(data)
					return this.setServerSetting(parsed.key, parsed.value)
				} catch (ex) {
					return new Promise((resolve, reject)=>{
						reject('invalid JSON for set-server-setting, please contact a dev')
					})
				}
			} else {
				return new Promise((resolve, reject)=>{
					reject('you are not allowed to do that')
				})
			}
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
			} else {
				if(data && typeof data.queueLength === 'number' && data.queueLength > 500){
					this.warn('game script queueLength is filling up (please contact a dev):', data.queueLength)
				}
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
				return new Promise((resolve, reject)=>{
					let syncname = messageType.substring('sync-'.length)
					this.info('(%)', 'syncing', syncname)
					this.log(data)
					this.c2.sendMessageToWebClient('all', messageType, data).then((res)=>{
						this.log('sync', syncname, 'success:', res)
						resolve()
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
				return new Promise((resolve, reject)=>{
					reject('unsupported type: ' + messageType)
				})
			}
		})


		this.getServerSettings().then(settingsObject => this.setServerSettingsTo(settingsObject))
	}

	inflatePermissions(permissions){
		let ret = {}

		for(let key of Object.keys(permissions)){
			if(typeof permissions[key] === 'function'){
				ret[key] = permissions[key]()
			} else {
				ret[key] = permissions[key]
			}
		}

		return ret
	}

	clientIsOwner(client){
		return this.tokenHasRole(client.token, 'Owner') || client.ip === 'localhost' || client.ip === '127.0.0.1' || client.ip === '::1' || client.ip === '::ffff:127.0.0.1'
	}

	tokenHasRole(token, roleName){
		if(!token){
			return false
		}

		if(roleName === undefined){
			throw new Error('roleName is undefined')
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

		if(roleName === undefined){
			throw new Error('roleName is undefined')
		}

		if(this.roles[roleName] && this.roles[roleName].members[steamId] === true){
			return true
		}

		return false
	}

	getServerSettings(){
		return new Promise((resolve, reject)=>{
			fsPromises.readFile(this.SETTINGS_FILE_PATH).then(content=>{
				try {
					let parsed = JSON.parse(content)

					// cleanup
					for(let key of Object.keys(parsed)){
						if(!this.DEFAULT_SETTINGS[key]){
							delete parsed[key]
						}
					}

					// add missing
					for(let key of Object.keys(this.DEFAULT_SETTINGS)){
						if(!parsed[key]){
							parsed[key] = JSON.parse(JSON.stringify(this.DEFAULT_SETTINGS[key]))
						}
					}

					this.settingsCache = JSON.parse(JSON.stringify(parsed))

					this.log('Current Settings: ', parsed)
					resolve(parsed)
				} catch (err){
					this.warn('unable to read server settings, using default settings', err)
					this.resetServerSettings().then(settingsObject => {

						this.settingsCache = JSON.parse(JSON.stringify(settingsObject))

						resolve(settingsObject)
					}).catch(err => reject(err))
				}
			}).catch(err => {
				this.warn('unable to read server settings file, using default settings', err)
				resolve(this.DEFAULT_SETTINGS)
			})
		})
	}

	setServerSetting(key, value){
		return new Promise((resolve, reject)=>{
			if(!this.DEFAULT_SETTINGS[key]){
				return reject('invalid settings key: ' + key)
			}

			this.getServerSettings().then(settingsObject => {
				this.info(`set server setting [${key}] to '${value}'`)

				settingsObject[key].value = value

				this.setServerSettingsTo(settingsObject).then(settingsObject => resolve(settingsObject)).catch(err => reject(err))
			}).catch(err => reject(err))
		})
	}

	setServerSettingsTo(settingsObject){
		return new Promise((resolve, reject)=>{
			fsPromises.writeFile(this.SETTINGS_FILE_PATH, JSON.stringify(settingsObject, null, 2)).then(_=>{
				this.settingsCache = JSON.parse(JSON.stringify(settingsObject))
				resolve( JSON.parse(JSON.stringify(settingsObject)) )
			}).catch(err => reject(err))
		})
	}

	resetServerSettings(){
		return this.setServerSettingsTo(this.DEFAULT_SETTINGS)
	}

	getCurrentServerSetting(key){
		if(! this.DEFAULT_SETTINGS[key]){
			throw new Error('invalid settings key: ' + key)
		}
		return this.settingsCache ? this.settingsCache[key].value : undefined
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

			// a bit hacky to generate notification in here, but does the trick

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
			return resolve()//TODO remove on production


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
			return resolve()//TODO remove on production

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
