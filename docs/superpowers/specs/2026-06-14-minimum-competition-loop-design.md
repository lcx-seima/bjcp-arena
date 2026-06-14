# 啤酒比赛最小闭环设计

## 目标

实现 `bjcp-arena` 的第一个啤酒比赛最小闭环：后台创建比赛并维护酒款，裁判登录后扫码进入指定酒款评分，大屏按比赛实时展示评分统计。

本阶段从“工程底座和 hello-world 联通链路”进入最小业务闭环，但仍保持克制：只实现比赛、酒款、评分、二维码和大屏统计所需的必要能力，不提前引入轮次编排、裁判分配、复杂赛制、报表导出或完整 BJCP 评分体系扩展。

## 范围

本次包含：

- 多场比赛并存，每个比赛独立维护酒款、评分和大屏。
- 后台比赛 CRUD、比赛状态切换、酒款 CRUD、酒款状态切换。
- 酒款录入字段：真实酒款名、厂牌/出品、BJCP 大类/子类、酒款介绍长文本。
- 每个酒款拥有比赛内匿名编码 `entryNumber`，从 1 开始递增。
- 后台统一二维码墙，只展示已进入比赛的酒款。
- 裁判端必须登录，扫码进入指定比赛下指定酒款评分页。
- 裁判只看到匿名酒款编号、BJCP 类型和酒款介绍。
- 专业裁判和大众评委使用两套评分表单。
- 评分记录保存提交时的评委类型快照和昵称快照。
- 同一裁判对同一酒款只保留一份有效评分，评审中可覆盖提交。
- 大屏打开指定比赛看板，通过 SSE 接收刷新信号并重拉 summary。

本次不包含：

- 全局 active 比赛。
- 裁判与比赛或酒款的绑定限制。
- 轮次、桌次、分组、出酒顺序编排。
- 评分历史审计。
- token 化或短链二维码。
- WebSocket 双向控制。
- 主持人控制台、倒计时、轮播编排。
- E2E、React 组件测试、截图测试、视觉回归或 Storybook。

## 领域模块

后端按三个业务模块组织：

```text
apps/api/src/modules/
  competitions/
  beers/
  scores/
```

- `competitions` 负责比赛基础信息和生命周期。
- `beers` 负责比赛下酒款、匿名编码、BJCP 类型快照、二维码 URL。
- `scores` 负责评分提交、评分覆盖、统计聚合和 SSE 刷新信号。

所有公开路径、请求 schema、响应 schema 和类型先定义在 `packages/contracts`，API、`packages/api-client` 和前端共同消费。

## 比赛模型

`Competition` 保存比赛基础信息：

- `id`
- `name`
- `description`
- `status`
- `createdAt`
- `updatedAt`

比赛状态：

- `draft`：准备中，后台可维护信息，不允许裁判评分。
- `judging`：评审中，允许裁判对已发布酒款评分。
- `closed`：已结束，评分锁定。
- `published`：已公示，评分仍锁定，允许展示完整酒款信息。

不设计全局 active 比赛。后台、裁判端和大屏均通过 URL 中的 `competitionId` 定位比赛。

## 酒款模型

`BeerEntry` 属于某一场比赛，保存完整酒款信息和匿名展示信息：

- `id`
- `competitionId`
- `entryNumber`
- `realName`
- `producer`
- `bjcpCategoryCode`
- `bjcpCategoryName`
- `bjcpSubcategoryCode`
- `bjcpSubcategoryName`
- `description`
- `status`
- `createdAt`
- `updatedAt`

酒款状态：

- `draft`：草稿，后台可编辑，裁判端不可评分。
- `published`：已进入比赛，裁判端可扫码评分。
- `removed`：已退出比赛，后台保留记录，裁判端不可评分。

`entryNumber` 规则：

- 在同一比赛内从 `1` 开始递增。
- 同一比赛内唯一，数据库约束为 `(competitionId, entryNumber)`。
- 创建酒款时分配，之后不允许修改。
- 酒款被 `removed` 后编号不回收，避免现场材料、二维码和匿名编号失配。
- 裁判端、大屏公示前、二维码墙均可使用“酒款 #N”定位酒款。

酒款基础信息在任意酒款状态下都可以修改，但 `entryNumber` 不可修改。删除酒款使用 `removed` 状态，不做硬删除。

## BJCP 类型常量

BJCP 类型作为系统常量放入 `packages/contracts`。后台选择具体子类，例如 `10A Weissbier`，系统同时保存其所属大类和子类快照。

保存快照而不是只保存 code，是为了历史比赛不受未来 BJCP 文案调整影响。

## 用户与评委类型

沿用现有用户、角色和登录体系。裁判端必须登录，且用户必须具备 `JUDGE` 角色。

在用户上增加预设评委类型：

- `professional`：专业裁判。
- `public`：大众评委。

该字段只对具备 `JUDGE` 角色的用户有业务意义。MVP 不限制哪些裁判能参加哪些比赛或酒款；只要裁判账号登录并进入对应二维码页面，就可以在状态允许时提交评分。

## 评分模型

评分使用一张 `scores` 表，专业裁判和大众评委两套表单字段显式存储，不使用 JSON，不拆成两张评分表。

通用字段：

- `id`
- `beerId`
- `judgeUserId`
- `judgeTypeSnapshot`
- `judgeNicknameSnapshot`
- `submittedAt`
- `createdAt`
- `updatedAt`

专业裁判字段：

- `professionalAromaScore`：0-12
- `professionalAromaComment`
- `professionalAppearanceScore`：0-3
- `professionalAppearanceComment`
- `professionalFlavorScore`：0-20
- `professionalFlavorComment`
- `professionalMouthfeelScore`：0-5
- `professionalMouthfeelComment`
- `professionalOverallScore`：0-10
- `professionalOverallComment`
- `professionalTotalScore`：0-50，由系统计算并保存。

大众评委字段：

- `publicOverallPreferenceScore`：1-10
- `publicAromaBodyFoamScore`：1-5
- `publicEntryAcceptanceScore`：1-5
- `publicWillingToDrinkScore`：1-5
- `publicComment`

约束与索引：

- 唯一约束：`(beerId, judgeUserId)`。
- 查询索引：`(beerId, judgeTypeSnapshot)`。

同一裁判对同一酒款只保留一份当前有效评分。比赛评审中再次提交时覆盖原记录。评分提交时从用户账号复制 `judgeTypeSnapshot` 和 `judgeNicknameSnapshot`，后续账号属性变化不影响历史评分。

裁判端 `my-score` 接口返回最后提交时间。若已有评分，页面在表单顶部提示：“你已于 YYYY-MM-DD HH:mm 提交过，本次提交会覆盖上次评分。”

## 评分门槛

裁判提交评分前，后端必须校验：

- 当前用户具备 `JUDGE` 角色。
- 当前用户有预设评委类型。
- 比赛存在。
- 酒款存在且属于该比赛。
- 比赛状态为 `judging`。
- 酒款状态为 `published`。

不满足条件时返回明确错误。比赛 `closed` 或 `published` 后不再允许新增或修改评分。

## 统计口径

大屏不把专业裁判 50 分制和大众评委 10 分制混成一个总分。

每个酒款展示两组统计：

- 专业裁判：评分人数、`professionalTotalScore` 平均分。
- 大众评委：评分人数、`publicOverallPreferenceScore` 平均分、三个大众维度均分。

公示前，大屏使用“酒款 #N”和 BJCP 类型展示；比赛状态为 `published` 后，可以展示真实酒款名和厂牌/出品。

## API 契约

后台比赛接口：

```text
GET    /api/competitions
POST   /api/competitions
GET    /api/competitions/:competitionId
PATCH  /api/competitions/:competitionId
PATCH  /api/competitions/:competitionId/status
```

后台酒款接口：

```text
GET    /api/competitions/:competitionId/beers
POST   /api/competitions/:competitionId/beers
GET    /api/competitions/:competitionId/beers/:beerId
PATCH  /api/competitions/:competitionId/beers/:beerId
PATCH  /api/competitions/:competitionId/beers/:beerId/status
GET    /api/competitions/:competitionId/qr-codes
```

裁判评分接口：

```text
GET   /api/judge/competitions/:competitionId/beers/:beerId
GET   /api/judge/competitions/:competitionId/beers/:beerId/my-score
PUT   /api/judge/competitions/:competitionId/beers/:beerId/my-score
```

大屏接口：

```text
GET /api/board/competitions/:competitionId/summary
GET /api/board/competitions/:competitionId/events
```

权限边界：

- 后台比赛和酒款 CRUD：`ADMIN` 或 `SUPER_ADMIN`。
- 裁判评分接口：必须登录且具备 `JUDGE`。
- 大屏接口：MVP 先公开读取，延续现有 board 不接认证保护的方向。
- 裁判受限酒款详情接口只返回匿名编号、BJCP 类型、介绍文本和状态，不返回真实酒款名或厂牌/出品。

`packages/api-client` 保持框架无关，只新增上述方法，不绑定 React、Mantine 或浏览器存储。

## 后台管理端

`apps/admin` 新增比赛和酒款管理能力。

页面：

- 比赛列表页：查看多场比赛、创建比赛、进入比赛详情。
- 比赛详情页：编辑比赛基础信息、切换比赛状态、管理该比赛下酒款。
- 酒款表单：新增或编辑真实酒款名、厂牌/出品、BJCP 子类、介绍文本。
- 二维码墙：`/competitions/:competitionId/qr-codes`。

二维码墙只展示该比赛下 `status = published` 的酒款。每张卡片显示：

- 酒款匿名编号。
- 真实酒款名。
- 厂牌/出品。
- BJCP 类型。
- 裁判端直达 URL。
- 二维码。

二维码内容使用直接 URL：

```text
http://<judge-host>/competitions/:competitionId/beers/:beerId
```

MVP 不做短码、token 化二维码或二维码访问权限绑定。

## 裁判 H5 端

`apps/judge` 继续沿用现有登录和 `JUDGE` 角色限制。

新增评分页：

```text
/competitions/:competitionId/beers/:beerId
```

进入页面后：

1. 若未登录，先登录。
2. 若当前账号不具备 `JUDGE` 角色，展示无权限提示。
3. 获取受限酒款信息和自己的历史评分。
4. 根据账号预设评委类型展示对应表单。
5. 已评分时显示最后提交时间，并说明再次提交会覆盖。
6. 状态不允许评分时展示明确提示，不展示可提交按钮。

专业裁判表单采用 50 分结构：

- 香气：0-12
- 外观：0-3
- 风味：0-20
- 口感：0-5
- 总体印象：0-10
- 系统计算总分，最高 50。
- 各分项可带评语，整体印象可作为总评。

大众评委表单：

- 总体喜欢程度：1-10
- 香气/酒体/泡沫吸引力：1-5
- 入口接受度：1-5，用于表达苦味或酸味是否容易接受。
- 是否愿意再喝：1-5
- 简短评价：可选。

## 大屏端

`apps/board` 新增比赛看板页：

```text
/competitions/:competitionId
```

看板首次加载时请求 `summary`，随后建立 SSE 连接订阅该比赛事件。

SSE 事件只作为刷新信号，不作为最终数据源。大屏收到事件后重新请求 `summary`。EventSource 断线重连成功后也重新请求 `summary`。页面再加低频兜底刷新，例如 15-30 秒一次，避免网络或浏览器异常导致事件漏收后长期滞后。

事件类型：

- `score.updated`
- `competition.updated`
- `beer.updated`

MVP 看板展示：

- 比赛名称和状态。
- 酒款数量。
- 每个已发布酒款的匿名编号和 BJCP 类型。
- 专业裁判评分人数和平均总分。
- 大众评委评分人数、总体喜欢程度均分、三个大众维度均分。
- 最近更新时间。

比赛 `published` 后，可以展示真实酒款名和厂牌/出品。

## 测试策略

自动化测试继续聚焦 contracts、api-client 和 API，不引入 E2E 或 React 组件测试。

`packages/contracts` 覆盖：

- 比赛、酒款、评分状态枚举。
- BJCP 常量。
- API 路径。
- 请求和响应 schema。
- 两套评分表单 schema。

`packages/api-client` 覆盖：

- 新增比赛、酒款、裁判评分、大屏方法。
- 认证请求携带 Bearer token。
- 公开大屏请求不要求 token。
- 成功响应解析。
- HTTP 错误和 schema 错误。

`apps/api` 覆盖：

- 后台比赛和酒款 CRUD 权限。
- 酒款 `entryNumber` 在比赛内递增且不回收。
- 裁判受限详情不泄露真实酒款名和厂牌。
- 评分提交状态门槛。
- 同一裁判同一酒款重复提交会覆盖。
- 评分保存 `judgeTypeSnapshot`、昵称快照和最后提交时间。
- 专业裁判总分由系统计算。
- 大屏 summary 聚合结果。
- 评分更新后会发出 SSE 刷新信号。

人工 smoke 覆盖：

- 后台创建比赛、录入多个酒款、发布酒款、打开二维码墙。
- 裁判账号登录后扫码进入对应酒款，只看到匿名编号、BJCP 类型和介绍文本。
- 专业裁判看到 50 分表单，大众评委看到轻量表单。
- 已评分时显示最后提交时间，再提交会覆盖。
- 大屏打开指定比赛后看到 summary，并在评分提交后自动刷新。
- 比赛关闭后，裁判端不能再提交。
- 比赛公示后，大屏或后台可展示完整酒款信息。

实现完成前运行：

```bash
pnpm verify
```

## 后续扩展点

以下能力不进入本次 MVP，但当前设计为它们保留空间：

- 裁判与比赛或酒款的分配关系。
- 评分历史审计和撤回。
- token 化二维码或短码跳转页。
- 轮次、桌次、出酒顺序。
- 更完整的 BJCP 风格说明快照。
- 主持人大屏控制和 WebSocket 双向交互。
- 报表导出和获奖结果发布。
