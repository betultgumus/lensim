"""Lensim uygulama ikonlarını üretir: assets/icon/icon.png ve foreground.png.

Çalıştırma: python3 tool/make_icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

BLUE = (62, 104, 184, 255)
WHITE = (255, 255, 255, 255)
OUT = Path(__file__).resolve().parent.parent / "assets" / "icon"


def bezier(p0, p1, p2, p3, n=80):
    pts = []
    for i in range(n + 1):
        t = i / n
        a = (1 - t) ** 3
        b = 3 * (1 - t) ** 2 * t
        c = 3 * (1 - t) * t ** 2
        d = t ** 3
        pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return pts


def meniscus(cx, cy, width):
    """Logodaki yandan görünen lens; viewBox 0 0 120 80 yolunun ölçeklenmiş hali."""
    s = width / 104.0
    ox = cx - 60 * s
    oy = cy - 44.5 * s

    def P(x, y):
        return (ox + x * s, oy + y * s)

    outer = bezier(P(8, 64), P(24, 12), P(96, 12), P(112, 64))
    inner = bezier(P(112, 64), P(94, 34), P(26, 34), P(8, 64))
    return outer + inner[1:]


def draw(size, bg, width_ratio, path):
    scale = 4
    big = size * scale
    img = Image.new("RGBA", (big, big), bg)
    d = ImageDraw.Draw(img)
    d.polygon(meniscus(big / 2, big / 2, big * width_ratio), fill=WHITE)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(path)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw(1024, BLUE, 0.62, OUT / "icon.png")
    draw(1024, (0, 0, 0, 0), 0.44, OUT / "foreground.png")
    print("ikonlar yazıldı:", OUT)


if __name__ == "__main__":
    main()
