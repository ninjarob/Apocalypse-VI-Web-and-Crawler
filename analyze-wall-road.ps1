# Analyze Wall Road rooms in the exploration log
$logFile = "c:\work\other\Apocalypse VI MUD\crawler\sessions\Exploration - Northern Midgaard City.txt"
$content = Get-Content $logFile -Raw

# Find all room blocks that contain "Wall Road" as the title
$pattern = '(?s)<font color="#00FFFF">([^<]+?)\s*\n</font>.*?''([a-z]+)'' briefly appears'

$allMatches = [regex]::Matches($content, $pattern)

$streetData = @{}

foreach ($match in $allMatches) {
    $roomName = $match.Groups[1].Value.Trim()
    $portalKey = $match.Groups[2].Value
    
    if ($roomName -eq "Wall Road" -or 
        $roomName -eq "Emerald Avenue" -or 
        $roomName -eq "Central Street" -or 
        $roomName -eq "Royal Boulevard" -or 
        $roomName -eq "Park Road") {
        
        if (-not $streetData.ContainsKey($roomName)) {
            $streetData[$roomName] = @()
        }
        
        if ($portalKey -notin $streetData[$roomName]) {
            $streetData[$roomName] += $portalKey
        }
    }
}

Write-Host "=== Street Rooms with Portal Keys ===" -ForegroundColor Cyan
Write-Host ""

foreach ($street in $streetData.Keys | Sort-Object) {
    $keys = $streetData[$street] | Sort-Object
    $count = $keys.Count
    Write-Host "$street`: $count unique portal keys" -ForegroundColor Yellow
    $keys | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    Write-Host ""
}
