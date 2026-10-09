// Delivery resizing only. This does NOT create native 16K artwork.
// Pass the path to sharp when it is supplied by the desktop runtime.
const sharp = require(process.argv[2] || 'sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
async function main() {
  const input = path.join(root, 'public/universe/origin-reference-v2.png');
  console.log('Generated source:', await sharp(input).metadata());
  for (const width of [16384, 8192, 4096, 2048]) {
    const output = path.join(root, `public/universe/origin-full-v2-${width}.jpg`);
    await sharp(input).resize(width, width / 2, { kernel: 'lanczos3' })
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(output);
    const meta = await sharp(output).metadata();
    console.log(JSON.stringify({ output, width: meta.width, height: meta.height }));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
