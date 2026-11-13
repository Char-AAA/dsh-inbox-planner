# Changelog

## 0.3.1

- **Every mailbox, not only the default.** Accounts are discovered through dsh-email's `email_health`, and each mailbox gets its own watermark, seen-set and own address, so uids that collide across mailboxes do not interfere. Dedupe and conflict checks still span all mailboxes.
  - An OAuth account that is not signed in yet is skipped with a notice.
  - A mailbox that fails (expired auth code, network) is reported and does not stop the others.
  - The new `accounts` setting limits processing to some mailboxes.
  - Notes record `account=` and reports prefix `[account]` when there is more than one mailbox.
  - `rescan` accepts `account`.
- The v1 single-mailbox state file is migrated automatically; the watermark and seen mails are kept.
- Audit notes, verified in dsh-email 0.25.0's source:
  - Reading mail uses IMAP fetch without setting `\Seen`, so processing never marks mail as read.
  - HTML-only mail is converted to text before the model sees it.
  - External images in the mail view are blocked by dsh-email by design, with a per-message "Load external images" button; this plugin does not affect it.

## 0.3.0 — all-in-one

- **The plugin now has its own To-do + calendar panel.** It is the panel from [dsh-sidebar-todo](https://www.npmjs.com/package/dsh-sidebar-todo) 0.3.1 (MIT, license kept in `vendor/LICENSE.dsh-sidebar-todo`), embedded with list and month views, recurring tasks, categories and notes. A **refresh icon** next to the panel title checks mail now and reloads the list.
- The panel uses the same data file as dsh-sidebar-todo (`data/dsh-todolist/todos.json`), so existing to-dos carry over unchanged. The plugin provides the same agent tools, `personal_todo` and `personal_note`. Its HTTP API lives under `/inbox-planner/todo/api` and the panel id is `inbox-todo`.
- **Coexistence.** If dsh-sidebar-todo is still enabled, the built-in panel stays off: no second store writes the file, and the planner keeps writing through dsh-sidebar-todo's tool. Disable dsh-sidebar-todo to switch over.
- The panel's UI follows the DSH language and falls back to English rather than Chinese when no locale service is present.
- `scripts/build-client.mjs` embeds the vendored panel with exact edits that must each match once, so the build fails if upstream code moves.
- dsh-sidebar-todo is no longer a requirement.

## 0.2.7

- **"Sync mail → to-do now" button.** It sits in the sidebar's **More** menu, through the official `sidebar.panellist.actions` slot, because dsh-sidebar-todo exposes no slot inside its own panel. A click runs one check, shows the result in the row ("2 new to-dos" or "No new mail"), then opens the To-do panel. Behind it is a new host route, `POST /inbox-planner/api/sync|status`, with the same connection auth as dsh-sidebar-todo's `/todo/api`.

## 0.2.6

- **Titles really follow the language setting.** In the real-host run DeepSeek kept Chinese titles even though the target language was English (the notes were already English). A title in the wrong language now gets one repair round with an explicit example. A third attempt is accepted as is, so an item is never lost over its language. This check does not run when `titleLanguage: mail`.

## 0.2.5

- The settings page labels select options per field. In 0.2.4 the engine's `auto` showed "Follow system", a label meant for the language field.
- A missing dsh-calendar is reported once, not on every run. Many users only need the to-do panel's built-in month calendar.

## 0.2.4

- **One language everywhere.** `language: auto` (the default) follows the DSH UI language, and falls back to the OS language when DSH is set to follow the system. It now drives to-do titles too, not only notes, reports and the settings page; the model translates titles and keeps proper names. The new `titleLanguage: mail` keeps each mail's own language instead. The `/inbox-sync` description follows the same language.
- **To-do vs calendar is decided per item.** The model labels each item `event` (you must attend at a set time: exam, interview, meeting, appointment) or `task` (to be done by a deadline). The new `calendar` setting has three values: `events` (default) sends only events to dsh-calendar, `all` sends every dated item, and `off` sends none. It replaces the `calendarMirror` boolean. A missing dsh-calendar is now a notice rather than an error, and those items still reach the to-do list.
- **Every mail's decision is in the report.** `/inbox-sync` and `inbox_planner status` list each mail with what happened to it: noise, no action needed, CC only, already listed, → to-do, or → to-do + calendar.

## 0.2.3

Polish from the first real-host run of the settings page (DSH 0.2.2-rc.2):

- `/inbox-sync` has a bilingual description, because it is registered once, before the language setting is read.
- Report timestamps use local `MM-DD HH:mm` instead of UTC ISO.
- The save bar is no longer `sticky`; in the Plugins page's scroll container it floated mid-page.

## 0.2.2

- **The settings page now shows up.** In DSH 0.2.2 the Plugins page opens a row's configuration only when a browser half registers `plugins.row.config` keyed `<package>#<row id>`. Exporting a volatile `Config` alone makes the host expose the form data (`autoGenerate: true`) but leaves nothing to render it, which was found in real-host testing. The new `client.js` registers `dsh-inbox-planner#inbox-planner` and renders all 20 fields in four groups (Basics / Rules / Calendar / Model) from `form.state`. It saves through `form.mutate(ops, revision)`, so the host validates the values and applies them live. The page also offers per-field reset (`unset`), marks changed fields, shows a read-only state and blocks out-of-range numbers. It is bilingual and follows the DSH UI language.
- The field table stays a single source of truth: `scripts/build-client.mjs` embeds `lib/config.js` into `client.js`, and `npm test` fails if `client.js` is stale.
- Seven new tests load `client.js` the way DSH's module loader does and render it with real React 19 in jsdom.

## 0.2.1

- **Language detection follows the DSH UI language.** It reads the `locale` settings row (`user.preference`, then `base.preference`), the same way dsh-email does, before falling back to env and Intl. In the desktop app the host has no `LANG` and Intl follows the OS, so 0.2.0 showed English reports to users whose DSH UI was in Chinese. Found in real-host testing on 0.2.2-rc.2.
- **An empty category is chosen once, then kept.** On first run it becomes 「邮件」 or 「Mail」 from the UI language and is stored in the state file, so a later language change can't split old and new items into two categories. An explicit `category` setting still wins immediately.

## 0.2.0

First public release.

- **General-purpose.** The prompt now covers any action or event (reply, confirm, pay, submit, sign, review, meetings, interviews, exams, appointments), not just recruiting. Titles follow the mail's language.
- **Settings page.** A schemastery `Config` is exported, so DSH renders the settings form. Fields are volatile and changes apply without a restart. Descriptions are bilingual.
- **Chinese and English** reports and notes (`language: auto | zh | en`).
- **CC handling.** CC-only mail produces nothing unless it names you. Your address comes from `selfAddresses` or is detected through dsh-email's `email_health`.
- **Better dedupe.** Organisation names are normalised (suffixes such as 集团 / 汽车 / Inc / Ltd are stripped, and prefixes match). Actions are grouped into kinds (confirm / setup / sign / docs / pay / reply / review / exam / assess / interview / checkup / meeting). The same task is matched within `dedupeDays` (default 3). This fixes four real duplicates found in 0.1.1 field use.
- **Optional calendar mirror** through dsh-calendar's `calendar_create`. Timed items become events with a UTC offset and the model's duration; date-only items become all-day events. Each item is mirrored at most once.
- **`rescan`** now reaches mail beyond the first page and no longer moves the watermark back.
- Model output carries `location` and `durationMinutes`.
- `cordis.patch.yml` now only inserts the row; defaults live in the schema.
- Tests run against the real dsh-sidebar-todo through a devDependency. There are 20 tests, including a strict host-contract executor.

## 0.1.1

- Fixed tool calls to use the DSH ≥ 0.2.1-rc.2 batch contract (`{ calls, signal }` with JSON-string arguments; `results[0].result.value`).
- String uids (POP3 / AgentMail) are supported. A missing `uidValidity` no longer triggers a rebaseline.

## 0.1.0

- Initial private build.
