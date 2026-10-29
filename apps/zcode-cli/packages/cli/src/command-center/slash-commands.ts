import type { DynamicWorkflowMode } from "@zcode/shared";
import type { TuiSlashCommandSuggestion } from "@zcode/tui";
import {
  findCustomCommandHelpEntry,
  formatAvailableCommandNames,
  formatCustomCommandHelpEntry,
  listCustomCommandSuggestions,
  type CommandCenterCustomCommandListOutcome,
} from "../command-center-custom.js";
import { SLASH_COMMAND_HELP_ENTRIES, type SlashCommandHelpEntry } from "./slash-command-help.js";
import type { SlashCommand } from "./slash-command-types.js";
import type { CommandCenterSkill } from "./types.js";
import { splitArgs } from "./utils.js";
import { isWorkflowModeEnabled } from "../workflow-mode.js";

const WORKFLOW_COMMAND_NAME = "workflow";

export type SlashCommandSurfaceOptions = {
  /** 缺席不设门（单测、嵌入方）；CLI 入口总会传入解析后的 `--workflow-mode`。 */
  workflowMode?: DynamicWorkflowMode;
  /**
   * skills 目录快照（与 `/skill` 列表同源，见 tui-skill-slash-suggestions.md）。
   * 提供时把 skills 合并进 `/` 建议菜单（对齐 Desktop buildSkillSuggestions）。
   */
  skills?: readonly CommandCenterSkill[];
};

/**
 * 命令面（建议、`/help`、未知命令提示）共用的可见集合：`disabled` 下去掉 `/workflow`，
 * 与 builtin resolver 不展开它是同一个结论（launch.md「The standalone CLI: `--workflow-mode`」）。
 */
function visibleHelpEntries(
  options?: SlashCommandSurfaceOptions,
): readonly SlashCommandHelpEntry[] {
  return isWorkflowModeEnabled(options?.workflowMode)
    ? SLASH_COMMAND_HELP_ENTRIES
    : SLASH_COMMAND_HELP_ENTRIES.filter((entry) => entry.name !== WORKFLOW_COMMAND_NAME);
}

export function listAvailableCommandNames(options?: SlashCommandSurfaceOptions): string[] {
  return visibleHelpEntries(options).map((entry) => `/${entry.name}`);
}

const SKILL_COMMAND_USAGE = "Usage: /skill [<skill-name> [task]]";

export function parseSlashCommand(input: string): SlashCommand | null {
  if (!input.startsWith("/")) return null;

  const trimmed = input.trim();
  const commandEnd = trimmed.search(/\s/);
  const rawName = (
    commandEnd === -1 ? trimmed.slice(1) : trimmed.slice(1, commandEnd)
  ).toLowerCase();
  const args = commandEnd === -1 ? "" : trimmed.slice(commandEnd + 1).trim();

  if (rawName === "compact") {
    return {
      args,
      name: "compact",
      rawName,
      type: "known",
    };
  }

  if (rawName === "expert") {
    return {
      args,
      name: "expert",
      rawName,
      type: "known",
    };
  }

  if (rawName === "effort" || rawName === "variant") {
    return {
      args,
      name: "effort",
      rawName,
      type: "known",
    };
  }

  if (rawName === "dwf") {
    return {
      args,
      name: "dwf",
      rawName,
      type: "known",
    };
  }

  if (rawName === "fork") {
    return {
      args,
      name: "fork",
      rawName,
      type: "known",
    };
  }

  if (rawName === "help") {
    return {
      args,
      name: "help",
      rawName,
      type: "known",
    };
  }

  if (rawName === "init") {
    return {
      args,
      name: "init",
      rawName,
      type: "known",
    };
  }

  // `/workflow` 与 `/init` 同为 bootstrap 展开的内置 prompt 命令：这里只识别名字，
  // 正文由 builtin-prompt-command.ts 生成；headless 下按 known 且非 expert/goal 走普通 prompt 路径。
  if (rawName === "workflow") {
    return {
      args,
      name: "workflow",
      rawName,
      type: "known",
    };
  }

  if (rawName === "login") {
    return {
      args,
      name: "login",
      rawName,
      type: "known",
    };
  }

  if (rawName === "logout") {
    return {
      args,
      name: "logout",
      rawName,
      type: "known",
    };
  }

  if (rawName === "locale" || rawName === "language") {
    return {
      args,
      name: "locale",
      rawName,
      type: "known",
    };
  }

  if (rawName === "resume" || rawName === "continue") {
    return {
      args,
      name: "resume",
      rawName,
      type: "known",
    };
  }

  if (rawName === "new" || rawName === "clear") {
    return {
      args,
      name: "new",
      rawName,
      type: "known",
    };
  }

  if (rawName === "rewind") {
    return {
      args,
      name: "rewind",
      rawName,
      type: "known",
    };
  }

  if (rawName === "mode") {
    return {
      args,
      name: "mode",
      rawName,
      type: "known",
    };
  }

  if (rawName === "mcp") {
    return {
      args,
      name: "mcp",
      rawName,
      type: "known",
    };
  }

  if (rawName === "plugins" || rawName === "plugin") {
    return {
      args,
      name: "plugins",
      rawName,
      type: "known",
    };
  }

  if (rawName === "model") {
    return {
      args,
      name: "model",
      rawName,
      type: "known",
    };
  }

  if (rawName === "goal" || rawName === "target") {
    return {
      args,
      name: "goal",
      rawName,
      type: "known",
    };
  }

  if (rawName === "skill") {
    const parsed = parseSkillCommandArgs(args);
    if (!parsed) {
      return {
        args,
        name: "skill",
        rawName,
        skillName: "",
        task: "",
        type: "known",
      };
    }
    return {
      args,
      name: "skill",
      rawName,
      skillName: parsed.skillName,
      task: parsed.task,
      type: "known",
    };
  }

  return {
    args,
    rawName,
    type: "unknown",
  };
}

export function buildManualSkillPrompt(skillName: string, task: string): string {
  const trimmedTask = task.trim();
  const taskBlock =
    trimmedTask.length > 0
      ? `User request:\n${trimmedTask}`
      : "No additional user request was provided. Load the skill and respond according to its instructions.";

  return [
    `Use the skill named \`${skillName}\` for this turn.`,
    `First call the \`Skill\` tool with name \`${skillName}\` before doing the task.`,
    "After the skill content is loaded, follow its instructions and continue.",
    "",
    taskBlock,
  ].join("\n");
}

export function manualSkillCommandUsage(): string {
  return SKILL_COMMAND_USAGE;
}

export function listSlashCommandSuggestions(
  customCommands?: CommandCenterCustomCommandListOutcome,
  options?: SlashCommandSurfaceOptions,
): TuiSlashCommandSuggestion[] {
  return [
    ...visibleHelpEntries(options).map((entry) => ({
      ...(entry.aliases ? { aliases: entry.aliases } : {}),
      name: entry.name,
      summary: entry.summary,
      usage: entry.usage,
    })),
    ...listCustomCommandSuggestions(customCommands),
    ...listSkillSlashCommandSuggestions(options?.skills),
  ];
}

/** 同名 skill 折叠优先级，对齐 Desktop mapSkillsToMentionItemsForTest（project > system(plugin) > user）。 */
const SKILL_SCOPE_PRIORITY: Record<string, number> = { project: 0, system: 1, user: 2 };

/**
 * skills 目录 → `/` 菜单建议（spec: docs/design/v2/tui-skill-slash-suggestions.md）。
 * 同名折叠 + 字典序；提交经 `submitAs` 落到既有 `/skill <name>` 分发，不新增加载机制。
 */
export function listSkillSlashCommandSuggestions(
  skills?: readonly CommandCenterSkill[],
): TuiSlashCommandSuggestion[] {
  if (!skills || skills.length === 0) return [];

  const unique = new Map<string, CommandCenterSkill>();
  for (const skill of skills) {
    const key = skill.name.trim().toLowerCase();
    const current = unique.get(key);
    if (
      !current ||
      (SKILL_SCOPE_PRIORITY[skill.scope] ?? Number.MAX_SAFE_INTEGER) <
        (SKILL_SCOPE_PRIORITY[current.scope] ?? Number.MAX_SAFE_INTEGER)
    ) {
      unique.set(key, skill);
    }
  }

  return [...unique.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((skill) => {
      const aliases = [skill.qualifiedName, skill.pluginName].filter(
        (alias): alias is string =>
          typeof alias === "string" && alias.length > 0 && alias !== skill.name,
      );
      return {
        ...(aliases.length > 0 ? { aliases } : {}),
        name: skill.name,
        summary: formatSkillSuggestionSummary(skill),
        submitAs: `/skill ${skill.name}`,
        usage: `/skill ${skill.name}`,
      };
    });
}

function formatSkillSuggestionSummary(skill: CommandCenterSkill): string {
  const description = [skill.description, skill.whenToUse]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
  return `${skill.scope}/${skill.source} · ${description}`;
}

export function formatSlashCommandHelp(
  args = "",
  customCommands?: CommandCenterCustomCommandListOutcome,
  options?: SlashCommandSurfaceOptions,
): string {
  const entries = visibleHelpEntries(options);
  const target = normalizeHelpTarget(args);
  if (target) {
    const entry = findSlashCommandHelpEntry(entries, target);
    if (entry) return formatSlashCommandHelpEntry(entry);

    const custom = findCustomCommandHelpEntry(target, customCommands);
    if (custom) return formatCustomCommandHelpEntry(custom);

    return `Unknown slash command: /${target}. Available commands: ${formatAvailableCommandNames(listAvailableCommandNames(options), customCommands)}.`;
  }

  const lines = [
    "Slash commands:",
    ...entries.map((entry) => `- ${entry.usage}: ${entry.summary}`),
  ];
  if (customCommands && customCommands.commands.length > 0) {
    lines.push(
      "",
      "Custom commands:",
      ...customCommands.commands.map(
        (command) =>
          `- /${command.name}${command.argumentHint ? ` ${command.argumentHint}` : ""}: ${command.description}`,
      ),
    );
  }
  lines.push("", "Use /help <command> for details.");
  return lines.join("\n");
}

function normalizeHelpTarget(args: string): string | undefined {
  const [target] = splitArgs(args);
  const normalized = target?.replace(/^\/+/, "").toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function findSlashCommandHelpEntry(
  entries: readonly SlashCommandHelpEntry[],
  name: string,
): SlashCommandHelpEntry | undefined {
  return entries.find((entry) => entry.name === name || entry.aliases?.includes(name));
}

function formatSlashCommandHelpEntry(entry: SlashCommandHelpEntry): string {
  const aliasLine =
    entry.aliases && entry.aliases.length > 0
      ? [`Aliases: ${entry.aliases.map((alias) => `/${alias}`).join(", ")}`]
      : [];
  return [entry.usage, entry.summary, ...aliasLine, ...entry.details].join("\n");
}

function parseSkillCommandArgs(args: string): { skillName: string; task: string } | null {
  const trimmed = args.trim();
  if (trimmed.length === 0) return null;
  const firstWhitespace = trimmed.search(/\s/);
  if (firstWhitespace === -1) {
    return {
      skillName: trimmed,
      task: "",
    };
  }
  return {
    skillName: trimmed.slice(0, firstWhitespace),
    task: trimmed.slice(firstWhitespace + 1).trim(),
  };
}
