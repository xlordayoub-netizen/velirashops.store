# Génère une mire de netteté 3000x3000 (traits fins + texte) pour tester
# la chaîne d'images : tout flou devient immédiatement visible.
Add-Type -AssemblyName System.Drawing

$S = 3000
$out = Join-Path $env:TEMP 'velira-test-3000.jpg'

$bmp = New-Object System.Drawing.Bitmap($S, $S)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::White)

$ink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(17,17,17))
$penThin = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(17,17,17), 2)
$penMed  = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(17,17,17), 6)

# Cercles concentriques fins (révèlent le moindre rééchantillonnage)
for ($r = 200; $r -lt 1400; $r += 60) {
  $g.DrawEllipse($penThin, [float](1500-$r), [float](1500-$r), [float](2*$r), [float](2*$r))
}
# Mire de lignes fines 1px alternées
for ($x = 300; $x -lt 900; $x += 6) {
  $g.DrawLine($penThin, [float]$x, 2050, [float]$x, 2500)
}
# Rayons
for ($k = 0; $k -lt 36; $k++) {
  $a = $k * 10 * [Math]::PI / 180
  $g.DrawLine($penMed, [float](1500 + 1420*[Math]::Sin($a)), [float](1500 - 1420*[Math]::Cos($a)),
                        [float](1500 + 1480*[Math]::Sin($a)), [float](1500 - 1480*[Math]::Cos($a)))
}
# Texte de contrôle à plusieurs tailles
$f1 = New-Object System.Drawing.Font('Georgia', 180, [System.Drawing.GraphicsUnit]::Pixel)
$f2 = New-Object System.Drawing.Font('Segoe UI', 60, [System.Drawing.GraphicsUnit]::Pixel)
$f3 = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString('VELIRA', $f1, $ink, (New-Object System.Drawing.RectangleF(0,1380,$S,260)), $fmt)
$g.DrawString('TEST 3000 x 3000 - NETTETE', $f2, $ink, (New-Object System.Drawing.RectangleF(0,1680,$S,100)), $fmt)
$g.DrawString('Texte 24px : si ces lettres sont lisibles, la chaine est nette.', $f3, $ink, (New-Object System.Drawing.RectangleF(0,1820,$S,60)), $fmt)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95L)
$bmp.Save($out, $codec, $ep)
$g.Dispose(); $bmp.Dispose()

$fi = Get-Item $out
Write-Output ("{0}  {1}x{1}  {2} KB" -f $fi.FullName, $S, [math]::Round($fi.Length/1KB))
