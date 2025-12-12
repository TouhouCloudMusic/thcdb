# Credit Role Tree 设计文档

## 概述

Credit Role（职能角色）用于描述艺术家在作品中的贡献类型，如作曲、编曲、演唱、混音等。与其他实体不同，Credit Role 不需要探索页面，而是通过**层级树结构**进行浏览和管理。

## 设计理念

### 为什么不使用探索页面？

1. **数量有限**: Credit Role 数量相对固定，不会像歌曲或艺术家那样持续增长
2. **层级关系**: 职能角色天然具有层级结构（如"音乐制作"下包含"作曲"、"编曲"等）
3. **浏览方式**: 用户更倾向于通过树形结构浏览，而非列表筛选

### Credit Role Tree 的优势

- **直观展示**: 清晰展示角色之间的父子关系
- **快速导航**: 用户可以展开/折叠分类快速定位
- **易于管理**: 管理员可以直观地调整层级结构

## 数据模型

### 现有结构

```rust
// entity/credit_role
pub struct Model {
    pub id: i32,
    pub name: String,
    pub short_description: Option<String>,
    pub description: Option<String>,
}
```

### 扩展结构（待实现）

```sql
-- 添加父角色引用，支持层级结构
ALTER TABLE credit_role ADD COLUMN parent_id INTEGER REFERENCES credit_role(id);

-- 添加排序字段
ALTER TABLE credit_role ADD COLUMN sort_order INTEGER DEFAULT 0;
```

## 层级结构示例

```
Credit Roles
├── 音乐制作 (Music Production)
│   ├── 作曲 (Composition)
│   ├── 编曲 (Arrangement)
│   ├── 作词 (Lyrics)
│   └── 混音 (Mixing)
├── 演奏 (Performance)
│   ├── 主唱 (Vocals)
│   ├── 吉他 (Guitar)
│   ├── 贝斯 (Bass)
│   ├── 鼓 (Drums)
│   └── 键盘 (Keyboard)
├── 制作 (Production)
│   ├── 制作人 (Producer)
│   ├── 录音 (Recording)
│   └── 母带处理 (Mastering)
└── 其他 (Other)
    ├── 封面设计 (Cover Art)
    └── 视频制作 (Video Production)
```

## API 设计

### 获取完整树结构

```
GET /credit-role/tree
```

**响应**:
```json
{
  "status": "Ok",
  "data": [
    {
      "id": 1,
      "name": "音乐制作",
      "short_description": "Music Production",
      "children": [
        {
          "id": 2,
          "name": "作曲",
          "short_description": "Composition",
          "children": []
        },
        {
          "id": 3,
          "name": "编曲",
          "short_description": "Arrangement",
          "children": []
        }
      ]
    }
  ]
}
```

### 获取子角色

```
GET /credit-role/{id}/children
```

### 获取角色路径（面包屑）

```
GET /credit-role/{id}/path
```

**响应**:
```json
{
  "status": "Ok",
  "data": [
    { "id": 1, "name": "音乐制作" },
    { "id": 2, "name": "作曲" }
  ]
}
```

## 实现计划

### 阶段 1：数据库迁移

- [ ] 添加 `parent_id` 字段
- [ ] 添加 `sort_order` 字段
- [ ] 创建索引优化查询

### 阶段 2：Domain 模型

- [ ] 创建 `CreditRoleTree` 结构
- [ ] 实现树构建算法

### 阶段 3：API 实现

- [ ] `GET /credit-role/tree` - 获取完整树
- [ ] `GET /credit-role/{id}/children` - 获取子角色
- [ ] `GET /credit-role/{id}/path` - 获取路径

### 阶段 4：管理功能

- [ ] 创建角色时指定父角色
- [ ] 调整角色层级
- [ ] 调整排序顺序

## 技术细节

### 树构建算法

```rust
pub struct CreditRoleNode {
    pub id: i32,
    pub name: String,
    pub short_description: Option<String>,
    pub children: Vec<CreditRoleNode>,
}

pub fn build_tree(roles: Vec<CreditRole>) -> Vec<CreditRoleNode> {
    // 1. 按 parent_id 分组
    // 2. 递归构建子树
    // 3. 按 sort_order 排序
}
```

### 查询优化

使用递归 CTE 查询完整树：

```sql
WITH RECURSIVE role_tree AS (
    -- 根节点
    SELECT id, name, short_description, parent_id, sort_order, 0 as depth
    FROM credit_role
    WHERE parent_id IS NULL

    UNION ALL

    -- 子节点
    SELECT cr.id, cr.name, cr.short_description, cr.parent_id, cr.sort_order, rt.depth + 1
    FROM credit_role cr
    JOIN role_tree rt ON cr.parent_id = rt.id
)
SELECT * FROM role_tree ORDER BY depth, sort_order;
```

## 与现有功能的关系

- **Credit 系统**: 在为艺术家添加 credit 时，可以通过树结构选择角色
- **搜索功能**: 搜索结果可以按角色分类展示
- **统计功能**: 可以统计各角色类型的使用频率

## 注意事项

1. **循环检测**: 更新 parent_id 时需要检测循环引用
2. **删除策略**: 删除父角色时需要处理子角色（提升或级联删除）
3. **缓存**: 树结构变化不频繁，可以缓存完整树
