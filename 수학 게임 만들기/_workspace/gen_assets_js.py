import os, base64, json
GAME = os.environ["GAMEDIR"]
A = os.path.join(GAME, "assets")
types = ["atv", "super", "f1"]
out = {}
for t in types:
    arr = []
    for lv in range(1, 5):
        with open(os.path.join(A, f"{t}_{lv}.png"), "rb") as f:
            arr.append("data:image/png;base64," + base64.b64encode(f.read()).decode())
    out[t] = arr
js = ("// 자동 생성(_workspace/gen_assets_js.py): 차량 에셋 3종(atv/super/f1) x 4단계, rembg 투명 PNG\n"
      "export const CAR_IMAGES = " + json.dumps(out) + ";\n")
p = os.path.join(GAME, "carAssets.js")
with open(p, "w", encoding="utf-8") as f:
    f.write(js)
print("wrote carAssets.js", round(os.path.getsize(p) / 1024, 1), "KB")
