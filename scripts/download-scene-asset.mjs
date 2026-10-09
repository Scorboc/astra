// Download a returned scene artifact; never log signed URLs or headers.
import { writeFile } from 'node:fs/promises';
const [url, target] = process.argv.slice(2);
if (!url || !target) throw new Error('Artifact URL and destination required');
const response = await fetch(url);
if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
const bytes = new Uint8Array(await response.arrayBuffer());
await writeFile(target, bytes);
console.log(`Downloaded ${bytes.length} bytes`);
