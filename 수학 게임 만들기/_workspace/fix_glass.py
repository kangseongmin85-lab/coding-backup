import os, numpy as np
from PIL import Image
from scipy.ndimage import maximum_filter, binary_dilation, label

GAME = os.environ["GAMEDIR"]
A = os.path.join(GAME, "assets")

# 차체 내부의 체커(밝은+어두운 회색 교차) 영역 = 유리에 비친 배경 -> 틴티드 글래스로 칠함
for lv in range(1, 5):
    p = os.path.join(A, f"super_{lv}.png")
    im = Image.open(p).convert("RGBA")
    arr = np.asarray(im).astype(np.int16)
    r, g, b, al = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    gray = (mx - mn) <= 30
    bright = (r + g + b) / 3.0
    opaque = al > 20

    light = gray & opaque & (bright > 205)   # 흰 체커칸
    dark  = gray & opaque & (bright < 115)    # 어두운 체커칸
    size = 23
    checker = gray & opaque & maximum_filter(light, size=size) & maximum_filter(dark, size=size)

    # 큰 연결 덩어리(유리)만 남기고 휠 등 잡티 제거
    lbl, n = label(checker)
    keep = np.zeros_like(checker)
    for i in range(1, n + 1):
        comp = lbl == i
        if comp.sum() > 200:
            keep |= comp
    keep = binary_dilation(keep, iterations=2) & opaque

    out = np.asarray(im).copy()
    ys, xs = np.where(keep)
    if len(ys):
        ymin, ymax = ys.min(), ys.max()
        t = (ys - ymin) / max(1, (ymax - ymin))
        top = np.array([78, 90, 110]); bot = np.array([34, 40, 52])
        col = (top[None, :] * (1 - t)[:, None] + bot[None, :] * t[:, None]).astype(np.uint8)
        out[ys, xs, 0:3] = col
        out[ys, xs, 3] = 255
    Image.fromarray(out).save(p)
    print(f"super_{lv}: recolored {len(ys)} px")
print("DONE")
