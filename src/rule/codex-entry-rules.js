const {
  CODEX_RULES_BEGIN,
  CODEX_RULES_END,
  analyzeCodexRulesRegion,
  removeContractBlock,
  replaceCodexRulesRegion,
} = require('../harness/contract');
const { getDefaultRulesForAgent } = require('./catalog');
const { getEntryFilesForAgent } = require('../harness/agents');
const { renderCodexRuleSections } = require('./artifacts');

function renderCodexRulesRegion(rules = [], variables) {
  const sections = renderCodexRuleSections(rules, undefined, variables);
  if (sections.length === 0) {
    return `${CODEX_RULES_BEGIN}\n${CODEX_RULES_END}`;
  }
  return `${CODEX_RULES_BEGIN}\n## Selected engineering rules\n\n${sections.map((section) => section.content).join('\n\n')}\n${CODEX_RULES_END}`;
}

function withEmptyCodexRulesRegion(block) {
  if (analyzeCodexRulesRegion(block).status === 'valid') return block;
  const marker = '<!-- niuma-harness:contract end -->';
  const end = block.lastIndexOf(marker);
  if (end < 0) throw new Error('entry template is missing a valid contract end marker');
  return `${block.slice(0, end).replace(/\s*$/u, '')}\n\n${renderCodexRulesRegion()}\n${block.slice(end)}`;
}

function appendCodexRuleSections(block, rules, variables) {
  const region = requireValidCodexRulesRegion(block, 'install Codex rules');
  const sections = renderCodexRuleSections(rules, undefined, variables);
  const eol = block.includes('\r\n') ? '\r\n' : '\n';
  const existingIds = sectionIds(region.block, 'install Codex rules');
  const missing = sections.filter((section) => !existingIds.has(section.id));
  if (missing.length === 0) return block;

  const contents = missing.map((section) => section.content.replace(/\n/g, eol)).join(`${eol}${eol}`);
  const endIndex = region.block.lastIndexOf(CODEX_RULES_END);
  const separator = existingIds.size === 0 ? `${eol}## Selected engineering rules${eol}${eol}` : `${eol}${eol}`;
  const nextRegion = `${region.block.slice(0, endIndex)}${separator}${contents}${eol}${CODEX_RULES_END}`;
  return replaceCodexRulesRegion(block, nextRegion);
}

function preserveCodexRulesRegion(freshBlock, existingBlock, action) {
  const existing = requireValidCodexRulesRegion(existingBlock, action);
  const fresh = requireValidCodexRulesRegion(freshBlock, action);
  return freshBlock.slice(0, fresh.begin) + existing.block + freshBlock.slice(fresh.end);
}

function isGeneratedCodexEntry(entry, renderEntry, input) {
  const region = analyzeCodexRulesRegion(entry);
  if (region.status !== 'valid' || !isCanonicalCodexRulesRegion(region.block, input.variables)) return false;
  const external = removeContractBlock(removeRegionAndNormalize(entry, region));
  return ['codex', 'multi'].some((agent) => {
    if (!getEntryFilesForAgent(agent).includes(input.entryFile)) return false;
    const canonical = renderGeneratedCodexEntry(agent, renderEntry, input);
    return external === removeContractBlock(removeRegionAndNormalize(canonical, analyzeCodexRulesRegion(canonical)));
  });
}

function renderGeneratedCodexEntry(agent, renderEntry, input) {
  return withEmptyCodexRulesRegion(renderEntry(agent, input.entryFile, input.harnessDir, input.workDirectory, input.topology));
}

function isCanonicalCodexRulesRegion(region, variables) {
  const defaultRules = getDefaultRulesForAgent('codex');
  const sections = renderCodexRuleSections(defaultRules, undefined, variables);
  const expectedById = new Map(sections.map((section) => [section.id, normalizeEol(section.content)]));
  const lines = normalizeEol(region).split('\n');
  if (lines[0] !== CODEX_RULES_BEGIN || lines.at(-1) !== CODEX_RULES_END) return false;
  const body = lines.slice(1, -1).join('\n').trim();
  if (!body) return true;
  if (!body.startsWith('## Selected engineering rules\n\n')) return false;
  const selected = body.slice('## Selected engineering rules\n\n'.length).split('\n\n');
  const blocks = [];
  let current = '';
  for (const part of selected) {
    if (part.startsWith('### ')) {
      if (current) blocks.push(current);
      current = part;
    } else {
      current += `${current ? '\n\n' : ''}${part}`;
    }
  }
  if (current) blocks.push(current);
  return blocks.length > 0 && blocks.every((block) => {
    const id = block.match(/^### ([^\n]+)\n/m)?.[1];
    return id && expectedById.get(id) === block;
  }) && new Set(blocks.map((block) => block.match(/^### ([^\n]+)\n/m)[1])).size === blocks.length;
}

function removeRegionAndNormalize(entry, region) {
  const before = entry.slice(0, region.begin).replace(/\s*$/u, '');
  const after = entry.slice(region.end).replace(/^\s*/u, '');
  return normalizeEol(`${before}\n${after}`);
}

function normalizeEol(value) { return value.replace(/\r\n/g, '\n'); }

function requireValidCodexRulesRegion(block, action) {
  const analysis = analyzeCodexRulesRegion(block);
  if (analysis.status !== 'valid') {
    throw new Error(`Codex rules region is ${analysis.status} and incompatible; cannot ${action}.`);
  }
  return analysis;
}

function sectionIds(region, action) {
  const ids = new Set();
  for (const match of region.matchAll(/^### ([^\r\n]+)\s*$/gmu)) {
    if (ids.has(match[1])) {
      throw new Error(`Cannot ${action} because the nested rules region contains duplicate section ${match[1]}.`);
    }
    ids.add(match[1]);
  }
  return ids;
}

module.exports = {
  appendCodexRuleSections,
  isGeneratedCodexEntry,
  preserveCodexRulesRegion,
  renderCodexRulesRegion,
  requireValidCodexRulesRegion,
  withEmptyCodexRulesRegion,
};
