"""Builds portfolio images, Upwork cover thumbnails and showreel videos."""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "portfolio")
TMP = os.path.join(os.environ["TEMP"], "claude")
AV = r"C:\SACHIN\VR\AstroVerse\Saved"
SHOT = AV + r"\Screenshots\WindowsEditor\ScreenShot%05d.png"
ZOOM = AV + r"\tmp\zoom\ScreenShot%05d.png"
VEH = AV + r"\VehicleBuild\%s_side.png"
FONTS = r"C:\Windows\Fonts"
for d in ("img", "thumbs", "video"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

DISPLAY = "bahnschrift.ttf"
BODY = "segoeui.ttf"
BODY_B = "segoeuib.ttf"
MONO = "consola.ttf"

INK = (10, 14, 26)
AMBER = (255, 176, 72)
PAPER = (236, 240, 248)
MUTED = (150, 162, 188)

def fit(im, w, h, cx=0.5, cy=0.5):
    return ImageOps.fit(im.convert("RGB"), (w, h), Image.LANCZOS, centering=(cx, cy))

def save_jpg(im, rel, q=84):
    p = os.path.join(OUT, rel)
    im.convert("RGB").save(p, "JPEG", quality=q, optimize=True, progressive=True)
    return p

# ---------- 1. gallery images ----------
gallery = {
    "av_launch_sls_pad": SHOT % 0, "av_launch_sls_climb": SHOT % 1, "av_launch_sls_staging": SHOT % 2,
    "av_launch_hlvm3_pad": SHOT % 3, "av_launch_hlvm3_climb": SHOT % 4, "av_launch_hlvm3_orbit": SHOT % 5,
    "av_earth_approach": ZOOM % 1, "av_earth": ZOOM % 2, "av_earth_india": ZOOM % 3,
    "av_moon": ZOOM % 6, "av_moon_surface": ZOOM % 7, "av_mars": ZOOM % 9,
    "av_jupiter": ZOOM % 12, "av_orbits": ZOOM % 11, "av_sunpaths": AV + r"\tmp\site_sun.png",
}
for name, src in gallery.items():
    im = Image.open(src).convert("RGB")
    im.thumbnail((1600, 900), Image.LANCZOS)
    save_jpg(im, f"img/{name}.jpg")

# vehicle line-up: crop each render to content, same height, side by side
def crop_content(im):
    g = im.convert("L").point(lambda v: 255 if v > 18 else 0)
    return im.crop(g.getbbox())
vehicles = [("HLVM3", "HLVM3 / Gaganyaan"), ("SaturnV", "Saturn V"), ("Shuttle", "Space Shuttle"), ("SLS", "SLS Block 1")]
parts = [crop_content(Image.open(VEH % k).convert("RGB")) for k, _ in vehicles]
H = 620
parts = [p.resize((max(1, int(p.width * H / p.height)), H), Image.LANCZOS) for p in parts]
W = 1600
line = Image.new("RGB", (W, 900), INK)
d = ImageDraw.Draw(line)
slot = W // len(parts)
for i, (p, (_, label)) in enumerate(zip(parts, vehicles)):
    x = i * slot + (slot - p.width) // 2
    line.paste(p, (x, 110))
    f = font(BODY_B, 30)
    tw = d.textlength(label, font=f)
    d.text((i * slot + (slot - tw) / 2, 770), label, font=f, fill=PAPER)
d.text((60, 40), "LAUNCH VEHICLES - built from published dimensions and NASA 3D resources", font=font(DISPLAY, 30), fill=AMBER)
save_jpg(line, "img/av_vehicles.jpg")

arch = Image.open(os.path.join(TMP, "arch_raw.png")).convert("RGB").crop((8, 8, 1928, 1048))
rift = Image.open(os.path.join(TMP, "rift_raw.png")).convert("RGB").crop((8, 8, 1928, 1048))
a = arch.copy(); a.thumbnail((1600, 900)); save_jpg(a, "img/arch_editor.jpg")
r = rift.copy(); r.thumbnail((1600, 900)); save_jpg(r, "img/rift_editor.jpg")

# ---------- 2. Upwork / Fiverr cover thumbnails (4:3, 1600x1200) ----------
def gradient(w, h, top, bottom):
    g = Image.new("RGB", (w, h))
    dr = ImageDraw.Draw(g)
    for y in range(h):
        t = y / (h - 1)
        dr.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g

def chips(dr, x, y, items, f, maxw):
    for it in items:
        tw = dr.textlength(it, font=f)
        if x + tw + 36 > maxw:
            x, y = 80, y + 64
        dr.rounded_rectangle([x, y, x + tw + 32, y + 50], 25, outline=AMBER, width=2)
        dr.text((x + 16, y + 7), it, font=f, fill=PAPER)
        x += tw + 48
    return y

def cover(bg, kicker, title, sub, tags, rel):
    W, H = 1600, 1200
    im = bg.copy()
    shade = gradient(W, H, (0, 0, 0), (0, 0, 0))
    mask = gradient(W, H, (0, 0, 0), (255, 255, 255)).convert("L").point(lambda v: 0 if v < 90 else min(248, int((v - 90) * 1.9)))
    im = Image.composite(shade, im, mask)
    dr = ImageDraw.Draw(im)
    dr.text((80, 720), kicker, font=font(DISPLAY, 34), fill=AMBER)
    dr.text((76, 770), title, font=font(DISPLAY, 104), fill=PAPER)
    dr.text((80, 900), sub, font=font(BODY, 38), fill=(205, 212, 228))
    chips(dr, 80, 990, tags, font(BODY_B, 28), W - 60)
    save_jpg(im, rel, 88)

av_bg = fit(Image.open(ZOOM % 2), 1600, 1200, 0.5, 0.35)
cover(av_bg, "UNREAL ENGINE 5  /  C++  /  N-BODY PHYSICS", "AstroVerse",
      "A real-scale solar system you can fly, land on and launch from",
      ["Unreal Engine 5", "C++", "Custom HLSL", "VR / OpenXR", "Real NASA data"], "thumbs/cover_astroverse.jpg")

_ls = Image.open(SHOT % 1).convert("RGB")
_ls.paste(_ls.crop((0, 600, 620, 900)).filter(ImageFilter.GaussianBlur(40)), (0, 600))
launch_bg = fit(_ls, 1600, 1200, 0.5, 0.3)
cover(launch_bg, "ASTROVERSE  /  MISSION MODE", "Rocket launch sim",
      "SLS, Saturn V, Shuttle and Gaganyaan: ascent, staging, docking",
      ["Data-driven vehicles", "Gravity-turn ascent", "Blender pipeline"], "thumbs/cover_astroverse_missions.jpg")

sun_bg = fit(Image.open(AV + r"\tmp\site_sun.png"), 1600, 1200, 0.45, 0.4)
cover(sun_bg, "ASTROVERSE  /  SOLAR GEOMETRY", "Sun path at any site",
      "Validated against NOAA: worst error 0.05 deg elevation",
      ["Astronomy maths", "Real elevation data", "Architecture / vastu"], "thumbs/cover_astroverse_sun.jpg")

# ArchEngine: engineering-first card, editor as inset
def eng_card(title, kicker, sub, layers, stats, shot, rel, accent):
    W, H = 1600, 1200
    im = gradient(W, H, (14, 20, 38), (6, 9, 18))
    dr = ImageDraw.Draw(im)
    for x in range(0, W, 40):
        dr.line([(x, 0), (x, H)], fill=(20, 28, 50))
    for y in range(0, H, 40):
        dr.line([(0, y), (W, y)], fill=(20, 28, 50))
    dr.text((80, 70), kicker, font=font(DISPLAY, 32), fill=accent)
    dr.text((76, 112), title, font=font(DISPLAY, 110), fill=PAPER)
    dr.text((80, 250), sub, font=font(BODY, 36), fill=(200, 208, 226))
    # layer stack
    y = 340
    fl, fs = font(BODY_B, 30), font(MONO, 24)
    for name, detail in layers:
        dr.rounded_rectangle([80, y, 800, y + 104], 12, fill=(22, 32, 60), outline=accent, width=2)
        dr.text((108, y + 14), name, font=fl, fill=PAPER)
        dr.text((108, y + 58), detail, font=fs, fill=MUTED)
        y += 124
    # stats
    sy = 340
    for big, small in stats:
        dr.text((880, sy), big, font=font(DISPLAY, 76), fill=accent)
        dr.text((884, sy + 88), small, font=font(BODY, 28), fill=(200, 208, 226))
        sy += 150
    # editor inset
    ins = shot.copy(); ins.thumbnail((520, 293), Image.LANCZOS)
    ix, iy = W - ins.width - 70, H - ins.height - 70
    dr.rounded_rectangle([ix - 8, iy - 44, ix + ins.width + 8, iy + ins.height + 8], 10, fill=(30, 40, 70))
    dr.text((ix + 6, iy - 38), "in the editor", font=font(BODY, 24), fill=MUTED)
    im.paste(ins, (ix, iy))
    save_jpg(im, rel, 88)

eng_card("ArchEngine", "C++17  /  OPENGL 4.6  /  PLUGIN ARCHITECTURE",
         "Structural analysis and 3D editor for buildings",
         [("Editor", "ImGui docking UI, gizmos, REPL console"),
          ("Plugins (DLLs)", "FEM solver, renderer, export, scripting"),
          ("Core", "event bus, service locator, allocators"),
          ("SDK", "pure interfaces, Result<T>, Handle<Tag>")],
         [("8", "hot-loaded plugin DLLs"), ("25+", "scripting APIs, REPL + CI automation"), ("4", "export formats: DXF SVG PDF IFC")],
         arch, "thumbs/cover_archengine.jpg", (110, 190, 255))

eng_card("RiftCore", "C++  /  CUSTOM GAME ENGINE  /  CMAKE",
         "Modular game engine built from scratch",
         [("Editor", "ImGui HUD, selection, transform gizmos"),
          ("Renderer", "OpenGL 4.6, Blinn-Phong, OBJ + MTL"),
          ("ECS + JobSystem", "component pools, 19-worker thread pool"),
          ("Core", "logger, event bus, memory, plugin manager")],
         [("DLL", "every system is a runtime-loaded module"), ("19", "worker threads, ParallelFor"), ("60 fps", "stable on Quadro M4000")],
         rift, "thumbs/cover_riftcore.jpg", (120, 230, 170))

# web hero / card crops (16:9) from covers
for n in ("astroverse", "archengine", "riftcore"):
    c = Image.open(os.path.join(OUT, f"thumbs/cover_{n}.jpg"))
    save_jpg(fit(c, 1200, 675, 0.5, 0.0 if n != "astroverse" else 0.8), f"img/card_{n}.jpg")

# ---------- 3. videos ----------
FF = imageio_ffmpeg.get_ffmpeg_exe()
VW, VH, FPS = 1280, 720, 30

def ken(im, t, zoom=(1.0, 1.1), focus=(0.5, 0.5)):
    z = zoom[0] + (zoom[1] - zoom[0]) * t
    w, h = im.size
    cw, ch = w / z, h / z
    x = (w - cw) * focus[0]; y = (h - ch) * focus[1]
    return im.resize((VW, VH), Image.BILINEAR, box=(x, y, x + cw, y + ch))

def caption(fr, text, sub=None):
    if not text:
        return fr
    fr = fr.copy()
    ov = Image.new("RGBA", fr.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rectangle([0, VH - 120, VW, VH], fill=(5, 8, 16, 190))
    d.text((48, VH - 104), text, font=font(DISPLAY, 38), fill=PAPER + (255,))
    if sub:
        d.text((50, VH - 56), sub, font=font(BODY, 24), fill=AMBER + (255,))
    return Image.alpha_composite(fr.convert("RGBA"), ov).convert("RGB")

def title_card(title, sub, bg=None):
    base = fit(bg, VW, VH).filter(ImageFilter.GaussianBlur(14)) if bg else Image.new("RGB", (VW, VH), INK)
    base = Image.blend(base, Image.new("RGB", (VW, VH), INK), 0.6)
    d = ImageDraw.Draw(base)
    f1, f2 = font(DISPLAY, 76), font(BODY, 30)
    d.text(((VW - d.textlength(title, font=f1)) / 2, VH / 2 - 70), title, font=f1, fill=PAPER)
    d.text(((VW - d.textlength(sub, font=f2)) / 2, VH / 2 + 30), sub, font=f2, fill=AMBER)
    return base

def render(shots, path, xfade=0.5):
    """shots: list of (PIL image, seconds, caption, sub, zoom, focus)"""
    p = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{VW}x{VH}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "24",
                          "-pix_fmt", "yuv420p", "-movflags", "+faststart", path], stdin=subprocess.PIPE)
    prev_tail = None
    nx = int(xfade * FPS)
    for idx, (im, secs, cap, sub, zoom, focus) in enumerate(shots):
        n = int(secs * FPS)
        frames = []
        for i in range(n):
            t = i / max(1, n - 1)
            fr = ken(im, t, zoom, focus) if zoom else fit(im, VW, VH)
            frames.append(caption(fr, cap, sub))
        if prev_tail:
            for i in range(nx):
                frames[i] = Image.blend(prev_tail[i], frames[i], (i + 1) / (nx + 1))
        last = idx == len(shots) - 1
        body = frames if last else frames[:-nx]
        for fr in body:
            p.stdin.write(fr.tobytes())
        prev_tail = None if last else frames[-nx:]
    # fade out
    p.stdin.close(); p.wait()
    print("wrote", path, os.path.getsize(path) // 1024, "KB")

L = lambda s: Image.open(s).convert("RGB")
Z = (1.0, 1.08)
launch = [
    (L(SHOT % 0), 3.2, "SLS Block 1 / Orion", "Launch Complex 39B, Kennedy Space Center", Z, (0.5, 0.45)),
    (L(SHOT % 1), 2.8, "Liftoff: four RS-25 engines, two solid boosters", "Real gravity-turn ascent profile", Z, (0.5, 0.35)),
    (L(SHOT % 2), 2.8, "Booster separation", "Parts separate at their real times", Z, (0.55, 0.4)),
    (L(SHOT % 3), 3.0, "HLVM3 / Gaganyaan", "Second Launch Pad, Sriharikota", Z, (0.5, 0.45)),
    (L(SHOT % 4), 2.8, "Both S200 boosters burning", None, Z, (0.5, 0.4)),
    (L(SHOT % 5), 3.2, "Climbing to a 200 km orbit", "Autopilot or hand-flown docking", Z, (0.5, 0.5)),
]
flyby = [
    (L(ZOOM % 0), 2.2, "Earth from deep space", "True physical scale: size and distance share one factor", (1.0, 1.25), (0.5, 0.5)),
    (L(ZOOM % 1), 2.4, None, None, (1.0, 1.2), (0.52, 0.45)),
    (L(ZOOM % 2), 3.0, "Earth", "8K textures, atmospheric scattering, custom HLSL", Z, (0.5, 0.5)),
    (L(ZOOM % 3), 3.0, "Down to the surface", "NOAA ETOPO elevation data", Z, (0.5, 0.5)),
    (L(ZOOM % 6), 3.0, "The Moon", "LRO LOLA elevation, 474 m per pixel", Z, (0.5, 0.5)),
    (L(ZOOM % 7), 2.6, None, None, Z, (0.5, 0.5)),
    (L(ZOOM % 9), 3.0, "Mars", "MGS MOLA elevation data", Z, (0.5, 0.5)),
    (L(ZOOM % 12), 3.0, "Jupiter's cloud tops", "Full N-body gravity, symplectic integrator", Z, (0.5, 0.5)),
    (L(ZOOM % 11), 2.8, "Every orbit, live", "Planets, dwarf planets, 21 moons, 33,000 small bodies", Z, (0.5, 0.5)),
]
render(launch, os.path.join(OUT, "video/astroverse_launch.mp4"))
render(flyby, os.path.join(OUT, "video/astroverse_flyby.mp4"))

reel = ([(title_card("AstroVerse", "Unreal Engine 5  /  C++  /  real-scale solar system", L(ZOOM % 2)), 2.6, None, None, None, None)]
        + flyby[2:5] + [flyby[6], flyby[7]] + launch[1:3] + launch[4:6]
        + [(L(AV + r"\tmp\site_sun.png"), 3.0, "Sun paths at any site on any planet", "Validated against NOAA: 0.05 deg worst error", Z, (0.4, 0.5)),
           (L(os.path.join(OUT, "img/av_vehicles.jpg")), 3.0, None, None, Z, (0.5, 0.5)),
           (title_card("ArchEngine", "C++17  /  OpenGL 4.6  /  FEM structural analysis"), 2.0, None, None, None, None),
           (L(os.path.join(OUT, "thumbs/cover_archengine.jpg")), 3.2, None, None, (1.0, 1.06), (0.3, 0.3)),
           (title_card("RiftCore", "Modular C++ game engine, built from scratch"), 2.0, None, None, None, None),
           (L(os.path.join(OUT, "thumbs/cover_riftcore.jpg")), 3.2, None, None, (1.0, 1.06), (0.3, 0.3)),
           (title_card("Sachin", "C++  /  Unreal Engine  /  3D simulation  -  available for contract work"), 3.0, None, None, None, None)])
render(reel, os.path.join(OUT, "video/showreel.mp4"))

# poster frames for the video tags
for n, src in (("launch", SHOT % 1), ("flyby", ZOOM % 2), ("showreel", ZOOM % 6)):
    save_jpg(fit(L(src), 1280, 720), f"img/poster_{n}.jpg", 80)
print("done")




