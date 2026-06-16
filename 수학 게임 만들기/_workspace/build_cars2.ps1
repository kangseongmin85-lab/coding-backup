# 차량 12장: 테두리 플러드필로 체커보드 배경 제거 + 크롭 + 리사이즈 -> assets2/<type>_<lv>.png (테스트)
$GAME = $env:GAMEDIR
$ASSETS = Join-Path $GAME "assets2"
if (-not (Test-Path $ASSETS)) { New-Item -ItemType Directory -Path $ASSETS | Out-Null }

$cs = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class CarProc {
  public static string Run(string src, string outp, int maxW, int grayTol){
    using(var img = Image.FromFile(src))
    using(var bmp = new Bitmap(img.Width, img.Height, PixelFormat.Format32bppArgb)){
      using(var g = Graphics.FromImage(bmp)) g.DrawImage(img,0,0,img.Width,img.Height);
      int w=bmp.Width, h=bmp.Height;
      var rect=new Rectangle(0,0,w,h);
      var bd=bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride=bd.Stride; byte[] px=new byte[stride*h];
      Marshal.Copy(bd.Scan0, px, 0, px.Length);
      bool[] bg=new bool[w*h];
      var q=new Queue<int>();
      // grayish = neutral color (low saturation)
      // seed all border pixels that are grayish
      for(int x=0;x<w;x++){ TrySeed(px,stride,bg,q,x,0,grayTol,w); TrySeed(px,stride,bg,q,x,h-1,grayTol,w); }
      for(int y=0;y<h;y++){ TrySeed(px,stride,bg,q,0,y,grayTol,w); TrySeed(px,stride,bg,q,w-1,y,grayTol,w); }
      while(q.Count>0){
        int p=q.Dequeue(); int y=p/w, x=p-y*w;
        if(x>0)   TrySeed(px,stride,bg,q,x-1,y,grayTol,w);
        if(x<w-1) TrySeed(px,stride,bg,q,x+1,y,grayTol,w);
        if(y>0)   TrySeed(px,stride,bg,q,x,y-1,grayTol,w);
        if(y<h-1) TrySeed(px,stride,bg,q,x,y+1,grayTol,w);
      }
      // apply transparency
      for(int yy=0; yy<h; yy++){ int row=yy*stride; for(int xx=0; xx<w; xx++){ if(bg[yy*w+xx]) px[row+xx*4+3]=0; } }
      // bbox of remaining (A>40)
      int minX=w,minY=h,maxX=0,maxY=0; bool found=false;
      for(int yy=0; yy<h; yy++){ int row=yy*stride; for(int xx=0; xx<w; xx++){ if(px[row+xx*4+3]>40){ found=true; if(xx<minX)minX=xx; if(xx>maxX)maxX=xx; if(yy<minY)minY=yy; if(yy>maxY)maxY=yy; } } }
      Marshal.Copy(px,0,bd.Scan0,px.Length); bmp.UnlockBits(bd);
      if(!found){ minX=0;minY=0;maxX=w-1;maxY=h-1; }
      int pad=6; minX=Math.Max(0,minX-pad); minY=Math.Max(0,minY-pad); maxX=Math.Min(w-1,maxX+pad); maxY=Math.Min(h-1,maxY+pad);
      int cw=maxX-minX+1, ch=maxY-minY+1;
      double scale=Math.Min(1.0,(double)maxW/cw);
      int tw=(int)Math.Round(cw*scale), th=(int)Math.Round(ch*scale);
      using(var outb=new Bitmap(tw,th,PixelFormat.Format32bppArgb))
      using(var g2=Graphics.FromImage(outb)){
        g2.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        g2.PixelOffsetMode=System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
        g2.DrawImage(bmp, new Rectangle(0,0,tw,th), minX,minY,cw,ch, GraphicsUnit.Pixel);
        outb.Save(outp, ImageFormat.Png);
      }
      return tw+"x"+th;
    }
  }
  static void TrySeed(byte[] px,int stride,bool[] bg,Queue<int> q,int x,int y,int grayTol,int w){
    int idx=y*w+x; if(bg[idx]) return;
    int i=y*stride+x*4; int b=px[i],gg=px[i+1],r=px[i+2];
    int mx=Math.Max(r,Math.Max(gg,b)), mn=Math.Min(r,Math.Min(gg,b));
    if((mx-mn)<=grayTol){ bg[idx]=true; q.Enqueue(idx); }
  }
}
"@
Add-Type -TypeDefinition $cs -ReferencedAssemblies System.Drawing

$sets = @(
  @{ type="atv";   files=@("v2_awi-f6762c29d87752dd.jpg","Gemini_Generated_Image_24x82z24x82z24x8.png","Gemini_Generated_Image_24x82z24x82z24x8 (1).png","Gemini_Generated_Image_24x82z24x82z24x8 (2).png") },
  @{ type="super"; files=@("Gemini_Generated_Image_pyluqwpyluqwpylu.png","Gemini_Generated_Image_u0pe0gu0pe0gu0pe.png","Gemini_Generated_Image_iy7vhpiy7vhpiy7v.png","Gemini_Generated_Image_fd89f1fd89f1fd89.png") },
  @{ type="f1";    files=@("Gemini_Generated_Image_b3uc1rb3uc1rb3uc.png","Gemini_Generated_Image_ct4hm1ct4hm1ct4h.png","Gemini_Generated_Image_do0h3do0h3do0h3d.png","Gemini_Generated_Image_qhcpomqhcpomqhcp.png") }
)
foreach($s in $sets){
  for($lv=0;$lv -lt $s.files.Count;$lv++){
    $src=Join-Path $GAME $s.files[$lv]
    $outName="{0}_{1}.png" -f $s.type,($lv+1)
    $outPath=Join-Path $ASSETS $outName
    $dim=[CarProc]::Run($src,$outPath,460,32)
    $kb=[Math]::Round((Get-Item $outPath).Length/1KB,1)
    Write-Output ("{0,-10} {1,-10} {2} KB" -f $outName,$dim,$kb)
  }
}
Write-Output "DONE"
