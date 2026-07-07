param(
    [Parameter(Position = 0)]
    [ValidateSet("get", "list-active", "list-unclosed", "prepare", "cleanup", "ping", "comment", "resolve", "validated")]
    [string]$Command = "list-unclosed",

    [Parameter(Position = 1)]
    [int]$BugId = 0,

    [int]$Limit = 20,
    [int]$Page = 1,
    [string]$Resolution = "",
    [string]$Comment = "",
    [string]$CommentFile = "",
    [string]$AssignedTo = "",
    [string]$TaskDir = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$pythonScript = Join-Path $scriptDir "zentao_bug.py"

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $python) {
    throw "Python 3 is required to run zentao_bug.py."
}

$argsList = @($pythonScript, $Command)
if ($BugId -gt 0) {
    $argsList += "$BugId"
}
$argsList += @("--limit", "$Limit", "--page", "$Page")
if (-not [string]::IsNullOrWhiteSpace($Resolution)) {
    $argsList += @("--resolution", $Resolution)
}
if (-not [string]::IsNullOrWhiteSpace($Comment)) {
    $argsList += @("--comment", $Comment)
}
if (-not [string]::IsNullOrWhiteSpace($CommentFile)) {
    $argsList += @("--comment-file", $CommentFile)
}
if (-not [string]::IsNullOrWhiteSpace($AssignedTo)) {
    $argsList += @("--assigned-to", $AssignedTo)
}
if (-not [string]::IsNullOrWhiteSpace($TaskDir)) {
    $argsList += @("--task-dir", $TaskDir)
}

& $python.Source @argsList
exit $LASTEXITCODE
