
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
			isUnlockComponentOnNextSync: false
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
		}
	},
	updated (){
		setTimeout(()=>{
			if(this.isUnlockComponentOnNextSync){
				this.isUnlockComponentOnNextSync = false
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

registerVueComponent('division', {
	data: function (){
		return {
			isExtended: false
		}
	},
	props: ['name', 'startExtended'],
	template: `<div class="division">
		<div class="division_head" v-if="name" v-on:click="isExtended = !isExtended">
			<h3>{{name}}</h3>
			<span class="extend_arrow im im-angle-up" v-if="isExtended"></span>
			<span class="extend_arrow im im-angle-down" v-else></span>
		</div>
		<div v-if="isExtended" class="division_body">
			<slot>
			</slot>
		</div>
	</div>`,
	mounted: function (){
		this.isExtended = this.$props.name ? this.$props.startExtended === true : true
	}
})

/*

---- COMPONENTS ----

*/

registerVueComponent('tab-players', {
	props: ['players'],
	template: `<div class="tab_players">
		<div class="tab_head">
			<h2>Player Management</h2>
		</div>
		<div class="tab_body">
			<player-list v-bind:players="players"/>
		</div>
	</div>`
})

registerVueComponent('player-list', {
	props: ['players'],
	template: `<div class="list player_list">
		<player v-for="(player, steamid) in players" v-bind:player="player" v-bind:steamid="steamid" v-bind:key="steamid"/>
	</div>`
})

registerVueComponent('player', {
	data: function (){
		return {
			isExtended: false
		}
	},
	props: ['player', 'steamid'],
	template: `<div class="player" key="{{player.id}}" v-bind:class="[{is_banned: player.banned}]">
		<div class="head" v-on:click="isExtended = !isExtended">
			
			<div class="state">
				<span class="id" v-if="player.peer_id">{{player.peer_id}}</span>
				<span class="offline im im-power" v-else></span>
			</div>

			<div class="name_container">
				<div class="name">{{player.name}}
					<span class="im im-angle-up extend_arrow" v-if="isExtended"></span>
					<span class="im im-angle-down extend_arrow" v-else></span>
				</div>
				<a class="steamid" target="_blank" rel="noopener noreferrer" v-bind:href="'https://steamcommunity.com/profiles/' + this.steamid"><span class="icon im im-external-link"></span>{{steamid}}</a>
			</div>

			<div class="gap"/>

			<div class="buttons">
				<button v-on:click="kick">Kick</button>
				<button v-on:click="ban">Ban</button>
			</div>
		</div>

		<div class="body" v-if="isExtended">
			<player-role v-for="(hasRole, roleName) in player.roles" v-bind:hasRole="hasRole" v-bind:roleName="roleName" v-bind:player="player" v-bind:key="roleName"/>
		</div>
	</div>`,
	methods: {
		kick (){
			alert('not implemented')//TODO: requires new command			
		},
		ban (){
			this.callGameCommandAndWaitForSync('banPlayer', [this.player.steamid])
		},
		unban (){
			this.callGameCommandAndWaitForSync('unban', [this.player.steamid])
		}
	}
})

registerVueComponent('player-role', {
	data: function (){
		return {
			enabledClass: 'enabled',
			disabledClass: 'disabled'
		}
	},
	props: ['hasRole', 'roleName', 'player'],
	template: `<div class="player_role" v-bind:class="hasRole ? enabledClass : disabledClass">
		<lockable/>
		<span class="name">{{roleName}}</span>

		<button class="small_button" v-if="hasRole" v-on:click.stop="revokeRole"><span class="im im-minus"></span></button>
		<button class="small_button" v-else v-on:click.stop="giveRole"><span class="im im-plus"></span></button>
	</div>`,
	methods: {
		giveRole () {
			this.callGameCommandAndWaitForSync('giveRole', [this.$store.state.userPeerId, this.player.peer_id, this.roleName])
		},
		revokeRole () {
			this.callGameCommandAndWaitForSync('revokeRole', [this.$store.state.userPeerId, this.player.peer_id, this.roleName])
		}
	},
	mixins: [gameCommandMixin]
})

registerVueComponent('tab-vehicles', {
	props: ['vehicles'],
	template: `<div class="tab_vehicles">
		<div class="tab_head">
			<h2>Vehicle Management</h2>
		</div>
		<div class="tab_body">
			<vehicle-list v-bind:vehicles="vehicles"/>
		</div>
	</div>`
})

registerVueComponent('vehicle-list', {
	props: ['vehicles'],
	template: `<div class="list vehicle_list">
		<vehicle v-for="(vehicle, vehicleId) of vehicles" v-bind:vehicle="vehicle" v-bind:vehicleId="vehicleId" v-bind:key="vehicle_id"/>
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

registerVueComponent('tab-roles', {
	props: ['roles'],
	template: `<div class="tab_roles">
		<div class="tab_head">
			<h2>Role Management</h2>
		</div>
		<div class="tab_body">
			<role-list v-bind:roles="roles"/>
		</div>
	</div>`
})

registerVueComponent('role-list', {
	props: ['roles'],
	template: `<div class="list role_list">
		<role v-for="(role, roleName) of roles" v-bind:role="role" v-bind:key="roleName"/>
	</div>`
})

registerVueComponent('role', {
	props: ['role', 'roleName'],
	template: `<div class="role">
		<span class="name">{{roleName}}</span>
		<div class="requirements">
			<span class="admin im im-crown" v-if="role.admin"></span>
			<span class="auth im im-check-mark" v-if="role.auth"></span>
		</div>

		<command-list v-bind:commands="role.commands"/>
		
		<member-list v-bind:members="role.members"/>

		<div class="gap"/>

		<div class="buttons">
			<button v-on:click="remove">Delete</button>
		</div>
	</div>`,
	methods: {
		remove (){
			alert('not implemented')
		}
	}
})

registerVueComponent('command-list', {
	props: ['commands'],
	template: `<div class="list command_list">
		<span v-for="(isCommand, commandName, index) of roles" v-bind:key="commandName">{{commandName}}
			<span v-if="index != Object.keys(commands).length - 1">, </span>
		</span>
	</div>`
})

registerVueComponent('member-list', {
	props: ['members'],
	template: `<div class="list member_list">
		<span v-for="(steamid, index) of members" v-bind:key="steamid">{{steamid}}
			<span v-if="index != Object.keys(members).length - 1">, </span>
		</span>
	</div>`
})

registerVueComponent('tab-rules', {
	data: function (){
		return {
			newRuleText: ''
		}
	},
	props: ['rules'],
	template: `<div class="tab_rules">
		<div class="tab_head">
			<h2>Rules Management</h2>
		</div>
		<div class="tab_body">
			<division class="new_rule_container" v-bind:startExtended="true">
				<textarea v-model="newRuleText" placeholder="New rule text" cols="30" roles="5"/>
				<button v-on:click="addNewRule">Add Rule</button>
			</division>
			<rule-list v-bind:rules="rules"/>
		</div>
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




registerVueComponent('tab-preferences', {
	props: ['preferences'],
	template: `<div class="tab_preferences">
		<div class="tab_head">
			<h2>C2 Preferences</h2>
		</div>
		<div class="tab_body">
			TODO
		</div>
	</div>`
})


registerVueComponent('tab-gamesettings', {
	props: ['gamesettings'],
	template: `<div class="tab_gamesettings">
		<div class="tab_head">
			<h2>Game Settings</h2>
		</div>
		<div class="tab_body">
			TODO
		</div>
	</div>`
})

registerVueComponent('tab-banned', {
	props: ['banned'],
	template: `<div class="tab_banned">
		<div class="tab_head">
			<h2>Banned Players</h2>
		</div>
		<div class="tab_body">
			TODO
		</div>
	</div>`
})

registerVueComponent('tab-logs', {
	props: ['logs'],
	template: `<div class="tab_logs">
		<div class="tab_head">
			<h2>Logs Management</h2>
		</div>
		<div class="tab_body">
			<log-list v-bind:logs="logs"></log-list>
		</div>
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
