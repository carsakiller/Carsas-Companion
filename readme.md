# Setup build system
- install node (e.g. v12)
- install compass `$ gem install compass`



# TODO
* version check with the script running in the game
* detect game restart / script reload
* make requests (e.g. for command) be able to run into a timeout
* implement auto reloading or at least websocket reconnecting for the browser
* lua script:
  for every command, create a field "onChangeSync" = "players"
  after a command was executed, it checks that field, and if existing, starts the sync for the defined data
  e.g. after revokeRole, the players will be synced

# more todo and ideas
- Rework sync to only send necessary data and not e.g. all players
- Adjust heartbeat rate (higher when no messages in sendqueue)
- Implement log filter (so we can filter out heartbeats (both Lua and js). Maybe we can even filter out the raw packages 
- Module based approach: core features and then modules can register data, tabs, messages, etc.
- a test module (test performance of web<->game transmission)
- Nodjs should check latest available version and inform game and browser about possible updates
- Something like lvh.me but for c2
- Do we really need the double capsulated JSON stringify??? Bad for performance, debugging and convenience
- Statistics: how do we do the database? Is handling it in a simple object to RAM intensive
- Can add-ons talk to each other?
- What if two add-ons use the same callback (e.g. onCustomMessage)? This greatly influences options for modules with seperate Lua script addons
- We could install modules via file system
- We could manage save games via file system
- We could restart dedicated server from webserver

- Discord link: use discord roles as members

- Addon: Money management by player. E.g. having infinite money, and when users do stuff (e.g. spawn in vehicle or sell) then change their money
- Addon: Discord chat link (bot)

# Documentation (haha)

## Workflow for data sync from browser to game:
Component defines methods (e.g. a button that triggers revoking a rule from a player) which will be called on button press.
The method then sends that command to the game, if game responds with success, wait until game syncs new player data (game triggers that by itself ^^ or do we do that from the website?)), if fails, do nothing and show error message.

# Before going into production:
* check app.js for necessary adjustments

# Building a standalone .exe
## install pkg
`npm i pkg -g`
## configure your package.json
```
    "bin": "index.js",
    "main": "index.js",
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