function getHelpText() {
  return `Usage:
  niuma-harness init [target] [options]
  niuma-harness doctor [target] [options]
  niuma-harness check [target] [options]

Init options:
  --agent <name>         claude | codex | opencode | multi
  --tool <name>          Alias for --agent
  --harness-dir <name>   Directory to create, default: harness
  --rules <selection>    common | all | none | <rule-dir>[,<rule-dir>...], default: common
  --rules-out <dirs>     Exclude rule dirs from all installed rules
  --force                Overwrite existing scaffold files
  --dry-run              Print planned actions without writing files

Doctor/check options:
  --harness-dir <name>   Directory to inspect, default: harness

Global options:
  -h, --help             Show help

Examples:
  niuma-harness init . --agent claude --rules common
  niuma-harness init D:\\work\\app --agent codex --rules java,web
  niuma-harness init . --agent claude --rules none
  niuma-harness init . --agent claude --rules all
  niuma-harness init . --agent claude --rules-out web
  niuma-harness init . --agent multi --harness-dir ai-harness
  niuma-harness init . --agent opencode --dry-run
  niuma-harness doctor .
  niuma-harness check . --harness-dir ai-harness`;
}

module.exports = {
  getHelpText,
};
