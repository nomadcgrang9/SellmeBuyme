$headers = @{
  'Content-Type' = 'application/json'
}
$body = @{
  submissionId = 'test-submission-001'
  boardName = 'Pagination Test Board'
  boardUrl = 'https://example.com/jobs'
  adminUserId = '85823de2-b69b-4829-8e1b-c3764c7d633c'
} | ConvertTo-Json

Write-Host "Request Body:"
Write-Host $body
Write-Host ""

try {
  $response = Invoke-WebRequest -Uri 'https://qpwnsvsiduvvqdijyxio.functions.supabase.co/generate-crawler' -Method POST -Headers $headers -Body $body -ErrorAction Stop
  Write-Host "Status: $($response.StatusCode)"
  Write-Host ""
  $result = $response.Content | ConvertFrom-Json
  Write-Host "Response:"
  Write-Host "- Success: $($result.success)"
  Write-Host "- Message: $($result.message)"
  Write-Host "- CrawlBoardId: $($result.crawlBoardId)"
  if ($result.crawlerCode) {
    Write-Host "- Crawler Code Generated: YES (length: $($result.crawlerCode.Length))"
    Write-Host ""
    Write-Host "First 800 chars of generated crawler code:"
    Write-Host "---"
    Write-Host $result.crawlerCode.Substring(0, [Math]::Min(800, $result.crawlerCode.Length))
    Write-Host "---"
  }
} catch {
  Write-Host "Error Status: $($_.Exception.Response.StatusCode)"
  Write-Host "Error Message: $($_.Exception.Message)"
  try {
    $errorContent = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorContent)
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error Body: $errorBody"
  } catch {
    Write-Host "Could not read error body"
  }
}
