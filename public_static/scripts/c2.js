class C2 extends C2EventManagerAndLoggingUtility {

	constructor(el){
		super(4)

		this.loglevel = 4

		this.c2Utility = new C2Utility(this.loglevel, this)
		this.c2Module_Core = new C2Module_Core(this.loglevel, this)
		this.c2Module_Map = new C2Module_Map(this.loglevel, this)
		this.c2Module_Gameserver = new C2Module_Gameserver(this.loglevel, this)
		this.c2Module_Test = new C2Module_Test(this.loglevel, this)

		$(window).on('load', ()=>{
			this.setup(el)
		})
	}

	setup(el){
		this.log('[C2] setup', el)

		this.storeConfig = {
			state: {
				localStorage: {},

				pages: [],

				status: {
					message: undefined,
					clazz:undefined
				},

				error: {
					title: undefined,
					message: undefined
				},

				players: {
					'x32' /* steam_id */ : {
						name: 'Pony',
						roles: {
							Admin: true
						},
						peer_id: 1
					},
					'x64': {
						name: 'Carsa',
						roles: {
							Owner: true
						}
					},
					'x99': {
						name: 'aBannedUser',
						roles: {
							Owner: true
						}
					}
				},

				vehicles: {
					1 /* vehicle_id */: {
						owner: 'x32',//steam_id
						name: 'Bus',
						ui_id: 'ui_id'
					}
				},

				roles: {
					Owner: {
						commands: {
							ban: true,
							unban: true
						},
						admin: true,
						auth: true,
						members: {
							'x64': true
						}
					},
					Admin: {
						commands: {
							unban: true
						},
						admin: true,
						auth: true,
						members: {
							'x32': true
						}
					},
					Friends: {
						commands: {
							ban: true
						},
						admin: false,
						auth: true,
						members: {
							'x32': true,
							'x99': true
						}
					}
				},

				rules: [
					'dont be a dick',
					'help out'
				],

				preferences: {
					cheats: {
						value: false,
						type: 'bool'
					},
					maxMass : {
						value: 1000,
						type: 'number'
					},
					welcomeNew : {
						value: 'Welcome to this Stormworks server!',
						type: 'string'
					},
					startEquipment : {
						value: [
							{id: 15, slot: 'B', data1: 1},
							{id: 6, slot: 'C'},
							{id: 11, slot: 'E', data1: 3},
						],
						type: 'table'
					}
				},

				gamesettings: {
					npc_damage: true, /* right now only supports booleans but will have numbers in the future */
					auto_save: false,
					test_number: 5
				},

				bannedplayers: {
					"x99": "x64"
				},

				logs: [
					{
						time: new Date().getTime(),
						message: 'server started'
					},{
						time: new Date().getTime(),
						message: 'fondling ponies'
					},{
						time: new Date().getTime(),
						message: 'loading lasers'
					}
				],

				allCommands: {
					ban: {

					},
					unban : {

					},
					orderFood: {

					}
				},

				liveVehicles: {
					1 /* vehicle_id */: {
						owner: 'x32',//steam_id
						name: 'Bus',
						ui_id: 'ui_id',
						x: 300,
						y: 30,
						z: 100
					}
				},

				livePlayers: {
					'x32' /* steam_id */ : {
						name: 'Pony',
						roles: {
							Admin: true
						},
						peer_id: 1,
						x: 400,
						y: 100,
						z: 100
					},
					'x99': {
						name: 'aBannedUser',
						roles: {
							Owner: true
						}
					}
				},
			},
			mutations: {
				setPlayers (state, players){
					state.players = players
				},
				test (state){
					state.roles.Owner.auth = false
				},
				setStatus(state, status){
					state.status = status
				},
				setError(state, error){
					state.error = error
				},
				setC2Version(state, version){
					state.C2_VERSION = version
				},
				setC2Commit(state, _commit){
					state.C2_COMMIT = _commit
				},
				addPage (state, page){
					state.pages.push(page)
				},
				setLocalStorage (state, _localStorage){
					state.localStorage = _localStorage
				},
				setToken (state, token){
					state.localStorage = token
				}
			},
			actions: {
				setPlayers ({commit}, players){
					commit('setPlayers', players)
				},
				test ({commit}){
					commit('test')
				},
				setStatus({commit}, status){
					commit('setStatus', status)
				},
				setError({commit}, error){
					commit('setError', error)
				},
				setC2Version({commit}, version){
					commit('setC2Version', version)
				},
				setC2Commit({commit}, _commit){
					commit('setC2Commit', _commit)
				},
				addPage ({commit}, page){
					commit('addPage', page)
				},
				setLocalStorage ({commit}, _localStorage){
					commit('setLocalStorage', _localStorage)
				},
				setToken ({commit}, token){
					commit('setToken', token)
				}
			},

			getters: {//TODO do this for EVERY state.xyz and make replace every components use of `this.$store.state.xyz` with `this.$store.getters.xyz`
				C2_VERSION: state =>{
					return state.C2_VERSION
				},
				C2_COMMIT: state =>{
					return state.C2_COMMIT
				},
				pages: state => {
					return state.pages
				},
				players: state => {
					return state.players
				},

				livePlayers: state => {
					return state.livePlayers
				},
				liveVehicles: state => {
					return state.liveVehicles
				}
			}
		}

		this.dispatch('can-register-storable')

		this.store = Vuex.createStore(this.storeConfig)

		$.get({
			url: '/static/version.txt',
			accepts: 'text/plain',
			async: true,
			success: (data)=>{
				this.store.dispatch('setC2Version', data)

				this.loadLocalStorage()
				$(window).on('beforeunload', ()=>{
					this.saveLocalStorage()
				})
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
					return this.$store.getters.pages
				},
				initialPage: function (){
					let saved = parseInt(localStorage.getItem('lastPageIndex'))
					return isNaN(saved) ? 0 : saved
				}
			},
			template: `<div class="c2">
				<error-popup/>
				<pages :initial-index="initialPage" @page-change="onPageChange">
					<page v-for="(page, index) of pages" :title="page.name" :icon="page.icon">
						<component :is="page.componentName"/>
					</page>
					<status-bar/>
				</pages>
			</div>`,
			methods: {
				onPageChange (index){
					this.debug('onPageChange', index)
					localStorage.setItem('lastPageIndex', index)
				}
			},
			mixins: [componentMixin_logging]
		})

		this.app.use(this.store)

		this.dispatch('can-register-component')

		this.dispatch('can-register-page')

		this.app.config.errorHandler = (...args)=>{this.handleVueError.apply(this, args)}
		this.app.config.warnHandler = (...args)=>{this.handleVueWarning.apply(this, args)}

		this.vm = this.app.mount(el)

		this.webclient = new C2WebClient(this)

		this.webclient.on('message', (...args)=>{return this.handleMessage.apply(this, args)})

		this.messageHandlers = {}
		this.dispatch('can-register-messagehandler')

		setTimeout(()=>{
			$.get('/static/commit.txt', (data)=>{
				this.store.dispatch('setC2Commit', data)
			})
		}, 1000)

		setTimeout(()=>{
			this.dispatch('setup-done')
		}, 1)
	}

	//TODO: rework this to work without vue, because if vue fucks up, we still want to have an error message!
	setError(title, message){
		this.store.dispatch('setError', {
			title: title,
			message: message
		})
	}

	handleMessage(message){

		if(message.type === 'heartbeat'){
			this.log('received message', message)
		} else {
			this.info('received message', message)
		}

		if(this.messageHandlers[message.type]){
			try {
				let promiseOrResult = this.messageHandlers[message.type](message.data)

				if(promiseOrResult instanceof Promise){
					return promiseOrResult
				} else {
					return new Promise((fulfill, reject)=>{
						fulfill(promiseOrResult)
					})
				}
			} catch (ex){
				this.error(ex)
				return new Promise((fulfill, reject)=>{
					reject('Error check client logs')
				})
			}
		} else {
			return new Promise((fulfill, reject)=>{
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

	showError(msg){
		this.setError('An Error has occured (Please contact an admin)', msg)
	}

	registerStorable(storableName){
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

		this.storeConfig.state[storableName] = undefined

		if(!this.storeConfig.mutations){
			this.storeConfig.mutations = {}
		}

		this.storeConfig.mutations['set_' + storableName] = function (state, data){
			state[storableName] = data
		}

		if(!this.storeConfig.actions){
			this.storeConfig.actions = {}
		}

		this.storeConfig.actions['set_' + storableName] = function ({ commit }, data){
			commit('set_' + storableName, data)
		}

		if(!this.storeConfig.getters){
			this.storeConfig.getters = {}
		}

		this.storeConfig.getters[storableName] = function (state){
			return state[storableName]
		}
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

	registerPage(name, icon, componentName){
		if(typeof name !== 'string'){
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

		this.store.dispatch('addPage', {
			name: name,
			icon: icon,
			componentName: componentName
		})
	}

	/*
		@callback callback(messageData)
		can return a promise
		if it does not, we assume it has executed successful and we will fulfill() with whatever callback() returned
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

	loadLocalStorage(){
		let value = {
			version: this.store.C2_VERSION
		}

		let saved = localStorage.getItem('c2')
		if(saved){
			try {
				let parsed = JSON.parse(saved)
				if(parsed.version === this.store.C2_VERSION){
					value = parsed
				} else {
					this.info('ignoring outdated localStorage.c2')
				}
			} catch (ex){
				this.warn('failed to parse saved localStorage.c2', ex)
			}
		}

		this.store.dispatch('setLocalStorage', value)
	}

	saveLocalStorage(){
		localStorage.setItem('c2', JSON.stringify(this.store.state.localStorage))
	}
}

C2.uuid = function (){
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}
