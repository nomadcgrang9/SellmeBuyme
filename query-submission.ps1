$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
$headers = @{
  apikey = $serviceKey
  Authorization = "Bearer $serviceKey"
  "Content-Type" = "application/json"
}
$encodedUrl = [System.Uri]::EscapeDataString('https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656')
$uri = "https://qpwnsvsiduvvqdijyxio.supabase.co/rest/v1/dev_board_submissions?board_url=eq.$encodedUrl"
try {
  $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -ErrorAction Stop
  if ($response) {
    $response | ConvertTo-Json -Depth 5
  } else {
    Write-Host 'No submissions found.'
  }
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd() | Write-Host
  }
}
