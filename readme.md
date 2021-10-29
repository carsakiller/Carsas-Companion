# Setup build system
- install node (e.g. v12)
- install compass `$ gem install compass`



# TODO
* check what the char limit for responses for server.httpGet() requests is!
* version check with the script running in the game
* detect game restart / script reload
* lua script:
  for every command, create a field "onChangeSync" = "players"
  after a command was executed, it checks that field, and if existing, starts the sync for the defined data
  e.g. after revokeRole, the players will be synced

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