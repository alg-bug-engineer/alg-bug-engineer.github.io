# 🔍 400 错误分析报告

## 问题描述

**错误类型：** 400 Bad Request  
**请求 URL：** `https://backend.appmiaoda.com/projects/supabase241003659318571008/rest/v1/items`  
**请求方法：** POST  
**发生时间：** 2025年10月29日

## 🎯 根本原因分析

### 问题根源：**字段不存在于数据库中**

从错误 URL 的 `columns` 参数可以看出，代码尝试查询以下字段：
```
user_id, raw_text, type, title, description, due_date, priority, status, 
tags, entities, archived_at, url, url_title, url_summary, url_thumbnail, 
url_fetched_at, has_conflict, start_time, end_time, recurrence_rule, 
recurrence_end_date, master_item_id, is_master
```

但是，**数据库中的 `items` 表可能没有运行所有迁移文件**，导致部分字段不存在。

## 📊 字段来源分析

根据迁移文件分析，这些字段分别来自：

### 01_create_initial_schema.sql（基础字段）
- ✅ `id`, `user_id`, `raw_text`, `type`, `title`, `description`
- ✅ `due_date`, `priority`, `status`, `tags`, `entities`
- ✅ `created_at`, `updated_at`, `archived_at`

### 02_add_url_support.sql（URL 相关字段）
- ⚠️ `url`, `url_title`, `url_summary`, `url_thumbnail`, `url_fetched_at`

### 03_add_advanced_features.sql（高级功能字段）
- ⚠️ `has_conflict`, `start_time`, `end_time`
- ⚠️ `recurrence_rule`, `recurrence_end_date`
- ⚠️ `master_item_id`, `is_master`

## 🚨 可能的原因

### 1. **迁移文件未执行**
- 数据库可能只运行了 `01_create_initial_schema.sql`
- `02_add_url_support.sql` 和 `03_add_advanced_features.sql` 未运行

### 2. **数据库版本不一致**
- 线上数据库和本地代码不同步
- 代码已更新但数据库未更新

### 3. **Supabase 托管服务限制**
- `backend.appmiaoda.com` 是托管服务
- 可能没有权限执行数据库迁移
- 需要通过管理界面手动执行

## 🔧 解决方案

### 方案 1: 手动执行迁移文件（推荐）

#### 步骤 1: 连接到 Supabase 数据库
1. 访问 Supabase 管理后台
2. 进入 SQL Editor
3. 依次执行以下 SQL 文件

#### 步骤 2: 执行 URL 支持迁移
```sql
-- 02_add_url_support.sql
ALTER TYPE item_type ADD VALUE IF NOT EXISTS 'url';

ALTER TABLE items ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS url_title text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS url_summary text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS url_thumbnail text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS url_fetched_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_items_url ON items(url) WHERE url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_url_fetched_at ON items(url_fetched_at DESC) WHERE url_fetched_at IS NOT NULL;
```

#### 步骤 3: 执行高级功能迁移
```sql
-- 03_add_advanced_features.sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS has_conflict boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE items ADD COLUMN IF NOT EXISTS end_time timestamptz;
ALTER TABLE items ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS recurrence_end_date timestamptz;
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_item_id uuid REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_master boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_items_has_conflict ON items(has_conflict) WHERE has_conflict = true;
CREATE INDEX IF NOT EXISTS idx_items_start_time ON items(start_time) WHERE start_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_end_time ON items(end_time) WHERE end_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_recurrence_rule ON items(recurrence_rule) WHERE recurrence_rule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_master_item_id ON items(master_item_id) WHERE master_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_is_master ON items(is_master) WHERE is_master = true;
```

### 方案 2: 使用 Supabase CLI（开发环境）

如果你有本地开发环境：

```bash
# 1. 安装 Supabase CLI
npm install -g supabase

# 2. 登录
supabase login

# 3. 链接到项目
supabase link --project-ref your_project_ref

# 4. 运行迁移
supabase db push
```

### 方案 3: 临时修复 - 调整代码（不推荐）

如果无法执行迁移，可以临时移除新字段的使用：

```typescript
// 在 QuickInput.tsx 中，只使用基础字段
const newItem = await itemApi.createItem({
  user_id: user.id,
  raw_text: inputText,
  type: 'url',
  title: urlResult.title,
  description: urlResult.summary,
  due_date: null,
  priority: 'medium',
  status: 'pending',
  tags: ['链接', '网页'],
  entities: {},
  archived_at: null,
  // 移除这些新字段
  // url: urlResult.url,
  // url_title: urlResult.title,
  // ...
});
```

**注意：** 这会导致功能不完整，不推荐使用。

## 📋 验证步骤

### 1. 检查数据库字段
在 Supabase SQL Editor 中运行：

```sql
-- 查看 items 表的所有列
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'items'
ORDER BY ordinal_position;
```

### 2. 检查枚举类型
```sql
-- 查看 item_type 枚举值
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'item_type'::regtype
ORDER BY enumsortorder;
```

应该看到：`task`, `event`, `note`, `data`, `url`

## 🎯 推荐操作流程

1. ✅ **立即执行**：运行方案1的 SQL 迁移
2. ✅ **验证**：检查数据库字段是否完整
3. ✅ **测试**：重新启动应用并测试功能
4. ✅ **监控**：观察是否还有其他错误

## 📞 获取帮助

如果问题仍然存在，请提供：
1. 数据库字段列表（运行上面的验证 SQL）
2. 完整的错误日志
3. Supabase 项目的管理权限情况

## 💡 预防措施

为避免将来出现类似问题：

1. **版本同步**
   - 确保代码和数据库版本一致
   - 使用版本控制管理迁移文件

2. **自动化部署**
   - 使用 CI/CD 自动执行迁移
   - 在部署前检查数据库状态

3. **环境隔离**
   - 使用不同的 Supabase 项目分离开发/生产环境
   - 在开发环境先测试迁移

4. **文档化**
   - 记录所有数据库变更
   - 维护迁移执行日志
