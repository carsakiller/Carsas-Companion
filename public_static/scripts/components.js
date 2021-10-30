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
let lockableComponent = {
	data: function(){
		return {
			isComponentLocked: false,
			isUnlockComponentOnNextSync: false
		}
	},
	methods: {
		lockComponent (){
			this.isComponentLocked = true
		},
		lockComponentUntilSync (){
			this.isComponentLocked = true
			this.unlockComponentOnNextSync()
		},
		unlockComponent (){
			this.isComponentLocked = false
		},
		unlockComponentOnNextSync (){
			console.log('unlockComponentOnNextSync', this.$el)
			this.isUnlockComponentOnNextSync = true
		}
	},
	beforeUpdate (){
		console.log('beforeUpdate', this.$el, this.isUnlockComponentOnNextSync, this.isComponentLocked)
	},
	updated (){
		setTimeout(()=>{
			console.log('updated', this.$el, this.isUnlockComponentOnNextSync, this.isComponentLocked)
			if(this.isUnlockComponentOnNextSync){
				this.isUnlockComponentOnNextSync = false
				this.unlockComponent()
			}
		}, 1)
	}
}

app.component('lockable', {
	template: `<div class="lockable">
		<div v-if="parentIsComponentLocked" class="lock_overlay"></div>
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
		this.$parent.$el.style = 'position: relative; background: red;'
	}
})


app.component('tab-players', {
	props: ['players'],
	template: `<div class="tab_players">
		<div class="tab_head">
			<h2>Player Management</h2>
		</div>
		<div class="tab_body">
			<player-list v-bind:players="players"></player-list>
		</div>
	</div>`
})

app.component('player-list', {
	props: ['players'],
	template: `<div class="player_list">
		<player v-for="(player, steamid) in players" v-bind:player="player" v-bind:steamid="steamid" v-bind:key="steamid"></player>
	</div>`
})

app.component('player', {
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
				<a class="steamid" target="_blank" rel="noopener noreferrer" v-bind:href="'https://steamcommunity.com/profiles/' + this.steamid">{{steamid}}</a>
			</div>
			<div class="gap">
			</div>
			<div class="buttons">
				<button class="button" v-on:click="kick">Kick</button>
				<button class="button" v-on:click="ban">Ban</button>
			</div>
		</div>

		<div class="body" v-if="isExtended">
			<player-role v-for="(hasRole, roleName) in player.roles" v-bind:hasRole="hasRole" v-bind:roleName="roleName" v-bind:player="player" v-bind:key="roleName"></player-role>
		</div>
	</div>`,
	methods: {
		kick (){
			alert('not implemented')
		},
		ban (){
			alert('not implemented')
		}
	}
})

app.component('player-role', {
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
			this.lockComponentUntilSync()
			C2WebClient.sendCommand('giveRole', [this.$store.state.userPeerId, this.player.peer_id, this.roleName]).then((res)=>{
				console.log('giveRole was successful', res)
			}).catch((err)=>{
				console.log('giveRole was error', err)
				this.unlockComponent()
			})
		},
		revokeRole () {
			this.lockComponentUntilSync()
			C2WebClient.sendCommand('revokeRole', [this.$store.state.userPeerId, this.player.peer_id, this.roleName]).then((res)=>{
				console.log('revokeRole was successful', res)
			}).catch((err)=>{
				console.log('revokeRole was error', err)
				this.unlockComponent()
			})
		}
	},
	mixins: [lockableComponent]
})


app.component('tab-logs', {
	props: ['logs'],
	template: `<div class="tab_logs">
		<div class="tab_head">
			<h2>Logs Management</h2>
		</div>
		<div class="tab_body">
			<logs-list v-bind:logs="logs"></logs-list>
		</div>
	</div>`
})

app.component('logs-list', {
	props: ['logs'],
	template: `<div class="logs_list">
		<log-entry v-for="(entry, entry_index) of logs" v-bind:entry="entry" v-bind:key="entry_index"></log-entry>
	</div>`
})

app.component('log-entry', {
	props: ['entry'],
	template: `<div class="log_entry">
		<div class="time">{{new Date(entry.time).toLocaleString()}}</div>
		<div class="message">{{entry.message}}</div>
	</div>`
})
