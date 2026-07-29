// 入口文件契约块的共享标记与切片逻辑。doctor(校验)和 scaffold(merge)共用，避免重复定义。

const CONTRACT_BEGIN = '<!-- niuma-harness:contract begin';
const CONTRACT_END = '<!-- niuma-harness:contract end -->';
const MODULE_BEGIN = '<!-- niuma-harness:module-supplement begin';
const MODULE_END = '<!-- niuma-harness:module-supplement end -->';
const CODEX_RULES_BEGIN = '<!-- niuma-harness:codex-rules begin -->';
const CODEX_RULES_END = '<!-- niuma-harness:codex-rules end -->';

function analyzeMarkedBlock(content, beginMarker, endMarker) {
  const begins = findAll(content, beginMarker);
  const ends = findAll(content, endMarker);

  if (begins.length === 0 && ends.length === 0) return { status: 'missing' };
  if (begins.length === 0) return { status: 'missing-begin' };
  if (ends.length === 0) return { status: 'missing-end' };
  if (begins.length > 1 || ends.length > 1) return { status: 'multiple' };
  if (begins[0] > ends[0]) return { status: 'out-of-order' };
  const end = ends[0] + endMarker.length;
  return { begin: begins[0], block: content.slice(begins[0], end), end, status: 'valid' };
}

function sliceMarkedBlock(content, beginMarker, endMarker) {
  const analysis = analyzeMarkedBlock(content, beginMarker, endMarker);
  return analysis.status === 'valid' ? analysis.block : null;
}

function replaceMarkedBlock(content, newBlock, beginMarker, endMarker) {
  const analysis = analyzeMarkedBlock(content, beginMarker, endMarker);
  return analysis.status === 'valid' ? content.slice(0, analysis.begin) + newBlock + content.slice(analysis.end) : null;
}

function removeMarkedBlock(content, beginMarker, endMarker) {
  const analysis = analyzeMarkedBlock(content, beginMarker, endMarker);
  return analysis.status === 'valid' ? content.slice(0, analysis.begin) + content.slice(analysis.end) : null;
}

function findAll(content, marker) {
  const indexes = [];
  let from = 0;
  while (from < content.length) {
    const index = content.indexOf(marker, from);
    if (index === -1) {
      break;
    }
    indexes.push(index);
    from = index + marker.length;
  }
  return indexes;
}

// 严格分析契约标记，避免把缺失、残缺、乱序或重复块误当成正常的用户入口。
function analyzeContractBlock(content) {
  return analyzeMarkedBlock(content, CONTRACT_BEGIN, CONTRACT_END);
}

function analyzeModuleBlock(content) {
  return analyzeMarkedBlock(content, MODULE_BEGIN, MODULE_END);
}

function analyzeCodexRulesRegion(content) {
  return analyzeMarkedBlock(content, CODEX_RULES_BEGIN, CODEX_RULES_END);
}

function sliceCodexRulesRegion(content) {
  const analysis = analyzeCodexRulesRegion(content);
  return analysis.status === 'valid' ? analysis.block : null;
}

function replaceCodexRulesRegion(content, region) {
  const analysis = analyzeCodexRulesRegion(content);
  return analysis.status === 'valid' ? content.slice(0, analysis.begin) + region + content.slice(analysis.end) : null;
}

function removeCodexRulesRegion(content) {
  const analysis = analyzeCodexRulesRegion(content);
  return analysis.status === 'valid' ? content.slice(0, analysis.begin) + content.slice(analysis.end) : content;
}

function normalizeContractForCoreComparison(content) {
  const analysis = analyzeCodexRulesRegion(content);
  if (analysis.status !== 'valid') return content;
  const before = content.slice(0, analysis.begin).replace(/\s+$/u, '');
  const after = content.slice(analysis.end).replace(/^\s*/u, '');
  return `${before}\n${after}`;
}

// 提取唯一且完整的契约块；其他状态返回 null。
function sliceContractBlock(content) {
  const analysis = analyzeContractBlock(content);
  return analysis.status === 'valid' ? analysis.block : null;
}

// 用新块替换唯一且完整的契约块，保留块外所有内容；其他状态返回 null。
function replaceContractBlock(content, newBlock) {
  const analysis = analyzeContractBlock(content);
  if (analysis.status !== 'valid') {
    return null;
  }
  return content.slice(0, analysis.begin) + newBlock + content.slice(analysis.end);
}

// 移除唯一且完整的契约块，块外字节保持不变；其他状态返回 null。
function removeContractBlock(content) {
  const analysis = analyzeContractBlock(content);
  if (analysis.status !== 'valid') {
    return null;
  }
  return content.slice(0, analysis.begin) + content.slice(analysis.end);
}

module.exports = {
  CODEX_RULES_BEGIN,
  CODEX_RULES_END,
  CONTRACT_BEGIN,
  MODULE_BEGIN,
  MODULE_END,
  analyzeCodexRulesRegion,
  analyzeContractBlock,
  analyzeMarkedBlock,
  analyzeModuleBlock,
  sliceCodexRulesRegion,
  sliceContractBlock,
  sliceMarkedBlock,
  replaceCodexRulesRegion,
  replaceContractBlock,
  replaceMarkedBlock,
  normalizeContractForCoreComparison,
  removeCodexRulesRegion,
  removeContractBlock,
  removeMarkedBlock,
};
