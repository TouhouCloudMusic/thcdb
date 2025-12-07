# Image (图片) 模块

> **实现状态**: ⚠️ 部分完成 | [查看路线图](../ROADMAP.md#image-queue)

图片系统管理 THCDB 中的所有视觉媒体，包括存储、元数据、审核队列和与各种实体的关联。

## Image 实体

图片包含以下信息：

- **文件名**: 上传图片的原始文件名
- **存储位置**: 图片的存储目录路径
- **上传者**: 上传图片的用户
- **上传时间**: 图片上传的时间
- **存储后端**: 图片使用的存储后端（目前仅支持本地文件系统）

## ImageQueue 实体

图片队列系统管理用户提交图片的审核和批准流程：

- **图片引用**: 关联的图片
- **状态**: 当前处理状态 (ImageQueueStatus)
- **处理信息**: 处理时间和处理人
- **撤销信息**: 撤销时间和撤销人（如适用）
- **创建信息**: 创建时间和创建人

### ImageQueueStatus

表示图片队列的处理状态：

- **Pending**: 等待审核
- **Approved**: 已接受并发布
- **Rejected**: 已拒绝并说明原因
- **Cancelled**: 过期取消
- **Reverted**: 曾被接受但被管理员撤销

## 图片类型

### 需要图像队列管理的类型

- **Artist**: 个人资料图片
- **Release**: 专辑封面 (Cover art)

### 不需要图像队列管理的类型

- **用户图片**: 头像、个人资料横幅、评论图片

## 验证与管理

### 全局允许的格式

| 格式 | 扩展名          | 用途                 |
| ---- | --------------- | -------------------- |
| JPEG | `.jpg`, `.jpeg` | 一般摄影、艺术作品   |
| PNG  | `.png`          | 透明图形、高质量图片 |
| WebP | `.webp`         | 现代格式，更好的压缩 |
| GIF  | `.gif`          | 动画图片（有限使用） |

### 手动审核标准

人工审核员评估：

- **相关性**: 图片与关联实体相关
- **质量**: 足够的分辨率和清晰度
- **适当性**: 遵循社区准则
- **版权**: 无明显版权违规
- **准确性**: 正确代表实体

## API 端点

### 已实现

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/image/{path}` | GET | ✅ | 下载图片文件 |
| `/artist/{id}/image` | POST | ✅ | 提交艺术家图片 |
| `/release/{id}/image` | POST | ✅ | 提交作品图片 |
| `/profile-banner` | POST | ✅ | 上传 profile banner |
| `/avatar` | POST | ✅ | 上传头像 |

### 待实现

| 端点 | 方法 | 说明 |
|------|------|------|
| `/admin/image-queue` | GET | 待审核队列 |
| `/admin/image-queue/{id}` | GET | 图片详情 |
| `/admin/image-queue/{id}/approve` | POST | 批准 |
| `/admin/image-queue/{id}/reject` | POST | 拒绝 |
| `/admin/image-queue/{id}/revert` | POST | 撤销 |
| `/admin/image-queue/pending-count` | GET | 待审核数量 |
| `/user/{id}/image-queue` | GET | 用户的图片 |
