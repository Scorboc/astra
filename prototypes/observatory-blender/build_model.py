"""Local authored architecture; no Tripo data or extracted model assets.
Run with Blender --background --python this-file. Blender Z-up -> glTF Y-up.
The silhouette follows approved 10/11 references; invisible sides are constructed.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector
from collections import defaultdict

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
parts = defaultdict(lambda: [[], []])
zone = 'architecture'

def mesh(mat, verts, faces):
    v, f = parts[mat]
    offset = len(v)
    # Reference-calibrated proportions, measured against abs.png:
    # spire base / height ~0.25, twin peak separation / height ~1.0.
    # This is actual geometry, not camera-dependent stretching in the browser.
    for x,y,z in verts:
        if zone != 'authored-spire':
            x *= 1.5
        if zone == 'bridge' and y < -4.05:
            x *= 1 + min(1,(-y-4.05)/12.95)*.9
            y = -4.05 + (y+4.05)*2.4
        v.append((x,y,z))
    f.extend([tuple(offset + i for i in face) for face in faces])

def rod(mat, a, b, radius=.035, sides=6):
    a, b = Vector(a), Vector(b)
    d = (b-a).normalized()
    u = d.cross(Vector((0, 0, 1)))
    if u.length < .01:
        u = d.cross(Vector((0, 1, 0)))
    u.normalize()
    w = d.cross(u).normalized()
    verts = [tuple(p + radius*(math.cos(i*math.tau/sides)*u + math.sin(i*math.tau/sides)*w)) for p in (a,b) for i in range(sides)]
    faces = [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    faces.extend([tuple(reversed(range(sides))),tuple(range(sides,sides*2))])
    mesh(mat,verts,faces)

def line(mat, points, radius=.03, sides=6):
    for a,b in zip(points,points[1:]): rod(mat,a,b,radius,sides)

def box(mat, x,y,z, sx,sy,sz):
    verts=[(x+a*sx/2,y+b*sy/2,z+c*sz/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    mesh(mat,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

def ellipse(mat, rx,ry,z, radius=.04, cx=0,cy=0, n=96):
    line(mat,[(cx+rx*math.cos(i*math.tau/n),cy+ry*math.sin(i*math.tau/n),z) for i in range(n+1)],radius)

def disc(mat,rx,ry,z,thick,cx=0,cy=0,n=64):
    verts=[(cx+rx*math.cos(i*math.tau/n),cy+ry*math.sin(i*math.tau/n),zz) for zz in (z-thick,z) for i in range(n)]
    mesh(mat,verts,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]+[tuple(reversed(range(n))),tuple(range(n,n*2))])

# Materials are portable PBR defaults. The browser adds environment and refraction.
spec={
 'Titanium':((.045,.065,.10,1),.86,.20),
 'Champagne':((.53,.43,.29,1),.88,.24),
 'Silver':((.64,.77,.86,1),.94,.16),
 'Ice':((.22,.54,.83,1),.08,.11),
 'IcePale':((.58,.80,.95,1),.08,.10),
 'Glazing':((.32,.57,.73,.3),.14,.09),
 'Floor':((.075,.13,.19,1),.90,.13),
 'WarmLight':((1,.70,.32,1),0,.3),
 'IceLight':((.48,.83,1,1),0,.3),
}

# Floating foundation: no terrain pedestal; the cloud is a separate visual layer.
disc('Titanium',6.7,4.7,.22,.42)
disc('Floor',6.45,4.48,.28,.08)
ellipse('Silver',6.65,4.65,.22,.07)
ellipse('WarmLight',6.3,4.38,.32,.018)
for side in (-1,1):
    disc('Titanium',2.12,2.15,.21,.36,side*8,0,48)
    ellipse('Silver',2.1,2.12,.26,.06,side*8,0,64)
    box('Titanium',side*6.6,0,.0,3,3.7,.3)
    for y in (-1.6,1.6):
        line('Champagne',[(side*5.2,y,.18),(side*6.4,y,-.65),(side*8,y,-1.0),(side*9.3,y,.18)],.08)

# Twin asymmetric-bladed spires. Serrations are modeled fins, not displacement.
# Narrow upper profiles and deliberate blade tips preserve the reference silhouette.
zone='authored-spire'
for side in (-1,1):
    # Pixel-landmark trace of the LEFT spire in owner's abs.png (1092x702).
    # Reflect at the central axis for its twin. The traced profile has a nearly
    # straight inner edge, wide splayed foot and inward-leaning needle tip.
    def point(x,pixel_y,depth=0):
        return ((x-573)*21.5/560*(-side),depth,(575-pixel_y)*21.5/560+.25)
    outline=[(169,315,568),(201,314,455),(230,312,350),(252,308,240),(270,304,170),(283,298,85),(290,290.04,15)]
    rings=[]
    for left,right,pixel_y in outline:
        d=max(.008,(pixel_y-15)/553*1.2)
        mid=left*.40+right*.60
        rings.append([point(left,pixel_y,0),point(mid,pixel_y,-d),point(right,pixel_y,-d*.25),point(right-.06*(right-left),pixel_y,d*.65),point(left+.40*(right-left),pixel_y,d)])
    for k in range(len(rings)-1):
        for j in range(5):
            a,b,c,d=rings[k][j],rings[k][(j+1)%5],rings[k+1][(j+1)%5],rings[k+1][j]
            mat='IcePale' if j==2 and k%3==0 else 'Ice'
            mesh(mat,[a,b,c,d],[(0,1,2),(0,2,3)])
    for j in (0,1,2,4):line('Silver',[r[j] for r in rings],.018)
    panels=[[(216,377),(239,302),(246,230),(279,180),(289,248),(265,328),(248,407)],
            [(194,564),(217,451),(272,362),(281,423),(262,492),(257,565)],
            [(269,565),(270,469),(296,513),(312,566)],
            [(282,252),(284,228),(308,222),(296,248)]]
    for panel in panels:
        # The dark armor follows the spire, rather than sticking out as branches.
        pts=[point(x,y,-max(.01,(y-15)/553*1.2)-.09) for x,y in panel]
        center=tuple(sum(p[i] for p in pts)/len(pts) for i in range(3))
        center=(center[0],center[1]-.075,center[2])
        mesh('Titanium',pts+[center],[(i,(i+1)%len(pts),len(pts)) for i in range(len(pts))])
        line('Champagne',pts+[pts[0]],.030)
        # Inset glints and reinforcing ridges on the broad armor plates.
        for i in (0,2):
            if i<len(pts):rod('Silver',pts[i],center,.016)
    for offset in (0,5,10):
        line('Champagne',[point(191+offset,564,-1.33),point(231+offset,431,-1.08),point(266+offset,356,-.87)],.018)

# Main glazed pavilion: one true elliptical hemisphere, all ribs on its surface.
zone='architecture'
rx,ry,h,wall=6.05,4.10,4.35,1.0
n,rows=48,12
verts=[]
for r in range(rows+1):
    e=r/rows*math.pi/2
    for i in range(n+1):
        a=i/n*math.tau
        verts.append((rx*math.cos(a)*math.cos(e),ry*math.sin(a)*math.cos(e),wall+h*math.sin(e)))
faces=[]
for r in range(rows):
    for i in range(n):
        q=r*(n+1)+i
        faces.append((q,q+1,q+n+2,q+n+1))
mesh('Glazing',verts,faces)
# The reference has a NARROW tall central barrel, not an arch across the
# whole dome. Its upright spring and raised roof are actual 3D geometry.
for yy in (-3.73,-3.51):
    pts=[(2.5*math.cos(i*math.pi/32),yy,2.60+2.43*math.sin(i*math.pi/32)) for i in range(33)]
    line('Titanium',pts,.12)
    line('Champagne',[(x,y-.10,z) for x,y,z in pts],.035)
    for side in (-1,1):
        rod('Titanium',(side*2.5,yy,.28),(side*2.5,yy,2.60),.12)
        rod('Champagne',(side*2.5,yy-.1,.28),(side*2.5,yy-.1,2.60),.035)
for j in range(32):
    a,b=j*math.pi/32,(j+1)*math.pi/32
    mesh('Glazing',[(2.5*math.cos(t),yy,2.6+2.43*math.sin(t)) for yy,t in [(-3.76,a),(-3.76,b),(-.8,b),(-.8,a)]],[(0,1,2,3)])
    if j%4==0:rod('Champagne',(2.5*math.cos(a),-3.76,2.6+2.43*math.sin(a)),(2.5*math.cos(a),-.8,2.6+2.43*math.sin(a)),.028)
for side in (-1,1):mesh('Glazing',[(side*2.5,-3.76,.28),(side*2.5,-.8,.28),(side*2.5,-.8,2.6),(side*2.5,-3.76,2.6)],[(0,1,2,3)])
for i in range(32):
    a=i/32*math.tau
    p=[(rx*math.cos(a)*math.cos(j/24*math.pi/2),ry*math.sin(a)*math.cos(j/24*math.pi/2),wall+h*math.sin(j/24*math.pi/2)) for j in range(25)]
    # Keep the pointed entrance unobstructed by the central meridian.
    line('Champagne' if i%4 else 'Titanium',[v for v in p if i!=24 or v[2]>3.92],.027 if i%4 else .060)
    if i!=24:rod('Silver',(rx*math.cos(a),ry*math.sin(a),.3),p[0],.03)
for e in (.13,.32,.52,.75,.98):
    ellipse('Champagne',rx*math.cos(e),ry*math.cos(e),wall+h*math.sin(e),.022)
ellipse('Titanium',rx,ry,wall,.08)
ellipse('WarmLight',rx-.18,ry-.18,.41,.018)
for i in range(48):
    a,b=i/48*math.tau,(i+1)/48*math.tau
    mesh('Glazing',[(rx*math.cos(a),ry*math.sin(a),.3),(rx*math.cos(b),ry*math.sin(b),.3),(rx*math.cos(b),ry*math.sin(b),wall),(rx*math.cos(a),ry*math.sin(a),wall)],[(0,1,2,3)])
# Small crown dome, separated by a polished circular band.
crx,cry=2.52,1.92
disc('Titanium',crx,cry,5.02,.14)
ellipse('Champagne',crx,cry,5.06,.055)
for j in range(16):
    a=j/16*math.tau;b=(j+1)/16*math.tau
    p=[];q=[]
    for k in range(9):
        e=k/8*math.pi/2
        p.append((crx*math.cos(a)*math.cos(e),cry*math.sin(a)*math.cos(e),5.05+1.05*math.sin(e)))
        q.append((crx*math.cos(b)*math.cos(e),cry*math.sin(b)*math.cos(e),5.05+1.05*math.sin(e)))
    line('Silver',p,.021)
    for k in range(8): mesh('Glazing',[p[k],q[k],q[k+1],p[k+1]],[(0,1,2,3)])
# Tall pointed entrance; no substitute round doorway.
for side in (-1,1):
    pts=[(side*.91,-4.08,.3),(side*.91,-4.04,2.7),(side*.68,-3.98,3.28),(0,-3.9,3.91)]
    line('Champagne',pts,.052)
    line('WarmLight',[(x*.94,y+.06,z) for x,y,z in pts],.012)
for i in range(12):
    a=i/12*math.tau
    if abs(math.sin(a)+1)<.1:continue
    rod('Titanium',(4.7*math.cos(a),3.0*math.sin(a),.3),(4.7*math.cos(a),3.0*math.sin(a),3.10),.06)
    rod('WarmLight',(4.66*math.cos(a),2.96*math.sin(a),.4),(4.66*math.cos(a),2.96*math.sin(a),2.75),.014)
ellipse('Champagne',3.7,2.5,2.9,.024)
ellipse('WarmLight',3.7,2.5,2.87,.009)
disc('Titanium',.65,.65,.65,.35)
ellipse('IceLight',.66,.66,.69,.015)

# Mirror bridge and structurally supported balustrades.
zone='bridge'
box('Titanium',0,-10.4,.05,3.4,13.1,.24)
box('Floor',0,-10.4,.19,3.22,13.1,.04)
for side in (-1,1):
    rod('Silver',(side*1.7,-17,.21),(side*1.7,-4.05,.21),.055)
    rod('Champagne',(side*1.6,-17,1.0),(side*1.6,-4.05,1.0),.043)
    rod('WarmLight',(side*1.55,-17,.75),(side*1.55,-4.05,.75),.019)
    for j in range(14):
        y=-4.1-j*.96
        rod('Silver',(side*1.59,y,.25),(side*1.59,y,1.0),.024)
    mesh('Glazing',[(side*1.61,-17,.28),(side*1.61,-4.05,.28),(side*1.61,-4.05,.92),(side*1.61,-17,.92)],[(0,1,2,3)])
for j in range(24):box('Champagne',0,-4.15-j*.54,.219,3.15,.008,.003)
for x in (-.81,0,.81):box('Silver',x,-10.4,.222,.008,13,.003)
for j in range(4):box('Silver',0,-4.1-j*.28,.26-j*.014,2.8,.24,.05)
zone='architecture'
for j in range(52):
    a=j/52*math.tau
    if math.sin(a)<-.93:continue
    x,y=6.60*math.cos(a),4.62*math.sin(a)
    rod('Champagne',(x,y,.23),(x,y,.89),.023)
for j in range(96):
    a,b=j*math.tau/96,(j+1)*math.tau/96
    if math.sin((a+b)/2)<-.93:continue
    rod('Champagne',(6.6*math.cos(a),4.62*math.sin(a),.9),(6.6*math.cos(b),4.62*math.sin(b),.9),.028)

objects=[]
for name,(v,f) in parts.items():
    me=bpy.data.meshes.new(name)
    me.from_pydata(v,[],f);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    color,metal,rough=spec[name]
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=color
    bs.inputs['Metallic'].default_value=metal
    bs.inputs['Roughness'].default_value=rough
    if 'Light' in name:
        bs.inputs['Emission Color'].default_value=color
        bs.inputs['Emission Strength'].default_value=2
    if name=='Glazing':
        bs.inputs['Alpha'].default_value=.28
        mat.surface_render_method='DITHERED'
    me.materials.append(mat)
    # Keep ice faceted and geometry crisp; smoothing round trim only avoids web lumps.
    if name not in ('Ice','IcePale','Titanium','Floor'):
        for poly in me.polygons:poly.use_smooth=True
    objects.append(ob)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'observatory.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'observatory.glb'),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
all_vertices=[v.co for o in objects for v in o.data.vertices]
minimum=[min(v[i] for v in all_vertices) for i in range(3)]
maximum=[max(v[i] for v in all_vertices) for i in range(3)]
stats={'source':'Locally authored Blender geometry, reference-calibrated revision 2','revision':2,'objects':len(objects),'vertices':sum(len(o.data.vertices) for o in objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects),'bytes':(OUT/'observatory.glb').stat().st_size,'bounds_blender_z_up':{'min':minimum,'max':maximum},'height':maximum[2]-minimum[2],'spire_reference_height':21.5,'spire_base_width':(315-169)*21.5/560,'spire_peak_separation':2*(573-290)*21.5/560,'dome_width':18.15,'bridge_length':31.32,'materials':list(parts)}
(OUT/'model-stats.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
print(json.dumps(stats))
