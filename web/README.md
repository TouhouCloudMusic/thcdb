# Web

## 安装

### 安装包管理器

包管理器使用Bun

#### 安装Bun

```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

#### 设置Bun

如果你需要diff bun的lockb文件，请参考<https://bun.sh/docs/install/lockfile>

### 安装依赖

```bash
bun install
```

## 设置

## 开发

使用Node:

```bash
bun dev
```

使用Bun:

```bash
bun dev-b
```

## 命名规范

- 大驼峰
  - 接口
  - 类
  - JSX Element
- 小驼峰
  - 函数
  - 变量
- 大写下划线
  - 常量
- 小写下划线
  - 对象键
  - 接口成员（值类型）
