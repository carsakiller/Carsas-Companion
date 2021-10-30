# How to code

## Setup build tools
* if you are on windows you will need a command line tool, i suggest the official one from git: https://gitforwindows.org/
* install node (e.g. v12)
* install compass (stylesheet parsing): `$ gem install compass`
* install nodemon (restart node server on code changes): `npm install -g nodemon`

## Coding
* command line tool 1 : `cd compass & compass watch`
* command line tool 2 : `nodemon`

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
* Module based approach: core features and then modules can register data, tabs, messages, commands, ... (e.g. the live module)

## Browser
* implement auto reloading or at least websocket reconnecting for the browser

## WebServer
* version check with the script running in the game
* detect game server restart / script reload
* when did not receive a heartbeat / any message for some time, set server to notAvailable (inform webclients, and directly reject their requests)

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
* gameserver management module (start/stop game, manage saves)
* a test module (test functionality and performance of web<->game transmission, can be controlled from the browser)
* Statistics: how do we do the database? Is handling it in a simple object to RAM intensive    

## Other
* Discord link: use discord role memebers for gameaddon role members (synced)
* Discord chat link (bot) to mirror game chat and a discord channel