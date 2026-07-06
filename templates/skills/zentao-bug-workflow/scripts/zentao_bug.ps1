param(
    [Parameter(Position = 0)]
    [ValidateSet("get", "list-active", "list-unclosed", "prepare", "cleanup", "ping", "resolve")]
    [string]$Command = "list-unclosed",

    [Parameter(Position = 1)]
    [int]$BugId = 0,

    [int]$Limit = 20,
    [int]$Page = 1,
    [string]$Resolution = "fixed",
    [string]$TaskDir = ""
)

$ErrorActionPreference = "Stop"

function Get-SkillRoot {
    Split-Path -Parent $PSScriptRoot
}

function Read-DotEnv {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing .env at $Path"
    }

    $config = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
            continue
        }

        $parts = $trimmed -split "=", 2
        if ($parts.Count -ne 2) {
            continue
        }

        $key = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        $config[$key] = $value
    }

    return $config
}

function Require-Config {
    param(
        [hashtable]$Config,
        [string[]]$Keys
    )

    foreach ($key in $Keys) {
        if (-not $Config.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($Config[$key])) {
            throw "Missing required .env value: $key"
        }
    }
}

function Join-Url {
    param(
        [string]$Base,
        [string]$Path
    )

    return $Base.TrimEnd("/") + "/" + $Path.TrimStart("/")
}

function Invoke-ZenTao {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [string]$Token = ""
    )

    $headers = @{ "Accept" = "application/json" }
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers["Token"] = $Token
    }

    $params = @{
        Method = $Method
        Uri = $Url
        Headers = $headers
    }

    if ($null -ne $Body) {
        $params["ContentType"] = "application/json"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 20)
    }

    Invoke-RestMethod @params
}

function Get-ZenTaoToken {
    param([hashtable]$Config)

    $tokenUrl = Join-Url $Config["ZENTAO_BASE_URL"] ($Config["ZENTAO_API_PREFIX"].TrimEnd("/") + "/tokens")
    $body = @{
        account = $Config["ZENTAO_ACCOUNT"]
        password = $Config["ZENTAO_PASSWORD"]
    }

    $response = Invoke-ZenTao -Method "Post" -Url $tokenUrl -Body $body
    if ($response.token) {
        return $response.token
    }
    if ($response.data.token) {
        return $response.data.token
    }

    throw "ZenTao token response did not include a token."
}

function Convert-ToPrettyJson {
    param([object]$Value)
    $Value | ConvertTo-Json -Depth 50
}

function Convert-HtmlToText {
    param([string]$Html)

    if ([string]::IsNullOrWhiteSpace($Html)) {
        return ""
    }

    $decoded = [System.Net.WebUtility]::HtmlDecode($Html)
    $withBreaks = $decoded -replace "(?i)</p>|<br\s*/?>", "`n"
    $text = $withBreaks -replace "<[^>]+>", ""
    return (($text -split "`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ }) -join "`n"
}

function Get-BugObject {
    param([object]$BugResponse)

    if ($null -ne $BugResponse.PSObject.Properties["data"]) {
        return $BugResponse.data
    }
    if ($null -ne $BugResponse.PSObject.Properties["bug"]) {
        return $BugResponse.bug
    }

    return $BugResponse
}

function Get-FieldValue {
    param(
        [object]$Value,
        [string[]]$Names
    )

    foreach ($name in $Names) {
        if ($null -ne $Value.PSObject.Properties[$name]) {
            return $Value.PSObject.Properties[$name].Value
        }
    }

    if ($null -ne $Value.PSObject.Properties["data"]) {
        return Get-FieldValue -Value $Value.data -Names $Names
    }
    if ($null -ne $Value.PSObject.Properties["bug"]) {
        return Get-FieldValue -Value $Value.bug -Names $Names
    }

    return $null
}

function Assert-BugScope {
    param(
        [object]$BugResponse,
        [hashtable]$Config
    )

    $product = Get-FieldValue -Value $BugResponse -Names @("product", "productID")
    $project = Get-FieldValue -Value $BugResponse -Names @("project", "projectID")

    if ($null -ne $product -and "$product" -ne "$($Config["ZENTAO_PRODUCT_ID"])") {
        throw "Bug is outside configured product scope. Expected ZENTAO_PRODUCT_ID=$($Config["ZENTAO_PRODUCT_ID"]), got $product."
    }

    if ($null -ne $project -and "$project" -ne "0" -and "$project" -ne "$($Config["ZENTAO_PROJECT_ID"])") {
        throw "Bug is outside configured project scope. Expected ZENTAO_PROJECT_ID=$($Config["ZENTAO_PROJECT_ID"]), got $project."
    }
}

function Get-TaskRoot {
    param([string]$SkillRoot)
    Join-Path $SkillRoot "tasks"
}

function New-BugTaskDir {
    param(
        [string]$SkillRoot,
        [int]$BugId
    )

    $taskRoot = Get-TaskRoot -SkillRoot $SkillRoot
    New-Item -ItemType Directory -Force -Path $taskRoot | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = Join-Path $taskRoot "bug-$BugId-$stamp"
    New-Item -ItemType Directory -Force -Path $path | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $path "images") | Out-Null
    return $path
}

function Get-ImageRefs {
    param(
        [string]$Html,
        [hashtable]$Config
    )

    $refs = New-Object System.Collections.Generic.List[object]
    if ([string]::IsNullOrWhiteSpace($Html)) {
        return $refs
    }

    $decoded = [System.Net.WebUtility]::HtmlDecode($Html)
    foreach ($match in [regex]::Matches($decoded, 'src=["'']([^"'']+)["'']')) {
        $src = $match.Groups[1].Value
        if ($src -match '^https?://') {
            $refs.Add([pscustomobject]@{ Url = $src; FileName = (Split-Path ([uri]$src).AbsolutePath -Leaf) })
        }
    }

    foreach ($match in [regex]::Matches($decoded, 'fileID=(\d+)')) {
        $fileId = $match.Groups[1].Value
        $url = Join-Url $Config["ZENTAO_BASE_URL"] "index.php?m=file&f=read&t=png&fileID=$fileId"
        $refs.Add([pscustomobject]@{ Url = $url; FileName = "$fileId.png" })
    }

    foreach ($match in [regex]::Matches($decoded, '\{(\d+)\.(png|jpg|jpeg|gif|webp)\}')) {
        $fileId = $match.Groups[1].Value
        $ext = $match.Groups[2].Value
        $url = Join-Url $Config["ZENTAO_BASE_URL"] "index.php?m=file&f=read&t=$ext&fileID=$fileId"
        $refs.Add([pscustomobject]@{ Url = $url; FileName = "$fileId.$ext" })
    }

    return $refs | Sort-Object Url -Unique
}

function Save-BugTask {
    param(
        [object]$BugResponse,
        [hashtable]$Config,
        [string]$Token,
        [string]$SkillRoot,
        [int]$BugId
    )

    $bug = Get-BugObject -BugResponse $BugResponse
    $taskPath = New-BugTaskDir -SkillRoot $SkillRoot -BugId $BugId
    $imagesPath = Join-Path $taskPath "images"
    $stepsHtml = if ($null -ne $bug.PSObject.Properties["steps"]) { "$($bug.steps)" } else { "" }
    $stepsText = Convert-HtmlToText -Html $stepsHtml

    Convert-ToPrettyJson $BugResponse | Set-Content -LiteralPath (Join-Path $taskPath "bug.json") -Encoding UTF8
    $stepsHtml | Set-Content -LiteralPath (Join-Path $taskPath "steps.html") -Encoding UTF8
    $stepsText | Set-Content -LiteralPath (Join-Path $taskPath "steps.txt") -Encoding UTF8

    $downloaded = New-Object System.Collections.Generic.List[object]
    foreach ($ref in (Get-ImageRefs -Html $stepsHtml -Config $Config)) {
        $fileName = if ([string]::IsNullOrWhiteSpace($ref.FileName)) { "image-$($downloaded.Count + 1).png" } else { $ref.FileName }
        $target = Join-Path $imagesPath $fileName
        try {
            Invoke-WebRequest -Uri $ref.Url -Headers @{ "Token" = $Token } -OutFile $target | Out-Null
            $downloaded.Add([pscustomobject]@{ url = $ref.Url; path = $target; ok = $true })
        }
        catch {
            $downloaded.Add([pscustomobject]@{ url = $ref.Url; path = $target; ok = $false; error = $_.Exception.Message })
        }
    }

    $summary = [pscustomobject]@{
        bugId = $BugId
        taskDir = $taskPath
        bugJson = Join-Path $taskPath "bug.json"
        stepsHtml = Join-Path $taskPath "steps.html"
        stepsText = Join-Path $taskPath "steps.txt"
        imageCount = @($downloaded | Where-Object { $_.ok }).Count
        downloads = $downloaded
    }
    Convert-ToPrettyJson $summary | Set-Content -LiteralPath (Join-Path $taskPath "task.json") -Encoding UTF8
    return $summary
}

function Remove-BugTaskDirs {
    param(
        [string]$SkillRoot,
        [int]$BugId,
        [string]$TaskDir
    )

    $taskRoot = Get-TaskRoot -SkillRoot $SkillRoot
    if (-not (Test-Path -LiteralPath $taskRoot)) {
        return [pscustomobject]@{ removed = @(); taskRoot = $taskRoot }
    }

    $rootResolved = (Resolve-Path -LiteralPath $taskRoot).Path.TrimEnd("\")
    if (-not [string]::IsNullOrWhiteSpace($TaskDir)) {
        $candidates = @((Resolve-Path -LiteralPath $TaskDir).Path)
    }
    elseif ($BugId -gt 0) {
        $candidates = @(Get-ChildItem -LiteralPath $taskRoot -Directory -Filter "bug-$BugId-*" | ForEach-Object { $_.FullName })
    }
    else {
        throw "BugId or TaskDir is required for cleanup."
    }

    $removed = New-Object System.Collections.Generic.List[string]
    foreach ($candidate in $candidates) {
        $resolved = (Resolve-Path -LiteralPath $candidate).Path
        $name = Split-Path -Leaf $resolved
        if (-not $resolved.StartsWith($rootResolved + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to delete outside task root: $resolved"
        }
        if (-not $name.StartsWith("bug-")) {
            throw "Refusing to delete non-bug task directory: $resolved"
        }
        Remove-Item -LiteralPath $resolved -Recurse -Force
        $removed.Add($resolved)
    }

    return [pscustomobject]@{ removed = $removed; taskRoot = $taskRoot }
}

$skillRoot = Get-SkillRoot

if ($Command -eq "cleanup") {
    Convert-ToPrettyJson (Remove-BugTaskDirs -SkillRoot $skillRoot -BugId $BugId -TaskDir $TaskDir)
    exit 0
}

$envPath = Join-Path $skillRoot ".env"
$config = Read-DotEnv -Path $envPath

Require-Config -Config $config -Keys @(
    "ZENTAO_BASE_URL",
    "ZENTAO_ACCOUNT",
    "ZENTAO_PASSWORD",
    "ZENTAO_PRODUCT_ID",
    "ZENTAO_PROJECT_ID",
    "ZENTAO_API_PREFIX",
    "ZENTAO_ALLOW_WRITE"
)

$baseApiUrl = Join-Url $config["ZENTAO_BASE_URL"] $config["ZENTAO_API_PREFIX"]
$token = Get-ZenTaoToken -Config $config

switch ($Command) {
    "ping" {
        $url = "$baseApiUrl/ping"
        Convert-ToPrettyJson (Invoke-ZenTao -Method "Get" -Url $url -Token $token)
    }
    { $_ -in @("list-active", "list-unclosed") } {
        $productId = [uri]::EscapeDataString($config["ZENTAO_PRODUCT_ID"])
        $url = "$baseApiUrl/bugs?product=$productId&status=unclosed&limit=$Limit&page=$Page"
        Convert-ToPrettyJson (Invoke-ZenTao -Method "Get" -Url $url -Token $token)
    }
    "get" {
        if ($BugId -le 0) {
            throw "BugId is required for get."
        }

        $url = "$baseApiUrl/bugs/$BugId"
        $response = Invoke-ZenTao -Method "Get" -Url $url -Token $token
        Assert-BugScope -BugResponse $response -Config $config
        Convert-ToPrettyJson $response
    }
    "prepare" {
        if ($BugId -le 0) {
            throw "BugId is required for prepare."
        }

        $url = "$baseApiUrl/bugs/$BugId"
        $response = Invoke-ZenTao -Method "Get" -Url $url -Token $token
        Assert-BugScope -BugResponse $response -Config $config
        Convert-ToPrettyJson (Save-BugTask -BugResponse $response -Config $config -Token $token -SkillRoot $skillRoot -BugId $BugId)
    }
    "resolve" {
        if ($BugId -le 0) {
            throw "BugId is required for resolve."
        }
        if ($config["ZENTAO_ALLOW_WRITE"].ToLowerInvariant() -ne "true") {
            throw "Write operation blocked. Set ZENTAO_ALLOW_WRITE=true in .env only after explicit user approval."
        }

        $checkUrl = "$baseApiUrl/bugs/$BugId"
        $bugResponse = Invoke-ZenTao -Method "Get" -Url $checkUrl -Token $token
        Assert-BugScope -BugResponse $bugResponse -Config $config

        $url = "$baseApiUrl/bugresolve/$BugId"
        $body = @{ resolution = $Resolution }
        Convert-ToPrettyJson (Invoke-ZenTao -Method "Post" -Url $url -Body $body -Token $token)
    }
}
