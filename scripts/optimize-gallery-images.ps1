param(
  [string]$GalleryPath = "assets/Gallery",
  [int]$MaxDimension = 1920,
  [int]$Quality = 80,
  [int]$MinBytes = 512KB
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName PresentationCore

$galleryRoot = Resolve-Path $GalleryPath
$files = Get-ChildItem $galleryRoot -File | Where-Object { $_.Extension -match '^\.(jpe?g)$' }

if (-not $files) {
  Write-Output "No JPEG files found in $galleryRoot."
  exit 0
}

$totalBefore = 0L
$totalAfter = 0L
$updated = 0
$skipped = 0

foreach ($file in $files) {
  $totalBefore += $file.Length

  $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
  $bitmap.BeginInit()
  $bitmap.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
  $bitmap.UriSource = [System.Uri]::new($file.FullName)
  $bitmap.EndInit()
  $bitmap.Freeze()

  $sourceWidth = $bitmap.PixelWidth
  $sourceHeight = $bitmap.PixelHeight
  $largestSide = [Math]::Max($sourceWidth, $sourceHeight)
  $scale = [Math]::Min(1.0, $MaxDimension / [double]$largestSide)
  $targetWidth = [Math]::Max(1, [int][Math]::Round($sourceWidth * $scale))
  $targetHeight = [Math]::Max(1, [int][Math]::Round($sourceHeight * $scale))

  if ($scale -ge 1.0 -and $file.Length -lt $MinBytes) {
    $totalAfter += $file.Length
    $skipped++
    continue
  }

  if ($scale -lt 1.0) {
    $transform = [System.Windows.Media.ScaleTransform]::new($scale, $scale)
    $frameSource = [System.Windows.Media.Imaging.TransformedBitmap]::new($bitmap, $transform)
  } else {
    $frameSource = $bitmap
  }

  $encoder = [System.Windows.Media.Imaging.JpegBitmapEncoder]::new()
  $encoder.QualityLevel = $Quality
  $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($frameSource))

  $tempPath = Join-Path $file.DirectoryName ([System.IO.Path]::GetRandomFileName() + $file.Extension)

  try {
    $stream = [System.IO.File]::Open($tempPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
      $encoder.Save($stream)
    } finally {
      $stream.Dispose()
    }

    $optimizedSize = (Get-Item $tempPath).Length

    $minimumSavings = [Math]::Max(4096, [int]($file.Length * 0.01))

    if (($file.Length - $optimizedSize) -gt $minimumSavings) {
      Move-Item $tempPath $file.FullName -Force
      $totalAfter += $optimizedSize
      $updated++
      Write-Output ("Optimized {0}: {1:N2} MB -> {2:N2} MB" -f $file.Name, ($file.Length / 1MB), ($optimizedSize / 1MB))
    } else {
      Remove-Item $tempPath -Force
      $totalAfter += $file.Length
      $skipped++
    }
  } catch {
    if (Test-Path $tempPath) {
      Remove-Item $tempPath -Force
    }
    throw
  }
}

$savedBytes = $totalBefore - $totalAfter
Write-Output ""
Write-Output ("Updated: {0}" -f $updated)
Write-Output ("Skipped: {0}" -f $skipped)
Write-Output ("Before: {0:N2} MB" -f ($totalBefore / 1MB))
Write-Output ("After: {0:N2} MB" -f ($totalAfter / 1MB))
Write-Output ("Saved: {0:N2} MB" -f ($savedBytes / 1MB))
