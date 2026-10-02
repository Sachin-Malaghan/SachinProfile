"""Exports the portfolio into the repo: <repo>/site (the website, only files the page uses)
and <repo>/_source (Upwork covers, extra media, build tools). Usage: export_site.py <repo>"""
import os, re, shutil, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "portfolio")
REPO = sys.argv[1]
DST = os.path.join(REPO, "site")

HEAD = """<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Sachin: C++ and Unreal Engine developer. Three mobile games, a real-scale solar system simulator, automotive exploded views and an AI-run game studio.">
<meta property="og:title" content="Sachin's Portfolio">
<meta property="og:description" content="C++, Unreal Engine 5, mobile games and real-time 3D.">
<meta property="og:image" content="img/card_emberhome.jpg">
<link rel="icon" href="img/eh_icon.png">
<style>html,body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
"""

html = open(os.path.join(SRC, "index.html"), encoding="utf-8-sig").read()
full = HEAD + html
refs = sorted({m for m in re.findall(r'(?:src|poster|href|content)="([^"#:]+\.(?:jpg|png|mp4|js))"', full) if not m.startswith("http")})
missing = [r for r in refs if not os.path.exists(os.path.join(SRC, r))]
assert not missing, missing

# rebuild site/ from scratch so files the page no longer uses are dropped
if os.path.isdir(DST):
    shutil.rmtree(DST)
os.makedirs(DST)
open(os.path.join(DST, "index.html"), "w", encoding="utf-8", newline="\n").write(full)
for r in refs:
    os.makedirs(os.path.dirname(os.path.join(DST, r)) or DST, exist_ok=True)
    shutil.copy2(os.path.join(SRC, r), os.path.join(DST, r))

src_dir = os.path.join(REPO, "_source")
shutil.copytree(os.path.join(SRC, "thumbs"), os.path.join(src_dir, "upwork-covers"), dirs_exist_ok=True)
os.makedirs(os.path.join(src_dir, "videos"), exist_ok=True)
for f in os.listdir(os.path.join(SRC, "video")):
    if "video/" + f not in refs:
        shutil.copy2(os.path.join(SRC, "video", f), os.path.join(src_dir, "videos", f))
ignore = shutil.ignore_patterns("node_modules", "frames", "__pycache__", "package-lock.json")
shutil.copytree(os.path.join(ROOT, "tools"), os.path.join(src_dir, "tools"), ignore=ignore, dirs_exist_ok=True)

size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(DST) for f in fs)
print("site: %d files, %.1f MB" % (len(refs) + 1, size / 1e6))
