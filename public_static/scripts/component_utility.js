
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
			timeSetOnNextSync: 0,
			lockableParents: []
		}
	},
	methods: {
		lockComponent (){
			this.log('lockComponent', this.lockableParents)
			this.isComponentLocked = true			
			for(let lp of this.lockableParents){
				lp.addLockedChild()
			}
		},
		lockComponentUntilSync (){
			this.log('lockComponentUntilSync')
			this.lockComponent()
			this.unlockComponentOnNextSync()
		},
		unlockComponent (){
			this.log('unlockComponent', this.lockableParents)
			this.isComponentLocked = false
			for(let lp of this.lockableParents){
				lp.removeLockedChild()
			}
		},
		unlockComponentOnNextSync (){
			this.log('unlockComponentOnNextSync')
			this.isUnlockComponentOnNextSync = true
			this.timeSetOnNextSync = Date.now()
		}
	},
	created: function (){
		searchForLockableByChildsParentRecursively(this, this.$parent)

		function searchForLockableByChildsParentRecursively(me, node){
			if(node && ('isLockableByChilds' in node)){
				me.lockableParents.push(node)
				me.log('found a lockable by childs parent', node)
			} else if (node) {
				searchForLockableByChildsParentRecursively(me, node.$parent)
			}
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
	template: `<div class="lockable" @click.stop>
		<div v-if="parentIsComponentLocked" class="lock_overlay"/>
	</div>`,
	computed: {
		parentIsComponentLocked (){
			return this.$parent.isComponentLocked
		}
	},
	mounted (){
		this.$parent.$el.style = 'position: relative;'
	}
})

registerVueComponent('lockable-by-childs', {
	data: function (){
		return {
			childComponentLocked: 0,
			isLockableByChilds: true//just a flag for childs to detect this component
		}
	},
	computed: {
		childComponentIsLocked (){
			return this.childComponentLocked > 0
		}
	},
	template: `<div class="lockable" @click.stop>
		<div v-if="childComponentIsLocked" class="lock_overlay"/>
		<slot/>
	</div>`,
	mounted (){
		this.$parent.$el.style = 'position: relative;'
	},
	methods: {
		addLockedChild (){
			this.log('locked by child')
			this.childComponentLocked++
		},
		removeLockedChild (){
			this.log('unlocked by child')
			this.childComponentLocked--
		}
	}
})

registerVueComponent('lockable-by-parent', {
	computed: {
		parentComponentIsLocked (){
			return this.$parent.$parent.isComponentLocked
		}
	},
	template: `<div class="lockable" @click.stop>
		<div v-if="parentComponentIsLocked" class="lock_overlay"/>
		<slot/>
	</div>`,
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

registerVueComponent('confirm-button', {
	data: function (){
		return {
			mouseIsHovering: false,
			timeHoverStarted: 0,
			fillPercentage: 0,
			intervalId: undefined
		}
	},
	computed: {
		isClickable (){
			return this.fillPercentage == 100
		},
		style (){
			return '--confirm-button-width: ' + this.fillPercentage + '%;'
		}
	},
	props: {
		time: {
			type: Number,
			default: 2
		}
	},
	template: `<button :class="['confirm_button', {confirmed: isClickable}]" @click="handleClick" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave" :style="style">
		<slot/>
	</button>`,
	methods: {
		handleMouseEnter (){
			this.mouseIsHovering = true
			this.timeHoverStarted = Date.now()

			if(window.requestAnimationFrame){
				let that = this
				let func = function(){
					that.updateFillPercentage()
					window.requestAnimationFrame(func)
				}
				this.intervalId = requestAnimationFrame(func)
			} else {
				let that = this
				this.intervalId = setInterval(()=>{
					that.updateFillPercentage()
				}, 16)
			}			
		},
		handleMouseLeave (){
			this.mouseIsHovering = false
			this.timeHoverStarted = 0

			if(this.intervalId){
				if(window.requestAnimationFrame){
					window.cancelAnimationFrame(this.intervalId)
				} else {
					clearInterval(this.intervalId)
				}
			}
			this.intervalId = undefined
		},
		handleClick (evt){
			if(!this.isClickable){
				evt.preventDefault()
				evt.stopImmediatePropagation()
			}
		},
		updateFillPercentage (){
			this.fillPercentage = this.timeHoverStarted > 0 ? Math.min(1, (Date.now() - this.timeHoverStarted) / (this.time * 1000) ) * 100 : 0
		}
	},

})

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
		<a class="steamid" target="_blank" rel="noopener noreferrer" v-if="steamid.length > 0" :href="'https://steamcommunity.com/profiles/' + this.steamid"><span class="icon im im-external-link"></span>{{steamid}}</a>
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
		},
		'on-value-change': {
			type: Function,
			required: true
		}
	},
	template: `<div class="toggleable_element">
		<div class="front">
			<label :for="uiid">
				<input type="checkbox" :id="uiid" v-model="val">
				<spacer-vertical/>
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
			default: false
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
			default: false
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
	props: {
		name: {
			type: String,
			default: ''
		},
		startExtended: {
			type: Boolean,
			default: false			
		},
		alwaysExtended: {
			type: Boolean,
			default: false
		}
	},
	template: `<extendable class="division" v-slot="extendableProps" :startExtended="startExtended || alwaysExtended">
		<div  class="division_head" v-if="name && alwaysExtended">
			<h3>{{name}}</h3>
		</div>
		<extendable-trigger class="division_head" v-if="name && !alwaysExtended" :useDefaultArrows="true">
			<h3>{{name}}</h3>
		</extendable-trigger>
		<extendable-body class="division_body">
			<slot>
			</slot>
		</extendable-body>
	</extendable>`,
	created: function(){
		if(this.alwaysExtended){
			this.isExtended = true
		}
	},
	mounted: function (){
		this.isExtended = this.$props.name ? this.$props.startExtended === true : true
	}
})