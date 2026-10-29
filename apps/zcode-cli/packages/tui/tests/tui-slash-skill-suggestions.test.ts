import assert from "node:assert/strict";
import test from "node:test";
import { filterSlashCommands } from "../src/app-input.js";
import { resolveComposerSubmittedText } from "../src/app-submit-resolver.js";
import type { TuiSlashCommandSuggestion } from "../src/types.js";

const builtinCommand: TuiSlashCommandSuggestion = {
  name: "compact",
  summary: "Compact the current conversation with optional instructions.",
  usage: "/compact",
};

const skillSuggestion: TuiSlashCommandSuggestion = {
  aliases: ["spreadsheets:xlsx", "spreadsheets"],
  name: "xlsx",
  summary: "system/plugin · View and discuss Excel (.xlsx) workbooks.",
  submitAs: "/skill xlsx",
  usage: "/skill xlsx",
};

test("filterSlashCommands 匹配 skill 建议的名称与别名", () => {
  const byName = filterSlashCommands("/xls", [builtinCommand, skillSuggestion]);
  assert.deepEqual(byName.map((command) => command.name), ["xlsx"]);

  const byQualifiedAlias = filterSlashCommands("/spreadsheets:xlsx", [skillSuggestion]);
  assert.deepEqual(byQualifiedAlias.map((command) => command.name), ["xlsx"]);

  const byPluginAlias = filterSlashCommands("/spreadsheets", [skillSuggestion]);
  assert.deepEqual(byQualifiedAlias.map((command) => command.name), byPluginAlias.map((command) => command.name));
});

test("filterSlashCommands 摘要参与 ≥2 字符查询、单字符不参与", () => {
  const noAliasSkill: TuiSlashCommandSuggestion = {
    name: "zzz-workbook",
    summary: "system/plugin · View and discuss Excel (.xlsx) workbooks.",
    submitAs: "/skill zzz-workbook",
    usage: "/skill zzz-workbook",
  };
  const bySummaryToken = filterSlashCommands("/excel", [builtinCommand, noAliasSkill]);
  assert.deepEqual(bySummaryToken.map((command) => command.name), ["zzz-workbook"]);

  // 单字符查询只按名称/别名收敛，摘要子串不参与，避免噪声。
  const singleChar = filterSlashCommands("/e", [builtinCommand, noAliasSkill]);
  assert.deepEqual(singleChar, []);
});

test("filterSlashCommands 保持既有约束：非 / 前缀与含空白输入不弹建议", () => {
  assert.deepEqual(filterSlashCommands("xls", [skillSuggestion]), []);
  assert.deepEqual(filterSlashCommands("/xlsx 检查", [skillSuggestion]), []);
});

test("resolveComposerSubmittedText：选中 skill 建议提交 submitAs 而非 /name", () => {
  const text = resolveComposerSubmittedText({
    slashCommands: [skillSuggestion],
    slashSelection: { selectedIndex: 0 },
    submittedValue: "/xls",
  });
  assert.equal(text, "/skill xlsx");
});

test("resolveComposerSubmittedText：无 submitAs 的命令保持 /name 行为", () => {
  const text = resolveComposerSubmittedText({
    slashCommands: [builtinCommand],
    slashSelection: { selectedIndex: 0 },
    submittedValue: "/comp",
  });
  assert.equal(text, "/compact");
});
