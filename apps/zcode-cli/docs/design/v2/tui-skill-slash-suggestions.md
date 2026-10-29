# TUI skill 斜杠建议（对齐 Desktop `/` 菜单）

## 背景

Desktop 客户端（`packages/ui`）的 `/` 输入建议会把 skills 目录合并进菜单并随输入过滤
（`slashCommandHelpers.buildSkillSuggestions` + `mentions/providers/skillsMentionProvider`）。
CLI TUI 的 `/` 菜单此前只含内置命令 + 自定义命令（`listSlashCommandSuggestions`），
skills 只能通过无参 `/skill` 列表或自然语言触达，与 Desktop 体验不一致。

本 spec 定义 TUI 侧对齐行为。不改 agent 运行时：skill 的加载/执行仍走既有
`/skill <name> [task]` 分发（`buildManualSkillPrompt` → `Skill` 工具）。

## 行为规格

1. **建议合并**：TUI 启动时（`loadStartupOptions`）用与 `/skill` 列表同源的数据
   （`listSkillsForTui` → bootstrap `listZCodeSkills`，单一路径，不另建目录来源）
   生成 skill 建议，追加在内置命令、自定义命令之后：
   - `name`：`SkillMetadata.name`（插件技能为裸名，与 `Skill` 工具一致）；
   - `summary`：`<scope>/<source> · <description>[ <whenToUse>]`（与 TUI `/skill`
     列表的 scope/source 标注一致；空白折叠为单行）；
   - `usage`/`submitAs`：`/skill <name>`；
   - `aliases`：`qualifiedName` 与 `pluginName`（去重、排除与 name 相同者）。
2. **同名折叠**：同名 skill 按 scope 优先级 `project` > `system`(plugin) > `user`
   折叠为一条（对齐 Desktop `mapSkillsToMentionItemsForTest` 的折叠规则）。
3. **排序**：skill 建议按 `name` 字典序，稳定浏览。
4. **过滤**：沿用 `filterSlashCommands` 的 `/` 前缀 + 无空白约束；`name`/`aliases`
   保持子串匹配；`summary` 仅参与 ≥2 字符查询的子串匹配（对齐 Desktop 关键词含描述，
   且避免单字符查询噪声）。`draft` 含空白时菜单照旧隐藏（参数场景不弹菜单）。
5. **提交语义**：`TuiSlashCommandSuggestion` 新增可选 `submitAs`；选中提交时
   `resolveComposerSubmittedText` 返回 `submitAs ?? /${name}`。skill 建议经
   `submitAs` 落到既有 `/skill <name>` 分发，不新增第二套加载机制。
6. **自由输入兜底**：用户越过菜单直接提交 `/名称 [任务]`（含空白场景）时，
   command-center 的 unknown 分支先用 `deps.listSkills()` 目录按
   `name`/`qualifiedName` 精确匹配（大小写不敏感）；命中则按 `/skill` 语义
   提交 `buildManualSkillPrompt(name, args)`；未命中保持既有 unknown 行为
   （custom command 优先级不变，位于 skill 兜底之前）。

## 所有权与边界

- **skills 目录唯一所有者**：bootstrap `listZCodeSkills`（现状不变）；TUI 快照
  与 command-center 兜底都读它，不引入第二份目录缓存。快照生命周期 = TUI 启动
  （与 customCommands 同策略）；会话中途安装的插件 skills 需 `/new` 或重启刷新。
- **TUI（presentation）**：只扩展建议契约字段（`submitAs`）与过滤规则，不感知
  skills 概念。
- **cli（composition）**：目录→建议的映射、启动装配、unknown 兜底路由都在 cli 层。
  依赖方向 cli → tui 公共契约，不新增反向依赖。

## 验收场景

- `/` 弹出菜单含 skills；输入字符（名称/别名/摘要 ≥2 字符子串）实时收敛；
  输入空白后菜单隐藏。
- 选中 skill 回车 → 提交 `/skill <name>`，agent 先调 `Skill` 工具再执行任务。
- 直接输入 `/xlsx 检查这个表`、`/spreadsheets:xlsx 检查这个表` → 等价
  `/skill` 提交；输入不存在的 `/nope` → 保持 "Unknown command" 提示。
- 同名多来源 skill 只出现一条（project 优先）。
- desktop/web 与 app-server 链路不受影响（本次只改 CLI TUI 呈现面）。
