# 前端代码组织约定

本文约束 `apps/admin` 和 `apps/judge` 的目录、UI 库、样式和状态管理。项目总览见 `docs/architecture.md`。

## 目标

前端代码按路由、业务 UI 模块、通用组件和应用胶水拆分，避免 `main.tsx` 或单个页面持续膨胀。当前阶段不建立大型设计系统，`admin` 和 `judge` 按各自设备形态使用不同 Ant Design 方案。

## 应用形态

- `apps/admin` 是后台管理端，按桌面优先设计，同时保证窄屏可用。
- `apps/judge` 是裁判 H5 端，按移动端优先设计。

judge 端开发、适配和人工校验的标准设备为 iPhone 17 竖屏：

```text
物理屏幕：6.3 英寸 OLED
物理分辨率：1206 x 2622 px
标准校验视口：402 x 874 CSS px
设备像素比：3
方向：portrait
```

`402 x 874 CSS px` 是按 iPhone 17 官方物理分辨率和 3x 设备像素比推导出的浏览器视口基准。judge 端页面不得依赖桌面宽度；关键操作应在该视口下无横向滚动、无文字遮挡、无主要操作按钮离开首屏过远。

## UI 技术选择

- `apps/admin` 使用 `antd` 和 `@ant-design/icons`。
- `apps/judge` 使用 `antd-mobile`。
- 表单校验可以使用 UI 库表单能力；复杂业务校验继续以 `packages/contracts` 的 Zod schema 为准。
- 不要混用 Mantine、MUI、shadcn/ui 或 Tailwind。

admin 使用 `ConfigProvider` 和 antd `App` 作为全局 Provider。后台 CRUD 默认采用“表格 + 操作按钮 + Modal/Drawer 表单”模式：列表页优先展示表格和详情区，新增、编辑、重置密码、导入等操作由按钮唤起 `Modal` 或 `Drawer`，不要把大段管理表单平铺在列表页。

judge 使用 antd-mobile 组件。登录、查找、提交评分等瞬时成功/失败反馈默认用 `Toast.show`；确认类交互用 `Dialog.confirm`；加载失败、无权限、角色不匹配、登录态恢复失败等需要用户阅读或处理的阻断状态保留页面级错误组件。

## 推荐目录

后台端示例：

```text
apps/admin/src/
  main.tsx
  app/
    App.tsx
    providers.tsx
    routes.tsx
    api.ts
    env.ts
    session.ts
    theme.ts
  layouts/
    AdminLayout.tsx
    AuthLayout.tsx
  pages/
    login/
      LoginPage.tsx
      LoginPage.module.css
    bootstrap/
      BootstrapPage.tsx
      BootstrapPage.module.css
    overview/
      OverviewPage.tsx
      OverviewPage.module.css
    users/
      UsersPage.tsx
      UsersPage.module.css
  modules/
    users/
      components/
        UserInfoModal.tsx
        ResetPasswordModal.tsx
        RoleCheckboxGroup.tsx
      hooks/
        useUsers.ts
      users-api.ts
      users-view-model.ts
  components/
    ui/
      EmptyState.tsx
      InlineMessage.tsx
      PageHeader.tsx
  utils/
    errors.ts
    random.ts
    roles.ts
  styles/
    base.css
```

`modules/*` 是前端业务 UI 模块，不等同于后端 service 模块。它用于承载一个业务能力相关的组件、hook、view model 和轻量 API 封装。

## 页面约束

使用 dir-based page：

```text
pages/users/UsersPage.tsx
pages/users/UsersPage.module.css
```

- `pages/*` 只放路由级页面。
- 一个路由一个目录，即使当前只有一个文件。
- 页面负责组装布局、调用模块 hook、处理页面状态。
- 页面不承载大量表单行、表格行或字段组件；文件明显膨胀时拆到 `modules/*` 或 `components/*`。

## modules 约束

- `modules/*` 放业务 UI 单元。
- `modules/*` 可以依赖 `app/api.ts`、`components/ui`、`utils`、`@bjcp-arena/contracts`。
- `modules/*` 不 import `pages/*`。
- 一个 module 可以暴露 hook、业务组件和 view model，但不直接声明全局路由。
- 跨 module 复用时，优先抽小函数或明确的公开组件，不互相读取内部文件。

## components 约束

- `components/ui` 只放无业务语义的项目通用组件，例如 `PageHeader`、`InlineMessage`、`EmptyState`。
- 不要把 antd 或 antd-mobile 的 `Button`、`Input` 原样包一层。
- 项目组件不调用 API、不读 `localStorage`、不依赖业务 contracts，除非它已经属于 `modules/*`。

暂不建立 `packages/ui`。当 admin/judge 出现稳定重复的主题、布局或无业务组件后，再评估是否上移共享。

## 样式策略

admin 优先使用 antd theme、组件 props 和少量 CSS Modules；judge 优先使用 antd-mobile 组件 props 和移动端页面级 CSS。

系统色板与主题使用规则见 `docs/theme.md`。当前先在 judge 端落地 Traditional Brewing Challenge 主题；admin 后续需要统一时再按同一色板映射到 antd theme。

优先级：

1. `ConfigProvider` theme 或 antd-mobile 全局变量。
2. UI 组件 props，例如 `type`、`color`、`size`、`status`。
3. CSS Modules 或页面级 class。
4. 少量全局 CSS。

禁止大量通过 `.ant-*` 或 `.adm-*` 全局选择器硬覆盖组件内部样式。

全局样式只放：

- reset。
- body 字体和背景。
- 少数 app 级 CSS 变量。
- 可访问性工具类，例如 `.sr-only`。

## 状态与请求

- 当前不引入全局状态库。
- 页面状态优先使用 `useState` / `useReducer`。
- 远程请求封装到页面或 `modules/*/hooks`。
- 只有出现跨页面缓存、失效和后台刷新需求时，再评估 TanStack Query。
- token 存取封装在 `app/session.ts`，不要散落 `localStorage` 调用。
- API client 实例放在 `app/api.ts`。
- 环境变量读取放在 `app/env.ts`。

## 表单规则

- admin 表单优先使用 antd `Form`。
- judge 表单优先使用 antd-mobile `Form` 或适合移动端的受控输入组件。
- 业务校验优先复用 `packages/contracts` 的 Zod schema。
- 不在页面里复制与后端不一致的校验规则。

## 依赖方向

```text
main.tsx -> app
app -> pages/layouts/components/utils
pages -> modules/components/utils/app
modules -> components/utils/app/api/contracts
components/ui -> React/UI 库/CSS Modules
utils -> 不依赖 React，不依赖 app/pages/modules
```

禁止：

```text
components/ui -> modules
modules -> pages
utils -> app
judge -> admin
admin -> judge
```
