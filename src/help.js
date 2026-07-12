function getHelpText() {
  return `Usage:
  niuma-harness init [target] [options]
  niuma-harness doctor [target] [options]
  niuma-harness check [target] [options]
  niuma-harness repair [target] [options]
  niuma-harness audit [target] [--harness-dir <name>] [--task <name> | --all] [--strict]

Init options:
  --agent <name>         claude | codex | opencode | multi
  --tool <name>          Alias for --agent
  --harness-dir <name>   Harness name for first init or same-name re-init; not migration
  --rules <selection>    all | none | <rule-dir>[,<rule-dir>...]; agent adapter rules are added automatically
  --rules-out <dirs>     Exclude rule dirs from all installed rules
  --skills <selection>   all | none | <skill>[,<skill>...], default: all
  --dry-run              Print planned actions without writing files

Doctor/check options:
  --harness-dir <name>   Directory to inspect, default: harness

Repair options:
  --harness-dir <name>   Harness to repair, auto-detected when unique
  --backup-dir <path>    Backup parent, default: .niuma-harness/repairs
  --agent <name>         Recovery agent when manifest state is unusable
  --rules <selection>    Recovery rules when manifest state is unusable
  --rules-out <dirs>     Recovery rule exclusions when manifest is unusable
  --skills <selection>   Recovery skills when manifest state is unusable
  --dry-run              Print all issues and actions without writing
  -y, --yes              Print the plan and skip confirmation

Audit options:
  --harness-dir <name>   Harness to inspect, default: harness
  --task <name>          Audit one task directory
  --all                  Audit every task directory
  --strict               Exit non-zero when evidence is partial

Global options:
  -h, --help             Show help

Examples:
  niuma-harness init . --agent claude
  niuma-harness init . --agent codex --rules common
  niuma-harness init . --agent claude --skills database-readonly
  niuma-harness init . --agent multi --skills all
  niuma-harness init . --agent claude --rules none --skills none
  niuma-harness init . --agent claude --rules all
  niuma-harness init . --agent claude --rules-out opencode
  niuma-harness init . --agent multi --harness-dir ai-harness
  niuma-harness init . --agent opencode --dry-run
  niuma-harness doctor .
  niuma-harness check . --harness-dir ai-harness
  niuma-harness repair . --dry-run
  niuma-harness repair . -y
  niuma-harness audit . --task release-42
  niuma-harness audit . --all --strict`;
}

module.exports = {
  getHelpText,
};
