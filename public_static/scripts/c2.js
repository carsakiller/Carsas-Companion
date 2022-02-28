class C2 extends C2EventManagerAndLoggingUtility {

	constructor(el){
		super(5)

		this.c2Utility = new C2Utility(this.loglevel, this)
		this.c2Module_Core = new C2Module_Core(this.loglevel, this)
		this.c2Module_Map = new C2Module_Map(this.loglevel, this)
		this.c2Module_Gameserver = new C2Module_Gameserver(this.loglevel, this)
		this.c2Module_Test = new C2Module_Test(this.loglevel, this)

		$(window).on('load', ()=>{
			this.setup(el)
		})
	}

	updateUserPermissions(){
		this.log('updating user permissions ...')

		this.webclient.sendMessage('user-permissions').then((permissions)=>{
			this.store.state.permissions = JSON.parse(permissions)
			this.info('updating user permissions to', this.store.state.permissions)
		}).catch(err=>{
			this.error('Error updating user permissions: ', err)
			this.showError('Error updating user permissions: ' + err)
			this.store.state.permissions = undefined
		})
	}

	updateSettings(){
		this.log('updating server settings ...')

		this.webclient.sendMessage('server-settings').then((settings)=>{
			this.store.state.settings = JSON.parse(settings)
			this.info('updating server settings to', this.store.state.settings)
		}).catch(err=>{
			this.error('Error updating server settings: ', err)
			this.showError('Error updating server settings: ' + err)
			this.store.state.settings = undefined
		})
	}

	setup(el){
		this.log('setup', el)

		this.storeConfig = {
			state: {}
		}

		this.dispatch('can-register-storable')
		this.registerStorable('pages')
		this.registerStorable('COMPANION_VERSION')
		this.registerStorable('COMPANION_COMMIT')
		this.registerStorable('permissions')


		this.syncables = []
		this.dispatch('can-register-syncable')

		this.store = Vuex.createStore(this.storeConfig)
		this.store.watch(function (state){return state.userSteamId}, ()=>{
			this.updateUserPermissions()
			this.updateSettings()

			this.webclient.sendMessage('check-notifications', this.store.state.userSteamId).then(json => {
				let notifications = JSON.parse(json)

				if(notifications){
					for(let n of notifications){
						this.showNotification(n.title, n.text)
					}
				}
			}).catch(err=>this.error)
		})

		$.get({
			url: '/static/version.txt',
			accepts: 'text/plain',
			async: true,
			success: (data)=>{
				this.store.state.COMPANION_VERSION = data
			},
			error: (err)=>{
				this.error('Error checking version', err)
				this.showError('Unable to check version.\n\n' + err)
			},
			complete: ()=>{
				this.createApp(el)
			}
		})
	}

	createApp (el){
		this.app = Vue.createApp({
			computed: {
				pages: function (){
					return this.$store.state.pages
				}
			},
			template: `<div class="c2">
				<notifications/>
				<login-popup ref="loginPopup"/>
				<user-login @show-login="$refs.loginPopup.show()"/>
				<status-bar/>
				<pages :pages="pages"/>
			</div>`
		})

		this.app.use(this.store)

		this.dispatch('can-register-component')

		this.dispatch('can-register-page')

		this.app.config.errorHandler = (...args)=>{this.handleVueError.apply(this, args)}
		this.app.config.warnHandler = (...args)=>{this.handleVueWarning.apply(this, args)}

		this.vm = this.app.mount(el)

		this.webclient = new C2WebClient(this.loglevel, this)

		this.webclient.on('message', (...args)=>{return this.handleMessage.apply(this, args)})

		this.messageHandlers = {}

		for(let syncable of this.syncables){
			this.registerMessageHandler('sync-' + syncable, data => {
				this.log(`got ${syncable} sync`, data)
				this.store.state[syncable] = data

				this.dispatch('sync-arrived', syncable)
			})
		}

		this.dispatch('can-register-messagehandler')

		setTimeout(()=>{
			$.get('/static/commit.txt', (data)=>{
				this.store.state.COMPANION_COMMIT = data
			})
		}, 1000)


		setTimeout(()=>{
			this.dispatch('setup-done')
		}, 1)

		this.webclient.ws.on('open', ()=>{
			this.updateUserPermissions()
			this.updateSettings()
		})
	}

	handleMessage(message){

		if(message.type === 'heartbeat' || message.type === 'stream-map'){
			this.debug('received message', message)
			this.dispatch('heartbeat')
		} else {
			this.info('received message', message)
		}

		if(this.messageHandlers[message.type]){
			try {
				let promiseOrResult = this.messageHandlers[message.type](message.data)

				if(promiseOrResult instanceof Promise){
					return promiseOrResult
				} else {
					return new Promise((resolve, reject)=>{
						resolve(promiseOrResult)
					})
				}
			} catch (ex){
				this.error(ex)
				return new Promise((resolve, reject)=>{
					reject('Error check client logs')
				})
			}
		} else {
			return new Promise((resolve, reject)=>{
				reject('unsupported request type: ' + message.type)
			})
		}
	}

	handleVueError(err, vm, info){
		this.error('[C2]', err, vm, info)
		this.showError('' + err + '\n\n' + info)
	}

	handleVueWarning(msg, vm, trace){
		this.warn('[C2]', msg, vm, trace)
		this.showError('' + msg + '\n\n' + trace)
	}

	showError(msgOrError){
		let text
		if(msgOrError instanceof Error){
			text = msgOrError.message + '\n\n' + msgOrError.stack
		} else {
			text = msgOrError
		}
		let popup = $('#error-popup')
		popup.find('.title').text('An Error has occured (Please contact an admin):')
		popup.find('.message').val(text + '\n\n' + ConsoleLogger.getLatestLogAsString())
		popup.find('.message').scrollTop(0)
		popup.show()
	}

	showNotification(title, text, /* optional */ type){
		let id = C2.uuid()

		this.store.state.notifications[id] = {
			title: title,
			text: text,
			type: type,
			id: id
		}

		return id
	}

	hideNotification(id){
		if(id === undefined){
			return
		}

		delete this.store.state.notifications[id]
	}

	registerStorable(storableName, /* optional */ initialValue){
		if(typeof storableName !== 'string'){
			this.error('storableName must be a string', storableName)
			return
		}

		this.log('registerStorable', storableName)

		if(!this.storeConfig.state){
			this.storeConfig.state = {}
		}

		if(this.storeConfig.state[storableName]){
			this.warn('storable is overwriting existing store state', storableName)
		}

		this.storeConfig.state[storableName] = initialValue
	}

	// creates a storable and a message handler with "sync-[syncableName]"
	registerSyncable(syncableName){
		this.registerStorable(syncableName)
		this.syncables.push(syncableName)
	}

	registerComponent(name, options){
		if(typeof name !== 'string'){
			this.error('name must be a string', name)
			return
		}

		if(!options){
			this.error('options is undefined (name: ', name, ')')
			return
		}

		this.log('registerComponent', name)
		this.debug(options)

		// set name if not happened (for logging)
		if(!options.name){
			options.name = name
		}

		// add base mixins
		options.mixins = [componentMixin_logging].concat(options.mixins || [])

		this.app.component(name, options)
	}

	registerPage(name, title, icon, componentName){
		if(typeof name !== 'string'){
			this.error('name must be a string')
			return
		}

		if(typeof title !== 'string'){
			this.error('name must be a string')
			return
		}

		if(typeof icon !== 'string'){
			this.error('icon must be a string')
			return
		}

		if(typeof componentName !== 'string'){
			this.error('componentName must be a string')
			return
		}

		if(!this.store.state.pages){
			this.store.state.pages = []
		}

		this.log('registerPage', name)

		this.store.state.pages.push({
			name: name,
			title: title,
			icon: icon,
			componentName: componentName
		})
	}

	/*
		@callback callback(messageData)
		can return a promise
		if it does not, we assume it has executed successful and we will resolve() with whatever callback() returned
	*/
	registerMessageHandler(messageType, callback){
		if(this.messageHandlers[messageType]){
			this.error('Cannot overwrite existing message handler: ' + messageType)
			return
		}

		if(typeof callback !== 'function'){
			this.error('callback must be a function: ' + messageType)
			return
		}

		this.messageHandlers[messageType] = callback
	}
}

C2.uuid = function (){
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}
