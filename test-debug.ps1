$headers = @{
  'Content-Type' = 'application/json'
}
$body = @{
  boardName = 'Pagination Test Board'
  boardUrl = 'https://example.com/jobs'
  adminId = '85823de2-b69b-4829-8e1b-c3764c7d633c'
} | ConvertTo-Json

Write-Host "Request Body:"
Write-Host $body

try {
  $response = Invoke-WebRequest -Uri 'https://qpwnsvsiduvvqdijyxio.functions.supabase.co/generate-crawler' -Method POST -Headers $headers -Body $body -ErrorAction Stop
  Write-Host "Status: $($response.StatusCode)"
  $result = $response.Content | ConvertFrom-Json
  Write-Host "Response:"
  $result | ConvertTo-Json -Depth 10
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
