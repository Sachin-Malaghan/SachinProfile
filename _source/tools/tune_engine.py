import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
f = os.path.join(ROOT, "portfolio", "demo", "explode.js")
src = open(f, encoding="utf-8").read()
for a, b in [
    # hex colours are sRGB; convert so they render as picked
    ("      return m;\n    }\n    var M = {", "      m.color.convertSRGBToLinear();\n      return m;\n    }\n    var M = {"),
    ("M.alu = mat(0x6d727a, 0.55, 0.5);", "M.alu = mat(0x9a9fa7, 0.6, 0.45);"),
    ("M.block = mat(0x4b5059, 0.45, 0.62);", "M.block = mat(0x767b84, 0.5, 0.55);"),
    ("M.crinkle = mat(0x6e0f08, 0.1, 0.7);", "M.crinkle = mat(0xa3180d, 0.15, 0.6);"),
    ("M.piston = mat(0x9ea3ab, 0.9, 0.32);", "M.piston = mat(0xc4c8cf, 0.9, 0.3);"),
    ("intake, new THREE.Vector3(0, -0.55, 1), 0.6, 0.06);", "intake, new THREE.Vector3(1, 0.15, 0.9), 0.62, 0.06);"),
    ("exh, new THREE.Vector3(0, -0.15, -1), 0.42, 0.06);", "exh, new THREE.Vector3(-0.6, 0.3, -1), 0.5, 0.06);"),
]:
    assert a in src, a
    src = src.replace(a, b)
open(f, "w", encoding="utf-8", newline="\n").write(src)
import shutil; shutil.rmtree(os.path.join(ROOT, "tools", "frames"), ignore_errors=True)
print("tuned")
