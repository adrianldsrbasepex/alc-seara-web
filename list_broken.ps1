param()
$f = [char]0xFFFD
$file = "c:\Users\adria\Desktop\ALC - SEARA\components\AdminPanel.tsx"
$text = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$lines = $text -split "`r?`n"
$lineNum = 0
foreach ($line in $lines) {
    $lineNum++
    if ($line.Contains($f)) {
        $preview = $line.TrimStart()
        if ($preview.Length -gt 100) { $preview = $preview.Substring(0, 100) }
        Write-Output "$lineNum`: $preview"
    }
}
