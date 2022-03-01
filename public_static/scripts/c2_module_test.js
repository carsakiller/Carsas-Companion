class C2Module_Test extends C2LoggingUtility {

	constructor(loglevel, c2){
		super(loglevel)

		this.c2 = c2

		this.c2.on('can-register-storable', ()=>{

		})

		this.c2.on('can-register-component', ()=>{
			this.c2.registerComponent('tests-management', {
				data: function (){
					return {
						toggleStateObject: { value: false},
						isConfirmed: false
					}
				},
				template: `<div class="tests_management">
					<tabs>
						<tab :title="'Debugging'">
							<division :name="'Companion Debugging'" :always-extended="true">
								<companion-debugging/>
							</division>
						</tab>




						<tab :title="'Test runs'">
							<division :name="'Performance'" :always-extended="true">
								<test-run :name="'test-performance-frontend-backend'" :type="'local'"/>
								<test-run :name="'test-performance-backend-frontend'" :type="'remote'"/>
								<test-run :name="'test-performance-game-backend-proxy'" :type="'remote'"/>
								<test-run :name="'test-performance-backend-game'" :type="'remote'"/>
								<test-run :name="'test-performance-frontend-game'" :type="'local'"/>
							</division>
						</tab>




						<tab :title="'Test Custom commands'">
							<division :name="'Run custom command'" :always-extended="true">
								<run-custom-command/>
							</division>
						</tab>




						<tab :title="'Structural Components'">
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

							<test-component-group :title="'input'" :description="'Different inputs.'">
								<test-component>
									<input type="number"/>
									<br/>
									<br/>
									<input type="text"/>
								</test-component>
							</test-component-group>

							<test-component-group :title="'textarea'">
								<test-component>
									<textarea cols="20" rows="5"/>
								</test-component>
							</test-component-group>
						</tab>




						<tab :title="'Functional Components'">
							<test-component-group :title="'toggleable-element'" :description="'Nice looking version of a checkbox.'">
								<test-component>
									<toggleable-element :value-object="toggleStateObject" :value-object-key="'value'" :on-value-change="toggleStateChange">{{toggleStateObject.value}}</toggleable-element>
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
									<confirm-button class="small_button">Small Button</confirm-button>
								</test-component>

								<test-component :description="'Mini version of confirm-button'" :options="{mini: true}">
									<confirm-button :mini="true"><icon :icon="'plus'"/></confirm-button>
								</test-component>

								<test-component :description="'Small Mini version of confirm-button'" :options="{mini: true}">
									<confirm-button class="small_button" :mini="true"><icon :icon="'plus'"/></confirm-button>
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
					toggleStateChange (key, val){
						this.toggleStateObject[key] = val
					}
				}
			})

			this.c2.registerComponent('test-component-group', {
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

			this.c2.registerComponent('test-component', {
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

			this.c2.registerComponent('test-component-options', {
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


			this.c2.registerComponent('companion-debugging', {
				data (){
					return {
						syncables: []
					}
				},
				template: `<div>
					<button @click="setCompanionDebug(true)">Enable Debug</button>
					<button @click="setCompanionDebug(false)">Disable Debug</button>
					<spacer-horizontal/>
					<button @click="setCompanionDebuDetailed(true)">Enable Debug Detailed</button>
					<button @click="setCompanionDebuDetailed(false)">Disable Debug Detailed</button>
				</div>`,
				methods: {
					setCompanionDebug (to){
						this.sendServerMessage('debug-set-companion', to).then(res => {
							this.showNotificationSuccess('debug-set-companion', res)
						}).catch(err => {
							this.showNotificationFailed('debug-set-companion', err)
						})
					},
					setCompanionDebuDetailed (to){
						this.sendServerMessage('debug-set-companion-detailed', to).then(res => {
							this.showNotificationSuccess('debug-set-companion-detailed', res)
						}).catch(err => {
							this.showNotificationFailed('debug-set-companion-detailed', err)
						})
					}
				},
				mixins: [componentMixin_serverMessage]
			})


			/*

				EXAMPLE COMPONENTS - implement a new component testcase to show off an example

			*/

			// lockable
			this.c2.registerComponent('test-example-lockable', {
				data (){
					return {
						syncables: []
					}
				},
				template: `<div style="background: #65075D; padding: 1em;">
					<lockable></lockable>
					<p>This pink area will be locked when you click the button</p>

					<button v-on:click="lockComponent">lock</button>
				</div>`,
				mixins: [componentMixin_lockable]
			})

			// lockable-by-childs
			this.c2.registerComponent('test-example-lockable-by-childs', {
				data: function (){
					return {
						childs: [1,2,3,4],
						syncables: []
					}
				},
				template: `<lockable-by-childs>
					<div style="background: #65075D; padding: 1em; display: flex; flex-direction: column;">
						<p>This pink area will be locked when you click any child button</p>
						<br/>
						<test-example-lockable-by-childs-child v-for="i in childs" :i="i"/>
					</div>
				</lockable-by-childs>`,
				mixins: [componentMixin_lockable]
			})

			this.c2.registerComponent('test-example-lockable-by-childs-child', {
				data (){
					return {
						syncables: []
					}
				},
				props: {
					i: {
						type: Number,
						required: true
					}
				},
				template: `<button v-on:click="lockComponent" style="margin: 1em; width: 10em;">lock #[{{i}}]</button>`,
				mixins: [componentMixin_lockable]
			})

			// lockable-by-parent
			this.c2.registerComponent('test-example-lockable-by-parent', {
				data (){
					return {
						syncables: []
					}
				},
				template: `<div>
					<button v-on:click="lockComponent">lock</button>
					<button v-on:click="unlockComponent">unlock</button>
					<br/>
					<br/>
					<div>
						<test-example-lockable-by-parent-child/>
					</div>
				</div>`,
				mixins: [componentMixin_lockable]
			})

			this.c2.registerComponent('test-example-lockable-by-parent-child', {
				data (){
					return {
						syncables: []
					}
				},
				template: `<div style="background: #65075D; padding: 1em;">
					<lockable-by-parent/>
					This child can be locked.
				</div>`,
				mixins: [componentMixin_lockable]
			})

			// disabled-when-any-parent-locked
			this.c2.registerComponent('test-example-disabled-when-any-parent-locked', {
				data (){
					return {
						syncables: []
					}
				},
				template: `<div>
					<button v-on:click="lockComponent">lock</button>
					<button v-on:click="unlockComponent">unlock</button>
					<br/>
					<br/>
					<div>
						<test-example-disabled-when-any-parent-locked-child/>
					</div>
				</div>`,
				mixins: [componentMixin_lockable]
			})

			this.c2.registerComponent('test-example-disabled-when-any-parent-locked-child', {
				template: `<div style="background: #65075D; padding: 1em;">
					<disabled-when-any-parent-locked v-slot="disabledProps">
						<span v-if="disabledProps.isDisabled">disabled</span>
						<span v-else>enabled</span>
						<br/>
						<br/>
						<input :disabled="disabledProps.isDisabled" :value="'test'">
						<br/>
						<br/>
						<confirm-button>Confirm</confirm-button>
						<br/>
						<br/>
						<lockable-button>Press</lockable-button>
					</disabled-when-any-parent-locked>
				</div>`
			})

			/*

				TEST RUN COMPONENTS - run a test and show the result

			*/
			let that = this

			this.c2.registerComponent('test-run', {
				data: function (){
					return {
						testSuccess: undefined,
						testMessage: undefined,
						syncables: []
					}
				},
				props: {
					name: {
						type: String,
						required: true
					},
					description: {
						type: String
					},
					type: {
						type: String,
						required: true
					}
				},
				template: `<div class="test_run">
					<lockable/>

					<div class="name">
						<span>{{name}}</span>
						<button @click="runTest">Run Test</button>
					</div>

					<p v-if="description" class="description">{{description}}</p>

					<div v-if="testSuccess !== undefined" :class="['test_result', {result_success: testSuccess}]">
						<icon v-if="testSuccess" class="test_icon" :icon="'check-mark-circle'"/>
						<icon v-else class="test_icon" :icon="'x-mark-circle'"/>
						<p class="test_message">{{testMessage}}</p>
					</div>
				</div>`,
				methods: {
					runTest (){
						this.log('runTest', this.name)
						this.setTestResult(undefined, undefined)
						this.lockComponent()

						if(this.type === 'remote'){
							that.runTestRemote(this.name).then((res)=>{
								this.handleTestResult(res)
							}).catch((res)=>{
								this.handleTestResult(res)
							})
						} else if(this.type === 'local'){
							that.runTestLocal(this.name).then((res)=>{
								this.handleTestResult(res)
							}).catch((res)=>{
								this.handleTestResult(res)
							})
						} else {
							this.error('unsupported runTest type', this.type)
						}
					},
					handleTestResult (res){
						this.unlockComponent()

						if(typeof res.testSuccess !== 'boolean'){
							this.error('test result is not a test result!', res)
							this.setTestResult(false, 'Error: contact an admin')
							return
						}

						this.setTestResult(res.testSuccess, res.testMessage)

					},
					setTestResult (success, message){
						this.testSuccess = success
						this.testMessage = message
					}
				},
				mixins: [componentMixin_lockable]
			})

			/*

				GAME COMMAND COMPONENTS - run a game command and show the result

			*/

			this.c2.registerComponent('run-custom-command', {
				data: function (){
					return {
						rawCommand: '',
						rawArgs: '',
						resultSuccess: undefined,
						resultMessage: undefined,
						syncables: []
					}
				},
				template: `<div class="run_custom_command">
					<lockable/>

					<div class="command_input">
						<div>
							<label>Command</label>
							<input type="text" v-model="rawCommand"/>
						</div>
						<div>
							<label>Arguments</label>
							<input type="text" v-model="rawArgs"/>
						</div>
						<button @click="runCustomCommand">Execute ingame</button>
					</div>

					<div v-if="resultSuccess !== undefined" :class="['command_result', {result_success: resultSuccess}]">
						<icon v-if="resultSuccess" class="result_icon" :icon="'check-mark-circle'"/>
						<icon v-else class="result_icon" :icon="'x-mark-circle'"/>
						<p class="result_message">{{resultMessage}}</p>
					</div>
				</div>`,
				methods: {
					runCustomCommand (){
						this.log('runCustomCommand', this.rawCommand)
						this.setResult(undefined, undefined)
						this.lockComponent()

						that.c2.webclient.sendMessage('command-run-custom-command', this.rawCommand + ';DELIM;' + this.rawArgs)
						.then(res => this.setResult(true, JSON.parse(res)))
						.catch(err => this.setResult(false, err))
						.finally(_ => this.unlockComponent())
					},
					setResult (success, message){
						this.resultSuccess = success
						this.resultMessage = ('' + message).replaceAll('\\n', '\n')
					}
				},
				mixins: [componentMixin_lockable]
			})

		})

		this.c2.on('can-register-page', ()=>{
			this.c2.registerPage('tests', 'Tests', 'flask', 'tests-management')
		})

		this.c2.on('can-register-messagehandler', ()=>{

			this.c2.registerMessageHandler('test-performance-backend-frontend', (data)=>{
				return data
			})
		})

		this.c2.on('setup-done', ()=>{

		})
	}

	runTestLocal(testName){
		return new Promise((resolve, reject)=>{
			let start = Date.now()

			this.c2.webclient.sendMessage(testName, start).then((data)=>{
				let parsed = JSON.parse(data)

				if(parsed !== start){
					throw new Error('data corrupted: ' + start + ' != ' + parsed)
				}

				let message = 'Test "' + testName + '" finished successful after ' + (Date.now() - start) + 'ms'

				this.info(message)
				resolve({
					testSuccess: true,
					testMessage: message
				})
			}).catch((err)=>{
				this.error('Test "', testName, '" failed', err)
				reject({
					testSuccess: false,
					testMessage: 'Test "' + testName + '" failed: ' + err.toString()
				})
			})
		})
	}

	runTestRemote(testName){
		return new Promise((resolve, reject)=>{
			this.c2.webclient.sendMessage(testName, '').then((data)=>{
				let parsed = JSON.parse(data)

				if(parsed.testSuccess !== true){
					throw new Error(parsed.testMessage)
				}

				let message = 'Test result: ' + parsed.testMessage

				this.info(message)
				resolve({
					testSuccess: true,
					testMessage: parsed.testMessage
				})
			}).catch((err)=>{
				this.error('Test "', testName, '" failed', err)
				reject({
					testSuccess: false,
					testMessage: 'Test "' + testName + '" failed: ' + err.toString()
				})
			})
		})
	}
}
