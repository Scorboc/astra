"""Technical resize/encode only. Source images are generated UV maps."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'design' / 'universe-v5' / 'textures'
target = root / 'public' / 'universe'
target.mkdir(parents=True, exist_ok=True)
for name in ('origin', 'aurora', 'velir', 'nereya', 'solis'):
    with Image.open(source / f'{name}.png') as original:
        for width, suffix in ((1536, ''), (1024, '-mobile')):
            image = original.convert('RGB')
            image.thumbnail((width, width // 2), Image.Resampling.LANCZOS)
            path = target / f'{name}{suffix}.webp'
            image.save(path, 'WEBP', quality=88, method=6)
            print(path.name, image.size, path.stat().st_size)
