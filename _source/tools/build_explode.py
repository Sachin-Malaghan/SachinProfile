"""Assembles the exploded-view video and cover art from frames captured by tools/capture.html."""
import os, glob, subprocess
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
FR = os.path.join(HERE, "frames")
OUT = os.path.join(HERE, "..", "portfolio")
F = r"C:\Windows\Fonts"
font = lambda n, s: ImageFont.truetype(os.path.join(F, n), s)
PAPER, AMBER, MUTED = (236, 240, 248), (255, 176, 72), (150, 162, 188)

def lower_third(im, title, sub, a):
    if a <= 0: return im
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rectangle([0, 600, 1280, 720], fill=(5, 8, 16, int(190 * a)))
    d.text((48, 616), title, font=font("bahnschrift.ttf", 38), fill=PAPER + (int(255 * a),))
    d.text((50, 664), sub, font=font("segoeui.ttf", 24), fill=AMBER + (int(255 * a),))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")

frames = sorted(glob.glob(os.path.join(FR, "explode", "*.jpg")))
ff = imageio_ffmpeg.get_ffmpeg_exe()
out = os.path.join(OUT, "video", "explode_view.mp4")
p = subprocess.Popen([ff, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1280x720", "-r", "30", "-i", "-",
                      "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
for i, f in enumerate(frames):
    t = i / 30
    im = Image.open(f).convert("RGB")
    if t < 3.4:
        a = min(1, t / 0.4, (3.4 - t) / 0.4)
        im = lower_third(im, "Exploded view", "14 parts separate in a staged, collision-free order", a)
    elif 4.0 < t < 6.3:
        a = min(1, (t - 4.0) / 0.4, (6.3 - t) / 0.4)
        im = lower_third(im, "Click any part", "Pistons and rods highlighted, with name and details", a)
    if t < 0.3:
        im = Image.blend(Image.new("RGB", im.size), im, t / 0.3)
    p.stdin.write(im.tobytes())
p.stdin.close(); p.wait()
print("video", os.path.getsize(out) // 1024, "KB")

# covers
ex = Image.open(os.path.join(FR, "still_exploded", "00000.jpg")).convert("RGB")
cal = Image.open(os.path.join(FR, "still_caliper", "00000.jpg")).convert("RGB")
asm = Image.open(os.path.join(FR, "still_assembled", "00000.jpg")).convert("RGB")
for name, im in (("explode_exploded", ex), ("explode_caliper", cal), ("explode_assembled", asm)):
    im.save(os.path.join(OUT, "img", name + ".jpg"), quality=86, optimize=True, progressive=True)

W, H = 1600, 1200
cv = Image.new("RGB", (W, H), (12, 18, 34))
big = ex.resize((1600, 900), Image.LANCZOS)
cv.paste(big, (0, 40))
d = ImageDraw.Draw(cv, "RGBA")
for y in range(640, H):  # fade the image into the text area
    a = min(255, int((y - 640) / 260 * 255))
    d.line([(0, y), (W, y)], fill=(12, 18, 34, a))
d.text((80, 850), "AUTOMOTIVE  /  3D  /  CLIENT FEATURE", font=font("bahnschrift.ttf", 34), fill=AMBER)
d.text((76, 898), "Exploded view", font=font("bahnschrift.ttf", 104), fill=PAPER)
d.text((80, 1030), "Pull an engine apart and inspect every part", font=font("segoeui.ttf", 38), fill=(205, 212, 228))
x = 80
for tag in ["Staged animation", "Part picking", "Real-time 3D"]:
    f = font("segoeuib.ttf", 28); tw = d.textlength(tag, font=f)
    d.rounded_rectangle([x, 1100, x + tw + 32, 1150], 25, outline=AMBER, width=2)
    d.text((x + 16, 1107), tag, font=f, fill=PAPER); x += tw + 48
cv.save(os.path.join(OUT, "thumbs", "cover_explode.jpg"), quality=88, optimize=True)
Image.open(os.path.join(FR, "explode", "00000.jpg")).save(os.path.join(OUT, "img", "poster_explode.jpg"), quality=82)
print("done")
