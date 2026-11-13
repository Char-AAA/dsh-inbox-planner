# 发布清单（这个文件不会进 npm 包）

DSH 没有官方的中心市场。「插件 → 发现」页读的是用户自己添加的**索引 JSON**，索引里的条目指向 npm 包或 Git 提交。所以“上架”要做三件事：

1. 发布到 npm
2. 开源到 GitHub
3. 进入别人在用的索引，或者自己托管一份索引

## 0. 发布前在真实宿主上实测（必做；0.2.2 已在 DSH 0.2.2-rc.2 上验证通过：设置页显示、保存后立即生效、/inbox-sync 输出中文报告）

让 DSH 里的 Agent 执行：

> 用 `install_bundle` 安装 `dsh-inbox-planner-0.2.0.tgz`，替换 0.1.1，然后重启 App。重启后依次检查：
> ① **设置 → 插件 → dsh-inbox-planner** 里能看到自动生成的设置表单。把 `pollSeconds` 改成 120，然后用 `inbox_planner status` 确认改动生效，确认后改回来。
> ② 执行 `/inbox-sync`，把报告贴出来。
> ③ `inbox_planner rescan` 任选一封旧邮件，确认不会重复建待办。
> ④（如果装了 dsh-calendar）打开 `calendarMirror`，确认日历里出现了对应日程。

只要设置页没有显示，或者 ① 改了不生效，就**不要发布**，把现象告诉我。

## 1. GitHub

```sh
# 把占位符换成你的 GitHub 用户名
grep -rl Char-AAA . --exclude-dir=node_modules | xargs sed -i '' 's/Char-AAA/<你的用户名>/g'   # macOS
git init && git add -A && git commit -m "dsh-inbox-planner 0.2.0"
gh repo create dsh-inbox-planner --public --source . --push
```

需要的话，把 `package.json` 和 `LICENSE` 里的 author 改成你想公开的署名。

## 2. npm

二选一：

- **自动发布（推荐）：**
  1. 在 npmjs.com 生成 Granular Access Token，勾选 Read and write 和 Bypass 2FA。
  2. 在仓库的 Settings → Secrets 里添加 `NPM_TOKEN`。
  3. 执行 `git tag v0.2.0 && git push --tags`。
  4. `release.yml` 会先跑测试，再带 provenance 发布到 npm，并创建 GitHub Release。
- **手动发布：** `npm login`，然后 `npm publish`。`prepublishOnly` 会先跑测试。

发布后，在另一个 profile 里验证一遍：`dsh plugin --profile test add dsh-inbox-planner`。

## 3. 进入索引

- 让 Agent 执行 `plugin_market action: list_indexes`，看看你和社区都在用哪些索引。
- 大多数索引是用官方参考生成器从一份包名列表生成的：每行一个 npm 包名，能收录所有声明了 `dsh.bundle` 的版本。去那份索引的源仓库提一个 PR，在列表里加上 `dsh-inbox-planner` 这一行就行。
- 如果索引是手写的，就把 `market/index-entry.example.json` 的内容贴进它的 `plugins` 数组，并填上真实的 `publishTimestamp`。
- 另外，`dsh-plugin` 关键词能让按 npm 关键词扫描的工具和 Agent 搜到它。

## 4. 自己托管一份索引（可选）

```sh
node scripts/make-index.mjs > market/index.json   # 从 npm 上已发布的版本生成
```

在 GitHub Pages 上发布 `market/` 目录后，别人在 **插件 → 发现 → 添加索引源** 里填入 `https://<你>.github.io/dsh-inbox-planner/index.json` 就能看到并安装。

## 以后每次发版

1. 修改 `version`，补一段 `CHANGELOG.md`。
2. 在本地跑 `npm test`。
3. 在真实宿主上把第 0 步走一遍。
4. 执行 `git tag vX.Y.Z && git push --tags`。
5. 如果是自建索引，重新生成 `market/index.json` 并推送。
