local index_key = KEYS[1]
local state_key_prefix = ARGV[1]
local reset_key_hash = ARGV[2]

local user_id_value = redis.call('GET', index_key)
if not user_id_value then
  return ''
end

local state_key = state_key_prefix .. ':' .. user_id_value
local state_payload = redis.call('GET', state_key)
if not state_payload then
  redis.call('DEL', index_key)
  return ''
end

local ok, decoded_state = pcall(cjson.decode, state_payload)
if not ok then
  redis.call('DEL', index_key)
  return ''
end

local awaiting_password = decoded_state['AwaitingPassword']
if not awaiting_password then
  redis.call('DEL', index_key)
  return ''
end

if awaiting_password['reset_key_hash'] ~= reset_key_hash then
  redis.call('DEL', index_key)
  return ''
end

local user_id = tonumber(user_id_value)
if not user_id then
  redis.call('DEL', index_key)
  return ''
end

redis.call('DEL', state_key)
redis.call('DEL', index_key)

return cjson.encode({
  user_id = user_id,
  reset_key_expires_at = awaiting_password['reset_key_expires_at'],
})
