"""Native 8192x4096 spherical material, computed from seeded geological fields.
No source image enlargement. Only albedo: lighting/clouds remain live in WebGL.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'public' / 'universe'
preview_only='--preview-only' in sys.argv
W,H=(2048,1024) if preview_only else (8192,4096)
rng=np.random.default_rng(90210)
grid=rng.standard_normal((96,96,96)).astype('float32')
def noise(x,y,z,f,offset=0):
    coords=[x*f+31+offset,y*f+45+offset,z*f+27+offset]
    base=[np.floor(c).astype('int32') for c in coords]
    weights=[c-b for c,b in zip(coords,base)]
    weights=[t*t*(3-2*t) for t in weights]
    out=np.zeros_like(x)
    for a in (0,1):
        for b in (0,1):
            for c in (0,1):
                weight=(weights[0] if a else 1-weights[0])*(weights[1] if b else 1-weights[1])*(weights[2] if c else 1-weights[2])
                out+=grid[(base[0]+a)%96,(base[1]+b)%96,(base[2]+c)%96]*weight
    return out
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1)
    return t*t*(3-2*t)
def blend(a,b,t): return a*(1-t[...,None])+b*t[...,None]
atlas=np.empty((H,W,3),dtype=np.uint8)
longitude=np.linspace(0,2*np.pi,W,endpoint=True,dtype='float32')[None,:]
for row in range(0,H,64):
    latitude=np.linspace(0,np.pi,H,dtype='float32')[row:row+64,None]
    x=-np.cos(longitude)*np.sin(latitude);z=np.sin(longitude)*np.sin(latitude);y=np.broadcast_to(np.cos(latitude),x.shape)
    warp=noise(x,y,z,2.1)*.16
    xx=x+warp; yy=y+noise(x,y,z,2.1,14)*.16; zz=z+noise(x,y,z,2.1,29)*.16
    field=np.zeros_like(x);detail=np.zeros_like(x)
    for i in range(12):
        n=noise(xx,yy,zz,2.5*2**i, i*3)
        field+=n*(.51**i)
        if i>=3: detail+=(1-np.abs(np.tanh(n)))*(.64**(i-3))
    land=smooth(.04,.085,field)
    shelf=smooth(-.55,.04,field)
    sea=blend(np.array([3,19,38]),np.array([9,145,150]),shelf**1.8)
    veins=np.exp(-np.abs(noise(xx,yy,zz,48)+noise(xx,yy,zz,140)*.28)*65)
    rock=blend(np.array([43,53,60]),np.array([203,201,174]),smooth(.35,1.85,detail))
    mineral=smooth(.0,.85,noise(x,y,z,8,24))*.65
    rock=blend(rock,np.array([188,120,40]),mineral)
    rock=blend(rock,np.array([238,184,80]),veins*.68)
    coast=np.exp(-np.abs(field-.065)*48)*.72
    rgb=blend(sea,rock,land)
    rgb=blend(rgb,np.array([196,182,125]),coast)
    atlas[row:row+64]=np.clip(rgb,0,255).astype('uint8')
    if row%512==0: print(f'{row}/{H}',flush=True)
atlas[:,-1]=atlas[:,0]
im=Image.fromarray(atlas)
if not preview_only: im.save(OUT/'origin-8k.webp',quality=90,method=6)
im.resize((2048,1024),Image.Resampling.LANCZOS).save(OUT/'origin-preview.webp',quality=88,method=6)
print(f'Native atlas: {im.size}; preview_only={preview_only}',flush=True)
