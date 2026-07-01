// 入口文件契约块的共享标记与切片逻辑。doctor(校验)和 scaffold(merge)共用，避免重复定义。

const CONTRACT_BEGIN = '<!-- niuma-harness:contract begin';
const CONTRACT_END = '<!-- niuma-harness:contract end -->';

// 提取包含首尾标记的完整契约块。无 begin 或无 end 返回 null。
function sliceContractBlock(content) {
  const beginIdx = content.indexOf(CONTRACT_BEGIN);
  if (beginIdx === -1) {
    return null;
  }
  const endIdx = content.indexOf(CONTRACT_END, beginIdx);
  if (endIdx === -1) {
    return null;
  }
  return content.slice(beginIdx, endIdx + CONTRACT_END.length);
}

// 用新块替换已有契约块，保留块外所有内容。无块返回 null。
function replaceContractBlock(content, newBlock) {
  const beginIdx = content.indexOf(CONTRACT_BEGIN);
  if (beginIdx === -1) {
    return null;
  }
  const endIdx = content.indexOf(CONTRACT_END, beginIdx);
  if (endIdx === -1) {
    return null;
  }
  const after = endIdx + CONTRACT_END.length;
  return content.slice(0, beginIdx) + newBlock + content.slice(after);
}

module.exports = {
  CONTRACT_BEGIN,
  CONTRACT_END,
  sliceContractBlock,
  replaceContractBlock,
};
