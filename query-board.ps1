$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
$headers = @{
  apikey = $serviceKey
  Authorization = "Bearer $serviceKey"
  "Content-Type" = "application/json"
}
$uri = "https://qpwnsvsiduvvqdijyxio.supabase.co/rest/v1/crawl_boards?select=id,name,status,is_active,board_url,approved_at,approved_by&order=created_at.desc&limit=20"
try {
  $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -ErrorAction Stop
  if ($response) {
    foreach ($item in @($response)) {
      Write-Host '---'
      Write-Host "ID: $($item.id)"
      Write-Host "Name: $($item.name)"
      Write-Host "Status: $($item.status)"
      Write-Host "Active: $($item.is_active)"
      Write-Host "Board URL: $($item.board_url)"
      Write-Host "Approved At: $($item.approved_at)"
      Write-Host "Approved By: $($item.approved_by)"
    }
  } else {
    Write-Host 'No rows returned.'
  }
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd() | Write-Host
  }
}
