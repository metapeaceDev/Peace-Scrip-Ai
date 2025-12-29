param(
  [Parameter(Mandatory=$false)]
  [string]$SourceDir,

  [Parameter(Mandatory=$false)]
  [string[]]$Files,

  [Parameter(Mandatory=$false)]
  [string]$Url,

  [Parameter(Mandatory=$false)]
  [string]$OutName,

  [switch]$RestartComfyUI
)

$ErrorActionPreference = 'Stop'

$targetDir = 'C:\Users\USER\ComfyUI\models\loras'
$containerName = 'comfyui-animatediff'

function Ensure-Dir($path) {
  if (!(Test-Path -LiteralPath $path)) {
    New-Item -ItemType Directory -Path $path | Out-Null
  }
}

function Copy-LoraFile($path) {
  if (!(Test-Path -LiteralPath $path)) {
    throw "File not found: $path"
  }
  $name = Split-Path -Leaf $path
  $dest = Join-Path $targetDir $name
  Copy-Item -LiteralPath $path -Destination $dest -Force
  "OK Copied: $name"
}

Ensure-Dir $targetDir

"Target LoRA folder: $targetDir"

$didSomething = $false

if ($SourceDir) {
  if (!(Test-Path -LiteralPath $SourceDir)) {
    throw "SourceDir not found: $SourceDir"
  }
  $items = Get-ChildItem -LiteralPath $SourceDir -File -Filter '*.safetensors' -ErrorAction Stop
  if ($items.Count -eq 0) {
    throw "No .safetensors found in SourceDir: $SourceDir"
  }
  foreach ($i in $items) {
    Copy-LoraFile $i.FullName | Out-String
    $didSomething = $true
  }
}

if ($Files -and $Files.Count -gt 0) {
  foreach ($f in $Files) {
    Copy-LoraFile $f | Out-String
    $didSomething = $true
  }
}

if ($Url) {
  if (!$OutName) {
    throw "When using -Url, you must also provide -OutName (e.g. add-detail-xl.safetensors)"
  }
  $outPath = Join-Path $targetDir $OutName
  "Downloading to: $outPath"
  Invoke-WebRequest -Uri $Url -OutFile $outPath -UseBasicParsing
  "OK Downloaded: $OutName"
  $didSomething = $true
}

if (!$didSomething) {
  "No files copied/downloaded. Examples:"
  "  .\\install-loras.ps1 -Files 'D:\\Downloads\\add-detail-xl.safetensors' -RestartComfyUI"
  "  .\\install-loras.ps1 -SourceDir 'D:\\Downloads\\loras' -RestartComfyUI"
  "  .\\install-loras.ps1 -Url '<DIRECT_DOWNLOAD_URL>' -OutName 'add-detail-xl.safetensors' -RestartComfyUI"
  exit 1
}

if ($RestartComfyUI) {
  "Restarting ComfyUI container: $containerName"
  docker restart $containerName | Out-Null
}

"`nVerifying LoRAs via ComfyUI /object_info/LoraLoader ..."
$verifyUrl = 'http://127.0.0.1:8188/object_info/LoraLoader'
$maxAttempts = 10
$sleepSeconds = 3

for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
  try {
    $json = Invoke-RestMethod -Uri $verifyUrl -TimeoutSec 20
    $list = $null
    if ($null -ne $json -and
        $null -ne $json.LoraLoader -and
        $null -ne $json.LoraLoader.input -and
        $null -ne $json.LoraLoader.input.required -and
        $null -ne $json.LoraLoader.input.required.lora_name) {
      $list = $json.LoraLoader.input.required.lora_name[0]
    }
    if ($list -is [System.Array]) {
      "OK ComfyUI sees LoRAs: $($list.Count)"
      $list | Select-Object -First 20 | ForEach-Object { "  - $_" }
      break
    }

    "WARN Could not parse LoRA list (attempt $attempt/$maxAttempts)."
  } catch {
    "WARN Verification attempt $attempt/$maxAttempts failed: $($_.Exception.Message)"
  }

  if ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds $sleepSeconds
  }
}
