### 返回值
返回一个有序数组.
- 如果直出模式为false则输出符合条件的resource的UUID.
- 如果直出模式为true则输出符合条件的resource数据.
如果有参数非法，则返回`illegal_value`.
如果`关键词`为空，且推荐系统未实现，则返回`search_unhandled_request`.
如果`resource类型`为空，则返回`unrestricted_type`.
如果`过滤条件`的键不是`resource类型`对应的类型中的任何一个键，则返回`nonexistence_of_filter_key_in_request_type`.