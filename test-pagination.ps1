$token = 'sbp_96c405695ff2ebbf8a183080e37db8951cd01118'
$headers = @{
  'Authorization' = 'Bearer ' + $token
  'Content-Type' = 'application/json'
}
$body = @{
  boardName = 'Pagination Test Board'
  boardUrl = 'https://example.com/jobs'
  adminId = '85823de2-b69b-4829-8e1b-c3764c7d633c'
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'https://qpwnsvsiduvvqdijyxio.functions.supabase.co/generate-crawler' -Method POST -Headers $headers -Body $body
$result = $response.Content | ConvertFrom-Json
Write-Host "Response Status: $($response.StatusCode)"
Write-Host "Response Body:"
$result | ConvertTo-Json -Depth 10
