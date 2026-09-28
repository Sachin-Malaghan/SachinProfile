import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
f = os.path.join(ROOT, "portfolio", "demo", "explode.js")
src = open(f, encoding="utf-8").read()
engine = open(os.path.join(os.environ["TEMP"], "claude", "engine_parts.js"), encoding="utf-8").read()
s = src.index("    // tyre: lathe profile")
e = src.index("    // ------------------------------------------------------------ interaction")
src = src[:s] + engine + "\n" + src[e:]
for a, b in [
    ("/* Exploded-view demo: a generic wheel, brake and suspension corner built from", "/* Exploded-view demo: a generic inline-four engine built from"),
    ("floor.position.y = -0.47;", "floor.position.y = -0.86;"),
    ("grid.position.y = -0.469;", "grid.position.y = -0.859;"),
    ("camera.position.set(2.5, 1.45, 2.9);", "camera.position.set(2.2, 1.3, 2.6);"),
    ("controls.target.set(0.1, 0.38, 0);", "controls.target.set(0, 0.2, 0);"),
    ("var target0 = new THREE.Vector3(0.1, 0.38, 0);", "var target0 = new THREE.Vector3(0, 0.2, 0);"),
    ("    // axle runs along +X (outboard). Everything is built around that.\n", ""),
]:
    assert a in src, a
    src = src.replace(a, b)
open(f, "w", encoding="utf-8", newline="\n").write(src)

c = os.path.join(ROOT, "tools", "capture.html")
h = open(c, encoding="utf-8").read()
for a, b in [("demo.orbit(0.95 - t * 0.075, 3.8, 1.4 + Math.sin(t * 0.4) * 0.1);", "demo.orbit(0.9 - t * 0.075, 3.5, 1.25 + Math.sin(t * 0.4) * 0.1);"),
             ("demo.select(t > 4.2 && t < 6.2 ? 3 : -1);", "demo.select(t > 4.2 && t < 6.2 ? 9 : -1);")]:
    assert a in h, a
    h = h.replace(a, b)
open(c, "w", encoding="utf-8", newline="\n").write(h)

import shutil
shutil.rmtree(os.path.join(ROOT, "tools", "frames"), ignore_errors=True)
print("spliced")
