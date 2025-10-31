$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
$headers = @{
  apikey = $serviceKey
  Authorization = "Bearer $serviceKey"
  "Content-Type" = "application/json"
  Prefer = "return=representation"
}
$submissionId = 'a8ef19c2-a2ac-4e05-8b09-fbf0a9ad2e7f'
$payload = @{
  status = 'pending'
  approved_at = $null
  approved_by = $null
  reviewed_at = $null
  reviewed_by = $null
  crawl_board_id = $null
} | ConvertTo-Json
$uri = "https://qpwnsvsiduvvqdijyxio.supabase.co/rest/v1/dev_board_submissions?id=eq.$submissionId"
try {
  $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Patch -Body $payload -ErrorAction Stop
  Write-Host 'Submission update result:'
  $response | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd() | Write-Host
  }
}
