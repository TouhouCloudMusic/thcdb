local state_key = KEYS[1]
local expected_payload = ARGV[1]

local current_payload = redis.call('GET', state_key)
if current_payload ~= expected_payload then
  return 0
end

local ttl_seconds = redis.call('TTL', state_key)
if ttl_seconds <= 0 then
  redis.call('DEL', state_key)
  return 0
end

local ok, decoded_state = pcall(cjson.decode, current_payload)
if not ok then
  return redis.error_reply('invalid password reset state payload')
end

local awaiting_code = decoded_state['AwaitingCode']
if not awaiting_code then
  return 0
end

awaiting_code['failed_attempts'] = (awaiting_code['failed_attempts'] or 0) + 1

redis.call('SET', state_key, cjson.encode(decoded_state), 'EX', ttl_seconds)

return 1
