# CogniFlow 智能流笔记 - 项目总结

## 项目概述

CogniFlow是一款由AI驱动的智能信息管理工具,实现了"你只管记录,我负责管理"的核心理念。用户可以像发消息一样输入任何碎片化信息,AI会自动进行意图识别、实体提取和智能归档。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件库**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS
- **路由**: React Router v6
- **状态管理**: React Hooks
- **图标**: Lucide React
- **日期处理**: date-fns
- **通知**: Sonner

### 后端
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth + miaoda-auth-react
- **API**: Supabase Client

### AI集成
- **模型**: 文心大模型(百度)
- **功能**: 意图识别、实体提取、智能分类
- **实现**: 流式处理、结构化输出

## 核心功能实现

### 1. 用户认证系统
- 手机号登录
- 自动创建用户档案
- 首个用户自动成为管理员
- 行级安全策略(RLS)

### 2. AI处理引擎
- 文本意图分类(task/event/note/data)
- 实体提取(时间、地点、人物、主题)
- 优先级判断
- 标签自动生成

### 3. 智能仪表盘
- **今日视图**: 显示当天任务和日程
- **即将发生视图**: 显示未来事项
- **收件箱视图**: 存放无时效信息
- **主题视图**: 标签分类浏览

### 4. 信息管理
- 快速输入(底部固定输入框)
- 卡片式展示
- 完成标记
- 编辑修改
- 归档删除
- 实时搜索

### 5. 管理功能
- 用户管理
- 角色分配
- 统计信息
- 权限控制

## 数据库设计

### profiles表
```sql
- id: uuid (主键,关联auth.users)
- phone: text (唯一)
- email: text (唯一)
- role: user_role (user/admin)
- created_at: timestamptz
```

### items表
```sql
- id: uuid (主键)
- user_id: uuid (外键)
- raw_text: text (原始输入)
- type: item_type (task/event/note/data)
- title: text (AI提取)
- description: text (AI提取)
- due_date: timestamptz (截止时间)
- priority: text (优先级)
- status: text (状态)
- tags: text[] (标签数组)
- entities: jsonb (实体信息)
- created_at: timestamptz
- updated_at: timestamptz
- archived_at: timestamptz
```

## 安全策略

### RLS策略
1. **profiles表**
   - 管理员: 完全访问
   - 用户: 只能查看和更新自己的信息

2. **items表**
   - 管理员: 完全访问
   - 用户: 完全控制自己的条目(CRUD)

### 数据隔离
- 用户数据完全隔离
- 基于user_id的访问控制
- 数据库级别的安全保障

## 文件结构

```
src/
├── components/
│   ├── common/
│   │   ├── Header.tsx          # 顶部导航栏
│   │   ├── Footer.tsx          # 底部信息
│   │   └── PageMeta.tsx        # 页面元数据
│   ├── items/
│   │   ├── ItemCard.tsx        # 信息卡片
│   │   ├── QuickInput.tsx      # 快速输入
│   │   └── EditItemDialog.tsx  # 编辑对话框
│   ├── ui/                     # shadcn/ui组件
│   ├── mode-toggle.tsx         # 主题切换
│   └── theme-provider.tsx      # 主题提供者
├── pages/
│   ├── Dashboard.tsx           # 仪表盘页面
│   ├── Login.tsx               # 登录页面
│   ├── Admin.tsx               # 管理页面
│   └── NotFound.tsx            # 404页面
├── db/
│   ├── supabase.ts             # Supabase客户端
│   └── api.ts                  # 数据库API
├── types/
│   └── types.ts                # TypeScript类型定义
├── utils/
│   └── ai.ts                   # AI处理工具
├── routes.tsx                  # 路由配置
├── App.tsx                     # 应用入口
└── main.tsx                    # 主入口

supabase/
└── migrations/
    └── 01_create_initial_schema.sql  # 数据库迁移
```

## 环境变量配置

```env
# 应用ID
VITE_APP_ID=app-753skrjg6ygx

# Supabase配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# 登录配置
VITE_LOGIN_TYPE=phone
VITE_SHOW_POLICY=true
VITE_POLICY_PREFIX=登录即表示同意

# 文心大模型API(需要用户配置)
VITE_WENXIN_API_KEY=your_api_key_here
VITE_WENXIN_SECRET_KEY=your_secret_key_here
VITE_API_ENV=production
```

## 使用流程

### 用户端
1. 手机号登录
2. 在底部输入框输入信息
3. AI自动分类和提取
4. 在对应视图查看信息
5. 管理和编辑条目

### 管理端
1. 以管理员身份登录
2. 点击顶部"管理"按钮
3. 查看用户统计
4. 管理用户角色
5. 分配权限

## AI处理流程

1. **用户输入**: 在快速输入框输入文本
2. **发送请求**: 调用文心大模型API
3. **流式处理**: 实时接收AI响应
4. **结构化解析**: 提取JSON格式结果
5. **数据存储**: 保存到数据库
6. **界面更新**: 刷新对应视图

## 特色功能

### 1. 智能识别
- 自动识别任务、日程、笔记、资料
- 提取时间、地点、人物等实体
- 判断优先级和紧急程度

### 2. 情境感知
- 今日视图突出当天事项
- 过期任务红色提醒
- 优先级边框标识

### 3. 标签系统
- AI自动生成标签
- 标签关联查看
- 快速筛选信息

### 4. 搜索功能
- 实时搜索
- 关键词匹配
- 全文检索

### 5. 响应式设计
- 桌面端优化
- 移动端适配
- 深色模式支持

## 性能优化

1. **数据库索引**: 为常用查询字段创建索引
2. **懒加载**: 按需加载数据
3. **防抖处理**: 搜索输入防抖
4. **缓存策略**: 本地状态缓存
5. **代码分割**: 路由级别代码分割

## 安全措施

1. **认证保护**: 所有路由需要登录
2. **RLS策略**: 数据库级别访问控制
3. **数据隔离**: 用户数据完全隔离
4. **环境变量**: 敏感信息环境变量管理
5. **HTTPS**: 生产环境强制HTTPS

## 部署说明

### 前置要求
1. Node.js 18+
2. pnpm/npm
3. Supabase账号
4. 文心大模型API密钥

### 部署步骤
1. 克隆代码仓库
2. 安装依赖: `pnpm install`
3. 配置环境变量
4. 运行数据库迁移
5. 启动开发服务器: `pnpm dev`
6. 构建生产版本: `pnpm build`

## 未来扩展

### 短期计划
- [ ] 语音输入支持
- [ ] 图片附件上传
- [ ] 提醒通知功能
- [ ] 数据导出功能

### 长期计划
- [ ] 移动端原生应用
- [ ] 协作共享功能
- [ ] 更多AI模型支持
- [ ] 数据分析报表

## 技术亮点

1. **AI驱动**: 文心大模型智能处理
2. **流式响应**: 实时AI处理反馈
3. **类型安全**: 完整TypeScript支持
4. **现代UI**: shadcn/ui组件库
5. **安全可靠**: Supabase RLS策略
6. **响应式**: 多设备完美适配
7. **用户友好**: 简洁直观的交互

## 开发规范

### 代码风格
- 使用2空格缩进
- 使用TypeScript严格模式
- 遵循ESLint规则
- 组件使用函数式写法

### 命名规范
- 组件: PascalCase
- 函数: camelCase
- 常量: UPPER_SNAKE_CASE
- 文件: kebab-case或PascalCase

### Git提交
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

## 许可证

本项目为私有项目,版权所有。

---

**CogniFlow** - 智能流笔记,让信息管理更简单 🚀
