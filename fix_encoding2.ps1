param()
# Fix broken Portuguese chars stored as '?' in AdminPanel.tsx
# Also fix abbreviations like 'Pgto Avulso'

$file = "c:\Users\adria\Desktop\ALC - SEARA\components\AdminPanel.tsx"
$text = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$original = $text

# Apply ordered list of replacements (no duplicate keys)
$pairs = @(
    @('Ve?culo', 'Ve' + [char]0xED + 'culo'),
    @('ve?culo', 've' + [char]0xED + 'culo'),
    @('Ve?culos', 'Ve' + [char]0xED + 'culos'),
    @('ve?culos', 've' + [char]0xED + 'culos'),
    @('Tempor?ria', 'Tempor' + [char]0xE1 + 'ria'),
    @('tempor?ria', 'tempor' + [char]0xE1 + 'ria'),
    @('Tempor?rio', 'Tempor' + [char]0xE1 + 'rio'),
    @('Di?ria', 'Di' + [char]0xE1 + 'ria'),
    @('di?ria', 'di' + [char]0xE1 + 'ria'),
    @('Di?rias', 'Di' + [char]0xE1 + 'rias'),
    @('Di?rio', 'Di' + [char]0xE1 + 'rio'),
    @('Informa??es', 'Informa' + [char]0xE7 + [char]0xF5 + 'es'),
    @('informa??es', 'informa' + [char]0xE7 + [char]0xF5 + 'es'),
    @('Informa??o', 'Informa' + [char]0xE7 + [char]0xE3 + 'o'),
    @('informa??o', 'informa' + [char]0xE7 + [char]0xE3 + 'o'),
    @('solicita??es', 'solicita' + [char]0xE7 + [char]0xF5 + 'es'),
    @('Solicita??es', 'Solicita' + [char]0xE7 + [char]0xF5 + 'es'),
    @('Solicita??o', 'Solicita' + [char]0xE7 + [char]0xE3 + 'o'),
    @('solicita??o', 'solicita' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Opera??es', 'Opera' + [char]0xE7 + [char]0xF5 + 'es'),
    @('opera??es', 'opera' + [char]0xE7 + [char]0xF5 + 'es'),
    @('Opera??o', 'Opera' + [char]0xE7 + [char]0xE3 + 'o'),
    @('opera??o', 'opera' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Aten??o', 'Aten' + [char]0xE7 + [char]0xE3 + 'o'),
    @('aten??o', 'aten' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Solu??o', 'Solu' + [char]0xE7 + [char]0xE3 + 'o'),
    @('solu??o', 'solu' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Valida??o', 'Valida' + [char]0xE7 + [char]0xE3 + 'o'),
    @('valida??o', 'valida' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Altera??o', 'Altera' + [char]0xE7 + [char]0xE3 + 'o'),
    @('altera??o', 'altera' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Atualiza??o', 'Atualiza' + [char]0xE7 + [char]0xE3 + 'o'),
    @('atualiza??o', 'atualiza' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Finaliza??o', 'Finaliza' + [char]0xE7 + [char]0xE3 + 'o'),
    @('finaliza??o', 'finaliza' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Cria??o', 'Cria' + [char]0xE7 + [char]0xE3 + 'o'),
    @('cria??o', 'cria' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Descri??o', 'Descri' + [char]0xE7 + [char]0xE3 + 'o'),
    @('descri??o', 'descri' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Rela??o', 'Rela' + [char]0xE7 + [char]0xE3 + 'o'),
    @('rela??o', 'rela' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Exibi??o', 'Exibi' + [char]0xE7 + [char]0xE3 + 'o'),
    @('exibi??o', 'exibi' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Fun??es', 'Fun' + [char]0xE7 + [char]0xF5 + 'es'),
    @('fun??es', 'fun' + [char]0xE7 + [char]0xF5 + 'es'),
    @('Fun??o', 'Fun' + [char]0xE7 + [char]0xE3 + 'o'),
    @('fun??o', 'fun' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Configura??o', 'Configura' + [char]0xE7 + [char]0xE3 + 'o'),
    @('configura??o', 'configura' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Conclus?o', 'Conclus' + [char]0xE3 + 'o'),
    @('conclus?o', 'conclus' + [char]0xE3 + 'o'),
    @('Exclus?o', 'Exclus' + [char]0xE3 + 'o'),
    @('exclus?o', 'exclus' + [char]0xE3 + 'o'),
    @('Sess?o', 'Sess' + [char]0xE3 + 'o'),
    @('sess?o', 'sess' + [char]0xE3 + 'o'),
    @('Vers?o', 'Vers' + [char]0xE3 + 'o'),
    @('vers?o', 'vers' + [char]0xE3 + 'o'),
    @('Gest?o', 'Gest' + [char]0xE3 + 'o'),
    @('gest?o', 'gest' + [char]0xE3 + 'o'),
    @('Vis?o', 'Vis' + [char]0xE3 + 'o'),
    @('vis?o', 'vis' + [char]0xE3 + 'o'),
    @('Usu?rios', 'Usu' + [char]0xE1 + 'rios'),
    @('usu?rios', 'usu' + [char]0xE1 + 'rios'),
    @('Usu?rio', 'Usu' + [char]0xE1 + 'rio'),
    @('usu?rio', 'usu' + [char]0xE1 + 'rio'),
    @('Hist?rico', 'Hist' + [char]0xF3 + 'rico'),
    @('hist?rico', 'hist' + [char]0xF3 + 'rico'),
    @('Per?odo', 'Per' + [char]0xED + 'odo'),
    @('per?odo', 'per' + [char]0xED + 'odo'),
    @('obrigat?rio', 'obrigat' + [char]0xF3 + 'rio'),
    @('Obrigat?rio', 'Obrigat' + [char]0xF3 + 'rio'),
    @('necess?rio', 'necess' + [char]0xE1 + 'rio'),
    @('Necess?rio', 'Necess' + [char]0xE1 + 'rio'),
    @('?ltimo', [char]0xFA + 'ltimo'),
    @('?ltima', [char]0xFA + 'ltima'),
    @('c?digo', 'c' + [char]0xF3 + 'digo'),
    @('C?digo', 'C' + [char]0xF3 + 'digo'),
    @('n?mero', 'n' + [char]0xFA + 'mero'),
    @('N?mero', 'N' + [char]0xFA + 'mero'),
    @('tamb?m', 'tamb' + [char]0xE9 + 'm'),
    @('Tamb?m', 'Tamb' + [char]0xE9 + 'm'),
    @('m?dio', 'm' + [char]0xE9 + 'dio'),
    @('M?dio', 'M' + [char]0xE9 + 'dio'),
    @('m?ximo', 'm' + [char]0xE1 + 'ximo'),
    @('M?ximo', 'M' + [char]0xE1 + 'ximo'),
    @('m?nimo', 'm' + [char]0xED + 'nimo'),
    @('M?nimo', 'M' + [char]0xED + 'nimo'),
    @('pr?ximo', 'pr' + [char]0xF3 + 'ximo'),
    @('Pr?ximo', 'Pr' + [char]0xF3 + 'ximo'),
    @('n?o ', 'n' + [char]0xE3 + 'o '),
    @('N?o ', 'N' + [char]0xE3 + 'o '),
    @('j? ', 'j' + [char]0xE1 + ' '),
    @('J? ', 'J' + [char]0xE1 + ' '),
    @('ser? ', 'ser' + [char]0xE1 + ' '),
    @('Ser? ', 'Ser' + [char]0xE1 + ' '),
    @(' ? ', ' ' + [char]0xE9 + ' '),
    @('cen?rio', 'cen' + [char]0xE1 + 'rio'),
    @('Cen?rio', 'Cen' + [char]0xE1 + 'rio'),
    @('ocorr?ncia', 'ocorr' + [char]0xEA + 'ncia'),
    @('Ocorr?ncia', 'Ocorr' + [char]0xEA + 'ncia'),
    @('Pgto Avulso', 'Pagamento Avulso'),
    @('Destina??o', 'Destina' + [char]0xE7 + [char]0xE3 + 'o'),
    @('destina??o', 'destina' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Aprova??o', 'Aprova' + [char]0xE7 + [char]0xE3 + 'o'),
    @('aprova??o', 'aprova' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Notifica??o', 'Notifica' + [char]0xE7 + [char]0xE3 + 'o'),
    @('notifica??o', 'notifica' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Sele??o', 'Sele' + [char]0xE7 + [char]0xE3 + 'o'),
    @('sele??o', 'sele' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Declara??o', 'Declara' + [char]0xE7 + [char]0xE3 + 'o'),
    @('declara??o', 'declara' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Apura??o', 'Apura' + [char]0xE7 + [char]0xE3 + 'o'),
    @('apura??o', 'apura' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Lista??o', 'Lista' + [char]0xE7 + [char]0xE3 + 'o'),
    @('lista??o', 'lista' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Contrata??o', 'Contrata' + [char]0xE7 + [char]0xE3 + 'o'),
    @('contrata??o', 'contrata' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Pagamento\n', 'Pagamento' + "`n"),
    @('rota??o', 'rota' + [char]0xE7 + [char]0xE3 + 'o'),
    @('Rota??o', 'Rota' + [char]0xE7 + [char]0xE3 + 'o'),
    @('?nico', [char]0xFA + 'nico'),
    @('?nica', [char]0xFA + 'nica'),
    @('m?s ', 'm' + [char]0xEA + 's '),
    @('M?s ', 'M' + [char]0xEA + 's ')
)

$count = 0
foreach ($pair in $pairs) {
    while ($text.Contains($pair[0])) {
        $text = $text.Replace($pair[0], $pair[1])
        $count++
    }
}

# Report any remaining lines with ? between letters (possible broken chars)
$suspiciousLines = @()
$lines = $text -split "`r?`n"
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '[a-zA-Z]\?[a-zA-Z]') {
        $suspiciousLines += "$($i+1): $($lines[$i].TrimStart().Substring(0, [Math]::Min($lines[$i].TrimStart().Length, 100)))"
    }
}

[System.IO.File]::WriteAllText($file, $text, [System.Text.Encoding]::UTF8)
Write-Host "Done: $count replacements applied"
if ($suspiciousLines.Count -gt 0) {
    Write-Host "Remaining suspicious lines ($($suspiciousLines.Count)):"
    $suspiciousLines | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
}
else {
    Write-Host "No remaining suspicious chars found."
}
