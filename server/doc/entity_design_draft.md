方法 1: 数据与实体标识分离：

- enum Status (Pending, Accepted, Rejected)
- artist
  - id
- artist_data
  - id
  - entity_id -> artist (id)
  - status
  - name
  - meta_comment
  - timestamp
- artist_data_history
  - id
  - entity_id -> artist_data (id)
  - ..artist_data
  - timestamp
- review
  - id
  - content
  - target_type -> artist_data | ..others
  - target_id -> artist_data | ..others (id)
  - timestamp

创建时：

1. 向 artist 表插入新条目, 返回 id
2. 向 artist_data 表插入新条目

更新时：

1. 向 artist_data 表插入新条目，设定 status 为 Pending
2. 更新内容时，向 artist_data_history 插入新内容
3. 评论时，向 review 插入新条目
4. 合并时，将 status 设定为 Accepted

缺点：

1. 需要维护一个影子表

方法 2:

- artist
  - id
  - change_set_id -> change_set
  - name
- change_set
  - id
  - meta_comment
  - timestamp
- history
  - id
  - table_name
  - change_set_id -> change_set
  - field_name
  - value
  - timestamp

创建时：

1. 向 change_set 表插入新条目, 返回 id
2. 向 artist 表插入新条目
3. 向 history 表插入条目

更新时：

1. 向 change_set 表插入新条目，返回 id
2. 更新内容时，向 history 插入新内容， 设定 id 为当前 change_set
3. 评论时，向 review 插入新条目
4. 合并时，修改 artist 的 change_set_id

方法 4：

- artist
  - id
  - change_set_id -> change_set
- change_set
  - id
  - entity_id
  - meta_comment
  - timestamp
- artist_data
  - id
  - entity_id -> artist (id)
  - change_set_id -> change_set (id)
  - name
  - timestamp

创建时：

1. 向 change_set 表插入新条目, 返回 id
2. 向 artist_data 表插入新条目
3. 向 artist 表插入新条目

更新时：

1. 向 change_set 表插入新条目，返回 id
2. 更新内容时，向 artist_data 插入新内容， 设定 id 为当前 change_set
3. 评论时，向 review 插入新条目
4. 合并时，修改 artist 的 change_set_id

简单来说需要以下三点：标识实体的 id，标识 change_set / pr 的 id，和 change_set 相关联的数据

方法 5：

- artist_id
  - id
- release_id
  - id
- change_set (generic?)
  - id (uuid? hash?)
  - author
  - approver
  - reviews -> many review
  - timestamp
- artist_data
  - id
  - entity_id -> artist_id (id)
  - change_set_id -> one change_set
  - other_datas
  - timestamp
- release_data
  - id
  - entity_id -> release_id (id)
  - change_set_id -> one change_set
  - other_datas
  - timestamp
- release_to_artist
  - artist_id -> artist_id (id)
  - release_data_id -> release_data (id)
  - change_set_id -> one change_set 与 release_data 的 change_set 相同

创建

```rust
let new_artist_id = artist_id::new()

let new_artist = artist_data::new(ArtistData {
	entity_id: new_artist_id
	change_set_id: change_set::new().id
	..others
})

let new_release_id = release_id::new()
let release_change_set_id = change_set::new().id
let new_release = release_data::new(ReleaseData {
	entity_id: new_release_id
	change_set_id:
	..others
})

release_to_artist::new(ReleaseToArtist {
	artist_id: new_artist_id
	release_data_id: new_release_id
	change_set_id: release_change_set_id
})

```

提出 Release PR

```rust

let {artist_id, release_id} = params
let {new_release_data} = body

let new_change_set_id = change_set::new().id
let new_release = release_data::new(ReleaseData {
	entity_id: release_id
	change_set_id: new_change_set_id
	..new_release_data
})

let mut release_artist = vec![]

for artist in new_release_data.artists {
	release_artist.push(ReleaseToArtist {
		artist_id: artist.id
		release_data_id: new_release.id
		change_set_id: new_change_set_id
	})
}

release_to_artist::insert_many(release_artist)

```

修改 PR

```rust

let {artist_id, release_id, change_set_id} = params
let {new_release_data} = body

let new_release = release_data::new(ReleaseData {
	entity_id: release_id
	change_set_id: change_set_id
	..new_release_data
})

let mut release_artist = vec![]

for artist in new_release_data.artists {
	release_artist.push(ReleaseToArtist {
		artist_id: artist.id
		release_data_id: new_release.id
		change_set_id: new_change_set_id
	})
}

release_to_artist::insert_many(release_artist)

```
