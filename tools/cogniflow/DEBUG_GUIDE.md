# 🔍 页面空白问题诊断指南

## 已完成的修复

### 1. 移除重复的 ThemeProvider
- ✅ 在 `App.tsx` 中移除了重复的 `ThemeProvider`
- ✅ 保留 `main.tsx` 中的 `ThemeProvider`
- ✅ 添加了详细的初始化日志

### 2. 增强错误处理
- ✅ 添加了错误状态显示
- ✅ 添加了重新加载按钮
- ✅ 添加了控制台日志

## 如何检查问题

### 步骤 1: 打开浏览器开发者工具

1. 访问 `http://127.0.0.1:5173`
2. 按 `F12` 或 `Cmd+Option+I` (Mac) 打开开发者工具
3. 切换到 **Console** 标签

### 步骤 2: 查看控制台日志

你应该看到类似以下的日志：

```
开始初始化 IndexedDB...
IndexedDB 初始化成功
开始初始化认证系统...
认证系统初始化成功
```

### 步骤 3: 检查可能的错误

#### 情况 A: 看到 "正在初始化数据库..." 一直不消失
**原因**: IndexedDB 初始化失败
**解决**:
1. 检查浏览器是否支持 IndexedDB
2. 检查是否在无痕模式（不支持 IndexedDB）
3. 查看 Console 是否有红色错误信息

#### 情况 B: 看到红色错误提示框
**原因**: 初始化过程中出错
**解决**:
1. 查看错误信息
2. 点击"重新加载"按钮
3. 如果仍然失败，清除浏览器数据后重试

#### 情况 C: 页面完全空白，没有任何提示
**原因**: JavaScript 加载失败或语法错误
**解决**:
1. 查看 Console 中的红色错误
2. 查看 Network 标签，检查 `main.tsx` 是否加载成功
3. 检查是否有模块加载错误

#### 情况 D: 看到 "找不到模块" 错误
**原因**: TypeScript 编译问题
**解决**:
```bash
# 清除缓存并重新启动
rm -rf node_modules/.vite dist
npx vite --host 127.0.0.1
```

### 步骤 4: 检查 IndexedDB

1. 在开发者工具中切换到 **Application** (Chrome) 或 **Storage** (Firefox) 标签
2. 展开 **IndexedDB** → **CogniFlowDB**
3. 检查是否有 `profiles`, `items`, `tags` 三个表

### 步骤 5: 常见错误及解决方案

#### 错误 1: `DOMException: The user denied permission to access the database`

**解决**:
```bash
# 浏览器设置 → 隐私和安全 → 网站设置 → Cookie 和网站数据
# 确保允许本地存储
```

#### 错误 2: `TypeError: Cannot read properties of undefined`

**原因**: 某个依赖模块未正确导入

**解决**:
1. 查看具体的错误栈
2. 检查相关文件的导入语句
3. 确认所有文件都存在

#### 错误 3: `Failed to fetch dynamically imported module`

**解决**:
```bash
# 重新启动服务器
npx vite --host 127.0.0.1
```

#### 错误 4: 白屏但 Console 没有错误

**原因**: CSS 加载失败或样式问题

**检查**:
1. Network 标签中检查 `index.css` 是否加载
2. 查看 Elements 标签，检查 `<div id="root">` 内是否有内容
3. 检查是否有 CSS 导致元素不可见

## 快速测试命令

### 测试 1: 验证文件结构
```bash
ls -la src/db/
# 应该看到: api.ts, indexeddb.ts, localApi.ts, localAuth.ts
```

### 测试 2: 验证 TypeScript 编译
```bash
npx tsc --noEmit --skipLibCheck
# 应该没有输出（表示没有错误）
```

### 测试 3: 验证 Vite 构建
```bash
npx vite build
# 应该成功构建
```

### 测试 4: 检查端口占用
```bash
lsof -i:5173
# 应该看到 node 进程
```

## 如果问题仍然存在

### 完全重置

```bash
# 1. 停止服务器 (Ctrl+C)

# 2. 清除所有缓存
rm -rf node_modules/.vite dist .turbo

# 3. 清除浏览器数据
# Chrome: F12 → Application → Clear storage → Clear site data
# Firefox: F12 → Storage → Clear All

# 4. 重新安装依赖（可选）
rm -rf node_modules
npm install

# 5. 重新启动
npx vite --host 127.0.0.1
```

### 回退到备份版本

如果新的本地化版本有问题，可以回退：

```bash
# 恢复旧的 api.ts
cp src/db/api.ts.backup src/db/api.ts

# 恢复后需要配置 Supabase
# 查看 .env.backup 文件
```

## 预期的正常行为

### 加载过程（正常）

1. **0-1秒**: 显示"正在初始化数据库..."（带旋转动画）
2. **1-2秒**: 控制台显示初始化日志
3. **2秒后**: 显示主界面（Dashboard）

### 正常的界面元素

- ✅ 顶部导航栏（Header）
- ✅ "今天"、"待办"、"收件箱"等标签页
- ✅ 快速输入框
- ✅ 主题切换按钮
- ✅ 导出/导入按钮

## 获取详细诊断信息

如果需要获取完整的诊断信息，在浏览器 Console 中运行：

```javascript
// 检查数据库状态
console.log('=== 数据库诊断 ===');
const dbRequest = indexedDB.open('CogniFlowDB');
dbRequest.onsuccess = (event) => {
  const db = event.target.result;
  console.log('数据库版本:', db.version);
  console.log('存储空间:', Array.from(db.objectStoreNames));
  db.close();
};

// 检查本地存储
console.log('=== 本地存储 ===');
console.log('当前用户:', localStorage.getItem('cogniflow_current_user'));
console.log('主题设置:', localStorage.getItem('cogniflow-theme'));

// 检查模块加载
console.log('=== 模块状态 ===');
console.log('React:', typeof React !== 'undefined');
console.log('ReactDOM:', typeof ReactDOM !== 'undefined');
```

## 联系支持

如果以上步骤都无法解决问题，请提供：

1. 浏览器 Console 的完整截图
2. Network 标签的截图
3. 浏览器版本
4. 操作系统版本
5. 是否在无痕模式

---

**最后更新**: 2025-01-13  
**版本**: v2.0.0-local
