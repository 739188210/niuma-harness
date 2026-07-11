function getHelpText() {
  return `Usage:
  niuma-harness init [target] [options]
  niuma-harness doctor [target] [options]
  niuma-harness check [target] [options]

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
  niuma-harness check . --harness-dir ai-harness`;
}

module.exports = {
  getHelpText,
};
