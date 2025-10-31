$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
$headers = @{
  apikey = $serviceKey
  Authorization = "Bearer $serviceKey"
  "Content-Type" = "application/json"
  Prefer = "return=representation"
}
$boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf'
$payload = @{
  status = 'active'
  is_active = $false
  approved_at = $null
  approved_by = $null
} | ConvertTo-Json
$uri = "https://qpwnsvsiduvvqdijyxio.supabase.co/rest/v1/crawl_boards?id=eq.$boardId"
try {
  $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Patch -Body $payload -ErrorAction Stop
  Write-Host 'Update result:'
  $response | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd() | Write-Host
  }
}
