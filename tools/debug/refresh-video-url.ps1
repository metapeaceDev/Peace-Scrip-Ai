param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [string]$Base = 'http://localhost:8000'
)

$body = @{ videoUrls = @($Url) } | ConvertTo-Json -Compress

try {
  $resp = Invoke-RestMethod -Method Post -Uri "$Base/api/video/refresh-urls" -ContentType 'application/json' -Body $body -TimeoutSec 30
  $result = $resp.data.refreshedUrls | Select-Object -First 1
  [pscustomobject]@{
    oldUrl = $result.oldUrl
    newUrl = $result.newUrl
    status = $result.status
    error = $result.error
    summary = $resp.data.summary
  } | ConvertTo-Json -Depth 10
} catch {
  Write-Error ("refresh-video-url failed: {0}" -f $_.Exception.Message)
  exit 1
}
