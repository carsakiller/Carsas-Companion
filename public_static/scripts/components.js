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
			isLocked: false
		}
	},
	methods: {
		lockComponent: function(){
			this.isLocked = true
		},
		unlockComponent: function(){
			this.isLocked = false
		}
	}
}

Vue.component('lockable', {
	template: `<div class="lockable">
		<div v-if="parentIsLocked" class="lock_overlay"></div>
	</div>`,
	methods: {
		lockParent (){
			this.$parent.isLocked = true
		}
	},
	computed: {
		parentIsLocked: function(){
			return this.$parent.isLocked
		}
	},
	mounted: function(){
		this.$parent.$el.style = 'position: relative; background: red;'
	}
})


Vue.component('tab-players', {
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

Vue.component('player-list', {
	props: ['players'],
	template: `<div class="player_list">
		<player v-for="player in players" v-bind:player="player" v-bind:key="player.id"></player>
	</div>`
})

Vue.component('player', {
	data: function (){
		return {
			isExtended: false
		}
	},
	props: ['player'],
	template: `<div class="player" key="{{player.id}}">
		<div class="head" v-on:click="isExtended = !isExtended">
			<span class="id">{{player.id}}</span>
			<div class="name_container">
				<div class="name">{{player.name}}
					<span class="im im-angle-up extend_arrow" v-if="isExtended"></span>
					<span class="im im-angle-down extend_arrow" v-else></span>
				</div>
				<a class="steamid" v-once v-bind:href="'https://steamcommunity.com/profiles/' + this.player.steamid">{{player.steamid}}</a>
			</div>
			<div class="gap">
			</div>
			<div class="buttons">
				<button class="button" v-on:click="kick">Kick</button>
				<button class="button" v-on:click="ban">Ban</button>
			</div>
		</div>

		<div class="body" v-if="isExtended">
			<player-role v-for="role in player.roles" v-bind:role="role" v-bind:player="player" v-bind:key="role.id"></player-role>
		</div>
	</div>`,
	methods: {
		kick: function (){
			alert('not implemented')
		},
		ban: function (){
			alert('not implemented')
		}
	}
})

Vue.component('player-role', {
	data: function (){
		return {
			enabledClass: 'enabled',
			disabledClass: 'disabled'
		}
	},
	props: ['role', 'player'],
	template: `<div class="player_role" key="{{role.id}}" v-bind:class="role.isEnabled ? enabledClass : disabledClass">
		<lockable/>
		<span class="name">{{role.name}}</span>

		<button class="small_button" v-if="role.isEnabled" v-on:click.stop="enableRole"><span class="im im-minus"></span></button>
		<button class="small_button" v-else v-on:click.stop="disableRole"><span class="im im-plus"></span></button>
	</div>`,
	methods: {
		enableRole () {
			this.lockComponent()
			C2WebClient.sendCommand('giveRole', [this.$store.userPeerId, this.player.id, this.role]).then((res)=>{
				console.log('giveRole was successful', res)
			}).catch((err)=>{
				console.log('giveRole was error', err)
			}).finally(()=>{
				this.unlockComponent()
			})
		},
		disableRole () {
			this.lockComponent()
			C2WebClient.sendCommand('revokeRole', [this.$store.userPeerId, this.player.id, this.role]).then((res)=>{
				console.log('revokeRole was successful', res)
			}).catch((err)=>{
				console.log('revokeRole was error', err)
			}).finally(()=>{
				this.unlockComponent()
			})
		}
	},
	mixins: [lockableComponent]
})


Vue.component('tab-logs', {
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

Vue.component('logs-list', {
	props: ['logs'],
	template: `<div class="logs_list">
		<log-entry v-for="(entry, entry_index) of logs" v-bind:entry="entry" v-bind:key="entry_index"></log-entry>
	</div>`
})

Vue.component('log-entry', {
	props: ['entry'],
	template: `<div class="log_entry">
		<div class="time">{{new Date(entry.time).toLocaleString()}}</div>
		<div class="message">{{entry.message}}</div>
	</div>`
})
