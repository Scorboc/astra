"""Web delivery encoding only; no resizing or artwork modification."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'public/universe/origin-detail'
with Image.open(root/'crystal-grain-v1.png') as im:
    im.save(root/'crystal-grain-v1.webp',quality=94,method=6)
    print(im.size,(root/'crystal-grain-v1.webp').stat().st_size)
