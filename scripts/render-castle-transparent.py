"""Blender-only artist pipeline. Read the supplied scene/look; never overwrite either source.

Run with Blender --background SOURCE.blend --python this-file -- --look-script LOOK.py
--output public/castle-orbit/transparent --scratch artifacts/castle-transparent --python PATH_TO_PYTHON.
The reviewed V8 look script must end its setup with 'import time; t=time.time(); bpy.ops.render.render'.
"""
import argparse
import math
from pathlib import Path
import subprocess
import sys
import time
import bpy
import mathutils

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--look-script', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--scratch', required=True)
parser.add_argument('--python', required=True)
parser.add_argument('--samples', type=int, default=72)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
look = Path(args.look_script).resolve()
output = Path(args.output).resolve()
scratch = Path(args.scratch).resolve()
output.mkdir(parents=True, exist_ok=True)
scratch.mkdir(parents=True, exist_ok=True)
source = look.read_text(encoding='utf-8')
marker = 'import time; t=time.time(); bpy.ops.render.render'
if marker not in source:
    raise ValueError('Look setup boundary not recognized; refuse to execute the render suffix')
sys.argv = [sys.argv[0], '--', 'unused-look-output.png']
exec(compile(source[:source.index(marker)], str(look), 'exec'), globals())
scene = bpy.context.scene
for obj in bpy.data.objects:
    if obj.name.startswith(('Aurora in control scene', 'Origin in control scene', 'Velir distant',
                            'Background nebula volume', 'Distant star field', 'Distant asteroid', 'Rock prototype')):
        obj.visible_camera = False  # Retain reflection and indirect-light visibility.
world = scene.world.node_tree
world_output = next(n for n in world.nodes if n.type == 'OUTPUT_WORLD')
if world_output.inputs['Volume'].links:
    volume = world_output.inputs['Volume'].links[0].from_socket
    path = world.nodes.new('ShaderNodeLightPath')
    mix = world.nodes.new('ShaderNodeMixShader')
    world.links.new(path.outputs['Is Camera Ray'], mix.inputs[0])
    world.links.new(volume, mix.inputs[1])
    world.links.new(mix.outputs[0], world_output.inputs['Volume'])
scene.render.film_transparent = True
comp = scene.node_tree
composite = next(n for n in comp.nodes if n.type == 'COMPOSITE')
beauty = composite.inputs['Image'].links[0].from_socket
separate = comp.nodes.new('CompositorNodeSeparateColor')
comp.links.new(beauty, separate.inputs['Image'])
rg = comp.nodes.new('CompositorNodeMath'); rg.operation = 'MAXIMUM'
rgb = comp.nodes.new('CompositorNodeMath'); rgb.operation = 'MAXIMUM'
coverage = comp.nodes.new('CompositorNodeMath'); coverage.operation = 'MAXIMUM'; coverage.use_clamp = True
comp.links.new(separate.outputs['Red'], rg.inputs[0]); comp.links.new(separate.outputs['Green'], rg.inputs[1])
comp.links.new(rg.outputs[0], rgb.inputs[0]); comp.links.new(separate.outputs['Blue'], rgb.inputs[1])
comp.links.new(rgb.outputs[0], coverage.inputs[0]); comp.links.new(rl.outputs['Alpha'], coverage.inputs[1])
alpha = comp.nodes.new('CompositorNodeSetAlpha'); alpha.mode = 'REPLACE_ALPHA'
comp.links.new(beauty, alpha.inputs['Image']); comp.links.new(coverage.outputs[0], alpha.inputs['Alpha'])
comp.links.new(alpha.outputs['Image'], composite.inputs['Image'])
scene.cycles.samples = args.samples
scene.render.use_persistent_data = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.resolution_percentage = 100
camera = scene.camera
origin = camera.location.copy()
target = mathutils.Vector((0, 0, 9.9))
offset = origin - target
encoder = Path(__file__).with_name('encode-castle-frame.py')
order = sorted(range(21), key=lambda i: abs(i - 10))
started = time.monotonic()
for ordinal, index in enumerate(order, 1):
    yaw = -40 + index * 4
    camera.location = target + mathutils.Matrix.Rotation(math.radians(yaw), 3, 'Z') @ offset
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    png = scratch / f'f{index:02}.png'
    webp = output / f'f{index:02}.webp'
    scene.render.filepath = str(png)
    bpy.ops.render.render(write_still=True)
    subprocess.run([args.python, str(encoder), str(png), str(webp)], check=True)
    print(f'CASTLE_FRAME {ordinal}/21 index={index} angle={yaw} seconds={time.monotonic()-started:.1f} bytes={webp.stat().st_size}', flush=True)
print('CASTLE_RENDER_COMPLETE', flush=True)
