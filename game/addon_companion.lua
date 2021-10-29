-- for testing purposes:

initialize = true

g_players = {}

function onTick()
	
	if initialize then
		initialize = false

		server.announce("----", "-------\n")

		registerSyncableData("players", function() return {{
			id = 1,
			name = "Pony",
			steamid = "x64",
			roles = {{
				id = 0,
				name = 'Owner',
				isEnabled = true
			},{
				id = 1,
				name = 'Admin',
				isEnabled = true
			}}
		},{
			id = 2,
			name = "FakeData",
			steamid = "x32",
			roles = {{
				id = 0,
				name = 'owner',
				isEnabled = true
			},{
				id = 1,
				name = 'admin',
				isEnabled = true
			}}
		}} end)
		
		registerWebServerCommandCallback("test", function(command, content)
			server.announce("received command test: " .. content)
			
			return "ok"
		end)
		
		registerWebServerCommandCallback("giveRole", function(command, content)
			if not (type(content[1]) == "number") then
				return "caller_id must be a number"
			end
			
			if not (type(content[2]) == "number") then
				return "player_id must be a number"
			end
			
			if not (type(content[3]) == "string") then
				return "role must be a string"
			end
			
			server.announce("executing command", "?giveRole " .. tableJoin(content, " "))
			syncSyncableData("players")
			
			return "ok"
		end)
		
		registerWebServerCommandCallback("revokeRole", function(command, content)
			if not (type(content[1]) == "number") then
				return "caller_id must be a number"
			end
			
			if not (type(content[2]) == "number") then
				return "player_id must be a number"
			end
			
			if not (type(content[3]) == "string") then
				return "role must be a string"
			end
			
			server.announce("executing command", "?revokeRole " .. tableJoin(content, " "))
			syncSyncableData("players")
			
			return "ok"
		end)
	end

	syncTick()
end

function onPlayerJoin()
	g_players = server.getPlayers()
	
	syncSyncableData("players")
end

function onCustomCommand(full_message, user_peer_id, is_admin, is_auth, command, ...)
	if command == "?sync" then
		g_players = server.getPlayers()
	
		syncSyncableData("players")
	end
end


function tableJoin(t, sep)
	local ret = ""
	for i,v in ipairs(t) do
		ret = ret .. v .. (i < #t and sep or "")
	end	
	return ret
end


--[[ Data Sync with web server ]]--
--
-- example use:
-- registerSyncableData("players", function() return g_players end)
-- 
-- function onPlayerJoin()
--   syncSyncableData("players")
-- end

syncableData = {}
function registerSyncableData(name, dataFunction--[[must be a function that returns the data to be synced]])
	if not (type(dataFunction) == "function") then
		return error("@registerSyncableData: dataFunction must be a function")
	end
	syncableData[name] = dataFunction
end

function syncSyncableData(name)
	if not syncableData[name] then
		return error("@syncSyncableData: this name does not exist: " .. name)
	end
	
	local data = syncableData[name]()
	
	sendToServer("sync-" .. name, data)
end

function error(msg)
	server.announce("C2 Error", msg)
end

function debug(msg)
	server.announce("C2 Debug", msg)
end


--[[ 2way Communication to Webserver via HTTP ]]--
-- v1.0
--
-- Give it any data and it will transmit it to the server (any size and type except functions)
-- You can listen to commands sent from the webserver too
--
--
-- IMPORTANT: call the syncTick() function at the end of onTick() !!!
--

local HTTP_GET_URL_CHAR_LIMIT = 4000 --TODO calc more precise
local HTTP_GET_API_PORT = 3000
local HTTP_GET_API_URL = "/game-api?data="
local packetSendingQueue = {}
local packetToServerIdCounter = 0
-- @data: table, string, number, bool (can be multidimensional tables; circular references not allowed!)
-- @meta: a table of additional fields to be send to the server
function sendToServer(datatype, data, meta --[[optional]])
	--[[
	
	Packet Structure (example):
	
	packet = {
		dataname = "sync-players",
		data = "{'justsome': 'example JSON'}",
		metapacketId = 13
		someOtherMeta = "hui"
	}
	
	]]--

	if not( type(datatype) == "string") then
		return error("@sendToServer: dataname must be a string")
	end

	local myPacketId = packetToServerIdCounter
	packetToServerIdCounter = packetToServerIdCounter + 1
	
	local stringifiedData = json.stringify(data)
	local encodedData = urlencode(string.gsub(stringifiedData, '"', '\\"'))
	
	local url = HTTP_GET_API_URL
	
	local packetPartCounter = 0
	
	debug("encodedData: " .. encodedData)

	repeat
		local myPacketPart = packetPartCounter
		packetPartCounter = packetPartCounter +1 
		
		local packet = json.parse(json.stringify(meta))
		packet.type = datatype
		packet.packetId = myPacketId
		packet.packetPart = myPacketPart
		
		local DATA_PLACEHOLDER = 'DATA_PLACEHOLDERINO'
		
		packet.data = DATA_PLACEHOLDER
		
		local stringifiedPacket = json.stringify(packet)
		local encodedPacket = urlencode(stringifiedPacket)

		local encodedPacketLength = string.len(encodedPacket) - string.len(urlencode(DATA_PLACEHOLDER))
		
		local maxLength = HTTP_GET_URL_CHAR_LIMIT - encodedPacketLength
		local myPartOfTheData = string.sub(encodedData, 1, maxLength)
		encodedData = string.sub(encodedData, maxLength + 1)
	
		local packetString = urlencode(json.stringify(packet))
		local from, to = string.find(packetString, urlencode(DATA_PLACEHOLDER), 1, true)
		local before = string.sub(packetString, 1, from - 1)
		local after = string.sub(packetString, to + 1)
		packetString = before .. myPartOfTheData .. after
		
		debug("queuing packet, size: " .. string.len(packetString) .. ", part: " .. myPacketPart)
		
		table.insert(packetSendingQueue, packetString)
	until (string.len(encodedData) == 0)
end

webServerCommandCallbacks = {}
-- @callback: this function must return either the boolean true (if execution of command was successful)
--            or a string containing an error message (e.g. bad user input, server threw error, etc.)
--            callback(commandname, commandcontent) will be called with the params commandname and commandcontent
function registerWebServerCommandCallback(commandname, callback)
	if not (type(callback) == "function") then
		return error("@registerWebServerCommandCallback: callback must be a function")
	end
	webServerCommandCallbacks[commandname] = callback
	debug("registered command callback '" .. commandname .. "'")
end

local tickCallCounter = 0
local lastPacketSendTickCallCount = 0
local HTTP_GET_TIMEOUT_BETWEEN_SEND = 30 -- in tick calls, not ticks! TODO: calculate precisely
function checkPacketSendingQueue()
	tickCallCounter = tickCallCounter + 1
	if #packetSendingQueue > 0 and tickCallCounter - lastPacketSendTickCallCount > HTTP_GET_TIMEOUT_BETWEEN_SEND then
		lastPacketSendTickCallCount = tickCallCounter
		
		local packetToSend = table.remove(packetSendingQueue, 1)
		
		debug("sending packet to server: " .. urldecode(packetToSend))
		
		server.httpGet(HTTP_GET_API_PORT, HTTP_GET_API_URL .. packetToSend)
	end
end

local c2HasMoreCommands = false
local HTTP_GET_HEARTBEAT_TIMEOUT = 60 * 5
function syncTick()
	checkPacketSendingQueue()
	
	if (c2HasMoreCommands and #packetSendingQueue == 0 and tickCallCounter - lastPacketSendTickCallCount > HTTP_GET_TIMEOUT_BETWEEN_SEND)
		or (tickCallCounter - lastPacketSendTickCallCount > HTTP_GET_HEARTBEAT_TIMEOUT) then
		sendToServer("heartbeat", "")
	end
end

-- don't call this, the game will call it (after getting a response for a HTTP request)
function httpReply(port, url, response_body)
	if port == HTTP_GET_API_PORT and string.sub(url, 1, string.len(HTTP_GET_API_URL)) == HTTP_GET_API_URL then
		if string.sub(response_body, 1, string.len("connect():")) == "connect():" then
			return error("C2 WebServer is not running!")
		end
		
		if string.sub(response_body, 1, string.len("timeout")) == "timeout" then
			return error("C2 WebServer Request timed out: " .. url)
		end
		
		local parsed = json.parse(response_body)
		
		if parsed == nil then
			debug("@httpReply parsing failed for: '" .. response_body .. "'")
			parsed = {}
		end
		
		if parsed.result == "ok" then
			-- do nothing, everything was fine
			debug("received response from server: ok")
		else
			error("server reported result: " .. (parsed.result or "nil"))
		end
		
		c2HasMoreCommands = parsed.hasMoreCommands == true
		
		if parsed.command then
			debug("received command from server: '" .. parsed.command .. "', " .. json.stringify(parsed.commandContent or "nil"))
		
			if type(webServerCommandCallbacks[parsed.command]) == "function" then
				local result = webServerCommandCallbacks[parsed.command](parsed.command, parsed.commandContent)
				
				sendToServer("command-response", result, {commandId = parsed.commandId})
			else
				error("no callback was registered for the command: '" .. parsed.command .. "'")
				
				sendToServer("command-response", "no callback was registered for the command: '" .. parsed.command .. "'", {commandId = parsed.commandId})
			end
		end
	end
end



--[[



Third Party Libraries





--]]




--[[ json.lua https://gist.github.com/tylerneylon/59f4bcf316be525b30ab
A compact pure-Lua JSON library.
The main functions are: json.stringify, json.parse.
## json.stringify:
This expects the following to be true of any tables being encoded:
 * They only have string or number keys. Number keys must be represented as
   strings in json; this is part of the json spec.
 * They are not recursive. Such a structure cannot be specified in json.
A Lua table is considered to be an array if and only if its set of keys is a
consecutive sequence of positive integers starting at 1. Arrays are encoded like
so: [2, 3, false, "hi"]. Any other type of Lua table is encoded as a json
object, encoded like so: {"key1": 2, "key2": false}.
Because the Lua nil value cannot be a key, and as a table value is considerd
equivalent to a missing key, there is no way to express the json "null" value in
a Lua table. The only way this will output "null" is if your entire input obj is
nil itself.
An empty Lua table, {}, could be considered either a json object or array -
it's an ambiguous edge case. We choose to treat this as an object as it is the
more general type.
To be clear, none of the above considerations is a limitation of this code.
Rather, it is what we get when we completely observe the json specification for
as arbitrary a Lua object as json is capable of expressing.
## json.parse:
This function parses json, with the exception that it does not pay attention to
\u-escaped unicode code points in strings.
It is difficult for Lua to return null as a value. In order to prevent the loss
of keys with a null value in a json string, this function uses the one-off
table value json.null (which is just an empty table) to indicate null values.
This way you can check if a value is null with the conditional
val == json.null.
If you have control over the data and are using Lua, I would recommend just
avoiding null values in your data to begin with.
--]]


json = {}


-- Internal functions.

local function kind_of(obj)
  if type(obj) ~= 'table' then return type(obj) end
  local i = 1
  for _ in pairs(obj) do
	if obj[i] ~= nil then i = i + 1 else return 'table' end
  end
  if i == 1 then return 'table' else return 'array' end
end

local function escape_str(s)
  local in_char  = {'\\', '"', '/', '\b', '\f', '\n', '\r', '\t'}
  local out_char = {'\\', '"', '/',  'b',  'f',  'n',  'r',  't'}
  for i, c in ipairs(in_char) do
	s = s:gsub(c, '\\' .. out_char[i])
  end
  return s
end

-- Returns pos, did_find; there are two cases:
-- 1. Delimiter found: pos = pos after leading space + delim; did_find = true.
-- 2. Delimiter not found: pos = pos after leading space;     did_find = false.
-- This throws an error if err_if_missing is true and the delim is not found.
local function skip_delim(str, pos, delim, err_if_missing)
  pos = pos + #str:match('^%s*', pos)
  if str:sub(pos, pos) ~= delim then
	if err_if_missing then
	  error('Expected ' .. delim .. ' near position ' .. pos)
	end
	return pos, false
  end
  return pos + 1, true
end

-- Expects the given pos to be the first character after the opening quote.
-- Returns val, pos; the returned pos is after the closing quote character.
local function parse_str_val(str, pos, val)
  val = val or ''
  local early_end_error = 'End of input found while parsing string.'
  if pos > #str then error(early_end_error) end
  local c = str:sub(pos, pos)
  if c == '"'  then return val, pos + 1 end
  if c ~= '\\' then return parse_str_val(str, pos + 1, val .. c) end
  -- We must have a \ character.
  local esc_map = {b = '\b', f = '\f', n = '\n', r = '\r', t = '\t'}
  local nextc = str:sub(pos + 1, pos + 1)
  if not nextc then error(early_end_error) end
  return parse_str_val(str, pos + 2, val .. (esc_map[nextc] or nextc))
end

-- Returns val, pos; the returned pos is after the number's final character.
local function parse_num_val(str, pos)
  local num_str = str:match('^-?%d+%.?%d*[eE]?[+-]?%d*', pos)
  local val = tonumber(num_str)
  if not val then error('Error parsing number at position ' .. pos .. '.') end
  return val, pos + #num_str
end


-- Public values and functions.

function json.stringify(obj, as_key)
  local s = {}  -- We'll build the string as an array of strings to be concatenated.
  local kind = kind_of(obj)  -- This is 'array' if it's an array or type(obj) otherwise.
  if kind == 'array' then
	if as_key then error('Can\'t encode array as key.') end
	s[#s + 1] = '['
	for i, val in ipairs(obj) do
	  if i > 1 then s[#s + 1] = ', ' end
	  s[#s + 1] = json.stringify(val)
	end
	s[#s + 1] = ']'
  elseif kind == 'table' then
	if as_key then error('Can\'t encode table as key.') end
	s[#s + 1] = '{'
	for k, v in pairs(obj) do
	  if #s > 1 then s[#s + 1] = ', ' end
	  s[#s + 1] = json.stringify(k, true)
	  s[#s + 1] = ':'
	  s[#s + 1] = json.stringify(v)
	end
	s[#s + 1] = '}'
  elseif kind == 'string' then
	return '"' .. escape_str(obj) .. '"'
  elseif kind == 'number' then
	if as_key then return '"' .. tostring(obj) .. '"' end
	return tostring(obj)
  elseif kind == 'boolean' then
	return tostring(obj)
  elseif kind == 'nil' then
	return 'null'
  else
	error('Unjsonifiable type: ' .. kind .. '.')
  end
  return table.concat(s)
end

json.null = {}  -- This is a one-off table to represent the null value.

function json.parse(str, pos, end_delim)
  pos = pos or 1
  if pos > #str then error('Reached unexpected end of input.') end
  local pos = pos + #str:match('^%s*', pos)  -- Skip whitespace.
  local first = str:sub(pos, pos)
  if first == '{' then  -- Parse an object.
	local obj, key, delim_found = {}, true, true
	pos = pos + 1
	while true do
	  key, pos = json.parse(str, pos, '}')
	  if key == nil then return obj, pos end
	  if not delim_found then error('Comma missing between object items.') end
	  pos = skip_delim(str, pos, ':', true)  -- true -> error if missing.
	  obj[key], pos = json.parse(str, pos)
	  pos, delim_found = skip_delim(str, pos, ',')
	end
  elseif first == '[' then  -- Parse an array.
	local arr, val, delim_found = {}, true, true
	pos = pos + 1
	while true do
	  val, pos = json.parse(str, pos, ']')
	  if val == nil then return arr, pos end
	  if not delim_found then error('Comma missing between array items.') end
	  arr[#arr + 1] = val
	  pos, delim_found = skip_delim(str, pos, ',')
	end
  elseif first == '"' then  -- Parse a string.
	return parse_str_val(str, pos + 1)
  elseif first == '-' or first:match('%d') then  -- Parse a number.
	return parse_num_val(str, pos)
  elseif first == end_delim then  -- End of an object or array.
	return nil, pos + 1
  else  -- Parse true, false, or null.
	local literals = {['true'] = true, ['false'] = false, ['null'] = json.null}
	for lit_str, lit_val in pairs(literals) do
	  local lit_end = pos + #lit_str - 1
	  if str:sub(pos, lit_end) == lit_str then return lit_val, lit_end + 1 end
	end
	local pos_info_str = 'position ' .. pos .. ': ' .. str:sub(pos, pos + 10)
	error('Invalid json syntax starting at ' .. pos_info_str)
  end
end





-- ref: https://gist.github.com/ignisdesign/4323051
-- ref: http://stackoverflow.com/questions/20282054/how-to-urldecode-a-request-uri-string-in-lua
-- to encode table as parameters, see https://github.com/stuartpb/tvtropes-lua/blob/master/urlencode.lua

local char_to_hex = function(c)
  return string.format("%%%02X", string.byte(c))
end

function urlencode(url)
  if url == nil then
	return
  end
  url = url:gsub("\n", "\r\n")
  url = url:gsub("([^%w ])", char_to_hex)
  url = url:gsub(" ", "+")
  return url
end

local hex_to_char = function(x)
  return string.char(tonumber(x, 16))
end

urldecode = function(url)
  if url == nil then
	return
  end
  url = url:gsub("+", " ")
  url = url:gsub("%%(%x%x)", hex_to_char)
  return url
end
