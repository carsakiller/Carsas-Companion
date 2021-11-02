C2.registerPage('Tests', 'flask', 'tests-management')

C2.registerVueComponent('tests-management', {
	data: function (){
		return {
			toggleState: false,
			isConfirmed: false
		}
	},
	template: `<div class="tests_management">
		<tabs>
			<tab :title="'Structural Components'">
				<test-component-group :title="'pages'">
					<test-component>
						<pages>
							<page :title="'Page A'" :icon="'users'">Content of A</page>
							<page :title="'Page B'" :icon="'car'">Content of B</page>
							<page :title="'Page C'" :icon="'plus'">Content of C</page>
						</pages>
					</test-component>

					<test-component :options="{initialIndex: 1}">
						<pages :initial-index="1">
							<page :title="'Page A'" :icon="'users'">Content of A</page>
							<page :title="'Page B'" :icon="'car'">Content of B</page>
							<page :title="'Page C'" :icon="'plus'">Content of C</page>
						</pages>
					</test-component>
				</test-component-group>

				<test-component-group :title="'tabs'">
					<test-component>
						<tabs>
							<tab :title="'Tab A'">Content of A</tab>
							<tab :title="'Tab B'">Content of B</tab>
							<tab :title="'Tab C'">Content of C</tab>
						</tabs>
					</test-component>
				</test-component-group>

				<test-component-group :title="'extendable'">
					<test-component>
						<extendable>
							<extendable-trigger>
								<p style="border: 1px solid; padding: 0.5em">Click me to extend</p>
							</extendable-trigger>

							<br/>

							<extendable-body>
								This shows when extended.
							</extendable-body>

						</extendable>
					</test-component>

					<test-component :options="{startExtended: true}">
						<extendable :start-extended="true">
							<p style="border: 1px solid; padding: 0.5em">Just a heading
								<extendable-trigger style="display: inline-block">
									<span style="padding: 0.1em 0.2em; border: 0.1em solid;">Toggle Extended</span>
								</extendable-trigger>
							</p>

							<br/>

							<extendable-body>
								This shows when extended.
							</extendable-body>

						</extendable>
					</test-component>
				</test-component-group>

				<test-component-group :title="'division'" :description="'A simple container that can be extendable or not.'">
					<test-component>
						<division>
							Some content.
						</division>
					</test-component>

					<test-component :options="{name: 'Name'}">
						<division :name="'Name'">
							Some content.
						</division>
					</test-component>

					<test-component :options="{alwaysExtended: true, name: 'Name'}">
						<division :name="'Name'" :always-extended="true">
							Some content.
						</division>
					</test-component>
				</test-component-group>

				<test-component-group :title="'spacer-horizontal'" :description="'A simple horizontal block with a margin.'">
					<test-component>
						<div style="display: flex; flex-direction: column;">
							<div style="background: grey">Before</div>
							<spacer-horizontal/>
							<div style="background: grey">After</div>
						</div>
					</test-component>

					<test-component :options="{height: '2em'}">
						<div style="display: flex; flex-direction: column;">
							<div style="background: grey">Before</div>
							<spacer-horizontal :height="'2em'"/>
							<div style="background: grey">After</div>
						</div>
					</test-component>
				</test-component-group>

				<test-component-group :title="'spacer-vertical'" :description="'A simple vertical block with a margin.'">
					<test-component>
						<div style="display: flex; flex-direction: row;">
							<div style="background: grey">Before</div>
							<spacer-vertical/>
							<div style="background: grey">After</div>
						</div>
					</test-component>

					<test-component :options="{width: '2em'}">
						<div style="display: flex; flex-direction: row;">
							<div style="background: grey">Before</div>
							<spacer-vertical :width="'2em'"/>
							<div style="background: grey">After</div>
						</div>
					</test-component>
				</test-component-group>

				<test-component-group :title="'todo'" :description="'A placeholder that shows something that has yet to be implemented.'">
					<test-component>
						<todo>bla bla blubb</todo>
					</test-component>
				</test-component-group>

				<test-component-group :title="'icon'" :description="'Just an icon.'">
					<test-component>
						<icon :icon="'users'"/>
					</test-component>
				</test-component-group>
			</tab>




			<tab :title="'Functional Components'">
				<test-component-group :title="'toggleable-element'" :description="'Nice looking version of a checkbox.'">
					<test-component>
						<toggleable-element :initial-value="false" :on-value-change="toggleStateChange">{{toggleState}}</toggleable-element>
					</test-component>
				</test-component-group>

				<test-component-group :title="'confirm-button'" :description="'Button which requires to hover over it for a certain time before it can be clicked (mobile devices need to click twice).'">
					<test-component>
						<confirm-button @click="isConfirmed = !isConfirmed">
							<span v-if="isConfirmed">Unconfirm</span>
							<span v-else>Confirm</span>
						</confirm-button>
						<br/>
						<br/>
						<span v-if="isConfirmed">Confirmed</span>
						<span v-else>Not confirmed</span>
					</test-component>

					<test-component :options="{serious: true}">
						<confirm-button @click="isConfirmed = !isConfirmed" :serious="true">
							<span v-if="isConfirmed">Unconfirm</span>
							<span v-else>Confirm</span>
						</confirm-button>
						<br/>
						<br/>
						<span v-if="isConfirmed">Confirmed</span>
						<span v-else>Not confirmed</span>
					</test-component>

					<test-component :options="{time: 5}">
						<confirm-button @click="isConfirmed = !isConfirmed" :time="5">
							<span v-if="isConfirmed">Unconfirm</span>
							<span v-else>Confirm</span>
						</confirm-button>
						<br>
						<br/>
						<span v-if="isConfirmed">Confirmed</span>
						<span v-else>Not confirmed</span>
					</test-component>

					<test-component :description="'Small version of confirm-button'">
						<confirm-button class="small_button"><span class="im im-plus"/></confirm-button>
					</test-component>
				</test-component-group>

				<test-component-group :title="'lockable'" :description="'A component that can lock itself.'">
					<test-component :title="'lockable'">
						<test-example-lockable/>
					</test-component>

					<test-component :title="'lockable-by-childs'" :description="'A component that can lock itself or get locked by any of his children.'">
						<test-example-lockable-by-childs/>
					</test-component>

					<test-component :title="'lockable-by-parent'" :description="'A component that can lock itself or get locked by a parent.'">
						<test-example-lockable-by-parent/>
					</test-component>

					<test-component :title="'disabled-when-any-parent-locked'" :description="'Anything inside this component can access this components prop \`isDisabled\` and use it to control any inputs disabled attribute.'">
						<test-example-disabled-when-any-parent-locked/>
					</test-component>
				</test-component-group>

				<test-component-group :title="'loading-spinner'">
					<test-component>
						<loading-spinner/>
					</test-component>
				</test-component-group>

				<test-component-group :title="'loading-spinner-or'" :description="'Shows a loading spinner or the content when the evaluated code returns false'">
					<test-component :options="{'is-loading-code': 'return (Date.now()/1000) % 6 > 2'}">
						<loading-spinner-or :is-loading-code="'return (Date.now()/1000) % 6 > 2'">
							<span>Loading has finished</span>
						</loading-spinner-or>
					</test-component>
				</test-component-group>

				<test-component-group :title="'steamid'" :description="'A link to the steam profile.'">
					<test-component>
						<steamid :steamid="'x42'"/>
					</test-component>
				</test-component-group>
			</tab>
		</tabs>
	</div>`,
	methods: {
		toggleStateChange (name, val){
			this.toggleState = val
		}
	}
})

C2.registerVueComponent('test-component-group', {
	props: {
		title: {
			type: String,
			required: true
		},
		description: {
			type: String
		},
	}, template: `<div class="test_component_group">
		<h4 class="title">&lt;{{title}}&gt;</h4>
		<p class="description" v-if="description">{{description}}</p>
		<div class="content">
			<slot ref="slot"/>
		</div>
	</div>`
})

C2.registerVueComponent('test-component', {
	props: {
		title: {
			type: String
		},
		description: {
			type: String
		},
		options: {
			type: Object
		}
	},
	template: `<div class="test_component">
		<h4 class="title" v-if="title">&lt;{{title}}&gt;</h4>
		<p class="description" v-if="description">{{description}}</p>
		<div class="options">
			<span>Options:</span>
			<br v-if="options"/>
			<br v-if="options"/>
			<test-component-options v-if="options" :options="options"></test-component-options>
			<span v-else class="default">Default</span>
		</div>
		<div class="content">
			<slot/>
		</div>
	</div>`
})

C2.registerVueComponent('test-component-options', {
	props: {
		options: {
			type: Object
		}
	},
	template: `<table class="options_table">
		<thead>
			<tr>
				<th>Name</th>
				<th>Value</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="(value, name) of options">
				<td>{{name}}</td>
				<td>{{value}}</td>
			</tr>
		</tbody>
	</table>`
})

/*

	EXAMPLE COMPONENTS - implement a new component testcase to show off an example

*/

// lockable
C2.registerVueComponent('test-example-lockable', {
	template: `<div style="background: #65075D; padding: 1em;">
		<lockable></lockable>
		<p>This pink area will be locked when you click the button</p>

		<button v-on:click="lockComponent">lock</button>
	</div>`,
	mixins: [lockableComponentMixin]
})

// lockable-by-childs
C2.registerVueComponent('test-example-lockable-by-childs', {
	data: function (){
		return {
			childs: [1,2,3,4]
		}
	},
	template: `<lockable-by-childs>
		<div style="background: #65075D; padding: 1em; display: flex; flex-direction: column;">
			<p>This pink area will be locked when you click any child button</p>
			<br/>
			<test-example-lockable-by-childs-child v-for="i in childs" :i="i"/>
		</div>
	</lockable-by-childs>`,
	mixins: [lockableComponentMixin]
})

C2.registerVueComponent('test-example-lockable-by-childs-child', {
	props: {
		i: {
			type: Number,
			required: true
		}
	},
	template: `<button v-on:click="lockComponent" style="margin: 1em; width: 10em;">lock #[{{i}}]</button>`,
	mixins: [lockableComponentMixin]
})

// lockable-by-parent
C2.registerVueComponent('test-example-lockable-by-parent', {
	template: `<div>
		<button v-on:click="lockComponent">lock</button>
		<button v-on:click="unlockComponent">unlock</button>
		<br/>
		<br/>
		<div>
			<test-example-lockable-by-parent-child/>
		</div>
	</div>`,
	mixins: [lockableComponentMixin]
})

C2.registerVueComponent('test-example-lockable-by-parent-child', {
	template: `<div style="background: #65075D; padding: 1em;">
		<lockable-by-parent/>
		This child can be locked.
	</div>`,
	mixins: [lockableComponentMixin]
})

// disabled-when-any-parent-locked
C2.registerVueComponent('test-example-disabled-when-any-parent-locked', {
	template: `<div>
		<button v-on:click="lockComponent">lock</button>
		<button v-on:click="unlockComponent">unlock</button>
		<br/>
		<br/>
		<div>
			<test-example-disabled-when-any-parent-locked-child/>
		</div>
	</div>`,
	mixins: [lockableComponentMixin]
})

C2.registerVueComponent('test-example-disabled-when-any-parent-locked-child', {
	template: `<div style="background: #65075D; padding: 1em;">
		<disabled-when-any-parent-locked v-slot="disabledProps">
			<input :disabled="disabledProps.isDisabled" :value="'test'">
			<span v-if="disabledProps.isDisabled">disabled</span>
			<span v-else>enabled</span>
		</disabled-when-any-parent-locked>
	</div>`
})

