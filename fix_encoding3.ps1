param()
# Fix remaining U+FFFD characters in AdminPanel.tsx and other files
# These are actual Unicode replacement chars (0xFFFD)

$targetFiles = @(
    "c:\Users\adria\Desktop\ALC - SEARA\components\AdminPanel.tsx",
    "c:\Users\adria\Desktop\ALC - SEARA\components\UnloadingReimbursement.tsx"
)

$f = [char]0xFFFD  # U+FFFD

# Replacement pairs using U+FFFD
$pairs = @(
    @($f + 'o ', [char]0xE3 + 'o '),           # ends with -ão + space
    @($f + 'o.', [char]0xE3 + 'o.'),           # ends with -ão.
    @($f + 'o,', [char]0xE3 + 'o,'),           # ends with -ão,
    @($f + 'o)', [char]0xE3 + 'o)'),           # ends with -ão)
    @($f + 'o"', [char]0xE3 + 'o"'),           # ends with -ão"
    @($f + 'o`', [char]0xE3 + 'o`'),            # ends with -ão`
    @($f + 'o:', [char]0xE3 + 'o:'),           # ends with -ão:
    @($f + 'es ', [char]0xF5 + 'es '),         # ends with -ões + space
    @($f + 'es.', [char]0xF5 + 'es.'),         # ends with -ões.
    @($f + 'es,', [char]0xF5 + 'es,'),         # ends with -ões,
    @($f + 'es)', [char]0xF5 + 'es)'),         # ends with -ões)
    @($f + 'es"', [char]0xF5 + 'es"'),         # ends with -ões"
    @('Di' + $f + 'ria', 'Di' + [char]0xE1 + 'ria'),
    @('di' + $f + 'ria', 'di' + [char]0xE1 + 'ria'),
    @('Ve' + $f + 'culo', 'Ve' + [char]0xED + 'culo'),
    @('ve' + $f + 'culo', 've' + [char]0xED + 'culo'),
    @('Gest' + $f + 'o', 'Gest' + [char]0xE3 + 'o'),
    @('gest' + $f + 'o', 'gest' + [char]0xE3 + 'o'),
    @('Vis' + $f + 'o', 'Vis' + [char]0xE3 + 'o'),
    @('vis' + $f + 'o', 'vis' + [char]0xE3 + 'o'),
    @('Usu' + $f + 'rios', 'Usu' + [char]0xE1 + 'rios'),
    @('Usu' + $f + 'rio', 'Usu' + [char]0xE1 + 'rio'),
    @('usu' + $f + 'rios', 'usu' + [char]0xE1 + 'rios'),
    @('Hist' + $f + 'rico', 'Hist' + [char]0xF3 + 'rico'),
    @('Per' + $f + 'odo', 'Per' + [char]0xED + 'odo'),
    @('n' + $f + 'o ', 'n' + [char]0xE3 + 'o '),
    @('N' + $f + 'o ', 'N' + [char]0xE3 + 'o '),
    @('Informa' + $f, 'Informa' + [char]0xE7),
    @('opera' + $f, 'opera' + [char]0xE7),
    @('Opera' + $f, 'Opera' + [char]0xE7),
    @('Solicita' + $f, 'Solicita' + [char]0xE7),
    @('solicita' + $f, 'solicita' + [char]0xE7),
    @('aten' + $f, 'aten' + [char]0xE7),
    @('Aten' + $f, 'Aten' + [char]0xE7),
    @('solu' + $f, 'solu' + [char]0xE7),
    @('cria' + $f, 'cria' + [char]0xE7),
    @('Cria' + $f, 'Cria' + [char]0xE7),
    @('altera' + $f, 'altera' + [char]0xE7),
    @('atualiza' + $f, 'atualiza' + [char]0xE7),
    @('finaliza' + $f, 'finaliza' + [char]0xE7),
    @('valida' + $f, 'valida' + [char]0xE7),
    @('descri' + $f, 'descri' + [char]0xE7),
    @('Descri' + $f, 'Descri' + [char]0xE7),
    @('rela' + $f, 'rela' + [char]0xE7),
    @('Rela' + $f, 'Rela' + [char]0xE7),
    @('fun' + $f, 'fun' + [char]0xE7),
    @('Fun' + $f, 'Fun' + [char]0xE7),
    @('configura' + $f, 'configura' + [char]0xE7),
    @('Configura' + $f, 'Configura' + [char]0xE7),
    @('sess' + $f + 'o', 'sess' + [char]0xE3 + 'o'),
    @('vers' + $f + 'o', 'vers' + [char]0xE3 + 'o'),
    @('conclus' + $f + 'o', 'conclus' + [char]0xE3 + 'o'),
    @($f + 'ltimo', [char]0xFA + 'ltimo'),
    @($f + 'ltima', [char]0xFA + 'ltima'),
    @('c' + $f + 'digo', 'c' + [char]0xF3 + 'digo'),
    @('C' + $f + 'digo', 'C' + [char]0xF3 + 'digo'),
    @('n' + $f + 'mero', 'n' + [char]0xFA + 'mero'),
    @('N' + $f + 'mero', 'N' + [char]0xFA + 'mero'),
    @('tamb' + $f + 'm', 'tamb' + [char]0xE9 + 'm'),
    @('m' + $f + 'ximo', 'm' + [char]0xE1 + 'ximo'),
    @('m' + $f + 'nimo', 'm' + [char]0xED + 'nimo'),
    @('obrigat' + $f + 'rio', 'obrigat' + [char]0xF3 + 'rio'),
    @('necess' + $f + 'rio', 'necess' + [char]0xE1 + 'rio'),
    @(' ' + $f + ' ', ' ' + [char]0xE9 + ' '),
    @('j' + $f + ' ', 'j' + [char]0xE1 + ' '),
    @('J' + $f + ' ', 'J' + [char]0xE1 + ' '),
    @('Tempor' + $f + 'ria', 'Tempor' + [char]0xE1 + 'ria'),
    @('notifica' + $f, 'notifica' + [char]0xE7),
    @('Notifica' + $f, 'Notifica' + [char]0xE7),
    @('aprova' + $f, 'aprova' + [char]0xE7),
    @('Aprova' + $f, 'Aprova' + [char]0xE7),
    @('exibi' + $f, 'exibi' + [char]0xE7),
    @('Exibi' + $f, 'Exibi' + [char]0xE7),
    @('destina' + $f, 'destina' + [char]0xE7),
    @('tambem', 'tamb' + [char]0xE9 + 'm'),
    @('sele' + $f, 'sele' + [char]0xE7),
    @(' ' + $f + 'nica', ' ' + [char]0xFA + 'nica'),
    @(' ' + $f + 'nico', ' ' + [char]0xFA + 'nico')
)

foreach ($file in $targetFiles) {
    if (-not (Test-Path $file)) { continue }
    $text = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $original = $text
    $count = 0
    
    foreach ($pair in $pairs) {
        while ($text.Contains($pair[0])) {
            $text = $text.Replace($pair[0], $pair[1])
            $count++
        }
    }
    
    $remaining = ($text.ToCharArray() | Where-Object { [int]$_ -eq 0xFFFD }).Count
    
    [System.IO.File]::WriteAllText($file, $text, [System.Text.Encoding]::UTF8)
    Write-Host "Fixed $count in $(Split-Path $file -Leaf) | $remaining U+FFFD remain"
    
    # List remaining broken lines if any
    if ($remaining -gt 0) {
        $lineNum = 0
        foreach ($line in ($text -split "`r?`n")) {
            $lineNum++
            if ($line.Contains([char]0xFFFD)) {
                $preview = $line.TrimStart()
                if ($preview.Length -gt 80) { $preview = $preview.Substring(0, 80) }
                Write-Host "  L$lineNum $preview"
            }
        }
    }
}
