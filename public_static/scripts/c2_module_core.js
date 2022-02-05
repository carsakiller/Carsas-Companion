class C2Module_Core extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.on('can-register-storable', ()=>{
			this.c2.registerStorable('status')
			this.c2.registerStorable('userSteamId')
			this.c2.registerStorable('profile')
			this.c2.registerStorable('logs', [])
		})

		this.c2.on('can-register-syncable', ()=>{
			this.c2.registerSyncable('players')
			this.c2.registerSyncable('vehicles')
			this.c2.registerSyncable('rules')
			this.c2.registerSyncable('roles')
			this.c2.registerSyncable('gamesettings')
			this.c2.registerSyncable('preferences')
			this.c2.registerSyncable('commands')
		})


		this.c2.on('can-register-messagehandler', ()=>{
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
		})

		this.c2.on('can-register-component', ()=>{

			/*

				GLOBAL

			*/

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
					<div v-else class="user_container">
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
					}
				},
				template: `<div class="login_popup" v-if="isVisible">
					<div class="inner">
						<icon :icon="'x-mark'" class="close" @click="hide"/>
						<span class="title">{{isLoggedIn ? 'You are logged in as' : 'Login'}}</span>

						<div v-if="isLoggedIn" class="profile_image" :style="profileImageStyle"></div>
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
							let steamId = JSON.parse(json)
							this.setMessage('success', steamId)
							localStorage.companionToken = this.token
							c2.webclient.ws.token = this.token

							setTimeout(()=>{
								this.hide()
								this.setMessage(undefined, undefined)

								this.$store.state.userSteamId = steamId
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
					}
				},
				mixins: [componentMixin_serverMessage]
			})

			/*

				PAGE INFO

			*/

			this.c2.registerComponent('info', {
				computed: {
					version (){
						return this.$store.state.C2_VERSION
					},
					commit (){
						return this.$store.state.C2_COMMIT
					},
					commitShort (){
						return this.commit ? this.commit.substring(0,8) : undefined
					}
				},
				template: `<div class="info">
					<division :name="'General'" :startExtended="true">
						<p>Version:
							<loading-spinner-or :is-loading-code="'return !this.version'" :parents-depth="3">
								{{version}}
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
						You can find a manual <a-link :url="'#'" :text="'here (TODO)'"/>
					</division>
				</div>`
			})

			/*

				PAGE PLAYERS MANAGEMENT

			*/

			this.c2.registerComponent('players-management', {
				computed: {
					players (){
						return this.$store.state.players
					}
				},
				template: `<div class="players_management">
					<player-list v-if="players" v-bind:players="players"/>
					<span v-else>Not synced</span>
				</div>`
			})

			this.c2.registerComponent('player-list', {
				props: {
					players: {
						type: Object,
						required: true
					}
				},
				template: `<div class="list player_list">
					<player v-for="(player, steamid) in players" :player="player" :steamid="steamid" :key="steamid"/>
				</div>`
			})

			this.c2.registerComponent('player', {
				data: function(){
					return {
						syncables: ['players']
					}
				},
				computed: {
					isBanned (){
						return !!this.player.banned
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
					}
				},
				props: {
					player: {
						type: Object,
						required: true
					},
					steamid: {
						type: String,
						required: true
					}
				},
				provide: function (){
					return {
						player: this.player,
						steamid: this.steamid
					}
				},
				template: `<extendable v-slot="extendableProps" class="player" key="{{player.steamID}}" :class="[{is_banned: isBanned}]">

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
							<confirm-button v-if="!isBanned" @click.stop="kick">Kick</confirm-button>
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
									<player-role v-for="(hasRole, roleName) in playerRoles" :hasRole="hasRole" :roleName="roleName" :key="roleName" :steamid="steamid"/>
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
						<vehicle v-for="(vehicle, vehicleId) of vehicles" :vehicle="vehicle" :vehicleId="parseInt(vehicleId)" :key="vehicleId"/>
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
					<span class="owner">{{ownerName}}</span>

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
					}
				},
				template: `<div class="roles_management">
					<lockable-by-childs>
						<division class="new_role_container" :startExtended="true">
							<input v-model="newRoleText" placeholder="New Role Name" :disabled="isComponentLocked"/>
							<lockable-button @click="addNewRole">Add new Role</lockable-button>
						</division>
						<role-list v-if="roles" :roles="roles"/>
						<span v-else>Not synced</span>
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
						type: Object,
						required: true
					}
				},
				template: `<div class="list role_list">
					<role v-for="(role, roleName) of roles" :role="role" :roleName="roleName" :key="roleName"/>
				</div>`
			})

			this.c2.registerComponent('role', {
				data: function(){
					return {
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
					playersThatAreNotAMember (){
						let ret = []

						for(let steamid of Object.keys(this.$store.state.players)){
							if(! this.role.members[steamid]){
								ret.push(steamid)
							}
						}

						return ret
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
								<lockable-button class="add_member" @click="addMember">
									<span class="im im-plus"/>
								</lockable-button>
								<member-list :members="role.members"/>
							</tab>
							<tab :title="'Commands'">
								<command-list :commands="allCommands"/>
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
					addMember (){
						alert('not implemented')
						//TODO: add selection for players
						//this.callGameCommandAndWaitForSync('giveRole', [this.roleName, ])
					}
				},
				mixins: [componentMixin_gameCommand]
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

					<toggleable-element :value="role.admin" :value-name="'admin'" :on-value-change="onPermissionChange">isAdmin</toggleable-element>
					<spacer-horizontal/>
					<toggleable-element :value="role.auth" :value-name="'auth'" :on-value-change="onPermissionChange">isAuth</toggleable-element>
				</div>`,
				methods: {
					onPermissionChange (name, value){
						this.debug('onPermissionChange', name, value)
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
						type: Object,
						required: true
					}
				},
				template: `<div class="list command_list">
					<lockable-by-childs>
						<command v-for="(isCommand, commandName) of commands" :key="commandName" :isCommand="isCommand" :commandName="commandName"/>
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
					isCommand: {
						type: Boolean,
						required: true
					},
					commandName: {
						type: String,
						required: true
					}
				},
				inject: ['roleName'],
				template: `<div class="command">
					<toggleable-element :value="isCommand" :value-name="commandName" :on-value-change="onCommandChange">{{commandName}}</toggleable-element>
				</div>`,
				methods: {
					onCommandChange (name, value){
						this.callGameCommandAndWaitForSync('roleAccess', [this.roleName, this.commandName, value])
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
					<member v-for="val, steamid of members" :key="steamid" :steamid="steamid"/>
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
						<span v-else>No rules</span>
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
					}
				},
				template: `<div class="preferences_management">
					<preference-list v-if="preferences" :preferences="preferences"/>
					<span v-else>Not synced</span>
				</div>`
			})

			this.c2.registerComponent('preference-list', {
				props: {
					preferences: {
						type: Object,
						required: true
					}
				},
				template: `<div class="list preference_list">
					<lockable-by-childs>
						<preference v-if="preferences" v-for="(preference, preferenceName) in preferences" :preference="preference" :preferenceName="preferenceName"/>
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
				template: `<toggleable-element class="preference_bool" :value="preference.value" :value-name="preferenceName" :on-value-change="preferenceChanged"/>`,
				methods: {
					preferenceChanged (name, value){
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
					<a-link v-if="preferenceName.toLowerCase().indexOf('equipment') >= 0" :url="'#'" :text="'Equipment IDs'" class="more_link"/>
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
					}
				},
				template: `<div class="gamesettings_management">
					<gamesetting-list v-if="gamesettings" :gamesettings="gamesettings"/>
					<span v-else>Not synced</span>
				</div>`
			})

			this.c2.registerComponent('gamesetting-list', {
				props: {
					gamesettings: {
						type: Object,
						required: true
					}
				},
				template: `<div class="list gamesetting_list">
					<lockable-by-childs>
						<gamesetting v-for="(gamesetting, gamesettingName) in gamesettings" :gamesetting="gamesetting" :gamesettingName="gamesettingName"/>
					</lockable-by-childs>
				</div>`,
				mixins: [componentMixin_lockable]
			})

			this.c2.registerComponent('gamesetting', {
				computed: {
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
					gamesetting: {
						required: true
					},
					gamesettingName: {
						type: String,
						required: true
					}
				},
				provide: function (){
					return {
						gamesetting: this.gamesetting
					}
				},
				template: `<division class="gamesetting" :name="gamesettingName" :alwaysExtended="true">
					<lockable-by-childs>
						<component :is="gamesettingComponent" :gamesetting-name="gamesettingName"/>
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
					gamesettingName: {
						type: String,
						required: true
					}
				},
				inject: ['gamesetting'],
				template: `<toggleable-element class="gamesetting_bool" :value="gamesetting" :value-name="gamesettingName" :on-value-change="gamesettingChanged"></toggleable-element>`,
				methods: {
					gamesettingChanged (name, value){
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
				props: {
					gamesettingName: {
						type: String,
						required: true
					}
				},
				inject: ['gamesetting'],
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

				PAGE LOGS MANAGEMENT

			*/

			this.c2.registerComponent('logs-management', {
				computed: {
					logs (){
						return this.$store.state.logs
					}
				},
				template: `<div class="logs_management">
					<log-list :logs="logs"></log-list>
				</div>`
			})

			this.c2.registerComponent('log-list', {
				props: {
					logs: {
						type: Array,
						required: true
					}
				},
				template: `<div class="log_list">
					<log-entry v-for="(entry, entry_index) of logs" :entry="entry" :key="entry_index"></log-entry>
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
		})

		this.c2.on('can-register-page', ()=>{
			this.c2.registerPage('Home', 'home', 'info')
			this.c2.registerPage('Players', 'users', 'players-management')
			this.c2.registerPage('Vehicles', 'car', 'vehicles-management')
			this.c2.registerPage('Roles', 'crown', 'roles-management')
			this.c2.registerPage('Rules', 'task-o', 'rules-management')
			this.c2.registerPage('Preferences', 'control-panel', 'preferences-management')
			this.c2.registerPage('Game Settings', 'wrench', 'gamesettings-management')
			this.c2.registerPage('Logs', 'note-o', 'logs-management')
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
		this.log('setStatus', type, state)
		if(!this.c2.store.state.status){
			this.c2.store.state.status = {}
		}
		this.c2.store.state.status[type] = state
	}
}