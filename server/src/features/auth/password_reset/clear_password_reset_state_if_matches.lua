local state_key = KEYS[1]

local expected_payload = ARGV[1]
local index_key = ARGV[2]

local current_payload = redis.call('GET', state_key)
if current_payload ~= expected_payload then
  return 0
end

redis.call('DEL', state_key)

if index_key ~= '' then
  redis.call('DEL', index_key)
end

return 1
