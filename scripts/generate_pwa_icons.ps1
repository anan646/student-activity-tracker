Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Lenovo\.gemini\antigravity\brain\fb681509-8d7c-4bf8-aa37-fcf2019f606b\.user_uploaded\media_1791955014391_2651f77a.jpg"
$currDir = (Get-Item -LiteralPath ".").FullName
$publicDir = Join-Path $currDir "public"
$appDir = Join-Path $currDir "src\app"

if (-not (Test-Path -LiteralPath $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

if (-not (Test-Path -LiteralPath $publicDir)) {
    New-Item -ItemType Directory -LiteralPath $publicDir -Force | Out-Null
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source Image Size: $($srcImage.Width) x $($srcImage.Height)"

# Copy original to public as edupass-logo.jpg
Copy-Item -LiteralPath $srcPath -Destination (Join-Path $publicDir "edupass-logo.jpg") -Force

function Generate-Icon {
    param(
        [int]$width,
        [int]$height,
        [string]$outputPath,
        [float]$paddingRatio = 0.0
    )
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Background white
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $graphics.FillRectangle($brush, 0, 0, $width, $height)

    # Draw image with padding
    $padX = [int]($width * $paddingRatio)
    $padY = [int]($height * $paddingRatio)
    $drawW = $width - (2 * $padX)
    $drawH = $height - (2 * $padY)

    $destRect = New-Object System.Drawing.Rectangle($padX, $padY, $drawW, $drawH)
    $graphics.DrawImage($srcImage, $destRect, 0, 0, $srcImage.Width, $srcImage.Height, [System.Drawing.GraphicsUnit]::Pixel)

    $graphics.Dispose()
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $outputPath ($width x $height)"
}

# 1. PWA Standard Icons
Generate-Icon 192 192 (Join-Path $publicDir "icon-192x192.png") 0.04
Generate-Icon 512 512 (Join-Path $publicDir "icon-512x512.png") 0.04

# 2. PWA Maskable Icons (Safe area has 12% padding)
Generate-Icon 192 192 (Join-Path $publicDir "icon-maskable-192x192.png") 0.12
Generate-Icon 512 512 (Join-Path $publicDir "icon-maskable-512x512.png") 0.12

# 3. Apple Touch Icon (iOS home screen)
Generate-Icon 180 180 (Join-Path $publicDir "apple-touch-icon.png") 0.05

# 4. Favicon PNG
Generate-Icon 32 32 (Join-Path $publicDir "favicon-32x32.png") 0.0
Generate-Icon 16 16 (Join-Path $publicDir "favicon-16x16.png") 0.0

# 5. Favicon ICO (Windows / Browser tab)
$icoBmp = New-Object System.Drawing.Bitmap(48, 48, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$icoGraphics = [System.Drawing.Graphics]::FromImage($icoBmp)
$icoGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$icoGraphics.DrawImage($srcImage, 0, 0, 48, 48)
$icoGraphics.Dispose()
$icoPath = Join-Path $publicDir "favicon.ico"
$appIcoPath = Join-Path $appDir "favicon.ico"

# Save as ICO (using Icon.FromHandle)
$hIcon = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
Copy-Item -LiteralPath $icoPath -Destination $appIcoPath -Force
$icoBmp.Dispose()

$srcImage.Dispose()
Write-Host "All PWA Icons generated successfully!"
