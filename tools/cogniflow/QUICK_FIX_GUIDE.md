# 🚀 400 错误快速修复指南

## ⚡ 5分钟快速修复

### 问题原因
数据库 `items` 表缺少必需的字段，导致 POST 请求返回 400 错误。

### 快速解决步骤

#### 步骤 1: 访问 Supabase SQL Editor
1. 打开浏览器访问：`https://backend.appmiaoda.com/projects/supabase241003659318571008`
2. 登录你的 Supabase 账号
3. 在左侧菜单找到 **SQL Editor**
4. 点击 **New Query** 创建新查询

#### 步骤 2: 执行修复 SQL
复制项目中的 `database_fix.sql` 文件的全部内容，粘贴到 SQL Editor 中，点击 **Run** 执行。

或者，直接复制以下 SQL：

```sql
-- 添加 'url' 到 item_type 枚举
DO $$ 
BEGIN
    ALTER TYPE item_type ADD VALUE IF NOT EXISTS 'url';
END $$;

-- 添加 URL 相关字段
ALTER TABLE items ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS url_title text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS url_summary text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS url_thumbnail text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS url_fetched_at timestamptz;

-- 添加高级功能字段
ALTER TABLE items ADD COLUMN IF NOT EXISTS has_conflict boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE items ADD COLUMN IF NOT EXISTS end_time timestamptz;
ALTER TABLE items ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS recurrence_end_date timestamptz;
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_item_id uuid REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_master boolean DEFAULT false;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_items_url ON items(url) WHERE url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_has_conflict ON items(has_conflict) WHERE has_conflict = true;
CREATE INDEX IF NOT EXISTS idx_items_start_time ON items(start_time) WHERE start_time IS NOT NULL;
```

#### 步骤 3: 验证修复
在 SQL Editor 中运行以下查询，确认字段已添加：

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'items'
ORDER BY ordinal_position;
```

你应该看到所有这些字段：
- ✅ url, url_title, url_summary, url_thumbnail, url_fetched_at
- ✅ has_conflict, start_time, end_time
- ✅ recurrence_rule, recurrence_end_date, master_item_id, is_master

#### 步骤 4: 重启应用
返回你的应用，刷新页面，问题应该已经解决！

## 📋 详细说明

### 为什么会出现这个错误？

你的代码使用了完整的字段列表（包括 URL、时间冲突等高级功能），但数据库中的 `items` 表还是初始版本，缺少这些字段。

### 这次修复做了什么？

1. **添加 URL 支持**：可以保存网页链接及其元数据
2. **添加时间管理**：支持日程的开始/结束时间
3. **添加冲突检测**：自动检测时间冲突
4. **添加重复规则**：支持重复任务/日程
5. **性能优化**：为新字段创建索引

### 修复后可以使用的功能

- ✅ 保存和管理网页链接
- ✅ 自动抓取网页标题和摘要
- ✅ 精确的日程时间管理
- ✅ 自动检测日程冲突
- ✅ 重复任务/日程支持

## 🔍 如果修复失败怎么办？

### 情况 1: 权限不足

**错误信息：** "permission denied for table items"

**解决方案：**
- 确认你有数据库管理权限
- 联系项目管理员授予权限
- 或使用超级管理员账号登录

### 情况 2: 枚举值已存在

**错误信息：** "enum label 'url' already exists"

**这不是问题！** 说明枚举值已经添加过了，可以忽略这个错误，继续执行后续 SQL。

### 情况 3: 字段已存在

**错误信息：** "column 'xxx' already exists"

**这不是问题！** 说明字段已经存在，可以忽略。使用 `IF NOT EXISTS` 确保脚本可以重复运行。

### 情况 4: 仍然报 400 错误

**检查清单：**

1. **确认所有字段都已添加**
   ```sql
   SELECT COUNT(*) as field_count
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'items';
   ```
   应该返回 26 个字段以上

2. **检查枚举类型**
   ```sql
   SELECT enumlabel 
   FROM pg_enum 
   WHERE enumtypid = 'item_type'::regtype;
   ```
   应该包含：task, event, note, data, url

3. **清除浏览器缓存**
   - 按 Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac)
   - 或使用无痕模式重新测试

4. **重启开发服务器**
   ```bash
   # 停止当前服务器 (Ctrl+C)
   # 重新启动
   npm run dev
   ```

## 📞 需要帮助？

如果问题仍未解决，请提供：

1. **SQL 执行结果**
   - 执行 `database_fix.sql` 的输出日志
   - 字段验证查询的结果

2. **浏览器错误日志**
   - 打开浏览器开发者工具 (F12)
   - 切换到 Console 标签
   - 复制错误信息

3. **网络请求详情**
   - 打开 Network 标签
   - 找到失败的请求
   - 查看 Request 和 Response 详情

## ✅ 修复成功标志

修复成功后，你应该能够：

1. ✅ 输入普通文本，AI 自动分类（task/event/note/data）
2. ✅ 输入网址，自动识别并保存为链接
3. ✅ 查看已保存的内容，没有报错
4. ✅ 编辑和删除功能正常
5. ✅ 日程冲突检测工作正常

## 🎉 恭喜！

如果以上步骤都完成了，你的 CogniFlow 应该已经可以正常工作了！

享受智能信息管理带来的便利吧！ 🚀
