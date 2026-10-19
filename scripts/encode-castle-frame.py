"""Mechanical PNG-to-WebP encoding of generated RGBA frames; no retouching or resizing."""
import argparse
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source')
parser.add_argument('destination')
args = parser.parse_args()
with Image.open(args.source) as image:
    if image.mode != 'RGBA' or image.size != (1550, 1014):
        raise ValueError('Expected a full-resolution RGBA castle render')
    image.save(args.destination, 'WEBP', quality=88, method=6, exact=True)
