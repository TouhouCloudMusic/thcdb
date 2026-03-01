local state_key = KEYS[1]

local has_expected_state = ARGV[1] == '1'
local expected_payload = ARGV[2]
local next_payload = ARGV[3]
local ttl_seconds = tonumber(ARGV[4])
local next_index_key = ARGV[5]
local previous_index_key = ARGV[6]
local user_id = ARGV[7]

local current_payload = redis.call('GET', state_key)

if has_expected_state then
  if current_payload ~= expected_payload then
    return 0
  end
elseif current_payload then
  return 0
end

if previous_index_key ~= '' and previous_index_key ~= next_index_key then
  redis.call('DEL', previous_index_key)
end

redis.call('SET', state_key, next_payload, 'EX', ttl_seconds)

if next_index_key ~= '' then
  redis.call('SET', next_index_key, user_id, 'EX', ttl_seconds)
end

return 1
