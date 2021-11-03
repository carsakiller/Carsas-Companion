/*

	GLOBAL

*/

c2.register.register('VueComponent', {
	name: 'status-bar',
	options: {
		computed: {
			status (){
				return this.$store.state.status
			}
		},
		template: `<div class="status_bar" v-show="status.message" :class="status.clazz">
			{{status.message}}
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'error-popup',
	options: {
		computed: {
			theError (){
				return this.$store.state.error
			}
		},
		template: `<div class="error_popup" v-show="theError.message">
			<div class="inner">
				<p class="title">{{theError.title}}</p>
				<textarea class="message" cols="30" rows="5" readonly="true" wrap="hard">{{theError.message}}</textarea>
				<button onclick="document.location.reload()">Reload Page</button>
			</div>
		</div>`
	}
})


/*

	PAGE INFO

*/

c2.register.register('Page',{
	name: 'Home',
	icon: 'home',
	componentName: 'info'
})

c2.register.register('VueComponent', {
	name: 'info',
	options: {
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
	}
})

/*

	PAGE PLAYERS MANAGEMENT

*/

c2.register.register('Page',{
	name: 'Players',
	icon: 'users',
	componentName: 'players-management'
})

c2.register.register('VueComponent', {
	name: 'players-management',
	options: {
		computed: {
			players (){
				return this.$store.state.players
			}
		},
		template: `<div class="players_management">
			<player-list v-bind:players="players"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'player-list',
	options: {
		props: {
			players: {
				type: Object,
				required: true
			}
		},
		template: `<div class="list player_list">
			<player v-for="(player, steamid) in players" :player="player" :steamid="steamid" :key="steamid"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'player',
	options: {
		computed: {
			isBanned (){
				return !!this.bannedPlayers[this.steamid]
			},
			bannedPlayers (){
				return this.$store.state.bannedplayers
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
		template: `<extendable v-slot="extendableProps" class="player" key="{{player.id}}" :class="[{is_banned: isBanned}]">

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
					<confirm-button v-if="!isBanned" v-on:click.stop="kick">Kick</confirm-button>
					<confirm-button v-if="!isBanned" v-on:click.stop="ban" :time="2">Ban</confirm-button>
					<confirm-button v-else v-on:click.stop="unban">Unban</confirm-button>
				</div>
			</div>

			<extendable-body class="body" :showShadow="true">
				<p v-if="player.banned">Player was banned by <steamid :steamid="banned[steamid]"/>.</p>

				<spacer-horizontal/>

				<tabs>
					<tab :title="'Roles'">
						<player-role v-for="(hasRole, roleName) in player.roles" :hasRole="hasRole" :roleName="roleName" :key="roleName"/>
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
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'player-state',
	options: {
		props: {
			player: {
				type: Object,
				required: true
			}
		},
		template: `<div class="player_state">
			<span class="id" v-if="player.peer_id">{{player.peer_id}}</span>
			<span class="offline im im-power" v-else></span>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'player-role',
	options: {
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

			<button class="small_button" v-if="hasRole" v-on:click.stop="revokeRole"><span class="im im-minus"></span></button>
			<button class="small_button" v-else v-on:click.stop="giveRole"><span class="im im-plus"></span></button>
		</div>`,
		methods: {
			giveRole () {
				this.callGameCommandAndWaitForSync('giveRole', [this.steamid, this.roleName])
			},
			revokeRole () {
				this.callGameCommandAndWaitForSync('revokeRole', [this.steamid, this.roleName])
			}
		},
		mixins: [gameCommandMixin]
	}
})

/*

	PAGE VEHICLES MANAGEMENT

*/

c2.register.register('Page',{
	name: 'Vehicles',
	icon: 'car',
	componentName: 'vehicles-management'
})

c2.register.register('VueComponent', {
	name: 'vehicles-management',
	options: {
		computed: {
			vehicles (){
				return this.$store.state.vehicles
			}
		},
		template: `<div class="vehicles_management">
			<vehicle-list :vehicles="vehicles"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'vehicle-list',
	options: {
		props: {
			vehicles: {
				type: Object,
				required: true
			}
		},
		template: `<div class="list vehicle_list">
			<vehicle v-for="(vehicle, vehicleId) of vehicles" :vehicle="vehicle" :vehicleId="parseInt(vehicleId)" :key="vehicleId"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'vehicle',
	options: {
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
			<span class="owner">{{vehicle.owner}}</span>

			<div class="gap"/>

			<div class="buttons">
				<confirm-button @click="despawn">Despawn</confirm-button>
			</div>
		</div>`,
		methods: {
			despawn (){
				alert('not implemented')
			}
		}
	}
})

/*

	PAGE ROLES MANAGEMENT

*/

c2.register.register('Page',{
	name: 'Roles',
	icon: 'crown',
	componentName: 'roles-management'
})

c2.register.register('VueComponent', {
	name: 'roles-management',
		options: {
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
				<input v-model="newRoleText" placeholder="New Role Name"/>
				<button @click="addNewRole">Add new Role</button>
			</division>
			<role-list :roles="roles"/>
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
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'role-list',
	options: {
		props: {
			roles: {
				type: Object,
				required: true
			}
		},
		template: `<div class="list role_list">
			<role v-for="(role, roleName) of roles" :role="role" :roleName="roleName" :key="roleName"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'role',
	options: {
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
				for(let commandName of Object.keys(this.$store.state.allCommands)){
					if(!ret[commandName]){
						ret[commandName] = false
					}
				}

				return ret
			},
			playersThatAreNotAMember (){//TODO: show that in a popup so one can select it
				let ret = []

				for(let steamid of Object.keys(this.$store.getters.players)){
					if(! this.members.includes(steamid)){
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
					<confirm-button @click="remove" :serious="true">Remove</confirm-button>
				</div>
			</div>

			<extendable-body class="role_body" :showShadow="true">
				<tabs>
					<tab :title="'Members'">
						<button class="add_member" @click="addMember">
							<span class="im im-plus"/>
						</button>
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
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'requirements',
	options: {
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
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'command-list',
	options: {
		props: {
			commands: {
				type: Object,
				required: true
			}
		},
		template: `<div class="list command_list">
			<command v-for="(isCommand, commandName, index) of commands" :key="commandName" :isCommand="isCommand" :commandName="commandName"/>
			<spacer-horizontal/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'command',
	options: {
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
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'member-list',
	options: {
		props: {
			members: {
				type: Array,
				required: true
			}
		},
		template: `<div class="list member_list">
			<member v-for="steamid of members" :key="steamid" :steamid="steamid"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'member',
	options: {
		props: {
			steamid: {
				type: String,
				required: true
			}
		},
		inject: ['roleName'],
		template: `<div class="member">
			<lockable/>
			<player-state :player="getPlayer()"/>
			<spacer-vertical/>
			<span class="name">{{getPlayer() ? getPlayer().name : 'Unknown'}}</span>
			<spacer-vertical/>
			<button class="small_button im im-minus" @click="removeMember()"></button>
		</div>`,
		methods: {
			getPlayer (){
				return this.$store.state.players[this.steamid]
			},
			removeMember (){
				this.callGameCommandAndWaitForSync('revokeRole ', [this.steamid, this.roleName])
			}
		},
		mixins: [gameCommandMixin]
	}
})

/*

	PAGE RULES MANAGEMENT

*/

c2.register.register('Page',{
	name: 'Rules',
	icon: 'task-o',
	componentName: 'rules-management'
})

c2.register.register('VueComponent', {
	name: 'rules-management',
	options: {
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
				<textarea v-model="newRuleText" placeholder="New rule text" cols="30" rows="5"/>
				<button @click="addNewRule">Add new Rule</button>
			</division>
			<rule-list :rules="rules"/>
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
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'rule-list',
	options: {
		props: {
			rules: {
				type: Array,
				required: true
			}
		},
		template: `<div class="list rule_list">
			<rule v-for="(rule, index) of rules" :rule="rule" :index="index"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'rule',
	options: {
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
			<confirm-button class="small_button" @click="remove">
				<span class="im im-minus"/>
			</confirm-button>
		</div>`,
		methods: {
			remove (){
				this.callGameCommandAndWaitForSync('removeRule', this.index + 1)
			}
		},
		mixins: [gameCommandMixin]
	}
})

/*

	PAGE PREFERENCES MANAGEMENT

*/

c2.register.register('Page',{
	name: 'Preferences',
	icon: 'control-panel',
	componentName: 'preferences-management'
})

c2.register.register('VueComponent', {
	name: 'preferences-management',
	options: {
		computed: {
			preferences (){
				return this.$store.state.preferences
			}
		},
		template: `<div class="preferences_management">
			<preference-list :preferences="preferences"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'preference-list',
	options: {
		props: {
			preferences: {
				type: Object,
				required: true
			}
		},
		template: `<div class="list preference_list">
			<preference v-for="(preference, preferenceName) in preferences" :preference="preference" :preferenceName="preferenceName"/>
			<spacer-horizontal/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'preference',
	options: {
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
	}
})

c2.register.register('VueComponent', {
	name: 'preference-bool',
	options: {
		inject: ['preference', 'preferenceName'],
		template: `<toggleable-element class="preference_bool" :initial-value="preference.value" :on-value-change="preferenceChanged"/>`,
		methods: {
			preferenceChanged (name, value){
				this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, value])
			}
		},
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'preference-string',
	options: {
		data: function (){
			return {
				val: ''
			}
		},
		inject: ['preference', 'preferenceName'],
		template: `<div class="preference_string">
			<textarea v-model="val" cols="30" rows="5"/>
			<spacer-vertical/>
			<button @click="update">Update</button>
		</div>`,
		created: function (){
			this.val = this.preference.value
		},
		methods: {
			update (){
				this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, this.val])
			}
		},
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'preference-number',
	options: {
		data: function (){
			return {
				val: 0
			}
		},
		inject: ['preference', 'preferenceName'],
		template: `<div class="preference_number">
			<input type="number" v-model="val"/>
			<spacer-vertical/>
			<button @click="update">Update</button>
		</div>`,
		created: function (){
			this.val = this.preference.value
		},
		methods: {
			update (){
				this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, this.val])
			}
		},
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'preference-table',
	options: {
		data: function (){
			return {
				val: ''
			}
		},
		inject: ['preference', 'preferenceName'],
		template: `<div class="preference_table">
			<textarea type="number" v-model="val" cols="30" rows="5"/>
			<spacer-vertical/>
			<button @click="update">Update</button>
		</div>`,
		created: function (){
			this.val = JSON.stringify(this.preference.value)
		},
		methods: {
			update (){
				this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, this.val])
			}
		},
		mixins: [gameCommandMixin]
	}
})

/*

	PAGE GAME SETTINGS MANAGEMENT

*/

c2.register.register('Page',{
	name: 'Game Settings',
	icon: 'wrench',
	componentName: 'gamesettings-management'
})

c2.register.register('VueComponent', {
	name: 'gamesettings-management',
	options: {
		computed: {
			gamesettings (){
				return this.$store.state.gamesettings
			}
		},
		template: `<div class="gamesettings_management">
			<gamesetting-list :gamesettings="gamesettings"/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'gamesetting-list',
	options: {
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
	}
})

c2.register.register('VueComponent', {
	name: 'gamesetting',
	options: {
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
	}
})

c2.register.register('VueComponent', {
	name: 'gamesetting-bool',
	options: {
		inject: ['gamesetting', 'gamesettingName'],
		template: `<toggleable-element class="gamesetting_bool" :initial-value="gamesetting" :on-value-change="gamesettingChanged"/>`,
		methods: {
			gamesettingChanged (name, value){
				this.callGameCommandAndWaitForSync('setGameSetting', [this.gamesettingName, value])
			}
		},
		mixins: [gameCommandMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'gamesetting-number',
	options: {
		data: function (){
			return {
				val: 0
			}
		},
		inject: ['gamesetting', 'gamesettingName'],
		template: `<div class="gamesetting_number">
			<input type="number" v-model="val"/>
			<spacer-vertical/>
			<button @click="update">Update</button>
		</div>`,
		created: function (){
			this.val = this.gamesetting
		},
		methods: {
			update (){
				this.callGameCommandAndWaitForSync('setGameSetting', [this.gamesettingName, this.val])
			}
		},
		mixins: [gameCommandMixin]
	}
})

/*

	PAGE LOGS MANAGEMENT

*/
c2.register.register('Page',{
	name: 'Logs',
	icon: 'note-o',
	componentName: 'logs-management'
})

c2.register.register('VueComponent', {
	name: 'logs-management',
	options: {
		computed: {
			logs (){
				return this.$store.state.logs
			}
		},
		template: `<div class="logs_management">
			<log-list v-bind:logs="logs"></log-list>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'log-list',
	options: {
		props: {
			logs: {
				type: Array,
				required: true
			}
		},
		template: `<div class="log_list">
			<log-entry v-for="(entry, entry_index) of logs" :entry="entry" :key="entry_index"></log-entry>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'log-entry',
	options: {
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
	}
})
