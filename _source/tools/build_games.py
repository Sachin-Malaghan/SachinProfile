"""Images, videos and covers for EMBERHOME, ECHOES, CURIO ISLES, Shunya Studio AI and the AstroVerse Odyssey update."""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "portfolio")
F = r"C:\Windows\Fonts"
font = lambda n, s: ImageFont.truetype(os.path.join(F, n), s)
DISPLAY, BODY, BODY_B, MONO = "bahnschrift.ttf", "segoeui.ttf", "segoeuib.ttf", "consola.ttf"
INK, AMBER, PAPER, MUTED = (10, 14, 26), (255, 176, 72), (236, 240, 248), (150, 162, 188)

EH = r"C:\SACHIN\Hollowlight\Build\Android\PlayStore"
EC = r"C:\SACHIN\Echoes\Build\Android\PlayStore"
ECS = r"C:\SACHIN\Echoes\Saved\Screenshots\WindowsEditor"
CI = r"C:\SACHIN\CurioIsles\Saved\Screenshots\WindowsEditor"
AV = r"C:\SACHIN\VR\AstroVerse\Saved"
L = lambda p: Image.open(p).convert("RGB")

def save(im, rel, q=84, maxw=1600):
    im = im.convert("RGB"); im.thumbnail((maxw, maxw))
    im.save(os.path.join(OUT, rel), "JPEG", quality=q, optimize=True, progressive=True)

def fit(im, w, h, cx=0.5, cy=0.5):
    return ImageOps.fit(im.convert("RGB"), (w, h), Image.LANCZOS, centering=(cx, cy))

# ------------------------------------------------------------------ images
EMBER = [("title", "screenshot-01-title.jpg"), ("wood", "screenshot-02-edge-of-the-wood.jpg"), ("touch", "screenshot-03-touch-controls.jpg"),
         ("stray", "screenshot-04-a-stray.jpg"), ("warehouse", "screenshot-05-the-warehouse.jpg"), ("sidings", "screenshot-06-sidings.jpg"),
         ("mountain", "screenshot-07-the-mountain.jpg"), ("home", "screenshot-08-homecoming.jpg")]
for n, f in EMBER: save(L(os.path.join(EH, f)), f"img/eh_{n}.jpg")
save(L(os.path.join(EH, "feature-graphic-1024x500.png")), "img/eh_feature.jpg", 88)
L(os.path.join(EH, "icon-512.png")).save(os.path.join(OUT, "img", "eh_icon.png"))

ECHO = [("title", "screenshot-01-title.jpg"), ("first", "screenshot-02-first-step.jpg"), ("touch", "screenshot-03-touch-controls.jpg"),
        ("stone", "screenshot-04-stepping-stone.jpg"), ("clockwork", "screenshot-05-clockwork.jpg"), ("hotwire", "screenshot-06-hot-wire.jpg"),
        ("assembly", "screenshot-07-assembly-line.jpg"), ("core", "screenshot-08-the-core.jpg")]
for n, f in ECHO: save(L(os.path.join(EC, f)), f"img/ec_{n}.jpg")
save(L(os.path.join(ECS, "Echoes_desktop_11_l1_rewind.png")), "img/ec_rewind.jpg")
save(L(os.path.join(ECS, "Echoes_desktop_40_paradox.png")), "img/ec_paradox.jpg")
save(L(os.path.join(EC, "feature-graphic-1024x500.png")), "img/ec_feature.jpg", 88)
L(os.path.join(EC, "icon-512.png")).save(os.path.join(OUT, "img", "ec_icon.png"))

CURIO = [("title", "01_title"), ("levels", "02_levels"), ("sliders", "11_first_roll_sliders"), ("rolling", "12_first_roll_rolling"),
         ("student", "16_student_solved"), ("splash", "21_brake_splash"), ("brake", "23_brake_stopped_student"), ("canyon", "31_canyon_flight")]
for n, f in CURIO: save(L(os.path.join(CI, f"CurioIsles_phone_{f}.png")), f"img/ci_{n}.jpg", 88)

for n, i in (("approach", 9), ("docked", 10), ("orbit", 12), ("ring", 11)):
    save(L(AV + r"\Screenshots\WindowsEditor\ScreenShot%05d.png" % i), f"img/av_odyssey_{n}.jpg")

# ------------------------------------------------------------------ covers (4:3) and cards (16:9)
def gradient_mask(w, h, start=0.38):
    m = Image.new("L", (w, h), 0); d = ImageDraw.Draw(m)
    for y in range(h):
        t = (y / h - start) / (1 - start)
        d.line([(0, y), (w, y)], fill=int(max(0, min(1, t)) ** 0.8 * 240))
    return m

def cover(bg, kicker, title, sub, tags, rel, accent=AMBER, tfont=DISPLAY):
    W, H = 1600, 1200
    im = fit(bg, W, H, 0.5, 0.3)
    im = Image.composite(Image.new("RGB", (W, H), (4, 6, 12)), im, gradient_mask(W, H))
    d = ImageDraw.Draw(im)
    d.text((80, 720), kicker, font=font(DISPLAY, 34), fill=accent)
    d.text((76, 770), title, font=font(tfont, 104), fill=PAPER)
    d.text((80, 900), sub, font=font(BODY, 38), fill=(205, 212, 228))
    x, f = 80, font(BODY_B, 28)
    for t in tags:
        tw = d.textlength(t, font=f)
        d.rounded_rectangle([x, 990, x + tw + 32, 1040], 25, outline=accent, width=2)
        d.text((x + 16, 997), t, font=f, fill=PAPER); x += tw + 48
    im.save(os.path.join(OUT, rel), "JPEG", quality=88, optimize=True)

cover(L(os.path.join(EH, "screenshot-04-a-stray.jpg")), "MOBILE GAME  /  UNREAL ENGINE 5  /  C++", "EMBERHOME",
      "A child, a lantern and a stray dog. 11 levels on Android, iOS and PC",
      ["Unreal Engine 5", "C++", "Android + iOS", "Procedural art and audio"], "thumbs/cover_emberhome.jpg", tfont="constan.ttf")
cover(L(os.path.join(EC, "screenshot-07-assembly-line.jpg")), "MOBILE GAME  /  UNREAL ENGINE 5  /  C++", "ECHOES",
      "A time-loop puzzle platformer: your past selves are your team",
      ["20 levels", "Deterministic replay", "Synthesised music", "Android first"], "thumbs/cover_echoes.jpg", accent=(90, 220, 235))
cover(L(os.path.join(CI, "CurioIsles_phone_01_title.png")), "EDUCATIONAL GAME  /  UNREAL ENGINE 5  /  C++", "Curio Isles",
      "Fix broken machines with real physics. In development",
      ["Deterministic physics", "JSON levels", "Auto-solver", "Student mode"], "thumbs/cover_curioisles.jpg", accent=(255, 200, 90))

def eng_card(title, kicker, sub, layers, stats, rel, accent):
    W, H = 1600, 1200
    im = Image.new("RGB", (W, H), (9, 13, 26)); d = ImageDraw.Draw(im)
    for x in range(0, W, 40): d.line([(x, 0), (x, H)], fill=(18, 25, 46))
    for y in range(0, H, 40): d.line([(0, y), (W, y)], fill=(18, 25, 46))
    d.text((80, 70), kicker, font=font(DISPLAY, 32), fill=accent)
    d.text((76, 112), title, font=font(DISPLAY, 104), fill=PAPER)
    d.text((80, 250), sub, font=font(BODY, 36), fill=(200, 208, 226))
    # pipeline as a chain of boxes
    x, y = 80, 350
    fl = font(BODY_B, 26)
    for i, name in enumerate(layers):
        tw = d.textlength(name, font=fl)
        if x + tw + 60 > W - 80: x, y = 80, y + 96
        d.rounded_rectangle([x, y, x + tw + 44, y + 64], 12, fill=(22, 32, 60), outline=accent, width=2)
        d.text((x + 22, y + 15), name, font=fl, fill=PAPER)
        x += tw + 44
        if i < len(layers) - 1:
            d.line([(x + 8, y + 32), (x + 34, y + 32)], fill=accent, width=3)
            d.polygon([(x + 34, y + 24), (x + 46, y + 32), (x + 34, y + 40)], fill=accent)
            x += 56
    sy = y + 150
    for i, (big, small) in enumerate(stats):
        cx = 80 + i * 500
        d.text((cx, sy), big, font=font(DISPLAY, 96), fill=accent)
        d.multiline_text((cx + 4, sy + 112), small, font=font(BODY, 28), fill=(200, 208, 226), spacing=6)
    im.save(os.path.join(OUT, rel), "JPEG", quality=88, optimize=True)

eng_card("Shunya Studio AI", "AI AGENTS  /  PYTHON  /  UNREAL ENGINE", "A virtual game studio: AI employees build a real Unreal project",
         ["You", "Studio Director", "Producer", "Author", "Lead review", "Build", "QA", "You approve", "Merge"],
         [("47", "AI employee roles in\nnine departments"), ("40", "typed tools: git, compile,\ntests, assets. No shell"), ("33", "tasks in the scripted\nOrb Runner game build")],
         "thumbs/cover_shunya.jpg", (180, 150, 255))

for n in ("emberhome", "echoes", "curioisles", "shunya"):
    c = Image.open(os.path.join(OUT, f"thumbs/cover_{n}.jpg"))
    fit(c, 1200, 675, 0.5, 0.0 if n == "shunya" else 0.85).save(os.path.join(OUT, f"img/card_{n}.jpg"), "JPEG", quality=84)

# ------------------------------------------------------------------ videos
FF = imageio_ffmpeg.get_ffmpeg_exe()
VW, VH, FPS = 1280, 720, 30

def ken(im, t, zoom, focus):
    z = zoom[0] + (zoom[1] - zoom[0]) * t
    w, h = im.size; cw, ch = w / z, h / z
    x, y = (w - cw) * focus[0], (h - ch) * focus[1]
    return im.resize((VW, VH), Image.BILINEAR, box=(x, y, x + cw, y + ch))

def caption(fr, text, sub, accent):
    if not text: return fr
    ov = Image.new("RGBA", fr.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rectangle([0, VH - 112, VW, VH], fill=(5, 8, 16, 200))
    d.text((48, VH - 98), text, font=font(DISPLAY, 36), fill=PAPER + (255,))
    if sub: d.text((50, VH - 52), sub, font=font(BODY, 23), fill=accent + (255,))
    return Image.alpha_composite(fr.convert("RGBA"), ov).convert("RGB")

def render(shots, name, accent=AMBER, xfade=0.45):
    path = os.path.join(OUT, "video", name)
    p = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{VW}x{VH}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path], stdin=subprocess.PIPE)
    prev, nx = None, int(xfade * FPS)
    for idx, (im, secs, cap, sub) in enumerate(shots):
        im = fit(im, 1600, 900)
        n = int(secs * FPS)
        frames = [caption(ken(im, i / max(1, n - 1), (1.0, 1.07), (0.5, 0.45)), cap, sub, accent) for i in range(n)]
        if prev:
            for i in range(nx): frames[i] = Image.blend(prev[i], frames[i], (i + 1) / (nx + 1))
        last = idx == len(shots) - 1
        for fr in (frames if last else frames[:-nx]): p.stdin.write(fr.tobytes())
        prev = None if last else frames[-nx:]
    p.stdin.close(); p.wait()
    print(name, os.path.getsize(path) // 1024, "KB")

e = lambda f: L(os.path.join(EH, f))
render([(e("screenshot-01-title.jpg"), 2.2, "EMBERHOME", "Unreal Engine 5, C++. Android, iOS and Windows"),
        (e("screenshot-02-edge-of-the-wood.jpg"), 2.2, "Eleven handcrafted levels", "Every tree, raindrop and sound is generated in code"),
        (e("screenshot-04-a-stray.jpg"), 2.2, "A stray dog joins you", "It warns of traps, holds plates and fits through gaps"),
        (e("screenshot-05-the-warehouse.jpg"), 2.2, "Puzzles to think about", "Levers, pressure plates, drawbridges, a crowbar to carry"),
        (e("screenshot-07-the-mountain.jpg"), 2.2, "Run, slide, vault, climb", "Deterministic physics shared by the game and its autopilot"),
        (e("screenshot-03-touch-controls.jpg"), 2.2, "Built for phones", "Large touch controls, keyboard and gamepad on PC"),
        (e("screenshot-08-homecoming.jpg"), 2.4, "Bring the light home", None)], "emberhome.mp4")
c = lambda f: L(os.path.join(EC, f))
render([(c("screenshot-01-title.jpg"), 2.2, "ECHOES", "You are your only teammate"),
        (L(os.path.join(ECS, "Echoes_desktop_11_l1_rewind.png")), 2.0, "Every level is a 10-second loop", "When it ends, your run replays as an Echo"),
        (c("screenshot-04-stepping-stone.jpg"), 2.2, "Stand on your past self", "Echoes press plates, hold doors and become steps"),
        (c("screenshot-05-clockwork.jpg"), 2.2, "Up to six Echoes at once", "Exact state replay at a fixed 50 Hz tick"),
        (c("screenshot-06-hot-wire.jpg"), 2.2, "Two worlds, 20 levels", "The Lab and the Factory"),
        (c("screenshot-07-assembly-line.jpg"), 2.2, "Lasers only an Echo can stop", "Music adds an instrument for every Echo you record"),
        (c("screenshot-08-the-core.jpg"), 2.4, "ECHOES", "Unreal Engine 5, C++. Android first")], "echoes.mp4", accent=(90, 220, 235))
k = lambda f: L(os.path.join(CI, f"CurioIsles_phone_{f}.png"))
render([(k("01_title"), 2.2, "CURIO ISLES", "Break it. Fix it. Understand it."),
        (k("11_first_roll_sliders"), 2.2, "Place parts, set real quantities", "Height, angle, speed and braking"),
        (k("12_first_roll_rolling"), 2.0, "Press play and watch it run", "Deterministic physics, identical on every device"),
        (k("16_student_solved"), 2.4, "Student mode shows the science", "Units, measurements and the formula worked through"),
        (k("21_brake_splash"), 2.0, "Failure is fun, not punishing", None),
        (k("31_canyon_flight"), 2.4, "In development", "Unreal Engine 5, C++. Levels are JSON, proven solvable by a solver")], "curioisles.mp4", accent=(255, 200, 90))
print("done")
