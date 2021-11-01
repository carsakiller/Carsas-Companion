class C2 {

	constructor(el){
		for(let script of ['c2_webclient.js', 'c2_websock.js', 'c2_utility_components.js', 'c2_module_core_components.js', 'c2_module_test_components.js']){
			let s = $('<script>').attr('type', 'text/javascript').attr('src', '/static/scripts/' + script)
			$('body').append(s)
		}

		$(window).on('load', ()=>{
			this.setup(el)
		})
	}

	setup(el){
		console.log('[C2] setup', el)

		this.store = Vuex.createStore({
			state: {
				status: {
					message: undefined,
					clazz:undefined
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
				setC2Version(state, version){
					state.C2_VERSION = version
				},
				setC2Commit(state, _commit){
					state.C2_COMMIT = _commit
				}
				/*,
				addTab (state, tab){
					state.tabs.push(tab)
				}*/
			},
			actions: {
				setPlayers ({ commit }, players){
					commit('setPlayers', players)
				},
				test ({commit}){
					commit('test')
				},
				setStatus({commit}, status){
					commit('setStatus', status)
				},
				setC2Version({commit}, version){
					commit('setC2Version', version)
				},
				setC2Commit({commit}, _commit){
					commit('setC2Commit', _commit)
				}
				/*,
				switchTab ({commit}, tab){
					commit('switchTab', tab)
				},
				addTab ({ commit }, tab){
					commit('addTab', tab)
				}*/
			},

			getters: {//TODO do this for EVERY state.xyz and make replace every components use of `this.$store.state.xyz` with `this.$store.getters.xyz`
				C2_VERSION: state =>{
					return state.C2_VERSION
				},
				C2_COMMIT: state =>{
					return state.C2_COMMIT
				},
				players: state => {
					return state.players
				}
			}
		})

		this.app = Vue.createApp({
			template: `<div class="c2">
				<status-bar></status-bar>
				<pages :initial-index="0">
					<page :title="'Home'" :icon="'home'">
						<info></info>
					</page>
					<page :title="'Players'" :icon="'users'">
						<players-management></players-management>
					</page>
					<page :title="'Vehicles'" :icon="'car'">
						<vehicles-management></vehicles-management>
					</page>
					<page :title="'Roles'" :icon="'crown'">
						<roles-management></roles-management>
					</page>
					<page :title="'Rules'" :icon="'task-o'">
						<rules-management></rules-management>
					</page>
					<page :title="'Preferences'" :icon="'control-panel'">
						<preferences-management></preferences-management>
					</page>
					<page :title="'Game Settings'" :icon="'wrench'">
						<gamesettings-management></gamesettings-management>
					</page>
					<page :title="'Logs'" :icon="'note-o'">
						<logs-management></logs-management>
					</page>
				</pages>
			</div>`
		})

		this.app.use(this.store)

		for(let name of Object.keys(C2.registeredComponents)){
			this.registerComponent(name, C2.registeredComponents[name])
		}

		this.vm = this.app.mount(el)

		this.webclient = new C2WebClient(this)

		setTimeout(()=>{
			$.get('/static/version.txt', (data)=>{
				this.store.dispatch('setC2Version', data)
			})

			$.get('/static/commit.txt', (data)=>{
				this.store.dispatch('setC2Commit', data)
			})
		}, 1000)
	}

	registerComponent (name, options){
		// set name if not happened (for logging)
		if(!options.name){
			options.name = name
		}

		// add base mixins
		options.mixins = [loggingMixin].concat(options.mixins || [])

		this.app.component(name, options)
	}

	/* TODO
	function registerTab(id, name, iconClass){
		store.dispatch('addTab', {
			id: id,
			name: name,
			iconClass: iconClass
		})
	}*/
}

C2.registeredComponents = {}

C2.registerVueComponent = function (name, options){
	C2.registeredComponents[name] = options
}

C2.uuid = function (){
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}