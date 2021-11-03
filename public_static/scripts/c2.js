class C2 extends C2LoggingUtility {

	constructor(el){
		super()

		this.register = new C2Register(2)

		this.register.createNewRegister('VueComponent')

		this.register.createNewRegister('Page')

		this.register.createNewRegister('MessageHandler')

		this.register.createNewRegister('Storable')

		$(window).on('load', ()=>{
			this.setup(el)
		})
	}

	setup(el){
		console.log('[C2] setup', el)

		let storeConfig = {
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
						members: [
							'x64'
						]
					},
					Admin: {
						commands: {
							unban: true
						},
						admin: true,
						auth: true,
						members: [
							'x32'
						]
					},
					Friends: {
						commands: {
							ban: true
						},
						admin: false,
						auth: true,
						members: [
							'x32',
							'x99'
						]
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
				}
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
				}
			}
		}

		for(let storableName of this.register.getRegister('Storable')){
			if(!storeConfig.state){
				storeConfig.state = {}
			}

			if(storeConfig.state[storableName]){
				this.warn('storable is overwriting existing store state', storableName)
			}

			storeConfig.state[storableName] = undefined

			if(!storeConfig.mutations){
				storeConfig.mutations = {}
			}

			storeConfig.mutations['set_' + storableName] = function (state, data){
				state[storableName] = data
			}

			if(!storeConfig.actions){
				storeConfig.actions = {}
			}

			storeConfig.actions['set_' + storableName] = function ({ commit }, data){
				commit('set_' + storableName, data)
			}

			if(!storeConfig.getters){
				storeConfig.getters = {}
			}

			storeConfig.getters[storableName] = function (state){
				return state[storableName]
			}
		}

		this.store = Vuex.createStore(storeConfig)

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
				console.error('Error checking version', err)
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
					<page v-for="(page, index) of pages" :title="page.name" :icon="page.icon" :keep-alife="false">
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
			mixins: [loggingMixin]
		})

		this.app.use(this.store)

		for(let entry of this.register.getRegister('VueComponent')){
			this.registerComponent(entry.name, entry.options)
		}

		for(let entry of this.register.getRegister('Page')){
			this.registerPage(entry)
		}

		this.app.config.errorHandler = (...args)=>{this.handleVueError.apply(this, args)}
		this.app.config.warnHandler = (...args)=>{this.handleVueWarning.apply(this, args)}

		this.vm = this.app.mount(el)

		this.webclient = new C2WebClient(this)

		this.webclient.on('connected', ()=>{
			this.setStatusSuccess('Server Connected')
		})

		this.webclient.on('disconnected', ()=>{
			this.setStatusError('Server Connection Lost')
		})

		this.messageHandlers = {}
		this.webclient.on('message', (...args)=>{return this.handleMessage.apply(this, args)})

		this.registerMessageHandler('heartbeat', (data)=>{
			//TODO: maybe lock the UI? or at least parts of the UI that interact with the game
		})

		this.registerMessageHandler('game-connection', (data)=>{
			if(data === true){
				this.setStatusSuccess('Game connected', 3000)
			} else {
				this.setStatusError('Game disconnected')
			}
		})

		this.registerMessageHandler('rtt-response', (data)=>{
			let rtt = new Date().getTime() - data
			this.log('RoundTripTime:', rtt, 'ms')
			return rtt + 'ms'
		})

		this.registerMessageHandler('test-timeout', (data)=>{
			return new Promise(()=>{
				//ignore so it runs into a timeout
			})
		})

		this.registerMessageHandler('sync-players', (data)=>{
			return new Promise((fulfill, reject)=>{
				this.c2.store.dispatch('setPlayers', data)
				fulfill()
			})
		})

		for(let entry of this.register.getRegister('MessageHandler')){
			this.registerMessageHandler(entry.messageType, entry.callback)
		}

		setTimeout(()=>{
			$.get('/static/commit.txt', (data)=>{
				this.store.dispatch('setC2Commit', data)
			})
		}, 1000)
	}

	//TODO: rework this to work without vue, because if vue fucks up, we still want to have an error message!
	setError(title, message){
		this.store.dispatch('setError', {
			title: title,
			message: message
		})
	}

	setStatus(message, clazz, /* optional */hideAfterTime){
		this.log('setStatus', message)
		this.store.dispatch('setStatus', {
			message: message,
			clazz: clazz
		})

		if(hideAfterTime){
			setTimeout(()=>{
				this.setStatus(undefined, undefined)
			}, hideAfterTime)
		}
	}

	setStatusSuccess(message, /* optional */hideAfterTime){
		this.setStatus(message, 'success', hideAfterTime)
	}

	setStatusWarn(message, /* optional */hideAfterTime){
		this.setStatus(message, 'warn', hideAfterTime)
	}

	setStatusError(message, /* optional */hideAfterTime){
		this.setStatus(message, 'error', hideAfterTime)
	}

	clearStatus(){
		this.setStatus(undefined, undefined)
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
		console.error('[C2]', err, vm, info)
		this.showError('' + err + '\n\n' + info)
	}

	handleVueWarning(msg, vm, trace){
		console.warn('[C2]', msg, vm, trace)
		this.showError('' + msg + '\n\n' + trace)
	}

	showError(msg){
		this.setError('An Error has occured (Please contact an admin)', msg)
	}

	registerComponent (name, options){
		if(!name){
			this.error('name is undefined')
			return
		}

		if(!options){
			this.error('options is undefined (name: ', name, ')')
			return
		}

		// set name if not happened (for logging)
		if(!options.name){
			options.name = name
		}

		// add base mixins
		options.mixins = [loggingMixin].concat(options.mixins || [])

		this.app.component(name, options)
	}

	registerPage(page){
		if(!page){
			this.error('page is undefined')
			return
		}
		this.store.dispatch('addPage', page)
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
					console.info('ignoring outdated localStorage.c2')
				}
			} catch (ex){
				console.warn('failed to parse saved localStorage.c2', ex)
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


/*
	you can register things and later fetch them
*/
class C2Register extends C2LoggingUtility {
	constructor(loglevel){
		super(loglevel)

		this.registers = {}
	}

	createNewRegister(registerName){
		if(typeof registerName !== 'string'){
			throw new Error('missing registerName')
		}

		this.info('createNewRegister', registerName)

		this.registers[registerName] = []
	}

	getRegister(registerName){
		if(typeof registerName !== 'string'){
			throw new Error('missing registerName')
		}

		return this.registers[registerName]
	}

	register(registerName, data){
		if(typeof registerName !== 'string'){
			throw new Error('missing registerName')
		}

		if(data === undefined){
			throw new Error('data is undefined')
		}

		if(!this.registers[registerName]){
			this.error('register is not defined:', registerName)
			return
		}

		this.info('register', registerName)
		this.log(data)

		this.registers[registerName].push(data)
	}
}
