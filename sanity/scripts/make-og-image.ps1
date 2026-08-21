# Génère images/og-cover.jpg — 1200x630.
# Le logo est COMPOSITÉ depuis le fichier source officiel
# (images/velira-primary-transparent.png) : aucun élément n'est redessiné.
# Seule la taille d'affichage change, en conservant le ratio 4:3 exact.
Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logoPath = Join-Path $root 'images\velira-primary-transparent.png'
$out      = Join-Path $root 'images\og-cover.jpg'

if (-not (Test-Path $logoPath)) { throw "Logo introuvable : $logoPath" }

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint  = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::White)

# Cadre fin
$penFrame = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(217,217,217), 2)
$g.DrawRectangle($penFrame, 40, 40, $W-80, $H-80)

# --- Logo source, ratio strictement conservé ---
$logo = [System.Drawing.Image]::FromFile($logoPath)
$srcRatio  = $logo.Width / $logo.Height          # 1600/1200 = 1.3333
$targetH   = 470.0
$targetW   = $targetH * $srcRatio                 # ratio d'origine préservé
$x = ($W - $targetW) / 2.0
$y = 55.0
$g.DrawImage($logo, [float]$x, [float]$y, [float]$targetW, [float]$targetH)
Write-Output ("logo composite : {0}x{1} -> {2}x{3} (ratio {4:N4} -> {5:N4})" -f `
  $logo.Width, $logo.Height, [int]$targetW, [int]$targetH, $srcRatio, ($targetW/$targetH))
$logo.Dispose()

# --- Tagline sous le logo (texte ajouté à côté du logo, pas dessus) ---
$tagline = 'Des montres essentielles, dessin' + [char]0xE9 + 'es pour durer.'
$fontTag = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.GraphicsUnit]::Pixel)
$brushInk = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(17,17,17))
$fmtC = New-Object System.Drawing.StringFormat
$fmtC.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString($tagline, $fontTag, $brushInk,
  (New-Object System.Drawing.RectangleF(100, 540, ($W-200), 50)), $fmtC)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 92L)
$bmp.Save($out, $codec, $ep)
$g.Dispose(); $bmp.Dispose()

$fi = Get-Item $out
Write-Output ("OK  {0}  {1}x{2}  {3} KB" -f $fi.FullName, $W, $H, [math]::Round($fi.Length/1KB))
