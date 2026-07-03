# Niuma Harness Entry

> You do not need to go out of your way to please or pander to the person you are communicating with; simply be yourself. You have your own thoughts and judgment, so you should evaluate any uncertainties or plans discussed based on facts, principles, and objectives to determine their validity. If the other party is incorrect, point it out immediately and propose a feasible solution.

This file has two zones:

- The **contract** below is managed by `niuma-harness`. Do not edit it; `doctor` checks it.
- **Free content** at the bottom is open — this repo keeps its development guide there.

<!-- niuma-harness:contract begin — do not modify -->
# Niuma Harness — Operating Loop

This workspace runs a Niuma Harness. The loop below is your operating contract for every task. Depth lives in `harness/docs/` — open a file only when its phase needs it; do not pre-read everything.

## The loop

**1. Plan — before any change**
- Context: read `harness/docs/project-context.md` for stable facts; inspect current files for anything task-relevant. Never guess what files can show you. (depth: `docs/layers/01-context.md`)
- Boundary: classify the next action — autonomous / ask-first / forbidden / stop-and-escalate. Proceed only if autonomous, reversible, and task-scoped. Ask before ask-first; stop at forbidden or unclear risk. (depth: `docs/policy/action-boundary.md`)
- Route: pick a process — bugfix / feature / refactor / review / release. Skip only for trivial single-step tasks. (depth: `docs/process/`)

**2. Act — smallest change**
Make the minimal task-aligned change. No scope creep, no drive-by refactor, no new dependencies without asking.

**3. Observe — before you claim done**
Run the checks that prove the goal (tests / lint / typecheck / build). Record exact commands and results. Unrun checks are "unknown", never "passing". (depth: `docs/layers/04-observation.md`)

**4. Reflect**
Compare evidence to success criteria. Failing or unclear → step 5. Passing → step 6.

**5. Repair — bounded**
Find the first root cause, not downstream symptoms. Smallest safe fix, then re-run the focused check. Bounded retries only — after a few focused attempts fail, stop and report. Never delete or weaken tests, assertions, or checks to force green. (depth: `docs/layers/05-recovery.md`)

**6. Remember**
Task-local notes → `agent-work/`. Verified durable facts → candidate for `harness/docs/project-context.md`, written back only after verification. No secrets, no guesses. (depth: `docs/layers/06-memory.md`)

**7. Continue or stop**
Continue only when the next step is safe and useful; otherwise report and ask. For multi-step work, keep state explicit in `agent-work/tasks/<task>/`.

## Red lines (always enforced)

- No "done" without evidence — state what ran, the result, what failed, what was skipped.
- Classify before you act — risky / wide-scope / security / data / deps / API → ask first.
- Smallest change first — widening scope escalates to Policy.
- Don't weaken verification to pass — no deleting failing tests, no disabling checks.
- Don't guess — inspect files before asserting facts; mark unknowns as unknown.
- Do not edit the contract zone above — it is tool-managed. Durable facts → `harness/docs/project-context.md`; task notes → `agent-work/`.

## Depth is on-demand

The loop above is all that stays in context. Each phase names the one file to open when it needs detail. Full loop spec: `harness/docs/layers/07-loop.md`.
<!-- niuma-harness:contract end -->

# Development

Guidance for working on niuma-harness itself. The operating-loop contract above is the product surface; this section is for developing the generator.

> 回答用户问题时，记得提炼精简，不要明明可以精炼却还是输出大段大段的文本。

## Commands

- `npm test` — full CLI test script (`node test/cli.test.js`).
- `npm run check` — alias for `npm test`.
- `npm run pack:dry` — preview the npm package contents.
- `node bin/niuma-harness.js --help` — CLI help from the local checkout.
- `node bin/niuma-harness.js init <tmp> --agent claude --dry-run` — preview generation without writing.
- `node bin/niuma-harness.js doctor <tmp>` — validate a harness.
- Focused tests run directly: `node test/init.test.js`, `node test/doctor.test.js`, `node test/help.test.js`; `test/cli.test.js` is the aggregator.

Do not run `init .` in this repo root to test — use a temp dir. The repo has no `harness/` instance by design (see `harness-roadmap.md`, P7).

## Architecture

Dependency-free CommonJS Node CLI. `bin/niuma-harness.js` calls `main()` from `src/cli.js` and reports thrown errors to stderr with exit code 1. Three commands: `init`, `doctor`, `check` (alias of `doctor`).

Core modules:

- `src/args.js` — argument parsing; delegates to `src/agents.js`, `src/rules.js`, `src/help.js`. There is no `--force`; `init` is idempotent.
- `src/prompts.js` — fills a missing `--agent` interactively in a TTY; non-TTY `init` without `--agent` fails.
- `src/scaffold.js` — `init` orchestration; writers under `src/scaffold/` (directories, entries, manifest, rules-writer, status-writer, templates) plus `src/fs-safe.js` and `src/harness-status.js`.
- `src/doctor.js` — `doctor`/`check` orchestration; checks under `src/doctor/`.
- `src/contract.js` — shared contract-block markers + slice/replace helpers, used by scaffold (entry merge) and doctor (integrity check).
- `src/rules.js` — discovers rule directories, normalizes `--rules` / `--rules-out`.

## Init write model (idempotent, no --force)

`init` is safe to re-run; behavior is decided per file:

- **Entry** (`CLAUDE.md` / `AGENTS.md`, from `getEntryFilesForAgent`): merged in `src/scaffold/entries.js`. No file → write full `templates/entry/entry.md`; contract markers present → replace only the block; markers absent → insert the block at the top. Existing content is always preserved.
- **Tool-managed template files** (`managed !== "user"` in `templates/manifest.json`, the default): overwritten every init.
- **User-maintained template files** (`managed: "user"` — `docs/project-context.md`, `docs/automation/automation-intent.md`): skipped if they exist.
- **Rules** (under `templates/core/docs/rules/<name>/`): converge to the current `--rules` / `--rules-out` selection; selected existing files are preserved, unselected known rule directories are removed, including local files inside them.
- **manifest.json**: regenerated every init (`src/scaffold/status-writer.js`).

`writeFile` (`src/fs-safe.js`) takes an explicit `{ dryRun, overwrite }`; callers set `overwrite` from the classification.

## Template model

`templates/manifest.json` is the source of truth for what `init` generates:

- `workDirectory` / `workDirectories` — workspace-level runtime task area.
- `directories` — created inside the harness root.
- `templateFiles` — rendered into the harness root; each may carry `"managed": "user"` (default tool-managed).
- `workTemplateFiles` — rendered under the workspace root (tool-managed).
- `rulesRoot` — rule directory root (`templates/core/docs/rules/<name>/`).

Entry files are not in `templates/manifest.json`; selected by `getEntryFilesForAgent()` (claude → `CLAUDE.md`, codex/opencode → `AGENTS.md`, multi → both). Single source template: `templates/entry/entry.md`.

When adding or moving scaffold templates, update `templates/manifest.json` and the focused tests, or files may exist in the repository but not be generated by `init` or validated by `doctor`.

## Generated harness shape

Entry written to the workspace root (auto-discovered by coding tools); the rest under `target/harness/`; runtime task records under the workspace-level `agent-work/`. Generated `manifest.json` records `schemaVersion`, agent, rules, harnessDir, workDir, entryFiles, createdBy, createdAt — regenerated every init. `doctor` validates against this generated manifest and also checks the entry contract zone is intact.

Docs follow a seven-layer operating model under `docs/layers/` (context, policy, process, observation, recovery, memory, loop). Process playbooks include the cross-cutting `isolation.md` and `subagent-development.md`.

## Tests

Plain Node scripts using built-in `assert` and temporary directories. `test/cli.test.js` is the aggregator used by `npm test`; focused coverage lives in `test/init.test.js`, `test/doctor.test.js`, and `test/help.test.js`, with shared helpers in `test/helpers.js`. Tests execute the real CLI binary, so cover parsing/scaffold/doctor changes by extending the focused test files rather than mocking internals.
