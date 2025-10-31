$serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzA1MDAwMCwiZXhwIjoxNzY0NTg2MDAwfQ.SUPABASE_SERVICE_ROLE_KEY_PLACEHOLDER'
$headers = @{
  'Authorization' = 'Bearer ' + $serviceRoleKey
  'Content-Type' = 'application/json'
}
$body = @{
  boardName = 'Pagination Test Board'
  boardUrl = 'https://example.com/jobs'
  adminId = '85823de2-b69b-4829-8e1b-c3764c7d633c'
} | ConvertTo-Json

try {
  $response = Invoke-WebRequest -Uri 'https://qpwnsvsiduvvqdijyxio.functions.supabase.co/generate-crawler' -Method POST -Headers $headers -Body $body -ErrorAction Stop
  $result = $response.Content | ConvertFrom-Json
  Write-Host "Response Status: $($response.StatusCode)"
  Write-Host "Response Body:"
  $result | ConvertTo-Json -Depth 10
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  Write-Host "Response: $($_.Exception.Response.Content)"
}
