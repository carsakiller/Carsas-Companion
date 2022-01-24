# How to code

## Setup build tools
* if you are on windows you will need a command line tool, i suggest the official one from git: https://gitforwindows.org/
* install node (e.g. v12)
* install compass (stylesheet parsing): `$ gem install compass`
* install nodemon (restart node server on code changes): `npm install -g nodemon`

### git hooks for versioning
After you cloned this repository, run
`sh setup_git_hooks.sh`
This will enable the git hooks, so it triggers the update of version.js to be set to the current commit hash.
You can also trigger it manually by doing a checkout on the current select branch (e.g. `git checkout master`)

## Coding
* command line tool 1 : `cd compass & compass watch`
* command line tool 2 : `nodemon` or `nodemon --trace-warnings`

### Upgrading the version
Just edit the file `public_static/version.txt`

## Creating executables
### install pkg
`npm i pkg -g`
### configure your package.json
```
    "bin": "app.js",
    "main": "app.js",
    "pkg": {
        "assets": [
            "views/**/*",
            "public_static/**/*"
        ],
        "outputPath": "dist"
    },
```
## run
`pkg .`

# Documentation (haha)

## Workflow for data sync from browser to game:
Component defines methods (e.g. a button that triggers revoking a rule from a player) which will be called on button press.
The method then sends that command to the game, if game responds with success, wait until game syncs new player data (game triggers that by itself ^^ or do we do that from the website?)), if fails, do nothing and show error message.


# TODO

## Before going into production:
* check app.js for necessary adjustments (mainly HTTP headers and security things), we should maybe do this automatically depending on development or production environment (especially when building an executable)

## All
* Rework data syncing (game->browser) to only send necessary data and not e.g. all players
* module activation: modules are controled via lua addon properties. The lua script transmits those properties to the web server.
* implement heartbeats for every single module
* add webserver settings page (settings only for the webserver, e.g. allow external access)

## Browser
* preserve selected page, tab, scroll positions
* Sandbox logging: so we can only show logs in the console for a specific component instance

## WebServer
* version check with the script running in the game
* detect game server restart / script reload

## GameAddon
* for every command, create a field "onChangeSync" = "players"
  after a command was executed, it checks that field, and if existing, starts the sync for the defined data
  e.g. after revokeRole, the players will be synced
* Do we really need the double capsulated JSON stringify (inside the lua) ? Bad for performance, debugging and convenience

# Ideas
* Something like lvh.me but for c2 (e.g. when joining the game, you get a whisper: "visit http://c2.flaffipony.rocks to view the web companion")
* Nodjs should check latest available version and inform game and browser about possible updates
* We could install modules via file system

## Modules
* live module (map with players and vehicles)
* Statistics: how do we do the database? Is handling it in a simple object to RAM intensive    
* Performance: show tps etc on the website

## Other
* Discord link: use discord role memebers for gameaddon role members (synced)
* Discord chat link (bot) to mirror game chat and a discord channel