$files = @(
    "c:\Users\adria\Desktop\ALC - SEARA\components\AdminPanel.tsx",
    "c:\Users\adria\Desktop\ALC - SEARA\components\ManagerialDashboard.tsx",
    "c:\Users\adria\Desktop\ALC - SEARA\components\ClosureTable.tsx",
    "c:\Users\adria\Desktop\ALC - SEARA\components\UnloadingReimbursement.tsx",
    "c:\Users\adria\Desktop\ALC - SEARA\components\DriverPanel.tsx",
    "c:\Users\adria\Desktop\ALC - SEARA\App.tsx"
)

$f = [char]0xFFFD  # U+FFFD replacement character

$fixes = @(
    @{ old = "Di${f}ria";        new = "Di`u00e1ria" },
    @{ old = "di${f}ria";        new = "di`u00e1ria" },
    @{ old = "Di${f}rias";       new = "Di`u00e1rias" },
    @{ old = "di${f}rias";       new = "di`u00e1rias" },
    @{ old = "Gest${f}o";        new = "Gest`u00e3o" },
    @{ old = "gest${f}o";        new = "gest`u00e3o" },
    @{ old = "Vis${f}o";         new = "Vis`u00e3o" },
    @{ old = "vis${f}o";         new = "vis`u00e3o" },
    @{ old = "Usu${f}rios";      new = "Usu`u00e1rios" },
    @{ old = "usu${f}rios";      new = "usu`u00e1rios" },
    @{ old = "Usu${f}rio";       new = "Usu`u00e1rio" },
    @{ old = "usu${f}rio";       new = "usu`u00e1rio" },
    @{ old = "Hist${f}rico";     new = "Hist`u00f3rico" },
    @{ old = "hist${f}rico";     new = "hist`u00f3rico" },
    @{ old = "Per${f}odo";       new = "Per`u00edodo" },
    @{ old = "per${f}odo";       new = "per`u00edodo" },
    @{ old = "n${f}o ";          new = "n`u00e3o " },
    @{ old = "N${f}o ";          new = "N`u00e3o " },
    @{ old = ${f} + ${f} + "es"; new = "`u00e7`u00f5es" },
    @{ old = ${f} + ${f} + "o";  new = "`u00e7`u00e3o" },
    @{ old = "Informa${f}";      new = "Informa`u00e7" },
    @{ old = "opera${f}";        new = "opera`u00e7" },
    @{ old = "Opera${f}";        new = "Opera`u00e7" },
    @{ old = "aten${f}";         new = "aten`u00e7" },
    @{ old = "Aten${f}";         new = "Aten`u00e7" },
    @{ old = "solu${f}";         new = "solu`u00e7" },
    @{ old = "Solu${f}";         new = "Solu`u00e7" },
    @{ old = "cria${f}";         new = "cria`u00e7" },
    @{ old = "Cria${f}";         new = "Cria`u00e7" },
    @{ old = "altera${f}";       new = "altera`u00e7" },
    @{ old = "Altera${f}";       new = "Altera`u00e7" },
    @{ old = "atualiza${f}";     new = "atualiza`u00e7" },
    @{ old = "Atualiza${f}";     new = "Atualiza`u00e7" },
    @{ old = "finaliza${f}";     new = "finaliza`u00e7" },
    @{ old = "Finaliza${f}";     new = "Finaliza`u00e7" },
    @{ old = "valida${f}";       new = "valida`u00e7" },
    @{ old = "Valida${f}";       new = "Valida`u00e7" },
    @{ old = "descri${f}";       new = "descri`u00e7" },
    @{ old = "Descri${f}";       new = "Descri`u00e7" },
    @{ old = "rela${f}";         new = "rela`u00e7" },
    @{ old = "Rela${f}";         new = "Rela`u00e7" },
    @{ old = "exibi${f}";        new = "exibi`u00e7" },
    @{ old = "Exibi${f}";        new = "Exibi`u00e7" },
    @{ old = "fun${f}";          new = "fun`u00e7" },
    @{ old = "Fun${f}";          new = "Fun`u00e7" },
    @{ old = "conclus${f}";      new = "conclus`u00e3" },
    @{ old = "sess${f}o";        new = "sess`u00e3o" },
    @{ old = "vers${f}o";        new = "vers`u00e3o" },
    @{ old = "${f}ltimo";        new = "`u00faltimo" },
    @{ old = "${f}ltima";        new = "`u00faltima" },
    @{ old = "c${f}digo";        new = "c`u00f3digo" },
    @{ old = "C${f}digo";        new = "C`u00f3digo" },
    @{ old = "n${f}mero";        new = "n`u00famero" },
    @{ old = "N${f}mero";        new = "N`u00famero" },
    @{ old = "m${f}s ";          new = "m`u00eas " },
    @{ old = "M${f}s ";          new = "M`u00eas " },
    @{ old = "m${f}dio";         new = "m`u00e9dio" },
    @{ old = "M${f}dio";         new = "M`u00e9dio" },
    @{ old = "tamb${f}m";        new = "tamb`u00e9m" },
    @{ old = "Tamb${f}m";        new = "Tamb`u00e9m" },
    @{ old = "j${f} ";           new = "j`u00e1 " },
    @{ old = "J${f} ";           new = "J`u00e1 " },
    @{ old = "obrigat${f}rio";   new = "obrigat`u00f3rio" },
    @{ old = "Obrigat${f}rio";   new = "Obrigat`u00f3rio" },
    @{ old = "necess${f}rio";    new = "necess`u00e1rio" },
    @{ old = "Necess${f}rio";    new = "Necess`u00e1rio" },
    @{ old = "m${f}ximo";        new = "m`u00e1ximo" },
    @{ old = "M${f}ximo";        new = "M`u00e1ximo" },
    @{ old = "m${f}nimo";        new = "m`u00ednimo" },
    @{ old = "M${f}nimo";        new = "M`u00ednimo" },
    @{ old = "pr${f}ximo";       new = "pr`u00f3ximo" },
    @{ old = "Pr${f}ximo";       new = "Pr`u00f3ximo" },
    @{ old = "cen${f}rio";       new = "cen`u00e1rio" },
    @{ old = "Cen${f}rio";       new = "Cen`u00e1rio" },
    @{ old = "ocorr${f}ncia";    new = "ocorr`u00eancia" },
    @{ old = "Ocorr${f}ncia";    new = "Ocorr`u00eancia" },
    @{ old = "ser${f} ";         new = "ser`u00e1 " },
    @{ old = "Ser${f} ";         new = "Ser`u00e1 " },
    @{ old = " ${f} ";           new = " `u00e9 " },
    @{ old = "${f} obrigat";     new = "`u00e9 obrigat" },
    @{ old = "Pgto Avulso";      new = "Pagamento Avulso" }
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) { continue }
    $text = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $original = $text
    $count = 0
    foreach ($fix in $fixes) {
        $oldStr = $fix.old -replace '`u([0-9a-fA-F]{4})', { [char][convert]::ToInt32($_.Groups[1].Value, 16) }
        $newStr = $fix.new -replace '`u([0-9a-fA-F]{4})', { [char][convert]::ToInt32($_.Groups[1].Value, 16) }
        while ($text.Contains($oldStr)) {
            $text = $text.Replace($oldStr, $newStr)
            $count++
        }
    }
    $remaining = ($text.ToCharArray() | Where-Object { [int]$_ -eq 0xFFFD }).Count
    if ($text -ne $original) {
        [System.IO.File]::WriteAllText($file, $text, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed $count replacements in $(Split-Path $file -Leaf) | $remaining broken chars remain"
    } else {
        Write-Host "No changes: $(Split-Path $file -Leaf) | $remaining broken chars"
    }
}
