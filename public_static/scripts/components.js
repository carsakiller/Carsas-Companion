
/*

---- UTILITY ----

*/


function registerVueComponent (name, options){
	// set name if not happened (for logging)
	if(!options.name){
		options.name = name
	}

	// add base mixins
	options.mixins = [loggingMixin].concat(options.mixins || [])

	return app.component(name, options)
}

function uuid() {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}

/*

---- MIXINS and BASE COMPONENTS ----

*/




let loggingMixin = {
	data: function (){
		return {
			loglevel: 4
		}
	},
	methods: {
		getThisComponentName (){
			return this.$options.name || '[No name specified]'
		},
		error (...args){
			if( this.loglevel < 1){
				return
			}
			console.error.apply(null, ['Vue Component ' + this.getThisComponentName() + ' Error:'].concat(args))
		},
		warn (...args){
			if( this.loglevel < 2){
				return
			}
			console.warn.apply(null, ['Vue Component ' + this.getThisComponentName() + ' Warn:'].concat(args))
		},
		info (...args){
			if( this.loglevel < 3){
				return
			}
			console.info.apply(null, ['Vue Component ' + this.getThisComponentName() + ':'].concat(args))
		},
		log (...args){
			if( this.loglevel < 4){
				return
			}
			console.log.apply(null, ['Vue Component ' + this.getThisComponentName() + ':'].concat(args))
		}

	}
}

/*

	if you want to have a lockable component then do this:

	Vue.component('my-lockable-component', {
		template: `<div>
			<lockable></lockable>
			<span>Hello World</span>

			<button v-on:click="lockComponent">lock</button>
		</div>`,
		mixins: [lockableComponent]
	}
})

Now you can click the button and lock the component

*/
let lockableComponentMixin = {
	data: function(){
		return {
			isComponentLocked: false,
			isUnlockComponentOnNextSync: false,
			timeSetOnNextSync: 0
		}
	},
	methods: {
		lockComponent (){
			this.log('lockComponent')
			this.isComponentLocked = true
		},
		lockComponentUntilSync (){
			this.log('lockComponentUntilSync')
			this.isComponentLocked = true
			this.unlockComponentOnNextSync()
		},
		unlockComponent (){
			this.log('unlockComponent')
			this.isComponentLocked = false
		},
		unlockComponentOnNextSync (){
			this.log('unlockComponentOnNextSync')
			this.isUnlockComponentOnNextSync = true
			this.timeSetOnNextSync = Date.now()
		}
	},
	updated (){
		setTimeout(()=>{
			if(this.isUnlockComponentOnNextSync && (Date.now() - this.timeSetOnNextSync > 10) ){// a sync from the game will NEVER happen within 10ms (this prevents other update calls to look like a sync) TODO: does it make sense to add a global event ('sync') which is called by "c2webclient" when a sync arrives?
				this.isUnlockComponentOnNextSync = false
				this.timeSetOnNextSync = 0
				this.unlockComponent()
			}
		}, 1)
	}
}

registerVueComponent('lockable', {
	template: `<div class="lockable" v-on:click.stop>
		<div v-if="parentIsComponentLocked" class="lock_overlay"/>
	</div>`,
	methods: {
		lockParent (){
			this.$parent.isComponentLocked = true
		}
	},
	computed: {
		parentIsComponentLocked (){
			return this.$parent.isComponentLocked
		}
	},
	mounted (){
		this.$parent.$el.style = 'position: relative;'
	}
})

let gameCommandMixin = {
	mixins: [lockableComponentMixin],
	methods: {
		callGameCommandAndWaitForSync (command, args){
			return new Promise((fulfill, reject)=>{
				this.lockComponentUntilSync()

				C2WebClient.sendCommand(command, args).then((res)=>{
					this.info('executing command', command,'was successful')
					this.log('args', args, 'result', res)
				}).catch((err)=>{
					this.info('executing command', command,'failed')
					this.log('args', args, 'error', err)
					this.unlockComponent()
				})
			})
		}
	}
}

registerVueComponent('spacer-horizontal', {
	props: {
		height: {
			type: String,
			default: '1em'
		}
	},
	template: `<div :style="'clear: both; height: ' + height"/>`
})

registerVueComponent('spacer-vertical', {
	props: {
		width: {
			type: String,
			default: '1em'
		}
	},
	template: `<div :style="'display: inline-block; width: ' + width"/>`
})

registerVueComponent('steamid', {
	props: {
		steamid: {
			type: String,
			default: ''
		}
	},
	template: `
		<a class="steamid" target="_blank" rel="noopener noreferrer" v-if="steamid.length > 0" v-bind:href="'https://steamcommunity.com/profiles/' + this.steamid"><span class="icon im im-external-link"></span>{{steamid}}</a>
		<span v-else class="steamid">"Invalid SteamId"</span>`
})

registerVueComponent('toggleable-element', {
	data: function (){
		return {
			skipNextWatch: false,
			oldVal: false,
			val: false,
			oldInitialValue: false,
			uiid: uuid()
		}
	},
	props: {
		'initial-value': {
			type: Boolean,
			required: true
		},
		'value-name': {
			type: String,
			required: true
		},
		'onValueChange': {
			type: Function,
			required: true
		}
	},
	template: `<div class="toggleable_element">
		<div class="front">
			<label :for="uiid">
				<input type="checkbox" :id="uiid" v-model="val">
				<span class="checkbox_slider"/>
			</label>
		</div>
		<div class="rear">
			<slot/>
		</div>
	</div>`,
	created: function (){
		this.skipNextWatch = this.initialValue //vue will only call update() if the initialValue is true
		this.val = this.initialValue
		this.oldVal = this.val
		this.oldInitialValue = this.initialValue
	},
	watch: {
		val: function (){
			if(this.skipNextWatch){
				this.skipNextWatch = false
				this.log('skipping watch')
			} else {
				this.log('watch val changed to', this.val)
				this.onValueChange(this.valueName, this.val)
				this.oldVal = this.val
			}
		}
	},
	updated: function (){
		if(this.initialValue !== this.oldInitialValue){
			this.log('updated [cause: props change]', this.valueName, this.initialValue)
			this.skipNextWatch = true
			this.oldInitialValue = this.initialValue
			this.val = this.initialValue
			this.oldVal = this.initialValue
		}
	},
	mixins: [loggingMixin]
})

registerVueComponent('tab', {
	data: function (){
		return {
			isSelected: false
		}
	},
	props: {
		title: {
			type: String,
			default: 'Tab'
		}
	},
	template: `<div class="tab" v-show="isSelected">
		<slot/>
	</div>`,
	created: function(){
		this.$parent.tabs.push(this)
	}
})

registerVueComponent('tabs', {
	data: function (){
		return {
			selectedIndex: 0,
			tabs: []
		}
	},
	template: `<div class="tabs">
		<div class="tabs_selector">
			<div v-for="(tab, index) in tabs" :key="index" @click="selectTab(index)" :class="['entry', {selected: (index === selectedIndex)}]">
				{{tab.title}}
			</div>
		</div>
		
		<slot/>
	</div>`,
	methods: {
		selectTab (i){
			this.selectedIndex = i

			this.tabs.forEach((tab, index) => {
		    	tab.isSelected = (index === i)
		    })
		}
	},
	mounted: function (){
		this.selectTab(0)
	}
})

registerVueComponent('extendable', {
	data: function (){
		return {
			isExtended: false,
			isAnExtendableComponent: true //just a flag so triggers can find it
		}
	},
	props: {
		startExtended: {
			type: Boolean,
			default: false,
			required: false
		}
	},
	template: `<div class="extendable">
		<slot :isExtended="isExtended"/>
	</div>`,
	created: function (){
		this.isExtended = this.startExtended
	},
	methods: {
		toggleExtend (){
			this.isExtended = !this.isExtended
		}
	},
	mixins: [loggingMixin]
})

registerVueComponent('extendable-body', {
	data: function (){
		return {
			extendable: undefined
		}
	},
	computed: {
		isExtended (){
			return this.extendable && this.extendable.isExtended
		}
	},
	template: `<div class="extendable_body" v-if="isExtended">
		<slot :isExtended="isExtended"/>
	</div>`,
	mounted: function (){
		searchForExtendableParentRecursively(this, this.$parent)

		function searchForExtendableParentRecursively(me, node){
			if(node && node.isAnExtendableComponent === true){
				me.extendable = node
				me.log('found an extendable', node)
			} else if (node) {
				searchForExtendableParentRecursively(me, node.$parent)
			}
		}
	},
	mixins: [loggingMixin]
})

registerVueComponent('extendable-trigger', {
	data: function (){
		return {
			extendable: undefined
		}
	},
	props: {
		useDefaultArrows: {
			type: Boolean,
			default: false,
			required: false
		}
	},
	computed: {
		isExtended (){
			return this.extendable && this.extendable.isExtended
		}
	},
	template: `<div class="extendable_trigger" @click.stop="triggerExtendToggle">
		<slot :isExtended="isExtended"/>
		<span class="extend_arrow im im-angle-up" v-if="useDefaultArrows && isExtended"></span>
		<span class="extend_arrow im im-angle-down" v-if="useDefaultArrows && !isExtended"></span>
	</div>`,
	mounted: function (){
		searchForExtendableParentRecursively(this, this.$parent)

		function searchForExtendableParentRecursively(me, node){
			if(node && node.isAnExtendableComponent === true){
				me.extendable = node
				me.log('found an extendable', node)
			} else if (node) {
				searchForExtendableParentRecursively(me, node.$parent)
			}
		}
	},
	methods: {
		triggerExtendToggle (){
			if(this.extendable && typeof this.extendable.toggleExtend){
				this.extendable.toggleExtend()
			}
		},
		registerExtendable (extendable){
			this.log('bound to extendable', extendable)
			this.extendable = extendable
		}
	},
	mixins: [loggingMixin]
})

registerVueComponent('division', {
	data: function (){
		return {
			isExtended: false
		}
	},
	props: ['name', 'startExtended'],
	template: `<extendable class="division" v-slot="extendableProps" :startExtended="startExtended">
		<div class="division_head" v-if="name" v-on:click="isExtended = !isExtended">
			<h3>{{name}}</h3>
			<extendable-trigger :useDefaultArrows="true"/>
		</div>
		<extendable-body class="division_body">
			<slot>
			</slot>
		</extendable-body>
	</extendable>`,
	mounted: function (){
		this.isExtended = this.$props.name ? this.$props.startExtended === true : true
	}
})

/*

---- COMPONENTS ----

*/

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
			default: 'Page'
		},
		icon: {
			type: String,
			default: ''
		}
	},
	template: `<div class="page" v-show="isSelected">
		<status-bar/>
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
		'selectedindex': {
			type: Number,
			default: 0
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
		this.selectedIndex = this.selectedindex
	},
	mounted: function (){
		this.selectPage(this.selectedIndex)
	}
})

registerVueComponent('players-management', {
	props: ['players'],
	template: `<div class="players_management">
		<player-list v-bind:players="players"/>
	</div>`
})

registerVueComponent('player-list', {
	props: ['players'],
	template: `<div class="list player_list">
		<player v-for="(player, steamid) in players" v-bind:player="player" v-bind:steamid="steamid" v-bind:key="steamid"/>
	</div>`
})


registerVueComponent('player-state', {
	props: ['player', 'steamid'],
	template: `<div class="player_state">
		<span class="id" v-if="player.peer_id">{{player.peer_id}}</span>
		<span class="offline im im-power" v-else></span>
	</div>`
})

registerVueComponent('player', {
	computed: {
		isBanned (){
			return !!this.banned[this.steamid]
		}
	},
	inject: ['banned'],
	props: ['player', 'steamid'],
	template: `<extendable v-slot="extendableProps" class="player" key="{{player.id}}" v-bind:class="[{is_banned: isBanned}]">
		<div class="head">
			<player-state :player="player" :steamid="steamid"/>

			<extendable-trigger class="name_container">
				<div class="name">{{player.name}}
					<span class="im im-angle-up extend_arrow" v-if="extendableProps.isExtended"></span>
					<span class="im im-angle-down extend_arrow" v-else></span>
				</div>
				<steamid :steamid="steamid"/>
			</extendable-trigger>

			<div class="gap"/>

			<div class="buttons">
				<button v-if="!isBanned" v-on:click.stop="kick">Kick</button>
				<button v-if="!isBanned" v-on:click.stop="ban">Ban</button>
				<button v-else v-on:click.stop="unban">Unban</button>
			</div>
		</div>

		<extendable-body class="body">
			<p v-if="player.banned">Player was banned by <steamid :steamid="banned[steamid]"/>.</p>

			<spacer-horizontal/>

			<tabs>
				<tab :title="'Roles'">
					<player-role v-for="(hasRole, roleName) in player.roles" v-bind:hasRole="hasRole" v-bind:roleName="roleName" v-bind:player="player" :steamid="steamid" v-bind:key="roleName"/>
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

registerVueComponent('player-role', {
	data: function (){
		return {
			enabledClass: 'enabled',
			disabledClass: 'disabled'
		}
	},
	props: ['hasRole', 'roleName', 'player', 'steamid'],
	template: `<div class="player_role" v-bind:class="hasRole ? enabledClass : disabledClass">
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
	props: ['vehicles'],
	template: `<div class="vehicles_management">
		<vehicle-list v-bind:vehicles="vehicles"/>
	</div>`
})

registerVueComponent('vehicle-list', {
	props: ['vehicles'],
	template: `<div class="list vehicle_list">
		<vehicle v-for="(vehicle, vehicleId) of vehicles" v-bind:vehicle="vehicle" v-bind:vehicleId="vehicleId" v-bind:key="vehicleId"/>
	</div>`
})

registerVueComponent('vehicle', {
	props: ['vehicle', 'vehicleId'],
	template: `<div class="vehicle">
		<span class="id">{{vehicleId}}</span>
		<span class="name">{{vehicle.name}}</span>
		<span class="owner">{{vehicle.owner}}</span>

		<div class="gap"/>

		<div class="buttons">
			<button v-on:click="despawn">Despawn</button>
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
	props: ['roles'],
	template: `<div class="roles_management">
		<division class="new_role_container" v-bind:startExtended="true">
			<input v-model="newRoleText" placeholder="New Role Name"/>
			<button v-on:click="addNewRole">Add new Role</button>
		</division>
		<role-list v-bind:roles="roles"/>
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
	props: ['roles'],
	template: `<div class="list role_list">
		<role v-for="(role, roleName) of roles" v-bind:role="role" v-bind:roleName="roleName" v-bind:key="roleName"/>
	</div>`
})

registerVueComponent('role', {
	props: ['role', 'roleName'],
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
				<button v-on:click="remove">Delete</button>
			</div>
		</div>

		<spacer-horizontal/>

		<extendable-body>
			<tabs>
				<tab :title="'Requirements'">
					
					<spacer-horizontal/>

					<p>If a player has this role, we will give him the ingame "auth" and/or "admin" rights which are necessary to use certain features (e.g. workbench) and commands (e.g. "?reload_scripts").</p>
					
					<spacer-horizontal/>

					<requirement-list v-bind:role="role" :roleName="roleName"/>
				</tab>
				<tab :title="'Commands'">
					<command-list v-bind:commands="allCommands" :roleName="roleName"/>
				</tab>
				<tab :title="'Members'">
					<member-list v-bind:members="role.members" :roleName="roleName"/>
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

registerVueComponent('requirement-list', {
	props: ['role', 'roleName'],
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
	props: ['roleName', 'commands'],
	template: `<div class="list command_list">
		<toggleable-element v-for="(isCommand, commandName, index) of commands" v-bind:key="commandName" :initial-value="isCommand" :value-name="commandName" :on-value-change="onCommandChange">{{commandName}}</toggleable-element>
		<spacer-horizontal/>
	</div>`,
	methods: {
		onCommandChange (name, value){
			this.callGameCommandAndWaitForSync('roleAccess', [this.roleName, name, value])
		}
	},
	mixins: [gameCommandMixin]
})

registerVueComponent('member-list', {
	props: ['members', 'roleName'],
	inject: ['players'],
	template: `<div class="list member_list">
		<div class="member" v-for="(steamid, index) of members" v-bind:key="steamid">
			<player-state :player="getPlayer(steamid)" :steamid="steamid"/>
			<spacer-vertical/>
			<span class="name">{{getPlayer(steamid).name}}</span>
			<spacer-vertical/>
			<span class="small_button im im-minus" @click="removeMember(steamid)"></span>
		</div>
	</div>`,
	methods: {
		getPlayer (steamid){
			return this.players[steamid]
		},
		removeMember (steamid){
			this.callGameCommandAndWaitForSync('revokeRole ', [steamid, this.roleName])
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
	props: ['rules'],
	template: `<div class="rules_management">
		<division class="new_rule_container" v-bind:startExtended="true">
			<textarea v-model="newRuleText" placeholder="New rule text" cols="30" roles="5"/>
			<button v-on:click="addNewRule">Add new Rule</button>
		</division>
		<rule-list v-bind:rules="rules"/>
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
	props: ['rules'],
	template: `<div class="list rule_list">
		<rule v-for="(rule, index) of rules" v-bind:rule="rule" v-bind:index="index"/>
	</div>`
})

registerVueComponent('rule', {
	props: ['rule', 'index'],
	template: `<div class="rule">
		<p class="text">{{rule}}</p>
		<span class="small_button im im-minus" v-on:click="remove"/>
	</div>`,
	methods: {
		remove (){
			this.callGameCommandAndWaitForSync('removeRule', this.index + 1)
		}
	},
	mixins: [gameCommandMixin]
})




registerVueComponent('preferences-management', {
	props: ['preferences'],
	template: `<div class="preferences_management">
		TODO
	</div>`
})


registerVueComponent('gamesettings-management', {
	props: ['gamesettings'],
	template: `<div class="gamesettings_management">
		TODO
	</div>`
})


registerVueComponent('logs-management', {
	props: ['logs'],
	template: `<div class="logs_management">
		<log-list v-bind:logs="logs"></log-list>
	</div>`
})

registerVueComponent('log-list', {
	props: ['logs'],
	template: `<div class="log_list">
		<log-entry v-for="(entry, entry_index) of logs" v-bind:entry="entry" v-bind:key="entry_index"></log-entry>
	</div>`
})

registerVueComponent('log-entry', {
	props: ['entry'],
	template: `<div class="log_entry">
		<div class="time">{{new Date(entry.time).toLocaleString()}}</div>
		<div class="message">{{entry.message}}</div>
	</div>`
})
