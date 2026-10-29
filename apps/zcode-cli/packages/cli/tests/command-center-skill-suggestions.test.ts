import assert from "node:assert/strict";
import test from "node:test";
import {
  listSkillSlashCommandSuggestions,
  listSlashCommandSuggestions,
} from "../src/command-center/slash-commands.js";
import { handleSkillNameFallbackCommand } from "../src/command-center/handlers/skill.js";
import type { CommandCenterDeps, CommandCenterSkill } from "../src/command-center/types.js";

const makeSkill = (overrides: Partial<CommandCenterSkill>): CommandCenterSkill => ({
  description: "View and discuss Excel workbooks.",
  name: "xlsx",
  path: "/tmp/xlsx/SKILL.md",
  scope: "user",
  source: "zcode",
  ...overrides,
});

test("listSkillSlashCommandSuggestions 同名折叠按 project > system > user", () => {
  const suggestions = listSkillSlashCommandSuggestions([
    makeSkill({ name: "xlsx", scope: "user", source: "zcode" }),
    makeSkill({
      name: "xlsx",
      scope: "system",
      source: "plugin",
      qualifiedName: "spreadsheets:xlsx",
      pluginName: "spreadsheets",
    }),
  ]);

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.name, "xlsx");
  assert.equal(suggestions[0]?.summary, "system/plugin · View and discuss Excel workbooks.");
  assert.deepEqual(suggestions[0]?.aliases, ["spreadsheets:xlsx", "spreadsheets"]);
});

test("listSkillSlashCommandSuggestions 摘要合并 whenToUse 并折叠空白", () => {
  const suggestions = listSkillSlashCommandSuggestions([
    makeSkill({
      description: "  View\nand discuss  workbooks. ",
      name: "xlsx",
      whenToUse: " Use  when the user opens a workbook. ",
    }),
  ]);

  assert.equal(
    suggestions[0]?.summary,
    "user/zcode · View and discuss workbooks. Use when the user opens a workbook.",
  );
});

test("listSkillSlashCommandSuggestions 字典序排序、submitAs 指向 /skill 分发", () => {
  const suggestions = listSkillSlashCommandSuggestions([
    makeSkill({ name: "zzz-helper" }),
    makeSkill({ name: "accessibility" }),
  ]);

  assert.deepEqual(suggestions.map((suggestion) => suggestion.name), [
    "accessibility",
    "zzz-helper",
  ]);
  for (const suggestion of suggestions) {
    assert.equal(suggestion.submitAs, `/skill ${suggestion.name}`);
    assert.equal(suggestion.usage, `/skill ${suggestion.name}`);
  }
});

test("listSkillSlashCommandSuggestions 空目录返回空数组", () => {
  assert.deepEqual(listSkillSlashCommandSuggestions(undefined), []);
  assert.deepEqual(listSkillSlashCommandSuggestions([]), []);
});

test("listSlashCommandSuggestions：内置命令在前，skills 追加在后", () => {
  const suggestions = listSlashCommandSuggestions(undefined, {
    skills: [makeSkill({ name: "xlsx" })],
  });
  const names = suggestions.map((suggestion) => suggestion.name);
  assert.ok(names.includes("help"));
  assert.ok(names.includes("skill"));
  assert.equal(names[names.length - 1], "xlsx");
});

const makeFallbackDeps = (
  skills: CommandCenterSkill[],
  submitted: { prompt?: string },
): CommandCenterDeps =>
  ({
    getApp: async () => ({
      sessionId: "sess_test",
      submitPrompt: async (input: string | { text: string }) => {
        submitted.prompt = typeof input === "string" ? input : input.text;
        return { response: "skill loaded" };
      },
    }),
    listSkills: async () => ({ skills, totalDiscovered: skills.length }),
  }) as unknown as CommandCenterDeps;

test("handleSkillNameFallbackCommand：裸名命中并按 /skill 语义提交", async () => {
  const submitted: { prompt?: string } = {};
  const deps = makeFallbackDeps([makeSkill({ name: "xlsx" })], submitted);

  const result = await handleSkillNameFallbackCommand(deps, "xlsx", "检查这个表", {});
  assert.ok(result);
  assert.match(submitted.prompt ?? "", /Use the skill named `xlsx` for this turn/);
  assert.match(submitted.prompt ?? "", /User request:\n检查这个表/);
});

test("handleSkillNameFallbackCommand：qualifiedName 命中时用裸名提交", async () => {
  const submitted: { prompt?: string } = {};
  const deps = makeFallbackDeps(
    [makeSkill({ name: "xlsx", qualifiedName: "spreadsheets:xlsx" })],
    submitted,
  );

  const result = await handleSkillNameFallbackCommand(deps, "spreadsheets:xlsx", "", {});
  assert.ok(result);
  assert.match(submitted.prompt ?? "", /Use the skill named `xlsx` for this turn/);
});

test("handleSkillNameFallbackCommand：未命中返回 undefined", async () => {
  const deps = makeFallbackDeps([makeSkill({ name: "xlsx" })], {});
  const result = await handleSkillNameFallbackCommand(deps, "nope", "", {});
  assert.equal(result, undefined);
});

test("handleSkillNameFallbackCommand：目录读取失败返回 undefined", async () => {
  const deps = {
    getApp: async () => {
      throw new Error("should not build app");
    },
    listSkills: async () => {
      throw new Error("discovery failed");
    },
  } as unknown as CommandCenterDeps;
  const result = await handleSkillNameFallbackCommand(deps, "xlsx", "", {});
  assert.equal(result, undefined);
});
