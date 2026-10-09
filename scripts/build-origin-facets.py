"""Native 16K-equivalent tiled normal field, not enlarged colour artwork.
32 independently loadable 2048px data tiles. No change to the approved albedo.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math

OUT=Path(__file__).resolve().parents[1]/'public/universe/origin-detail'
OUT.mkdir(exist_ok=True)
SIZE=2048
CELLS=40
def rand(x,y,s=0):
    x=x%(8*CELLS)
    h=((x*374761393)^(y*668265263)^(s*2246822519))&0xffffffff
    h=((h^(h>>13))*1274126177)&0xffffffff
    return ((h^(h>>16))&0xffffffff)/4294967295
def point(x,y):
    return ((x+(rand(x,y,2)-.5)*.65)*SIZE/CELLS,(y+(rand(x,y,3)-.5)*.65)*SIZE/CELLS)
for ty in range(4):
    for tx in range(8):
        im=Image.new('RGB',(SIZE,SIZE),(128,128,255));draw=ImageDraw.Draw(im)
        for y in range(ty*CELLS-1,(ty+1)*CELLS+1):
            for x in range(tx*CELLS-1,(tx+1)*CELLS+1):
                p=[point(x,y),point(x+1,y),point(x+1,y+1),point(x,y+1)]
                p=[(px-tx*SIZE,py-ty*SIZE) for px,py in p]
                for k,indices in enumerate(((0,1,2),(0,2,3))):
                    nx=(rand(x,y,10+k*3)-.5)*.75
                    ny=(rand(x,y,11+k*3)-.5)*.75
                    nz=math.sqrt(1-nx*nx-ny*ny)
                    color=tuple(round((n*.5+.5)*255) for n in (nx,ny,nz))
                    draw.polygon([p[j] for j in indices],fill=color)
        im.save(OUT/f'{tx}-{ty}.webp',lossless=True,method=4)
    print(f'Latitude band {ty+1}/4',flush=True)
print('32 native 2048x2048 normal tiles; bytes:',sum(p.stat().st_size for p in OUT.glob('*.webp')))
