from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'design/benchmark-origin/stone-albedo.png').convert('RGB')
source.thumbnail((1536,1536),Image.Resampling.LANCZOS)
source.save(root/'public/benchmark-origin/stone.webp','WEBP',quality=86,method=6)
print((root/'public/benchmark-origin/stone.webp').stat().st_size)
