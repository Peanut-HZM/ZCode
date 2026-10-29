import type { TuiSubmitPromptResult } from "@zcode/tui";
import type {
  CommandCenterDeps,
  CommandCenterSkill,
  CommandCenterSkillListOutcome,
  TuiSubmitOptions,
} from "../types.js";
import { buildManualSkillPrompt } from "../slash-commands.js";
import { attachCurrentSessionMetadata } from "../metadata.js";

export async function handleSkillListCommand(
  deps: CommandCenterDeps,
): Promise<TuiSubmitPromptResult> {
  if (!deps.listSkills) {
    return {
      mode: deps.getMode?.(),
      response: "Skill listing is not available in this client.",
    };
  }

  try {
    const outcome = await deps.listSkills();
    return {
      mode: deps.getMode?.(),
      response: formatCommandCenterSkillList(outcome),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      mode: deps.getMode?.(),
      response: `Unable to list skills: ${message}`,
    };
  }
}

/**
 * 用户越过建议菜单直接提交 `/名称 [任务]` 时的 skill 兜底（spec: tui-skill-slash-suggestions.md）。
 * 按裸名/qualifiedName 精确匹配（大小写不敏感）；未命中或目录不可用时返回 undefined，
 * 交给既有 unknown 处理（custom command 优先级不受影响）。
 */
export async function handleSkillNameFallbackCommand(
  deps: CommandCenterDeps,
  rawName: string,
  args: string,
  options: TuiSubmitOptions,
): Promise<TuiSubmitPromptResult | undefined> {
  if (!deps.listSkills) return undefined;

  let skills: CommandCenterSkill[];
  try {
    skills = (await deps.listSkills()).skills;
  } catch {
    return undefined;
  }

  const query = rawName.trim().toLowerCase();
  const matched = skills.find(
    (skill) =>
      skill.name.toLowerCase() === query || skill.qualifiedName?.toLowerCase() === query,
  );
  if (!matched) return undefined;

  const app = await deps.getApp();
  return attachCurrentSessionMetadata(
    await app.submitPrompt(buildManualSkillPrompt(matched.name, args), options),
    deps,
    app,
  );
}

function formatCommandCenterSkillList(outcome: CommandCenterSkillListOutcome): string {
  if (outcome.skills.length === 0) {
    return "No skills found.";
  }

  const lines = [`Available skills (${outcome.skills.length})`];
  for (const skill of outcome.skills) {
    const alias = skill.qualifiedName ? `; alias ${skill.name}` : "";
    lines.push(`- ${formatCommandCenterSkillName(skill)} (${skill.scope}/${skill.source}${alias})`);
    lines.push(`  ${formatCommandCenterSkillDescription(skill)}`);
    lines.push(`  ${skill.path}`);
  }
  lines.push("", "Use /skill <name> [task] to load one.");
  return lines.join("\n");
}

function formatCommandCenterSkillDescription(skill: CommandCenterSkill): string {
  return skill.whenToUse ? `${skill.description} ${skill.whenToUse}` : skill.description;
}

function formatCommandCenterSkillName(skill: CommandCenterSkill): string {
  return skill.qualifiedName ?? skill.name;
}
