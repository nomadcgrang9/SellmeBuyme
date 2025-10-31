$headers = @{'Content-Type' = 'application/json'}
$body = @{
  submissionId = 'manual-approval-test-namyangju'
  boardName = '남양주교육지원청 구인구직'
  boardUrl = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656'
  adminUserId = '85823de2-b69b-4829-8e1b-c3764c7d633c'
} | ConvertTo-Json
$response = Invoke-WebRequest -Uri 'https://qpwnsvsiduvvqdijyxio.functions.supabase.co/generate-crawler' -Method POST -Headers $headers -Body $body
$response.StatusCode
