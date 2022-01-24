class C2Module_Core extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.on('can-register-syncable', ()=>{
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

			this.c2.registerComponent('status-bar', {
				computed: {
					status (){
						return this.$store.state.status
					}
				},
				template: `<div class="status_bar" v-if="status.message" :class="status.clazz">
					{{status.message}}
				</div>`
			})

			this.c2.registerComponent('error-popup', {
				computed: {
					theError (){
						return this.$store.state.error
					}
				},
				template: `<div class="error_popup" v-if="theError.message">
					<div class="inner">
						<p class="title">{{theError.title}}</p>
						<textarea class="message" cols="30" rows="5" readonly="true" wrap="hard">{{theError.message}}</textarea>
						<button onclick="document.location.reload()">Reload Page</button>
					</div>
				</div>`
			})

			/*

				PAGE INFO

			*/

			this.c2.registerComponent('info', {
				computed: {
					version (){
						return this.$store.getters.C2_VERSION
					},
					commit (){
						return this.$store.getters.C2_COMMIT
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
						You can find a manual <a href="#">here (TODO)</a>
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
					<span v-else>No players</span>
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

						<spacer-horizontal/>

						<tabs>
							<tab :title="'Roles'">
								<player-role v-for="(hasRole, roleName) in playerRoles" :hasRole="hasRole" :roleName="roleName" :key="roleName"/>
							</tab>
						</tabs>
					</extendable-body>
				</extendable>`,
				methods: {
					kick (){
						alert('not implemented')//TODO: requires new command
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
					<span class="id" v-if="player.peerID">{{player.peerID}}</span>
					<span class="offline im im-power" v-else></span>
				</div>`
			})

			this.c2.registerComponent('player-role', {
				data: function (){
					return {
						enabledClass: 'enabled',
						disabledClass: 'disabled'
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
					}
				},
				inject: ['player', 'steamid'],
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
					<span v-else>No vehicles</span>
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
					<vehicle v-for="(vehicle, vehicleId) of vehicles" :vehicle="vehicle" :vehicleId="parseInt(vehicleId)" :key="vehicleId"/>
				</div>`
			})

			this.c2.registerComponent('vehicle', {
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
						alert('not implemented')
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
						newRoleText: ''
					}
				},
				computed: {
					roles (){
						return this.$store.state.roles
					}
				},
				template: `<div class="roles_management">
					<division class="new_role_container" :startExtended="true">
						<input v-model="newRoleText" placeholder="New Role Name" :disabled="isComponentLocked"/>
						<lockable-button @click="addNewRole">Add new Role</lockable-button>
					</division>
					<role-list v-if="roles" :roles="roles"/>
					<span v-else>No roles</span>
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
					playersThatAreNotAMember (){//TODO: show that in a popup so one can select it
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
							<confirm-button @click="remove">Remove</confirm-button>
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
								<requirements :role="role"/>
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
					}
				},
				mixins: [componentMixin_gameCommand]
			})

			this.c2.registerComponent('requirements', {
				props: {
					role: {
						type: Object,
						required: true
					}
				},
				inject: ['roleName'],
				template: `<div class="requirements">

					<lockable/>

					<toggleable-element :initial-value="role.admin" :value-name="'admin'" :on-value-change="onRequirementChange">isAdmin</toggleable-element>
					<spacer-horizontal/>
					<toggleable-element :initial-value="role.auth" :value-name="'auth'" :on-value-change="onRequirementChange">isAuth</toggleable-element>
				</div>`,
				methods: {
					onRequirementChange (name, value){
						this.debug('onRequirementChange', name, value)
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
					<command v-for="(isCommand, commandName) of commands" :key="commandName" :isCommand="isCommand" :commandName="commandName"/>
					<spacer-horizontal/>
				</div>`
			})

			this.c2.registerComponent('command', {
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
					<lockable/>
					<toggleable-element :initial-value="isCommand" :on-value-change="onCommandChange">{{commandName}}</toggleable-element>
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
						this.callGameCommandAndWaitForSync('revokeRole ', [this.steamid, this.roleName])
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
						newRuleText: ''
					}
				},
				computed: {
					rules (){
						return this.$store.state.rules
					}
				},
				template: `<div class="rules_management">
					<division class="new_rule_container" :startExtended="true">
						<textarea v-model="newRuleText" placeholder="New rule text" cols="30" rows="5" :disabled="isComponentLocked"/>
						<lockable-button @click="addNewRule">Add new Rule</lockable-button>
					</division>
					<rule-list v-if="rules" :rules="rules"/>
					<span v-else>No rules</span>
				</div>`,
				methods: {
					addNewRule (){
						if(this.newRuleText && this.newRuleText.length > 0){
							this.callGameCommandAndWaitForSync('addRule', this.newRuleText).then(()=>{
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
				template: `<div class="list rule_list">
					<rule v-for="(rule, index) of rules" :rule="rule" :index="index"/>
				</div>`
			})

			this.c2.registerComponent('rule', {
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
				template: `<div class="rule">
					<lockable/>
					<p class="text">{{rule}}</p>
					<confirm-button class="small_button" :mini="true" @click="remove">
						<span class="im im-minus"/>
					</confirm-button>
				</div>`,
				methods: {
					remove (){
						this.callGameCommandAndWaitForSync('removeRule', this.index + 1)
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
					<span v-else>No preferences</span>
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
					<preference v-if="preferences" v-for="(preference, preferenceName) in preferences" :preference="preference" :preferenceName="preferenceName"/>
					<spacer-horizontal/>
				</div>`
			})

			this.c2.registerComponent('preference', {
				computed: {
					preferenceComponent (){
						switch(this.preference.type){
							case 'bool': return 'preference-bool';
							case 'number': return 'preference-number';
							case 'string': return 'preference-string';
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
				provide: function (){
					return {
						preference: this.preference,
						preferenceName: this.preferenceName
					}
				},
				template: `<division class="preference" :name="preferenceName" :alwaysExtended="true">
					<lockable-by-childs>
						<component :is="preferenceComponent" :preference="preference" :preferenceName="preferenceName"/>
					</lockable-by-childs>
				</division>`
			})

			this.c2.registerComponent('preference-bool', {
				inject: ['preference', 'preferenceName'],
				template: `<toggleable-element class="preference_bool" :initial-value="preference.value" :on-value-change="preferenceChanged"/>`,
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
						val: ''
					}
				},
				inject: ['preference', 'preferenceName'],
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
						val: 0
					}
				},
				inject: ['preference', 'preferenceName'],
				template: `<div class="preference_number">
					<input type="number" v-model="val" :disabled="isComponentLocked"/>
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

			this.c2.registerComponent('preference-table', {
				data: function (){
					return {
						val: ''
					}
				},
				inject: ['preference', 'preferenceName'],
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
					<span v-else>No gamesettings</span>
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
					<gamesetting v-for="(gamesetting, gamesettingName) in gamesettings" :gamesetting="gamesetting" :gamesettingName="gamesettingName"/>
					<spacer-horizontal/>
				</div>`
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
						gamesetting: this.gamesetting,
						gamesettingName: this.gamesettingName
					}
				},
				template: `<division class="gamesetting" :name="gamesettingName" :alwaysExtended="true">
					<lockable-by-childs>
						<component :is="gamesettingComponent"/>
					</lockable-by-childs>
				</division>`
			})

			this.c2.registerComponent('gamesetting-bool', {
				inject: ['gamesetting', 'gamesettingName'],
				template: `<toggleable-element class="gamesetting_bool" :initial-value="gamesetting" :on-value-change="gamesettingChanged"/>`,
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
						val: 0
					}
				},
				inject: ['gamesetting', 'gamesettingName'],
				template: `<div class="gamesetting_number">
					<input type="number" v-model="val" :disabled="isComponentLocked"/>
					<spacer-vertical/>
					<lockable-button @click="update">Update</lockable-button>
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
					<log-list v-if="logs" :logs="logs"></log-list>
					<span v-else>No logs</span>
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
				//TODO: maybe lock the UI? or at least parts of the UI that interact with the game
			})

			this.c2.registerMessageHandler('game-connection', data => {
				if(data === true){
					this.setStatusSuccess('Game connected', 3000)

					this.syncAllData()
				} else {
					this.setStatusError('Game disconnected')
				}
			})

		})

		this.c2.on('setup-done', ()=>{

			this.c2.webclient.on('connected', ()=>{
				this.setStatusSuccess('Server Connected')
			})

			this.c2.webclient.on('disconnected', ()=>{
				this.setStatusError('Server Connection Lost')
			})
		})
	}

	syncAllData(){
		this.c2.webclient.sendMessage('command-sync-all')
		.then(_ => this.log('started sync all ...'))
		.catch(err => this.error('error while syncing all', err))
	}

	// TODO: rework this to use registerStorable()

	setStatus(message, clazz, /* optional */hideAfterTime){
		this.log('setStatus', message)
		this.c2.store.dispatch('setStatus', {
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
}