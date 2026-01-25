# UTF-8 with BOM encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "35 Crawler Execution Started" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""

$sources = @(
    "seoul", "busan", "daegu", "incheon", "gwangju", "daejeon", "ulsan", "sejong",
    "gyeonggi", "gangwon", "chungbuk", "chungnam", "jeonbuk", "jeonnam", "gyeongbuk", "gyeongnam", "jeju",
    "seongnam", "goyang", "uijeongbu", "namyangju", "bucheon", "gimpo", "gwangmyeong",
    "gwangjuhanam", "gurinamyangju", "anseong", "pyeongtaek", "paju", "yangpyeong",
    "pocheon", "yeoncheon", "dongducheonyangjyu", "gapyeong1", "gapyeong2"
)

$total = $sources.Count
$success = 0
$failed = 0
$count = 0

# Initialize progress tracking
Write-Host "Initializing progress tracker..." -ForegroundColor Cyan
$progressData = @{
    startTime = (Get-Date).ToString('o')
    currentIndex = 0
    total = $total
    currentSource = $null
    regions = @{}
    stats = @{
        completed = 0
        failed = 0
        running = 0
        pending = $total
        totalNew = 0
        totalSkipped = 0
        totalProcessed = 0
    }
    logs = @()
}

# Initialize all regions as pending
foreach ($source in $sources) {
    $progressData.regions[$source] = @{
        status = 'pending'
        new = 0
        skipped = 0
        processed = 0
        startTime = $null
        endTime = $null
        duration = 0
        error = $null
    }
}

# Write initial progress file (UTF8 without BOM)
$jsonContent = $progressData | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Join-Path $PWD '.progress.json'), $jsonContent, [System.Text.UTF8Encoding]::new($false))

# Start monitor in a new terminal window
Write-Host "Starting real-time monitor dashboard..." -ForegroundColor Green
$monitorProcess = Start-Process -FilePath "node" -ArgumentList "monitor.js" -WindowStyle Normal -PassThru
Write-Host "Monitor PID: $($monitorProcess.Id)" -ForegroundColor Gray
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Execution Started..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

foreach ($source in $sources) {
    $count++
    Write-Host ""
    Write-Host "[$count/$total] $source crawling..." -ForegroundColor Yellow
    Write-Host "------------------------------------"

    & node index.js --source=$source | Out-Default

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $source completed" -ForegroundColor Green
        $success++
    } else {
        Write-Host "[FAIL] $source failed" -ForegroundColor Red
        $failed++
    }

    Write-Host ""
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "All Crawlers Completed" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "End Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""
Write-Host "Results:" -ForegroundColor Cyan
Write-Host "  Success: $success/$total" -ForegroundColor Green
Write-Host "  Failed: $failed/$total" -ForegroundColor Red
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Keep monitor open for review
Write-Host "Monitor dashboard is still running." -ForegroundColor Yellow
Write-Host "Press any key to close the monitor and exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Clean up monitor process
if ($monitorProcess -and !$monitorProcess.HasExited) {
    Stop-Process -Id $monitorProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Monitor closed." -ForegroundColor Gray
}

# Clean up progress file
if (Test-Path '.progress.json') {
    Remove-Item '.progress.json' -Force -ErrorAction SilentlyContinue
}
