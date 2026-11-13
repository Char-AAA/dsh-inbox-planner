# dsh-inbox-planner · 收件箱规划

[English](README.md) | 中文

**DeepSeek Harness（DSH）的「邮件 → 待办 → 日历」插件。** 新邮件里凡是需要你动手的事（回复、确认参加、缴费、交材料、考试、面试、开会），都会连同日期和时间写进 [dsh-sidebar-todo](https://www.npmjs.com/package/dsh-sidebar-todo)，在它的列表和月历里显示。也可以选择同步到 [dsh-calendar](https://www.npmjs.com/package/dsh-calendar) 的真实日历。整个过程不占对话回合，不新增界面，也不会另存一份邮箱密码。

```
dsh-email ──email_list / email_read──▶ inbox-planner ──personal_todo──▶ dsh-sidebar-todo（列表 + 月历）
（收信、凭证）                          │                └─calendar_create─▶ dsh-calendar（可选）
                              噪音预筛 → 模型抽取（失败退回规则）→ 判重 → 冲突检测
```

## 邮箱

dsh-email 里配置的每个账号都会处理：QQ、163、126、Gmail、Outlook / Microsoft 365、腾讯企业邮、任意 IMAP / POP3 服务器，以及 AgentMail。每个邮箱单独记录处理进度，所有邮箱共用一份待办清单，并且跨邮箱判重。只想处理其中几个邮箱，就在「处理哪些邮箱」里填账号名。Gmail、Outlook 这类 OAuth 账号要先在 设置 → 邮件 里登录，登录之前会被跳过。

## 前置

| 插件 | 用途 |
|---|---|
| [dsh-email](https://www.npmjs.com/package/dsh-email)，已配好能收信的账号 | 邮件来源；凭证只保存在它那里 |
| （内置）待办 + 日历面板 | 基于 dsh-sidebar-todo（MIT）。如果你之前装过 dsh-sidebar-todo，**请停用它**：数据文件是同一个，已有待办会原样保留 |
| [dsh-calendar](https://www.npmjs.com/package/dsh-calendar)（可选） | 写入真实日历（iCloud / CalDAV / Google） |

支持 DSH `>=0.2.1-rc.2 <0.3`。默认使用 DSH 的默认模型，也可以单独指定。

## 安装

如果你添加了收录本插件的索引，可以在 **插件 → 发现** 里一键安装。也可以让 Agent 执行，或者在命令行运行：

```
plugin_manager  action: install_bundle  target: dsh-inbox-planner
dsh plugin --profile desktop add dsh-inbox-planner
```

加载约 15 秒后跑第一轮，回补最近 `backfillDays` 天（默认 3 天）的邮件，之后每 `pollSeconds` 秒（默认 60 秒）检查一次。

## 每一轮做什么

1. **取新信封：** IMAP 按 uid 水位判断；POP3 / AgentMail 的字符串 id 按「已处理集合 + 基线时间」判断。离线期间积压的邮件会自动翻页补上，最多 200 封。没有新邮件时，一轮只调用一次 `email_list`。
2. **噪音预筛，不调模型：** 跳过验证码、登录提醒、投递回执、岗位推荐、订阅、推广、问卷。主题里有动作词（笔试、截止、请回复、payment due……）的邮件一律不跳过。
3. **模型抽取，每封调用一次：**
   - 一封邮件里有多个时间点就拆成多条，时间换算成本地时区，已经过去的事不收。
   - 标题跟随邮件语言，格式为「机构：动作」。
   - 同时抽取需要的准备、地点和时长。
   - 回复格式不对时修复重试一次；输出被截断时把上限翻倍再试一次；`auto` 模式下仍然失败就退回规则引擎。
4. **识别抄送：** 只抄送给你的邮件默认不生成待办，除非信中点名要你做事。你的邮箱地址从 dsh-email 自动识别。
5. **判重：** 和清单里已有的全部条目比对，包括你手动加的和已经完成的。机构名归一化后一致（「远景科技集团」=「远景」、「Acme Inc」=「Acme」），动作类型相同（笔试 / 测评 / 面试 / 确认 / 签约 / 材料 / 缴费 / 会议……），并且日期相差不超过 `dedupeDays` 天，就算同一件事。新邮件补上了原来缺的时间时，更新原条目，不新建。
6. **冲突检测：** 同一天开始时间相差小于 `conflictMinutes` 分钟的两条，备注里都会加上 ⚠️，注明和哪一条冲突。
7. **写入待办：** 分类为「邮件」，备注里写发件人和主题、地点、需要的准备、原文依据，以及 `#inbox-planner uid=…`。
8. **同步日历（可选）：** 带时间的事项建成带正确时区偏移的日程，只有日期的建成全天日程；每条只同步一次。

每处理完一封就保存一次进度，状态文件在 `$DSH_PROFILE_DIR/data/dsh-inbox-planner/state.json`。中途崩溃也不会重复处理或漏掉邮件。

## 使用

- 平时什么都不用做，事项会自动出现在待办面板里，可以按「邮件」分类筛选。
- **待办面板标题旁的刷新图标**：立即检查一次邮件并刷新列表。同样的操作也在 **侧栏 → More → 「立即同步邮件 → 待办」** 里。在对话框输入 `/inbox-sync` 效果相同，不经过模型。
- 对 Agent 说「收件箱规划状态」「重扫邮件 5402」「暂停收件箱规划」，它会调用 `inbox_planner` 工具（`status / sync / rescan / pause / resume`）。

## 设置

打开 **插件 → dsh-inbox-planner → Components → dsh-inbox-planner ›**。字段分为基本、判定规则、日历、模型四组，点「保存」后立即生效，改过的项可以单独恢复默认。安装或升级后需要重启一次 DSH，设置页的界面端才会加载。各项含义见 [README.md](README.md#settings)；设置页里每一项都有中英双语说明。

## 隐私

邮件正文会先去掉引用回复、签名和链接，再截断到 `llmBodyChars` 字符，只发给你在 DSH 里配置的模型。本插件不保存任何凭证，自己也不发起任何网络请求。

## 开发

```
npm install
npm test
```

测试直接使用真实的 dsh-sidebar-todo 存储。`test/host-contract.test.js` 通过 `apply()` 加载插件，所有工具调用都经过一个严格按 DSH 官方 `ToolBatchInput` / `ToolBatchResult` 约定写的执行器；邮件和模型用假数据。

欢迎提 issue 和 PR。MIT 协议。

## 第三方声明

内置的待办面板改编自 dsh-sidebar-todo（MIT 协议）。按 MIT 协议要求，其许可证原文保留在 `vendor/LICENSE.dsh-sidebar-todo`。
