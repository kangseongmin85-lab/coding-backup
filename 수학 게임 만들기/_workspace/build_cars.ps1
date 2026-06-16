# 차량 12장(3종 x 4단계) 최적화: 리사이즈 + 투명여백 크롭 + JPG 흰배경 제거 -> assets/<type>_<lv>.png
Add-Type -AssemblyName System.Drawing

$GAME = "C:\Users\vamos\Desktop\코딩\수학 게임 만들기\자동차 게임"
$ASSETS = Join-Path $GAME "assets"
if (-not (Test-Path $ASSETS)) { New-Item -ItemType Directory -Path $ASSETS | Out-Null }

$MAXW = 460        # 최종 가로 폭(px)
$TOL  = 62.0       # JPG 흰배경 제거 색 거리 허용치

# 처리 순서 = 업그레이드 단계(0=기본 Lv1 ... 3=Lv4)
$sets = @(
  @{ type="atv";   files=@(
      @{f="v2_awi-f6762c29d87752dd.jpg"; key=$true},
      @{f="Gemini_Generated_Image_24x82z24x82z24x8.png"; key=$false},
      @{f="Gemini_Generated_Image_24x82z24x82z24x8 (1).png"; key=$false},
      @{f="Gemini_Generated_Image_24x82z24x82z24x8 (2).png"; key=$false}
  )},
  @{ type="super"; files=@(
      @{f="Gemini_Generated_Image_pyluqwpyluqwpylu.png"; key=$false},
      @{f="Gemini_Generated_Image_u0pe0gu0pe0gu0pe.png"; key=$false},
      @{f="Gemini_Generated_Image_iy7vhpiy7vhpiy7v.png"; key=$false},
      @{f="Gemini_Generated_Image_fd89f1fd89f1fd89.png"; key=$false}
  )},
  @{ type="f1";    files=@(
      @{f="Gemini_Generated_Image_b3uc1rb3uc1rb3uc.png"; key=$false},
      @{f="Gemini_Generated_Image_ct4hm1ct4hm1ct4h.png"; key=$false},
      @{f="Gemini_Generated_Image_do0h3do0h3do0h3d.png"; key=$false},
      @{f="Gemini_Generated_Image_qhcpomqhcpomqhcp.png"; key=$false}
  )}
)

function Process-One($srcPath, $doKey, $outPath) {
  $img = [System.Drawing.Image]::FromFile($srcPath)
  $w = $img.Width; $h = $img.Height
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose(); $img.Dispose()

  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $bd = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $bd.Stride
  $bytes = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0, $bytes, 0, $bytes.Length)

  # BGRA 순서. 흰배경 키잉(JPG 등 불투명 원본만)
  if ($doKey) {
    # 네 모서리 평균색 샘플
    $cs = @(@(0,0),@(($w-1),0),@(0,($h-1)),@(($w-1),($h-1)))
    $sb=0.0;$sg=0.0;$sr=0.0
    foreach($c in $cs){ $o=$c[1]*$stride + $c[0]*4; $sb+=$bytes[$o]; $sg+=$bytes[$o+1]; $sr+=$bytes[$o+2] }
    $kb=$sb/4; $kg=$sg/4; $kr=$sr/4
    for($i=0; $i -lt $bytes.Length; $i+=4){
      $db=$bytes[$i]-$kb; $dg=$bytes[$i+1]-$kg; $dr=$bytes[$i+2]-$kr
      if([Math]::Sqrt($db*$db+$dg*$dg+$dr*$dr) -lt $TOL){ $bytes[$i+3]=0 }
    }
  }

  # 알파 bbox (A>90: 옅은 그림자/헤일로 무시, 단단한 차체만)
  $minX=$w; $minY=$h; $maxX=0; $maxY=0; $found=$false
  for($y=0;$y -lt $h;$y++){
    $row=$y*$stride
    for($x=0;$x -lt $w;$x++){
      if($bytes[$row+$x*4+3] -gt 90){
        $found=$true
        if($x -lt $minX){$minX=$x}; if($x -gt $maxX){$maxX=$x}
        if($y -lt $minY){$minY=$y}; if($y -gt $maxY){$maxY=$y}
      }
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $bd.Scan0, $bytes.Length)
  $bmp.UnlockBits($bd)

  if(-not $found){ $minX=0;$minY=0;$maxX=$w-1;$maxY=$h-1 }
  $pad=6
  $minX=[Math]::Max(0,$minX-$pad); $minY=[Math]::Max(0,$minY-$pad)
  $maxX=[Math]::Min($w-1,$maxX+$pad); $maxY=[Math]::Min($h-1,$maxY+$pad)
  $cw=$maxX-$minX+1; $ch=$maxY-$minY+1

  # 리사이즈(가로 MAXW, 업스케일 금지)
  $scale=[Math]::Min(1.0, $MAXW/$cw)
  $tw=[int][Math]::Round($cw*$scale); $th=[int][Math]::Round($ch*$scale)
  $out = New-Object System.Drawing.Bitmap $tw, $th, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g2=[System.Drawing.Graphics]::FromImage($out)
  $g2.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $srcRect = New-Object System.Drawing.Rectangle $minX, $minY, $cw, $ch
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $tw, $th
  $g2.DrawImage($bmp, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g2.Dispose()
  $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose(); $bmp.Dispose()
  return "{0}x{1}" -f $tw, $th
}

foreach($s in $sets){
  for($lv=0; $lv -lt $s.files.Count; $lv++){
    $src = Join-Path $GAME $s.files[$lv].f
    $outName = "{0}_{1}.png" -f $s.type, ($lv+1)
    $outPath = Join-Path $ASSETS $outName
    $dim = Process-One $src $s.files[$lv].key $outPath
    $kb = [Math]::Round((Get-Item $outPath).Length/1KB,1)
    Write-Output ("{0,-10} <- {1,-46}  {2,-10} {3} KB" -f $outName, $s.files[$lv].f, $dim, $kb)
  }
}
Write-Output "DONE"
