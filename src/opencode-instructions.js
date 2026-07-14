function reconcileOpenCodeInstructions(config, expectedPaths, previouslyOwnedPaths) {
  const instructions = config.instructions;
  if (instructions !== undefined
      && (!Array.isArray(instructions) || instructions.some((item) => typeof item !== 'string'))) {
    throw new Error('Cannot update opencode.json because instructions must be an array of strings.');
  }

  const owned = new Set(previouslyOwnedPaths);
  const userInstructions = (instructions || []).filter((item) => !owned.has(item));
  const nextInstructions = [...userInstructions];
  const nextOwnedPaths = [];

  for (const expectedPath of expectedPaths) {
    const userCount = userInstructions.filter((item) => item === expectedPath).length;
    if (owned.has(expectedPath)) {
      nextInstructions.push(expectedPath);
      nextOwnedPaths.push(expectedPath);
    } else if (userCount === 0) {
      nextInstructions.push(expectedPath);
      nextOwnedPaths.push(expectedPath);
    } else if (userCount > 1) {
      throw new Error(`Cannot update opencode.json because user instruction ${expectedPath} appears more than once.`);
    }
  }

  const next = { ...config };
  if (nextInstructions.length === 0) {
    delete next.instructions;
  } else {
    next.instructions = nextInstructions;
  }
  return { config: next, ownedPaths: nextOwnedPaths };
}

function assertNoLossyJsonNumbers(content) {
  let index = 0;
  while (index < content.length) {
    if (content[index] === '"') {
      index = skipJsonString(content, index);
      continue;
    }
    if (content[index] === '-' || /[0-9]/.test(content[index])) {
      const match = content.slice(index).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
      if (match) {
        const token = match[0];
        const value = Number(token);
        if (!Number.isFinite(value) || JSON.stringify(value) !== token) {
          throw new Error(`Cannot update opencode.json without changing number ${token}.`);
        }
        index += token.length;
        continue;
      }
    }
    index += 1;
  }
}

function skipJsonString(content, start) {
  let index = start + 1;
  while (index < content.length) {
    if (content[index] === '\\') {
      index += 2;
      continue;
    }
    if (content[index] === '"') {
      return index + 1;
    }
    index += 1;
  }
  return index;
}

function sameJsonValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

module.exports = {
  assertNoLossyJsonNumbers,
  reconcileOpenCodeInstructions,
  sameJsonValue,
};
