

registerVueComponent('status-bar', {
	computed: {
		status (){
			return this.$store.state.status
		}
	},
	template: `<div class="status_bar" v-show="status.message" :class="status.clazz">
		{{status.message}}
	</div>`
})


registerVueComponent('page', {
	data: function (){
		return {
			isSelected: false
		}
	},
	props: {
		title: {
			type: String,
			default: 'Page',
			required: false
		},
		icon: {
			type: String,
			default: '',
			required: false
		}
	},
	template: `<div class="page" v-show="isSelected">
		<div class="page_head">
			<h2>{{title}}</h2>
		</div>
		<div class="page_body">
			<slot/>
		</div>
	</div>`,
	created: function(){
		this.$parent.pages.push(this)
	}
})

registerVueComponent('pages', {
	data: function (){
		return {
			selectedIndex: 0,
			pages: []
		}
	},
	props: {
		'initial-index': {
			type: Number,
			default: 0,
			required: false
		}
	},
	template: `<div class="pages">
		<div class="sidebar">
			<div v-for="(page, index) in pages" :key="index" @click="selectPage(index)" :class="['entry', {selected: (index === selectedIndex)}]" :alt="page.title">
				<span :class="['im', 'im-' + page.icon]"/>
			</div>
		</div>

		<slot/>
	</div>`,
	methods: {
		selectPage (i){
			this.selectedIndex = i

			this.pages.forEach((page, index) => {
		    	page.isSelected = (index === i)
		    })
		}
	},
	created: function (){
		this.selectedIndex = this.initialIndex
	},
	mounted: function (){
		this.selectPage(this.selectedIndex)
	}
})

registerVueComponent('players-management', {
	computed: {
		players (){
			return this.$store.state.players
		}
	},
	template: `<div class="players_management">
		<player-list v-bind:players="players"/>
	</div>`
})

registerVueComponent('player-list', {
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

registerVueComponent('player', {
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
		<div class="head">
			<player-state :player="player"/>

			<extendable-trigger class="name_container">
				<div class="name">{{player.name}}
					<span class="im im-angle-up extend_arrow" v-if="extendableProps.isExtended"></span>
					<span class="im im-angle-down extend_arrow" v-else></span>
				</div>
				<steamid :steamid="steamid"/>
			</extendable-trigger>

			<div class="gap"/>

			<div class="buttons">
				<confirm-button v-if="!isBanned" v-on:click.stop="kick">Kick</confirm-button>
				<confirm-button v-if="!isBanned" v-on:click.stop="ban">Ban</confirm-button>
				<confirm-button v-else v-on:click.stop="unban">Unban</confirm-button>
			</div>
		</div>

		<extendable-body class="body">
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
})

registerVueComponent('player-state', {
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
})

registerVueComponent('player-role', {
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
})

registerVueComponent('vehicles-management', {
	computed: {
		vehicles (){
			return this.$store.state.vehicles
		}
	},
	template: `<div class="vehicles_management">
		<vehicle-list :vehicles="vehicles"/>
	</div>`
})

registerVueComponent('vehicle-list', {
	props: {
		vehicles: {
			type: Object,
			required: true
		}
	},
	template: `<div class="list vehicle_list">
		<vehicle v-for="(vehicle, vehicleId) of vehicles" :vehicle="vehicle" :vehicleId="vehicleId" :key="vehicleId"/>
	</div>`
})

registerVueComponent('vehicle', {
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
			<button @click="despawn">Despawn</button>
		</div>
	</div>`,
	methods: {
		despawn (){
			alert('not implemented')
		}
	}
})

registerVueComponent('roles-management', {
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
})

registerVueComponent('role-list', {
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

registerVueComponent('role', {
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
		}
	},
	template: `<extendable class="role">
		<div class="role_top_container">
			<extendable-trigger :useDefaultArrows="true">
				<span class="name">{{roleName}}</span>
			</extendable-trigger>

			<div class="buttons">
				<button @click="remove">Delete</button>
			</div>
		</div>

		<spacer-horizontal/>

		<extendable-body>
			<tabs>
				<tab :title="'Members'">
					<member-list :members="role.members"/>
				</tab>
				<tab :title="'Commands'">
					<command-list :commands="allCommands"/>
				</tab>
				<tab :title="'Permissions'">
					
					<spacer-horizontal/>

					<p>If a player has this role, we will give him the ingame "auth" and/or "admin" rights which are necessary to use certain features (e.g. workbench) and commands (e.g. "?reload_scripts").</p>
					
					<spacer-horizontal/>

					<requirements :role="role"/>
				</tab>
			</tabs>
		</extendable-body>
	</extendable>`,
	methods: {
		remove (){
			alert('not implemented')
		}
	}
})

registerVueComponent('requirements', {
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
			this.log('onRequirementChange', name, value)
			let updatedRole = {
				admin: this.role.admin,
				auth: this.role.auth
			}

			updatedRole[name] = value

			this.callGameCommandAndWaitForSync('rolePerms', [this.roleName, updatedRole.admin, updatedRole.auth])
		}
	},
	mixins: [gameCommandMixin]
})


registerVueComponent('command-list', {
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
})

registerVueComponent('command', {
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
})

registerVueComponent('member-list', {
	props: {
		members: {
			type: Array,
			required: true
		}
	},
	template: `<div class="list member_list">
		<member v-for="(steamid, index) of members" :key="steamid" :steamid="steamid"/>
	</div>`
})

registerVueComponent('member', {
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
		<span class="small_button im im-minus" @click="removeMember()"></span>
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
})

registerVueComponent('rules-management', {
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
})

registerVueComponent('rule-list', {
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

registerVueComponent('rule', {
	props: {
		rule: {
			type: Object,
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
		<span class="small_button im im-minus" @click="remove"/>
	</div>`,
	methods: {
		remove (){
			this.callGameCommandAndWaitForSync('removeRule', this.index + 1)
		}
	},
	mixins: [gameCommandMixin]
})




registerVueComponent('preferences-management', {
	computed: {
		preferences (){
			return this.$store.state.preferences
		}
	},
	template: `<div class="preferences_management">
		<preference-list :preferences="preferences"/>
	</div>`
})

registerVueComponent('preference-list', {
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
})

registerVueComponent('preference', {
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

registerVueComponent('preference-bool', {
	inject: ['preference', 'preferenceName'],
	template: `<toggleable-element class="preference_bool" :initial-value="preference.value" :on-value-change="preferenceChanged"/>`,
	methods: {
		preferenceChanged (name, value){
			this.callGameCommandAndWaitForSync('setPref', [this.preferenceName, value])
		}
	},
	mixins: [gameCommandMixin]
})

registerVueComponent('preference-string', {
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
})

registerVueComponent('preference-number', {
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
})

registerVueComponent('preference-table', {
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
})


registerVueComponent('gamesettings-management', {
	computed: {
		gamesettings (){
			return this.$store.state.gamesettings
		}
	},
	template: `<div class="gamesettings_management">
		<gamesetting-list :gamesettings="gamesettings"/>
	</div>`
})


registerVueComponent('gamesetting-list', {
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

registerVueComponent('gamesetting', {
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

registerVueComponent('gamesetting-bool', {
	inject: ['gamesetting', 'gamesettingName'],
	template: `<toggleable-element class="gamesetting_bool" :initial-value="gamesetting" :on-value-change="gamesettingChanged"/>`,
	methods: {
		gamesettingChanged (name, value){
			this.callGameCommandAndWaitForSync('setGameSetting', [this.gamesettingName, value])
		}
	},
	mixins: [gameCommandMixin]
})

registerVueComponent('gamesetting-number', {
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
})

registerVueComponent('logs-management', {
	computed: {
		logs (){
			return this.$store.state.logs
		}
	},
	template: `<div class="logs_management">
		<log-list v-bind:logs="logs"></log-list>
	</div>`
})

registerVueComponent('log-list', {
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

registerVueComponent('log-entry', {
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
