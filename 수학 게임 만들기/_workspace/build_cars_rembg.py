import os, io
from PIL import Image
from rembg import remove, new_session

GAME = os.environ["GAMEDIR"]
ASSETS = os.path.join(GAME, "assets")
os.makedirs(ASSETS, exist_ok=True)
MAXW = 460

sets = {
    "atv": [
        "v2_awi-f6762c29d87752dd.jpg",
        "Gemini_Generated_Image_24x82z24x82z24x8.png",
        "Gemini_Generated_Image_24x82z24x82z24x8 (1).png",
        "Gemini_Generated_Image_24x82z24x82z24x8 (2).png",
    ],
    "super": [
        "Gemini_Generated_Image_pyluqwpyluqwpylu.png",
        "Gemini_Generated_Image_u0pe0gu0pe0gu0pe.png",
        "Gemini_Generated_Image_iy7vhpiy7vhpiy7v.png",
        "Gemini_Generated_Image_fd89f1fd89f1fd89.png",
    ],
    "f1": [
        "Gemini_Generated_Image_b3uc1rb3uc1rb3uc.png",
        "Gemini_Generated_Image_ct4hm1ct4hm1ct4h.png",
        "Gemini_Generated_Image_do0h3do0h3do0h3d.png",
        "Gemini_Generated_Image_qhcpomqhcpomqhcp.png",
    ],
}

session = new_session("isnet-general-use")

for typ, files in sets.items():
    for lv, fn in enumerate(files, start=1):
        src = os.path.join(GAME, fn)
        inp = Image.open(src).convert("RGBA")
        out = remove(inp, session=session, post_process_mask=True)
        # crop to alpha bbox
        alpha = out.split()[3]
        bbox = alpha.getbbox()
        if bbox:
            l, t, r, b = bbox
            pad = 8
            l = max(0, l - pad); t = max(0, t - pad)
            r = min(out.width, r + pad); b = min(out.height, b + pad)
            out = out.crop((l, t, r, b))
        # resize to width MAXW (no upscale)
        if out.width > MAXW:
            th = round(out.height * MAXW / out.width)
            out = out.resize((MAXW, th), Image.LANCZOS)
        outp = os.path.join(ASSETS, f"{typ}_{lv}.png")
        out.save(outp)
        kb = os.path.getsize(outp) / 1024
        print(f"{typ}_{lv}.png  {out.width}x{out.height}  {kb:.1f} KB")
print("DONE")
