"""Technical encoding only: preserve full composition; no crop, painting or retouch."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
for name in ("origin", "galaxy", "surface", "galaxy-wide", "galaxy-mobile"):
    source = root / "design" / "cinematic-v4" / f"{name}.png"
    target = root / "public" / "space" / f"{name}.webp"
    with Image.open(source) as im:
        im.convert("RGB").save(target, "WEBP", quality=90, method=6)
    print(f"{name}: {target.stat().st_size:,} bytes")
