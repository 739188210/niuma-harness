function getHelpText() {
  return `Usage:
  niuma-harness init [target] [options]
  niuma-harness doctor [target] [options]
  niuma-harness repair [target] [options]
  niuma-harness install-skill [names...] [--dry-run]
  niuma-harness install-rule [names...] [--dry-run]
  niuma-harness install-command [names...] [--dry-run]

Init options:
  --agent <name>         claude | codex | opencode | multi
  --harness-dir <name>   Harness name for first init or same-name re-init; not migration
  --rules <selection>    all | none | <rule-dir>[,...]; named selections automatically include common
  --rules-out <dirs>     Exclude rule dirs from all available rules
  --skills <selection>   all | none | <skill>[,<skill>...], default: all
  --topology <mode>      single | discover; single disables auto-discovery, discover reads root declarations
  --modules <paths>      Explicit comma-separated existing module roots; bypasses auto-discovery
  --dry-run              Print planned actions without writing files

Doctor options:
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

Asset install options:
  --dry-run              Show the current-directory asset plan without writing

Asset install commands require an interactive terminal, install in the current working directory,
and prompt for an agent each time. They do not initialize or modify Harness docs, entry files, or task data.

Global options:
  -h, --help             Show help

Examples:
  niuma-harness init . --agent claude
  niuma-harness init . --agent claude --rules java
  niuma-harness init . --agent claude --skills database-readonly
  niuma-harness init . --agent multi --skills all
  niuma-harness init . --agent claude --rules none --skills none
  niuma-harness init . --agent claude --rules all
  niuma-harness init . --agent claude --rules-out web
  niuma-harness init . --agent multi --harness-dir ai-harness
  niuma-harness init . --agent opencode --dry-run
  niuma-harness init . --agent multi --topology discover --dry-run
  niuma-harness init . --agent multi --modules apps/admin,services/orders
  niuma-harness doctor .
  niuma-harness repair . --dry-run
  niuma-harness repair . -y
  niuma-harness install-skill
  niuma-harness install-rule common,typescript`;
}

module.exports = {
  getHelpText,
};
