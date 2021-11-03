/*

---- MIXINS ----

*/

let loggingMixin = {
	data: function (){
		return {
			loglevel: 5 /* 1 = error, 2 = warn, 3 = info, 4 = log, 5 = debug */
		}
	},
	methods: {
		getThisComponentName (){
			return this.$options.name || 'app' //it must be app, otherwise someone did not use the proper functions to register a VueComponent
		},
		error(...args){
			if(this.loglevel < 1){
				return
			}
			console.error.apply(null, [
					'%c<%c'
					+ this.getThisComponentName()
					+ '%c>%c Error',

					'>color: #364CC4', 'color: initial',
					'color: #364CC4', 'color: red',

					this.$el
				].concat(args)
			)
		},
		warn(...args){
			if(this.loglevel < 2){
				return
			}
			console.warn.apply(null, [
					'%c<%c'
					+ this.getThisComponentName()
					+ '%c>%c Warning',

					'color: #364CC4', 'color: initial',
					'color: #364CC4', 'color: orang',

					this.$el
				].concat(args)
			)
		},
		info(...args){
			if(this.loglevel < 3){
				return
			}
			console.info.apply(null, [
					'%c<%c'
					+ this.getThisComponentName()
					+ '%c>%c Info',

					'color: #364CC4', 'color: initial',
					'color: #364CC4', 'color: magenta'
				].concat(args)
			)
		},
		log(...args){
			if(this.loglevel < 4){
				return
			}
			console.log.apply(null, [
					'%c<%c'
					+ this.getThisComponentName()
					+ '%c>%c',

					'color: #364CC4', 'color: initial',
					'color: #364CC4', 'color: initial'
				].concat(args)
			)
		},
		debug(...args){
			if(this.loglevel < 5){
				return
			}
			console.debug.apply(null, [
					'%c<%c'
					+ this.getThisComponentName()
					+ '%c>%c',

					'color: #364CC4', 'color: initial',
					'color: #364CC4', 'color: initial',

					this.$el
				].concat(args)
			)
		}
	}
}

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
			this.debug('lockComponent', this.lockableParents)
			this.isComponentLocked = true			
			for(let lp of this.lockableParents){
				lp.addLockedChild()
			}
		},
		lockComponentUntilSync (){
			this.debug('lockComponentUntilSync')
			this.lockComponent()
			this.unlockComponentOnNextSync()
		},
		unlockComponent (){
			this.debug('unlockComponent', this.lockableParents)
			this.isComponentLocked = false
			for(let lp of this.lockableParents){
				lp.removeLockedChild()
			}
		},
		unlockComponentOnNextSync (){
			this.debug('unlockComponentOnNextSync')
			this.isUnlockComponentOnNextSync = true
			this.timeSetOnNextSync = Date.now()
		}
	},
	created: function (){
		searchForLockableByChildsParentRecursively(this, this.$parent)

		function searchForLockableByChildsParentRecursively(me, node){
			if(node && ('isLockableByChilds' in node)){
				me.lockableParents.push(node)
				me.debug('found a lockable by childs parent', node)
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

let gameCommandMixin = {
	mixins: [lockableComponentMixin],
	methods: {
		callGameCommandAndWaitForSync (command, args){
			return new Promise((fulfill, reject)=>{
				this.lockComponentUntilSync()

				c2.webclient.sendCommand(command, args).then((res)=>{
					this.log('executing command', command,'was successful')
					this.debug('args', args, 'result', res)
				}).catch((err)=>{
					this.log('executing command', command,'failed')
					this.debug('args', args, 'error', err)
					this.unlockComponent()
				})
			})
		}
	}
}

/*

	FUNCTIONAL COMPONENTS

*/

c2.register.register('VueComponent', {
	name: 'keep-alife',
	options: {
		props: {
			'keep-alife': {
				type: Boolean,
				required: true
			}
		},
		/*
			template: `
				<keep-alive v-if="keepAlife"> <slot/> </keep-alive>
				<slot v-if="!keepAlife"/>`,
		*/
		template: `<slot/>`//TODO i don't know why, but <component> seem to be always alive (regardless of vue docs), so this does not work
	}
})

/*
	Usage:

	registerVueComponent('my-lockable-component', {
		template: `<div>
			<lockable/>
			<span>Hello World</span>

			<button v-on:click="lockComponent">lock</button>
		</div>`,
		mixins: [lockableComponentMixin]
	})

	Now you can click the button and lock the component

*/
c2.register.register('VueComponent', {
	name: 'lockable',
	options: {
		template: `<div class="lockable" @click.stop>
			<div v-if="parentIsComponentLocked" class="lock_overlay"/>
		</div>`,
		computed: {
			parentIsComponentLocked (){
				return this.$parent.isComponentLocked
			}
		},
		mounted (){
			this.$parent.$el.style.position = 'relative'
		}
	}
})

/*
	Usage:

	registerVueComponent('my-lockable-component', {
		template: `<div>
			<lockable-by-childs/>
			<span>Hello World</span>

			<some-other-component/>


		</div>`,
		mixins: [lockableComponentMixin]
	})

	c2.register.register('VueComponent', {
	name: 'some-other-component',
	options: {
		template: `<button v-on:click="lockComponent">lock</button>`,
		mixins: [lockableComponentMixin]
	})

	Now you can click the button and lock the component

*/
c2.register.register('VueComponent', {
	name: 'lockable-by-childs',
	options: {
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
			this.$parent.$el.style.position = 'relative'
		},
		methods: {
			addLockedChild (){
				this.debug('locked by child')
				this.childComponentLocked++
			},
			removeLockedChild (){
				this.debug('unlocked by child')
				this.childComponentLocked--
			}
		}
	}
})

/*
	Usage:

	registerVueComponent('my-lockable-component', {
		template: `<div>
			<lockable-by-parent/>
			<span>Hello World</span>
		</div>`,
		mixins: [lockableComponentMixin]
	})

	c2.register.register('VueComponent', {
	name: 'some-parent-component',
	options: {
		template: `<div>
			<my-lockable-component/>

			<button v-on:click="lockComponent">lock</button>
		</di>`
		mixins: [lockableComponentMixin]
	})

	Now you can click the button and lock the component

*/
c2.register.register('VueComponent', {
	name: 'lockable-by-parent',
	options: {
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
			this.$parent.$el.style.position = 'relative'
		}
	}
})

/*
	Usage:

	<disabled-when-any-parent-locked v-slot="disabledProps">
		<input :disabled="disabledProps.isDisabled">
	</disabled-when-any-parent-locked>

*/
c2.register.register('VueComponent', {
	name: 'disabled-when-any-parent-locked',
	options: {
		data: function (){
			return {
				oldValue: false,
				disabledCount: 0
			}
		},
		computed: {
			isDisabled (){
				return this.disabledCount > 0
			}
		},
		template: `<slot :is-disabled="isDisabled"/>`,
		methods: {
			checkIfAnyParentIsLocked (){
				return searchForLockedParentRecursively(this, this.$parent)

				function searchForLockedParentRecursively(me, node){
					if(node && ('isComponentLocked' in node) && node.isComponentLocked === true){
						return true
					} else if (node) {
						return searchForLockedParentRecursively(me, node.$parent)
					}
					return false
				}
			},
			disable (){
				this.disabledCount++
			},
			enable (){
				this.disabledCount--
			}
		},
		mounted (){
			setInterval(()=>{
				let newValue = this.checkIfAnyParentIsLocked()
				if(newValue !== this.oldValue){
					if(newValue){
						this.disable()
					} else {
						this.enable()
					}
					this.oldValue = newValue
				}
			}, 100)
		}
	}
})

c2.register.register('VueComponent', {
	name: 'confirm-button',
	options: {
		data: function (){
			return {
				timeToFill: 0,
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
				default: 0
			},
			serious: {
				type: Boolean,
				default: false
			}
		},
		template: `<button :class="['confirm_button', {confirmed: isClickable, serious: serious, hovering: mouseIsHovering}]" @click="handleClick" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave" :style="style">
			<slot/>
		</button>`,
		methods: {
			handleMouseEnter (){
				if(this.mouseIsHovering){
					return
				}

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
					this.handleMouseEnter()
				} else {
					this.handleMouseLeave()
				}
			},
			updateFillPercentage (){
				this.fillPercentage = this.timeHoverStarted > 0 ? Math.min(1, (Date.now() - this.timeHoverStarted) / (this.timeToFill * 1000) ) * 100 : 0
			}
		},
		created: function (){
			if(this.time === 0){
				this.timeToFill = this.serious ? 2 : 1
			} else {
				this.timeToFill = this.time
			}
		}
	}
})

c2.register.register('VueComponent', {
	name: 'loading-spinner',
	options: {
		template: `<span class="loading_spinner im im-spinner"/>`
	}
})

/*

	Usage:
	<loading-spinner-or :is-loading-code="'return true == false'">
		Show this when eval('return true == false') returns false
	</loading-spinner-or>

	Special case: burried inside multiple other components:

	<extendable>
		<loading-spinner-or :is-loading-code="'return true == false'" :parents-depth="1">
			Show this when eval('return true == false') returns false
		</loading-spinner-or>
	</extendable>

	*/
c2.register.register('VueComponent', {
	name: 'loading-spinner-or',
	options: {
		data: function (){
			return {
				isLoading: true
			}
		},
		props: {
			'is-loading-code': {
				type: String,
				required: true
			},
			'parents-depth': {
				type: Number,
				default: 0
			}
		},
		template: `<div class="loading_spinner_or">
			<loading-spinner v-if="isLoading"/>
			<slot v-else/>
		</div>`,
		mounted: function (){
			setInterval(()=>{
				this.checkIsLoading()
			}, 100)
		},
		methods: {
			checkIsLoading (){
				let node = this

				for(let i=this.parentsDepth; i >= 0; i--){
					node = node.$parent
				}

				let ret = new Function(this.isLoadingCode).apply(node)
				if(ret == true){
					if(!this.isLoading){
						this.debug('started loading')
					}
					this.isLoading = true
				} else {
					if(this.isLoading){
						this.debug('stopped loading')
					}
					this.isLoading = false
				}
			}
		}
	}
})

c2.register.register('VueComponent', {
	name: 'steamid',
	options: {
		props: {
			steamid: {
				type: String,
				default: ''
			}
		},
		template: `
			<a class="steamid" target="_blank" rel="noopener noreferrer" v-if="steamid.length > 0" :href="'https://steamcommunity.com/profiles/' + this.steamid"><icon :icon="'external-link'" class="icon"/>{{steamid}}</a>
			<span v-else class="steamid">"Invalid SteamId"</span>`
	}
})

c2.register.register('VueComponent', {
	name: 'toggleable-element',
	options: {
		data: function (){
			return {
				skipNextWatch: false,
				oldVal: false,
				val: false,
				oldInitialValue: false,
				uiid: C2.uuid()
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
					<disabled-when-any-parent-locked v-slot="disabledProps">
						<input type="checkbox" :id="uiid" v-model="val" :disabled="disabledProps.isDisabled">
					</disabled-when-any-parent-locked>
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
					this.debug('skipping watch')
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
	}
})

c2.register.register('VueComponent', {
	name: 'module-enableable',
	options: {
		props: {
			name: {
				type: String,
				required: true
			}
		},
		computed: {
			isModuleEnabled (){
				return true // TODO get this
			}
		},
		template: `<div class="module_enableable">
			<slot v-if="isModuleEnabled"/>
			<div v-else class="module_not_enabled">
				<p><icon :icon="'x-mark-circle'"/> Module <span class="name">{{name}}</span> is not enabled. You can enable this module in the addon settings when you create a new game in Stormworks.</p>
			</div>
		</div>`
	}
})

/*

	STRUCTURAL COMPONENTS

*/

c2.register.register('VueComponent', {
	name: 'pages',
	options: {
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
				<div v-for="(page, index) in pages" :key="index" @click="selectPage(index)" :class="['entry', {selected: (index === selectedIndex)}]" :title="page.title">
					<icon :icon="page.icon"/>
				</div>
			</div>

			<slot/>
		</div>`,
		emits: ['page-change'],
		methods: {
			selectPage (i){
				this.selectedIndex = i

				this.pages.forEach((page, index) => {
			    	page.isSelected = (index === i)
			    })

			    this.$emit('page-change', this.selectedIndex)
			}
		},
		created: function (){
			this.selectedIndex = this.initialIndex
		},
		mounted: function (){
			this.selectPage(this.selectedIndex)
		}
	}
})

c2.register.register('VueComponent', {
	name: 'page',
	options: {
		data: function (){
			return {
				isSelected: false,
				lastPageHeight: 0,
				lastPageHeightChangeTime: 0,
				checkPageHeightInterval: undefined
			}
		},
		props: {
			title: {
				type: String,
				required: true
			},
			icon: {
				type: String,
				required: true
			},
			'keep-alife': {
				type: Boolean,
				default: true
			}
		},
		template: `<div class="page" v-show="isSelected">
			<keep-alife :keep-alife="keepAlife">
				<div class="page_head">
					<h2>{{title}}</h2>
				</div>

				<div class="page_body">
					<slot/>
				</div>
			</keep-alife>
		</div>`,
		created: function(){
			this.$parent.pages.push(this)
		},
		mounted: function (){
			this.checkPageHeightInterval = setInterval(()=>{
				let newHeight = $(this.$el).height()
				if(newHeight !== this.lastPageHeight){
					this.debug('resized')
					this.lastPageHeight = newHeight
					this.lastPageHeightChangeTime = Date.now()
				}

				if(this.lastPageHeightChangeTime > 0 && (Date.now() - this.lastPageHeightChangeTime) > 20){//stop the check when we think the page has fully loaded
					this.debug('stopped to resize')
					$(this.$el).find('.page_body').scrollTop(0)
					clearInterval(this.checkPageHeightInterval)
					return
				}
			}, 5)
		}
	}
})

c2.register.register('VueComponent', {
	name: 'tabs',
	options: {
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
	}
})

c2.register.register('VueComponent', {
	name: 'tab',
		options: {
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
	}
})

c2.register.register('VueComponent', {
	name: 'extendable',
		options: {
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
	}
})

c2.register.register('VueComponent', {
	name: 'extendable-body',
		options: {
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
		props: {
			showShadow: {
				type: Boolean,
				default: false
			}
		},
		template: `<div :class="['extendable_body', {show_shadow: showShadow}]" v-if="isExtended">
			<slot :isExtended="isExtended"/>
		</div>`,
		mounted: function (){
			searchForExtendableParentRecursively(this, this.$parent)

			function searchForExtendableParentRecursively(me, node){
				if(node && node.isAnExtendableComponent === true){
					me.extendable = node
					me.debug('found an extendable', node)
				} else if (node) {
					searchForExtendableParentRecursively(me, node.$parent)
				}
			}
		},
		mixins: [loggingMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'extendable-trigger',
	options: {
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
					me.debug('found an extendable', node)
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
				this.debug('bound to extendable', extendable)
				this.extendable = extendable
			}
		},
		mixins: [loggingMixin]
	}
})

c2.register.register('VueComponent', {
	name: 'division',
	options: {
		props: {
			name: {
				type: String,
				default: ''
			},
			'start-extended': {
				type: Boolean,
				default: false
			},
			'always-extended': {
				type: Boolean,
				default: false
			}
		},
		template: `<extendable class="division" v-slot="extendableProps" :startExtended="startExtended || alwaysExtended || !name">
			<div class="division_head" v-if="name && alwaysExtended">
				<h3>{{name}}</h3>
			</div>
			<extendable-trigger class="division_head" v-if="name && !alwaysExtended" :useDefaultArrows="true">
				<h3>{{name}}</h3>
			</extendable-trigger>
			<extendable-body class="division_body" :showShadow="!!name">
				<slot/>
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
	}
})

c2.register.register('VueComponent', {
	name: 'spacer-horizontal',
	options: {
		props: {
			height: {
				type: String,
				default: '1em'
			}
		},
		template: `<div :style="'clear: both; height: ' + height"/>`
	}
})

c2.register.register('VueComponent', {
	name: 'spacer-vertical',
	options: {
		props: {
			width: {
				type: String,
				default: '1em'
			}
		},
		template: `<div :style="'display: inline-block; width: ' + width"/>`
	}
})

c2.register.register('VueComponent', {
	name: 'todo',
	options: {
		computed: {
			status (){
				return this.$store.state.status
			}
		},
		template: `<div style="display: inline-block; padding: 0.5em 1em; background: red; color: white; font-weight: bold;">
			<span>TODO: </span><slot/>
		</div>`
	}
})

c2.register.register('VueComponent', {
	name: 'icon',
	options: {
		props: {
			icon: {
				type: String,
				required: true
			}
		},
		template: `<span :class="['im', 'im-' + icon]"><slot/></span>`
	}
})
