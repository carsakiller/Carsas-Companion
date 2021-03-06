class C2Module_Core extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.on('can-register-storable', ()=>{
			this.c2.registerStorable('notifications', {})
			this.c2.registerStorable('status')
			this.c2.registerStorable('userSteamId')
			this.c2.registerStorable('userName')
			this.c2.registerStorable('profile')
			this.c2.registerStorable('logs', [])
			this.c2.registerStorable('chatMessages', [])
			this.c2.registerStorable('settings')
		})

		this.c2.on('can-register-syncable', ()=>{
			this.c2.registerSyncable('SCRIPT_VERSION')
			this.c2.registerSyncable('players')
			this.c2.registerSyncable('vehicles')
			this.c2.registerSyncable('rules')
			this.c2.registerSyncable('roles')
			this.c2.registerSyncable('gamesettings')
			this.c2.registerSyncable('preferences')
			this.c2.registerSyncable('commands')
		})


		this.c2.on('can-register-component', ()=>{

			/*

				GLOBAL

			*/

			this.c2.registerComponent('notifications', {
				computed: {
					notifications (){
						return this.$store.state.notifications
					}
				},
				template: `<div class="notifications">
					<notification v-for="(notification, id) in notifications" :notification="notification"/>
				</div>`
			})

			this.c2.registerComponent('notification', {
				props: {
					notification: {
						type: Object,
						required: true
					}
				},
				template: `<div class="notification" :type="notification.type">
					<icon :icon="'x-mark'" @click="closeNotification" class="close"/>
					<span class="title">{{notification.title}}</span>
					<p class="text">{{notification.text}}</p>
				</div>`,
				methods: {
					closeNotification (){
						delete this.$store.state.notifications[this.notification.id]
					}
				}
			})

			this.c2.registerComponent('status-bar', {
				template: `<div class="status_bar">
					<status-bar-entry :name="'server'" :label="'Webserver'"/>
					<status-bar-entry :name="'game'" :label="'Game'" :flash-on-heartbeat="true"/>
				</div>`
			})

			this.c2.registerComponent('status-bar-entry', {
				data: function (){
					return {
						updating: false
					}
				},
				props: {
					name: {
						type: String,
						required: true
					},
					label: {
						type: String,
						required: true
					},
					'flash-on-heartbeat': {
						type: Boolean
					}
				},
				computed: {
					state (){
						return this.$store.state.status && this.$store.state.status[this.name] === true
					}
				},
				template: `<div class="status_bar_entry" :class="[state ? 'state_on' : 'state_off', updating ? 'state_update' : '']">
					<span class="name">{{label}}</span><span class="circle"/>
				</div>`,
				created (){
					c2.on('heartbeat', ()=>{
						if(!this.flashOnHeartbeat){
							return
						}

						this.updating = true
						setTimeout(()=>{
							this.updating = false
						}, 500)
					})
				}
			})

			this.c2.registerComponent('user-login', {
				data (){
					return {
						syncables: []
					}
				},
				computed: {
					steamId (){
						return this.$store.state.userSteamId
					},
					isLoggedIn (){
						return this.steamId !== undefined
					},
					profile (){
						return this.$store.state.profile
					},
					profileImageStyle (){
						return 'background-image: url("' + ( this.profile && this.profile.profileImageUrl ? this.profile.profileImageUrl : 'static/images/profile_image_placeholder.png') + '")'
					}
				},
				emits: ['show-login'],
				template: `<div class="user_login" @click="showLoginPopup">
					<span v-if="!isLoggedIn">Log In</span>
					<div v-else class="user_container" title="Logout">
						<div class="profile_image" :style="profileImageStyle"></div>
					</div>
				</div>`,
				methods: {
					showLoginPopup (){
						this.$emit('show-login')
					},
					setProfile (profile){
						this.$store.state.profile = profile
					}
				},
				watch: {
					steamId (){
						if(this.steamId){
							this.sendServerMessage('steam-profile', this.steamId).then(res => {
								this.setProfile(JSON.parse(res))
								this.log('profile', this.profile)
							}).catch(err => {
								this.setProfile(undefined)
							})
						} else {
							this.setProfile(undefined)
						}
					}
				},
				mixins: [componentMixin_serverMessage]
			})

			this.c2.registerComponent('login-popup', {
				data (){
					return {
						isVisible: false,
						isCurrentlyLoggingIn: false,
						isCurrentlyLoggingOut: false,
						token: '',
						message: undefined,
						messageType: 'normal',
						syncables: []
					}
				},
				computed: {
					isLoggedIn (){
						return this.$store.state.userSteamId !== undefined
					},
					profile (){
						return this.$store.state.profile
					},
					profileImageStyle (){
						return 'background-image: url("' + ( this.profile && this.profile.profileImageUrl ? this.profile.profileImageUrl : 'static/images/profile_image_placeholder.png') + '")'
					},
					userName (){
						return this.$store.state.userName
					}
				},
				template: `<div class="login_popup" v-if="isVisible">
					<div class="inner">
						<icon :icon="'x-mark'" class="close" @click="hide"/>
						<span class="title">{{isLoggedIn ? 'You are logged in as' : 'Login'}}</span>

						<div v-if="isLoggedIn" class="profile_image" :style="profileImageStyle"></div>
						<span v-if="isLoggedIn" class="user_name">{{userName}}</span>
						<label v-else>Token: <input type="text" name="token" v-model="token" :disabled="isCurrentlyLoggingIn" @keydown="onKeyDown"/></label>

						<p v-if="message" :class="['message', 'type_' + messageType]">{{message}}</p>

						<button v-if="isLoggedIn" @click="logout" :disabled="isCurrentlyLoggingOut || !isLoggedIn">Logout</button>
						<button v-else="isLoggedIn" @click="login" :disabled="token === '' || isCurrentlyLoggingIn || isLoggedIn">Login</button>
					</div>
				</div>`,
				methods: {
					show (){
						this.isVisible = true
					},
					hide (){
						this.isVisible = false
					},
					login (){
						if(this.isLoggedIn){
							return
						}

						this.setMessage('normal', 'logging in ...')

						this.isCurrentlyLoggingIn = true
						this.sendServerMessage('companion-login', this.token).then(json => {
							let parsed = JSON.parse(json)
							this.setMessage('success', 'Welcome ' + parsed.name)
							localStorage.companionToken = this.token
							c2.webclient.ws.token = this.token

							setTimeout(()=>{
								this.hide()
								this.setMessage(undefined, undefined)

								this.$store.state.userSteamId = parsed.steamId
								this.$store.state.userName = parsed.name
							}, 1000)

						}).catch(err => {
							this.setMessage('error', err)
						}).finally(()=>{
							this.isCurrentlyLoggingIn = false
						})
					},
					logout (){
						this.setMessage('normal', 'logging out ...')
						this.isCurrentlyLoggingOut = true

						setTimeout(()=>{
							this.setMessage('success', 'logged out')
							c2.webclient.ws.token = undefined
							localStorage.removeItem('companionToken')

							setTimeout(()=>{
								this.hide()
								this.setMessage(undefined, undefined)

								this.$store.state.userSteamId = undefined
							}, 1000)

							this.isCurrentlyLoggingOut = false

						}, 1000)
					},
					setMessage(type, message){
						this.messageType = type
						this.message = message
					},
					onKeyDown(evt){
						if(evt.key === 'Enter'){
							this.login()
						}
					}
				},
				created: function (){
					if(typeof localStorage.companionToken === 'string'){
						this.token = localStorage.companionToken
						this.isCurrentlyLoggingIn = true
						c2.on('setup-done', ()=>{
							c2.webclient.ws.on('open', ()=>{
								this.login()
							})
						})
					}
				},
				mixins: [componentMixin_serverMessage]
			})

			/*

				PAGE INFO

			*/

			this.c2.registerComponent('info', {
				computed: {
					companionVersion (){
						return this.$store.state.COMPANION_VERSION
					},
					scriptVersion (){
						return this.$store.state.SCRIPT_VERSION
					},
					commit (){
						return this.$store.state.COMPANION_COMMIT
					},
					commitShort (){
						return this.commit ? this.commit.substring(0,8) : undefined
					}
				},
				template: `<div class="info">
					<div class="intro">
						<div class="logo">
						</div>
						<h1 class="headline">Carsa's Companion</h1>
					</div>
					<division :name="'General'" :startExtended="true">
						<p>Version (Companion):
							<loading-spinner-or :is-loading-code="'return !this.companionVersion'" :parents-depth="3">
								{{companionVersion}}
							</loading-spinner-or>
						</p>
						<spacer-horizontal/>
						<p>Version (Game Script):
							<loading-spinner-or :is-loading-code="'return !this.scriptVersion'" :parents-depth="3">
								{{scriptVersion}}
							</loading-spinner-or>
						</p>
						<spacer-horizontal/>
						<p>Commit:
							<loading-spinner-or :is-loading-code="'return !this.commit'" :parents-depth="3">
								<span :title="commit">{{commitShort}}</span>
							</loading-spinner-or>
						</p>
					</division>
					<division :name="'Help'" :startExtended="false">
						You can find a manual <a-link :url="'/manual'" :text="'here'"/>
						<spacer-horizontal/>
						<button @click="exportLogs">Export Logs</button>
					</division>
				</div>`,
				methods: {
					exportLogs (){
						let link = document.createElement('a')
						$(link).attr('download', 'c2_companion_log.txt')

						let blob = new Blob(['' + ConsoleLogger.getLatestLogAsString()], {type: 'text/plain'})

						let url = URL.createObjectURL(blob)
						$(link).attr('href', url)

						document.body.appendChild(link)

						link.click()

						setTimeout(()=>{
							link.remove()
							URL.revokeObjectURL(url)
						}, 100)
					}
				}
			})

			/*

				PAGE PLAYERS MANAGEMENT

			*/

			this.c2.registerComponent('players-management', {
				data (){
					return {
						filters: {
							'all': (player)=>{ return true },
							'online': (player)=>{ return player.peerID !== undefined },
							'offline': (player)=>{ return player.peerID === undefined },
							'not banned': (player)=>{ return player.banned === undefined },
							'banned': (player)=>{ return player.banned !== undefined }
						},
						currentFilter: 'all'
					}
				},
				computed: {
					players (){
						return this.$store.state.players
					},
					orderedPlayerArray (){
						if(!this.players){
							return undefined
						}

						let ret = []

						for(let p of Object.keys(this.players)){
							if(this.filters[this.currentFilter](this.players[p])){
								ret.push(this.players[p])
							}
						}

						ret.sort((a,b)=>{
							if(a.peerID !== undefined && b.peerID === undefined){
								return -1
							}

							if(a.peerID === undefined && b.peerID !== undefined){
								return 1
							}

							if(a.peerID === undefined && b.peerID === undefined){
								return ('' + a.name).localeCompare('' + b.name)
							}

							if(parseInt(a.peerID) < parseInt(b.peerID)){
								return -1
							}

							if(parseInt(a.peerID) > parseInt(b.peerID)){
								return 1
							}

							return 0
						})

						return ret
					}
				},
				template: `<div class="players_management">
					<div class="filter_selection">
						<div v-for="(_, filtername) of filters" @click="currentFilter = filtername" :class="['filter', {selected: currentFilter === filtername}]">{{filtername}}</div>
					</div>
					<player-list v-if="orderedPlayerArray" :players="orderedPlayerArray"/>
					<span v-else>Not synced</span>
				</div>`
			})

			this.c2.registerComponent('player-list', {
				props: {
					players: {
						type: Array,
						required: true
					}
				},
				template: `<div class="list player_list">
					<player v-for="(player) in players" :player="player"/>
				</div>`
			})

			this.c2.registerComponent('player', {
				data: function(){
					return {
						syncables: ['players']
					}
				},
				computed: {
					steamid (){
						return this.player.steamID
					},
					isOnline (){
						return this.player.peerID !== undefined
					},
					isBanned (){
						return this.player.banned !== undefined
					},
					bannedBy (){
						return this.isBanned ? this.player.banned : ''
					},
					playerRoles (){
						let roles = this.$store.state.roles
						if(!roles){
							return undefined
						}

						let myRoles = {}
						for(let roleName of Object.keys(roles)){
							let role = roles[roleName]
							myRoles[role.name] = !!role.members[this.steamid]
						}

						return myRoles
					},
					orderedPlayerRoleArray (){
						let roleArray = []

						let roles = this.playerRoles

						if(!roles){
							return undefined
						}

						for(let k of Object.keys(roles)){
							roleArray.push({
								name: k,
								hasRole: roles[k]
							})
						}

						return roleArray.sort((a, b)=>{
							return ('' + a.name).localeCompare('' + b.name)
						})
					}
				},
				props: {
					player: {
						type: Object,
						required: true
					}
				},
				provide: function (){
					return {
						player: this.player,
						steamid: this.steamid
					}
				},
				template: `<extendable v-slot="extendableProps" class="player" :class="[{is_banned: isBanned}]">

					<lockable-by-parent/>

					<div class="head">
						<player-state :player="player"/>

						<extendable-trigger class="name_container">
							<div class="name">{{player.name}}
								<icon v-if="extendableProps.isExtended" :icon="'angle-up'" class="extend_arrow"/>
								<icon v-else :icon="'angle-down'" class="extend_arrow"/>
							</div>
							<steamid :steamid="steamid"/>
						</extendable-trigger>

						<div class="gap"/>

						<div class="buttons">
							<confirm-button v-if="!isBanned && isOnline" @click.stop="kick">Kick</confirm-button>
							<confirm-button v-if="!isBanned" @click.stop="ban" :time="2">Ban</confirm-button>
							<confirm-button v-else @click.stop="unban">Unban</confirm-button>
						</div>
					</div>

					<extendable-body class="body" :showShadow="true">
						<p v-if="isBanned">Player was banned by <steamid :steamid="bannedBy"/>.</p>

						<spacer-horizontal v-if="isBanned"/>

						<tabs>
							<tab :title="'Roles'">
								<lockable-by-childs>
									<player-role v-for="r in orderedPlayerRoleArray" :hasRole="r.hasRole" :roleName="r.name" :steamid="steamid"/>
								</lockable-by-childs>
							</tab>
						</tabs>
					</extendable-body>
				</extendable>`,
				methods: {
					kick (){
						this.callGameCommandAndWaitForSync('kickPlayer', this.steamid)
					},
					ban (){
						this.callGameCommandAndWaitForSync('banPlayer', this.steamid)
					},
					unban (){
						this.callGameCommandAndWaitForSync('unban', this.steamid)
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('player-state', {
				props: {
					player: {
						type: Object,
						required: true
					}
				},
				template: `<div class="player_state">
					<span class="id" v-if="typeof player.peerID === 'number'">{{player.peerID}}</span>
					<span class="offline im im-power" v-else></span>
				</div>`
			})

			this.c2.registerComponent('player-role', {
				data: function (){
					return {
						enabledClass: 'enabled',
						disabledClass: 'disabled',
						syncables: ['roles']
					}
				},
				props: {
					hasRole: {
						type: Boolean,
						required: true
					},
					roleName: {
						type: String,
						required: true
					},
					steamid: {
						type: String,
						required: true
					}
				},
				inject: ['player'],
				template: `<div class="player_role" :class="hasRole ? enabledClass : disabledClass">
					<lockable/>
					<span class="name">{{roleName}}</span>

					<lockable-button class="small_button" v-if="hasRole" @click.stop="revokeRole"><span class="im im-minus"></span></lockable-button>
					<lockable-button class="small_button" v-else @click.stop="giveRole"><span class="im im-plus"></span></lockable-button>
				</div>`,
				methods: {
					giveRole () {
						this.callGameCommandAndWaitForSync('giveRole', [this.roleName, this.steamid])
					},
					revokeRole () {
						this.callGameCommandAndWaitForSync('revokeRole', [this.roleName, this.steamid])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			/*

				PAGE VEHICLES MANAGEMENT

			*/

			this.c2.registerComponent('vehicles-management', {
				computed: {
					vehicles (){
						return this.$store.state.vehicles
					}
				},
				template: `<div class="vehicles_management">
					<vehicle-list v-if="vehicles" :vehicles="vehicles"/>
					<span v-else>Not synced</span>
				</div>`
			})

			this.c2.registerComponent('vehicle-list', {
				props: {
					vehicles: {
						type: Object,
						required: true
					}
				},
				template: `<div class="list vehicle_list">
					<lockable-by-childs>
						<vehicle v-for="(vehicle, vehicleId) of vehicles" :vehicle="vehicle" :vehicleId="parseInt(vehicleId)"/>
						<span v-if="Object.keys(vehicles).length === 0">No vehicles</span>
					</lockable-by-childs>
				</div>`
			})

			this.c2.registerComponent('vehicle', {
				data: function(){
					return {
						syncables: ['vehicles']
					}
				},
				computed: {
					ownerName (){
						return this.$store.state.players && this.$store.state.players[this.vehicle.owner] && this.$store.state.players[this.vehicle.owner].name || '?'
					}
				},
				props: {
					vehicle: {
						type: Object,
						required: true
					},
					vehicleId: {
						type: Number,
						required: true
					}
				},
				template: `<div class="vehicle">
					<span class="id">{{vehicleId}}</span>
					<span class="name">{{vehicle.name}}</span>
					<div class="owner_container"><span class="by">Owner:</span><span class="owner">{{ownerName}}</span></div>

					<div class="gap"/>

					<div class="buttons">
						<confirm-button @click="despawn">Despawn</confirm-button>
					</div>
				</div>`,
				methods: {
					despawn (){
						this.callGameCommandAndWaitForSync('clearVehicle', [this.vehicleId])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			/*

				PAGE ROLES MANAGEMENT

			*/

			this.c2.registerComponent('roles-management', {
				data: function (){
					return {
						newRoleText: '',
						syncables: ['roles']
					}
				},
				computed: {
					roles (){
						return this.$store.state.roles
					},
					orderedRoleArray (){
						let roleArray = []

						let roles = this.roles

						if(!roles){
							return undefined
						}

						for(let k of Object.keys(roles)){
							roleArray.push({
								name: k,
								role: roles[k]
							})
						}

						return roleArray.sort((a, b)=>{
							return ('' + a.name).localeCompare('' + b.name)
						})
					}
				},
				template: `<div class="roles_management">
					<lockable-by-childs>
						<division class="new_role_container" :startExtended="true">
							<input v-model="newRoleText" placeholder="New Role Name" :disabled="isComponentLocked"/>
							<lockable-button @click="addNewRole">Add new Role</lockable-button>
						</division>
						<role-list v-if="roles" :roles="orderedRoleArray"/>
						<span v-else style="margin-top: 1em;">Not synced</span>
					</lockable-by-childs>
				</div>`,
				methods: {
					addNewRole (){
						if(this.newRoleText && this.newRoleText.length > 0){
							this.callGameCommandAndWaitForSync('addRole', this.newRoleText).then(()=>{
								this.newRoleText = ''
							})
						}
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('role-list', {
				props: {
					roles: {
						type: Array,
						required: true
					}
				},
				template: `<div class="list role_list">
					<role v-for="r of roles" :role="r.role" :roleName="r.name"/>
				</div>`
			})

			this.c2.registerComponent('role', {
				data: function(){
					return {
						showAddMemberSelection: false,
						syncables: ['roles']
					}
				},
				props: {
					role: {
						type: Object,
						required: true
					},
					roleName: {
						type: String,
						required: true
					}
				},
				provide: function (){
					return {
						roleName: this.roleName
					}
				},
				computed: {
					allCommands (){
						let ret = {}

						// the commands the role has access to
						for(let commandName of Object.keys(this.role.commands)){
							ret[commandName] = this.role.commands[commandName]
						}

						//the commands the role has NO access to
						for(let commandName of this.$store.state.commands || []){
							if(!ret[commandName]){
								ret[commandName] = false
							}
						}

						return ret
					},
					orderedCommandArray (){
						let commandArray = []

						let commands = this.allCommands

						if(!commands){
							return undefined
						}

						for(let k of Object.keys(commands)){
							commandArray.push({
								name: k,
								isCommand: commands[k]
							})
						}

						return commandArray.sort((a, b)=>{
							return ('' + a.name).localeCompare('' + b.name)
						})
					}
				},
				template: `<extendable class="role">
					<lockable-by-parent/>
					<div class="role_head">
						<extendable-trigger :useDefaultArrows="true">
							<span class="name">{{roleName}}</span>
						</extendable-trigger>

						<div class="buttons">
							<confirm-button v-if="role.no_delete !== true" @click="remove">Remove</confirm-button>
						</div>
					</div>

					<extendable-body class="role_body" :showShadow="true">
						<tabs>
							<tab :title="'Members'">
								<lockable-button v-if="!showAddMemberSelection" class="add_member" @click="showAddMemberSelection = true">
									<span class="im im-plus"/>
								</lockable-button>
								<member-selection v-if="showAddMemberSelection" @member-selected="addMember" :role="role"/>
								<member-list :members="role.members"/>
							</tab>
							<tab :title="'Commands'">
								<command-list :commands="orderedCommandArray"/>
							</tab>
							<tab :title="'Permissions'">
								<p>If a player has this role, we will give him the ingame "auth" and/or "admin" rights which are necessary to use certain features (e.g. workbench) and commands (e.g. "?reload_scripts").</p>
								<spacer-horizontal/>
								<permissions :role="role"/>
							</tab>
						</tabs>
					</extendable-body>
				</extendable>`,
				methods: {
					remove (){
						this.callGameCommandAndWaitForSync('removeRole', this.roleName)
					},
					addMember (steamId){
						this.showAddMemberSelection = false
						this.callGameCommandAndWaitForSync('giveRole', [this.roleName, steamId])
					}
				},
				mixins: [componentMixin_gameCommand]
			})


			this.c2.registerComponent('member-selection', {
				props: {
					role: {
						type: Object,
						required: true
					}
				},
				computed: {
					playersThatAreNotAMember (){
						let ret = {}

						for(let steamId of Object.keys(this.$store.state.players)){
							if(! this.role.members[steamId]){
								ret[steamId] = this.$store.state.players[steamId]
							}
						}

						return ret
					}
				},
				emits: ['member-selected'],
				template: `<div class="member_selection">
					<div v-for="(player, steamid) in playersThatAreNotAMember" class="member_entry" @click="selectMember(steamid)">
						<span>{{player.name}}</span>
					</div>
				</div>`,
				methods: {
					selectMember (steamId){
						this.$emit('member-selected', steamId)
					}
				}
			})

			this.c2.registerComponent('permissions', {
				data: function(){
					return {
						syncables: ['roles']
					}
				},
				props: {
					role: {
						type: Object,
						required: true
					}
				},
				inject: ['roleName'],
				template: `<div class="permissions">

					<lockable/>

					<toggleable-element :value-object="role" :value-object-key="'admin'" :on-value-change="onPermissionChange">isAdmin</toggleable-element>
					<spacer-horizontal/>
					<toggleable-element :value-object="role" :value-object-key="'auth'" :on-value-change="onPermissionChange">isAuth</toggleable-element>
				</div>`,
				methods: {
					onPermissionChange (name, value){
						this.debug('onPermissionChange', name, value)

						this.role[name] = value

						let updatedRole = {
							admin: this.role.admin,
							auth: this.role.auth
						}

						updatedRole[name] = value

						this.callGameCommandAndWaitForSync('rolePerms', [this.roleName, updatedRole.admin, updatedRole.auth])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('command-list', {
				props: {
					commands: {
						type: Array,
						required: true
					}
				},
				template: `<div class="list command_list">
					<lockable-by-childs>
						<command v-for="c of commands" :commands="commands" :isCommand="c.isCommand" :commandName="c.name"/>
					</lockable-by-childs>
				</div>`
			})

			this.c2.registerComponent('command', {
				data: function(){
					return {
						syncables: ['roles']
					}
				},
				props: {
					commands: {
						type: Object,
						required: true
					},
					commandName: {
						type: String,
						required: true
					}
				},
				inject: ['roleName'],
				template: `<div class="command">
					<toggleable-element :value-object="commands" :value-object-key="commandName" :on-value-change="onCommandChange" ref="toggleable">{{commandName}}</toggleable-element>
				</div>`,
				methods: {
					onCommandChange (_, value){
						this.commands[this.commandName] = value

						this.callGameCommandAndWaitForSync('roleAccess', [this.roleName, this.commandName, value])
					}
				},
				watch: {
					commands (){
						this.$refs.toggleable.refreshValue()
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('member-list', {
				props: {
					members: {
						type: Object,
						required: true
					}
				},
				template: `<div class="list member_list">
					<member v-for="val, steamid of members" :steamid="steamid"/>
				</div>`
			})

			this.c2.registerComponent('member', {
				data: function(){
					return {
						syncables: ['roles']
					}
				},
				props: {
					steamid: {
						type: String,
						required: true
					}			},
				inject: ['roleName'],
				template: `<div class="member">
					<lockable/>
					<player-state :player="getPlayer()"/>
					<spacer-vertical/>
					<span class="name">{{getPlayer() ? getPlayer().name : 'Unknown'}}</span>
					<spacer-vertical/>
					<lockable-button class="small_button im im-minus" @click="removeMember()"></lockable-button>
				</div>`,
				methods: {
					getPlayer (){
						return this.$store.state.players[this.steamid]
					},
					removeMember (){
						this.callGameCommandAndWaitForSync('revokeRole', [this.roleName, this.steamid])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			/*

				PAGE RULES MANAGEMENT

			*/

			this.c2.registerComponent('rules-management', {
				data: function (){
					return {
						newRuleText: '',
						syncables: ['rules']
					}
				},
				computed: {
					rules (){
						return this.$store.state.rules instanceof Array ? this.$store.state.rules : undefined
					}
				},
				template: `<div class="rules_management">
					<lockable/>
					<lockable-by-childs>
						<division class="new_rule_container" :startExtended="true">
							<textarea v-model="newRuleText" placeholder="New rule text" cols="30" rows="5" :disabled="isComponentLocked"/>
							<lockable-button @click="addNewRule" :set-disabled="newRuleText.length === 0">Add new Rule (at the end)</lockable-button>
						</division>
						<rule-list v-if="rules" :rules="rules" @addNewRuleBefore="addNewRule"/>
						<span v-else class="empty_list_hint">No rules</span>
					</lockable-by-childs>
				</div>`,
				methods: {
					addNewRule (/* optional */ beforeIndex){
						if(this.newRuleText && this.newRuleText.length > 0){
							this.callGameCommandAndWaitForSync('addRule', typeof beforeIndex === 'number' ? [this.newRuleText, beforeIndex] : [this.newRuleText]).then(()=>{
								this.newRuleText = ''
							})
						}
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('rule-list', {
				props: {
					rules: {
						type: Array,
						required: true
					}
				},
				emits: ['addNewRuleBefore'],
				template: `<div class="list rule_list">
					<rule v-for="(rule, index) of rules" :rule="rule" :index="index" @addNewRuleBeforeMe="addNewRuleBeforeMe"/>
				</div>`,
				methods: {
					addNewRuleBeforeMe (beforeIndex) {
						this.$emit('addNewRuleBefore', beforeIndex)
					}
				}
			})

			this.c2.registerComponent('rule', {
				data: function(){
					return {
						syncables: ['rules']
					}
				},
				props: {
					rule: {
						type: String,
						required: true
					},
					index: {
						type: Number,
						required: true
					}
				},
				emits: ['addNewRuleBeforeMe'],
				template: `<div class="rule">
					<p class="text">{{rule}}</p>
					<confirm-button class="small_button" :mini="true" @click="remove">
						<span class="im im-minus"/>
					</confirm-button>
					<button class="small_button" :mini="true" @click="addBeforeMe">Insert Before</button>
				</div>`,
				methods: {
					remove (){
						this.callGameCommandAndWaitForSync('removeRule', this.index + 1)
					},
					addBeforeMe (){
						this.$emit('addNewRuleBeforeMe', this.index + 1)
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			/*

				PAGE PREFERENCES MANAGEMENT

			*/

			this.c2.registerComponent('preferences-management', {
				computed: {
					preferences (){
						return this.$store.state.preferences
					},
					orderedPreferenceArray (){
						let preferenceArray = []

						let preferences = this.preferences

						if(!preferences){
							return undefined
						}

						for(let k of Object.keys(preferences)){
							preferenceArray.push({
								name: k,
								preference: preferences[k]
							})
						}

						return preferenceArray.sort((a, b)=>{
							return ('' + a.name).localeCompare('' + b.name)
						})
					}
				},
				template: `<div class="preferences_management">
					<preference-list v-if="preferences" :preferences="orderedPreferenceArray"/>
					<span v-else>Not synced</span>
				</div>`
			})

			this.c2.registerComponent('preference-list', {
				data (){
					return {
						syncables: []
					}
				},
				props: {
					preferences: {
						type: Array,
						required: true
					}
				},
				template: `<div class="list preference_list">
					<lockable-by-childs>
						<preference v-if="preferences" v-for="p in preferences" :preference="p.preference" :preferenceName="p.name"/>
					</lockable-by-childs>
				</div>`,
				mixins: [componentMixin_lockable]
			})

			this.c2.registerComponent('preference', {
				computed: {
					preferenceComponent (){
						switch(this.preference.type){
							case 'bool': return 'preference-bool';
							case 'number': return 'preference-number';
							case 'string':
							case 'text': return 'preference-string';
							case 'table': return 'preference-table';
							default: {
								this.error('invalid preference type', this.preference.type)
								return
							}
						}
					}
				},
				props: {
					preference: {
						type: Object,
						required: true
					},
					preferenceName: {
						type: String,
						required: true
					}
				},
				template: `<division class="preference" :name="preferenceName" :alwaysExtended="true">
					<lockable-by-childs>
						<component :is="preferenceComponent" :preference="preference" :preferenceName="preferenceName"/>
					</lockable-by-childs>
				</division>`
			})

			this.c2.registerComponent('preference-bool', {
				data: function(){
					return {
						syncables: ['preferences']
					}
				},
				props: {
					preference: {
						type: Object,
						required: true
					},
					preferenceName: {
						type: String,
						required: true
					}
				},
				template: `<toggleable-element class="preference_bool" :value-object="preference" :value-object-key="'value'" :on-value-change="preferenceChanged"/>`,
				methods: {
					preferenceChanged (_, value){
						this.preference.value = value
						this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, value])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('preference-string', {
				data: function (){
					return {
						val: '',
						syncables: ['preferences']
					}
				},
				props: {
					preference: {
						type: Object,
						required: true
					},
					preferenceName: {
						type: String,
						required: true
					}
				},
				template: `<div class="preference_string">
					<textarea v-model="val" cols="30" rows="5" :disabled="isComponentLocked"/>
					<spacer-vertical/>
					<lockable-button @click="update">Update</lockable-button>
				</div>`,
				created: function (){
					this.val = this.preference.value
				},
				methods: {
					update (){
						this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, this.val])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('preference-number', {
				data: function (){
					return {
						val: 0,
						syncables: ['preferences']
					}
				},
				props: {
					preference: {
						type: Object,
						required: true
					},
					preferenceName: {
						type: String,
						required: true
					}
				},
				template: `<div class="preference_number">
					<input type="number" v-model="val" :disabled="isComponentLocked"/>
					<spacer-vertical/>
					<lockable-button @click="update">Update</lockable-button>
					<a-link v-if="preferenceName.toLowerCase().indexOf('equipment') >= 0" :url="'https://c2.carsakiller.com/cc-website/docs/commands.html#equipmentIDs'" :text="'Equipment IDs'" class="more_link"/>
				</div>`,
				created: function (){
					this.val = this.preference.value
				},
				methods: {
					update (){
						this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, this.val])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('preference-table', {
				data: function (){
					return {
						val: '',
						syncables: 'preferences'
					}
				},
				props: {
					preference: {
						type: Object,
						required: true
					},
					preferenceName: {
						type: String,
						required: true
					}
				},
				template: `<div class="preference_table">
					<textarea type="number" v-model="val" cols="30" rows="5" :disabled="isComponentLocked"/>
					<spacer-vertical/>
					<lockable-button @click="update">Update</lockable-button>
				</div>`,
				created: function (){
					this.val = JSON.stringify(this.preference.value)
				},
				methods: {
					update (){
						this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, this.val])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			/*

				PAGE GAME SETTINGS MANAGEMENT

			*/

			this.c2.registerComponent('gamesettings-management', {
				computed: {
					gamesettings (){
						return this.$store.state.gamesettings
					},
					orderedGamesettingArray (){
						let gamesettingArray = []

						let gamesettings = this.gamesettings

						if(!gamesettings){
							return undefined
						}

						for(let k of Object.keys(gamesettings)){
							gamesettingArray.push({
								name: k,
								gamesetting: gamesettings[k]
							})
						}

						return gamesettingArray.sort((a, b)=>{
							return ('' + a.name).localeCompare('' + b.name)
						})
					}
				},
				template: `<div class="gamesettings_management">
					<gamesetting-list v-if="gamesettings && orderedGamesettingArray" :gamesettings="gamesettings" :ordered-gamesettings="orderedGamesettingArray"/>
					<span v-else>Not synced</span>
				</div>`
			})

			this.c2.registerComponent('gamesetting-list', {
				data (){
					return {
						syncables: []
					}
				},
				props: {
					gamesettings: {
						type: Object,
						required: true
					},
					orderedGamesettings: {
						type: Array,
						required: true
					}
				},
				template: `<div class="list gamesetting_list">
					<lockable-by-childs>
						<gamesetting v-for="g in orderedGamesettings" :gamesettings="gamesettings" :gamesettingName="g.name"/>
					</lockable-by-childs>
				</div>`,
				mixins: [componentMixin_lockable]
			})

			this.c2.registerComponent('gamesetting', {
				computed: {
					gamesetting (){
						return this.gamesettings[this.gamesettingName]
					},
					gamesettingComponent (){
						switch(typeof this.gamesetting){
							case 'boolean': return 'gamesetting-bool';
							case 'number': return 'gamesetting-number';
							default: {
								this.error('invalid gamesetting type', typeof this.gamesetting)
								return
							}
						}
					}
				},
				props: {
					gamesettings: {
						type: Object,
						required: true
					},
					gamesettingName: {
						type: String,
						required: true
					}
				},
				template: `<division class="gamesetting" :name="gamesettingName" :alwaysExtended="true">
					<lockable-by-childs>
						<component :is="gamesettingComponent" :gamesettings="gamesettings" :gamesetting-name="gamesettingName"/>
					</lockable-by-childs>
				</division>`
			})

			this.c2.registerComponent('gamesetting-bool', {
				data: function(){
					return {
						syncables: ['gamesettings']
					}
				},
				props: {
					gamesettings: {
						type: Object,
						required: true
					},
					gamesettingName: {
						type: String,
						required: true
					}
				},
				template: `<toggleable-element class="gamesetting_bool" :value-object="gamesettings" :value-object-key="gamesettingName" :on-value-change="gamesettingChanged"></toggleable-element>`,
				methods: {
					gamesettingChanged (_, value){
						this.gamesettings[this.gamesettingName] = value
						this.callGameCommandAndWaitForSync('setGameSetting', [this.gamesettingName, value])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('gamesetting-number', {
				data: function (){
					return {
						val: 0,
						syncables: ['gamesettings']
					}
				},
				computed: {
					gamesetting (){
						return this.gamesettings[this.gamesettingName]
					}
				},
				props: {
					gamesettings: {
						type: Object,
						required: true
					},
					gamesettingName: {
						type: String,
						required: true
					}
				},
				template: `<div class="gamesetting_number">
					<span class="only_ingame_hint">can only be changed ingame in custom menu.</span>
					<!--<input type="number" v-model="val" :disabled="isComponentLocked"/>
					<spacer-vertical/>
					<lockable-button @click="update">Update</lockable-button>-->
				</div>`,
				created: function (){
					this.val = this.gamesetting
				},
				methods: {
					update (){
						this.callGameCommandAndWaitForSync('setGameSetting', [this.gamesettingName, this.val])
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			/*

				PAGE CHAT MANAGEMENT

			*/

			this.c2.registerComponent('chat-management', {
				data (){
					return {
						newChatMessageText: '',
						syncables: []
					}
				},
				computed: {
					chatMessages (){
						return this.$store.state.chatMessages
					},
					hasChatMessages (){
						return this.chatMessages && this.chatMessages.length > 0
					}
				},
				template: `<div class="chat_management">
					<chat-message-list v-if="hasChatMessages" :chatMessages="chatMessages"></chat-message-list>
					<span v-else class="empty_list_hint">No chat messages</span>

					<division class="new_chat_message_container" :startExtended="true">
						<textarea v-model="newChatMessageText" placeholder="Your chat message" cols="50" rows="3"/>
						<lockable-button @click="sendNewChatMessage" :set-disabled="newChatMessageText.length === 0">Send</lockable-button>
					</division>
				</div>`,
				methods: {
					sendNewChatMessage (){
						if(this.newChatMessageText && this.newChatMessageText.length > 0){
							this.sendServerMessage('chat-write', [this.newChatMessageText]).then(()=>{
								this.newChatMessageText = ''
							}).catch((err)=>{
								this.showNotificationFailed('chat-write', err)
								this.unlockComponent()
							})
						}
					}
				},
				mixins: [componentMixin_serverMessage]
			})

			this.c2.registerComponent('chat-message-list', {
				props: {
					chatMessages: {
						type: Array,
						required: true
					}
				},
				template: `<div class="list chat_message_list">
					<chat-message v-for="(chatMessage, index) of chatMessages" :chatMessage="chatMessage" :index="index"></chat-messagery>
				</div>`
			})

			this.c2.registerComponent('chat-message', {
				props: {
					chatMessage: {
						type: Object,
						required: true
					},
					index: {
						type: Number,
						required: true
					}
				},
				computed: {
					hasSameAuthorAsLastMessage (){
						return this.$store.state.chatMessages[this.index - 1] && this.$store.state.chatMessages[this.index - 1].author === this.chatMessage.author
					},
					authorSteamId (){
						return this.chatMessage.author
					},
					authorName (){
						return this.$store.state.players && this.$store.state.players[this.chatMessage.author] ? this.$store.state.players[this.chatMessage.author].name : undefined
					}
				},
				template: `<div class="chat_message">
					<div class="player">{{!hasSameAuthorAsLastMessage ? authorName : ''}} <steamid v-if="!hasSameAuthorAsLastMessage" :steamid="authorSteamId"/></div>
					<div class="message">{{chatMessage.message}}</div>
				</div>`
			})

			/*

				PAGE LOGS MANAGEMENT

			*/

			this.c2.registerComponent('logs-management', {
				computed: {
					logs (){
						return this.$store.state.logs
					},
					hasLogs (){
						return this.logs && this.logs.length > 0
					}
				},
				template: `<div class="logs_management">
					<log-list v-if="hasLogs" :logs="logs"></log-list>
					<span v-else class="empty_list_hint">No logs</span>
				</div>`
			})

			this.c2.registerComponent('log-list', {
				props: {
					logs: {
						type: Array,
						required: true
					}
				},
				template: `<div class="list log_list">
					<log-entry v-for="(entry, entry_index) of logs" :entry="entry"></log-entry>
				</div>`
			})

			this.c2.registerComponent('log-entry', {
				props: {
					entry: {
						type: Object,
						required: true
					}
				},
				template: `<div class="log_entry">
					<div class="time">{{new Date(entry.time).toLocaleString()}}</div>
					<div class="message">{{entry.message}}</div>
				</div>`
			})

			/*

				PAGE SETTINGS MANAGEMENT

			*/

			this.c2.registerComponent('settings-management', {
				computed: {
					settings (){
						return this.$store.state.settings
					},
					orderedSettingArray (){
						let settingArray = []

						let settings = this.settings

						if(!settings){
							return undefined
						}

						for(let k of Object.keys(settings)){
							settingArray.push({
								name: k,
								setting: settings[k]
							})
						}

						return settingArray.sort((a, b)=>{
							return ('' + a.name).localeCompare('' + b.name)
						})
					}
				},
				template: `<div class="settings_management">
					<setting-list :settings="orderedSettingArray"></setting-list>
				</div>`
			})

			this.c2.registerComponent('setting-list', {
				props: {
					settings: {
						type: Array,
						required: true
					}
				},
				template: `<div class="setting_list">
					<setting v-if="settings" v-for="s of settings" :setting="s.setting" :settingName="s.name"></setting>
				</div>`
			})

			this.c2.registerComponent('setting', {
				props: {
					setting: {
						type: Object,
						required: true
					},
					settingName: {
						type: String,
						required: true
					}
				},
				computed: {
					settingComponent (){
						switch(this.setting.type){
							case 'boolean': return 'setting-bool';
							case 'string': return 'setting-string';
							default: {
								this.error('invalid setting type', this.setting.type)
								return
							}
						}
					}
				},
				template: `<division class="setting" :name="settingName" :alwaysExtended="true">
					<lockable-by-childs>
						<p class="description" v-if="setting.description">{{setting.description}}</p>
						<component :is="settingComponent" :setting="setting" :settingName="settingName"/>
					</lockable-by-childs>
				</division>`
			})

			this.c2.registerComponent('setting-bool', {
				data: function(){
					return {
						syncables: []
					}
				},
				props: {
					setting: {
						type: Object,
						required: true
					},
					settingName: {
						type: String,
						required: true
					}
				},
				template: `<toggleable-element class="setting_bool" :value-object="setting" :value-object-key="'value'" :on-value-change="settingChanged"/>`,
				methods: {
					settingChanged (_, value){
						this.sendServerMessage('set-server-setting', JSON.stringify({key: this.settingName, value: value})).then(settings => {
							this.$store.state.settings = JSON.parse(settings)
						}).catch(err => {
							this.showNotificationFailed('set-server-setting', err)
						}).finally(_=>{
							this.unlockComponent()
							c2.updateUserPermissions()
						})
					}
				},
				mixins: [componentMixin_serverMessage]
			})

			this.c2.registerComponent('setting-string', {
				data: function (){
					return {
						val: '',
						syncables: []
					}
				},
				props: {
					setting: {
						type: Object,
						required: true
					},
					settingName: {
						type: String,
						required: true
					}
				},
				template: `<div class="setting_string">
					<textarea v-model="val" cols="30" rows="5" :disabled="isComponentLocked"/>
					<spacer-vertical/>
					<lockable-button @click="update">Update</lockable-button>
				</div>`,
				created: function (){
					this.val = this.setting.value
				},
				methods: {
					update (){
						this.sendServerMessage('set-server-setting', JSON.stringify({key: this.settingName, value: this.val})).then(settings => {
							this.$store.state.settings = JSON.parse(settings)
						}).catch(err => {
							this.showNotificationFailed('set-server-setting', err)
						}).finally(_=>{
							this.unlockComponent()
							c2.updateUserPermissions()
						})
					}
				},
				mixins: [componentMixin_gameCommand]
			})
		})

		this.c2.on('can-register-page', ()=>{
			this.c2.registerPage('home', 'Home', 'home', 'info')
			this.c2.registerPage('players', 'Players', 'users', 'players-management')
			this.c2.registerPage('vehicles', 'Vehicles', 'car', 'vehicles-management')
			this.c2.registerPage('roles', 'Roles', 'crown', 'roles-management')
			this.c2.registerPage('rules', 'Rules', 'task-o', 'rules-management')
			this.c2.registerPage('preferences', 'Preferences', 'control-panel', 'preferences-management')
			this.c2.registerPage('gamesettings', 'Game Settings', 'wrench', 'gamesettings-management')
			this.c2.registerPage('chat', 'Chat', 'speech-bubble-comments', 'chat-management')
			this.c2.registerPage('logs', 'Logs', 'note-o', 'logs-management')
			this.c2.registerPage('settings', 'Settings', 'gear', 'settings-management')
		})

		this.c2.on('can-register-messagehandler', ()=>{

			this.c2.registerMessageHandler('heartbeat', (data)=>{
				this.setStatus('game', true)
			})

			this.c2.registerMessageHandler('game-connection', data => {
				if(data === true){
					this.setStatus('game', true)

					this.syncAllData()
				} else {
					this.setStatus('game', false)
				}
			})

			this.c2.registerMessageHandler('stream-log', (newLogs)=>{
				if(!newLogs){
					return
				}

				for(let log of newLogs){
					this.c2.store.state.logs.push({
						message: log,
						time: Date.now()
					})
				}
			})

			this.c2.registerMessageHandler('stream-chat', (newChatMessages)=>{
				if(!newChatMessages){
					return
				}

				for(let chatMessage of newChatMessages){
					this.c2.store.state.chatMessages.push(chatMessage)
				}
			})
		})

		this.c2.on('setup-done', ()=>{

			this.c2.webclient.on('connected', ()=>{
				this.setStatus('server', true)
			})

			this.c2.webclient.on('disconnected', ()=>{
				this.setStatus('server', false)
				this.setStatus('game', false)
			})
		})
	}

	syncAllData(){
		this.c2.webclient.sendMessage('command-sync-all')
		.then(_ => this.log('started sync all ...'))
		.catch(err => this.error('error while syncing all', err))
	}

	setStatus(type, state){
		this.debug('setStatus', type, state)
		if(!this.c2.store.state.status){
			this.c2.store.state.status = {}
		}
		this.c2.store.state.status[type] = state
	}
}