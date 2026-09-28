"""Copies the portfolio into a standalone, deploy-ready folder (GitHub Pages / any static host)."""
import os, shutil, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "portfolio")
DST = sys.argv[1]

HEAD = """<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Sachin: C++, Unreal Engine and game developer. Real-scale solar system simulation, automotive exploded views, custom engines and a playable HTML5 game.">
<meta property="og:title" content="Sachin's Portfolio">
<meta property="og:description" content="C++, Unreal Engine 5, real-time 3D and game development.">
<meta property="og:image" content="img/card_astroverse.jpg">
<link rel="icon" href="game/art/app_icon_512.png">
<style>html,body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
"""

os.makedirs(DST, exist_ok=True)
html = open(os.path.join(SRC, "index.html"), encoding="utf-8-sig").read()
open(os.path.join(DST, "index.html"), "w", encoding="utf-8", newline="\n").write(HEAD + html)

# site assets actually used by the page
for d in ("img", "video", "demo"):
    shutil.copytree(os.path.join(SRC, d), os.path.join(DST, d), dirs_exist_ok=True)
os.makedirs(os.path.join(DST, "game", "art"), exist_ok=True)
shutil.copy2(os.path.join(SRC, "game", "hollowlight.js"), os.path.join(DST, "game"))
for f in os.listdir(os.path.join(SRC, "game", "art")):
    if f.endswith(".jpg") or f in ("feature_graphic_1024x500.png", "app_icon_512.png"):
        shutil.copy2(os.path.join(SRC, "game", "art", f), os.path.join(DST, "game", "art", f))

# not published by GitHub Pages (underscore folders are skipped by Jekyll)
src_dir = os.path.join(DST, "_source")
shutil.copytree(os.path.join(SRC, "thumbs"), os.path.join(src_dir, "upwork-covers"), dirs_exist_ok=True)
for f in os.listdir(os.path.join(SRC, "game", "art")):
    if f.startswith("screen_") and f.endswith(".png"):
        os.makedirs(os.path.join(src_dir, "store-screenshots"), exist_ok=True)
        shutil.copy2(os.path.join(SRC, "game", "art", f), os.path.join(src_dir, "store-screenshots", f))
ignore = shutil.ignore_patterns("node_modules", "frames", "__pycache__", "package-lock.json")
shutil.copytree(os.path.join(ROOT, "tools"), os.path.join(src_dir, "tools"), ignore=ignore, dirs_exist_ok=True)

open(os.path.join(DST, ".gitignore"), "w").write("node_modules/\n_source/tools/frames/\n__pycache__/\n")
total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(DST) if ".git" not in dp for f in fs)
print("exported to", DST, "%.1f MB" % (total / 1e6))
