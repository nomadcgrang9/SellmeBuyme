$headers = @{
  'Content-Type' = 'application/json'
}
$body = @{
  boardName = 'Pagination Test Board'
  boardUrl = 'https://example.com/jobs'
  adminId = '85823de2-b69b-4829-8e1b-c3764c7d633c'
} | ConvertTo-Json

try {
  $response = Invoke-WebRequest -Uri 'https://qpwnsvsiduvvqdijyxio.functions.supabase.co/generate-crawler' -Method POST -Headers $headers -Body $body -ErrorAction Stop
  Write-Host "Status: $($response.StatusCode)"
  $result = $response.Content | ConvertFrom-Json
  Write-Host "Success: $($result.success)"
  Write-Host "Message: $($result.message)"
  if ($result.crawlerCode) {
    Write-Host "Crawler code generated (length: $($result.crawlerCode.Length))"
    # Show first 500 chars
    Write-Host "First 500 chars of crawler code:"
    Write-Host $result.crawlerCode.Substring(0, [Math]::Min(500, $result.crawlerCode.Length))
  }
} catch {
  Write-Host "Error Status: $($_.Exception.Response.StatusCode)"
  Write-Host "Error: $($_.Exception.Message)"
}
