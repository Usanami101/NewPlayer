"""Generate professional NSIS installer bitmaps from the app icon."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
ICON = ROOT / "icon.png"
if not ICON.exists():
    ICON = ROOT.parent / "assets" / "icon.png"

def load_icon(size):
    im = Image.open(ICON).convert("RGBA")
    im = im.resize((size, size), Image.Resampling.LANCZOS)
    return im

def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def vertical_gradient(size, c1, c2):
    w, h = size
    base = Image.new("RGB", size, c1)
    top = Image.new("RGB", size, c2)
    mask = Image.new("L", size)
    md = ImageDraw.Draw(mask)
    for y in range(h):
        md.line([(0, y), (w, y)], fill=int(255 * y / max(1, h - 1)))
    return Image.composite(top, base, mask)

def make_sidebar():
    # NSIS MUI2 sidebar: 164 x 314
    w, h = 164, 314
    img = vertical_gradient((w, h), (18, 10, 14), (8, 8, 10))
    d = ImageDraw.Draw(img, "RGBA")
    # soft glow
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([20, 40, 144, 180], fill=(255, 0, 51, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img.convert("RGBA"), glow)

    icon = load_icon(72)
    img.paste(icon, ((w - 72) // 2, 70), icon)

    d = ImageDraw.Draw(img)
    d.text((w // 2, 168), "NewPlayer", fill=(255, 255, 255, 240), font=font(20, True), anchor="mt")
    d.text((w // 2, 194), "Tube · TV · Radio", fill=(200, 200, 210, 220), font=font(11), anchor="mt")
    d.text((w // 2, 212), "Weather · News", fill=(160, 160, 170, 200), font=font(11), anchor="mt")
    d.text((w // 2, 280), "v2.0", fill=(120, 120, 130, 180), font=font(11), anchor="mt")

    out = ROOT / "installerSidebar.bmp"
    img.convert("RGB").save(out, "BMP")
    print("wrote", out)

    # uninstaller uses same sidebar
    img.convert("RGB").save(ROOT / "uninstallerSidebar.bmp", "BMP")
    print("wrote uninstallerSidebar.bmp")

def make_header():
    # Classic header bitmap often 150x57
    w, h = 150, 57
    img = vertical_gradient((w, h), (28, 12, 16), (12, 12, 14))
    icon = load_icon(36)
    img = img.convert("RGBA")
    img.paste(icon, (10, (h - 36) // 2), icon)
    d = ImageDraw.Draw(img)
    d.text((54, h // 2 - 8), "NewPlayer Setup", fill=(255, 255, 255), font=font(13, True))
    d.text((54, h // 2 + 10), "Install wizard", fill=(180, 180, 190), font=font(10))
    out = ROOT / "installerHeader.bmp"
    img.convert("RGB").save(out, "BMP")
    print("wrote", out)

if __name__ == "__main__":
    make_sidebar()
    make_header()
