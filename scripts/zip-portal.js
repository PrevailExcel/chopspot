// Packs dist-<portal>/ into chopspot-<portal>.zip, ready to upload to the portal's developer page.
// Usage: node scripts/zip-portal.js crazygames
// No extra packages: a small ZIP writer using Node's own zlib.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const portal = process.argv[2] || 'crazygames';
const dir = `dist-${portal}`;
const out = `chopspot-${portal}.zip`;

// left out of portal builds: real-ad images and the share-link picture
const SKIP = [/^ads\//, /^og\.png$/, /\.map$/];

function files(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const local = []; const central = []; let offset = 0; let total = 0;
const list = files(dir)
  .map((p) => ({ p, name: relative(dir, p).split(sep).join('/') }))
  .filter(({ name }) => !SKIP.some((r) => r.test(name)))
  .sort((a, b) => a.name.localeCompare(b.name));

for (const { p, name } of list) {
  const data = readFileSync(p);
  const packed = deflateRawSync(data, { level: 9 });
  const useDeflate = packed.length < data.length;
  const body = useDeflate ? packed : data;
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = crc32(data);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6);
  head.writeUInt16LE(useDeflate ? 8 : 0, 8); head.writeUInt16LE(0, 10); head.writeUInt16LE(0x21, 12);
  head.writeUInt32LE(crc, 14); head.writeUInt32LE(body.length, 18); head.writeUInt32LE(data.length, 22);
  head.writeUInt16LE(nameBuf.length, 26); head.writeUInt16LE(0, 28);
  local.push(head, nameBuf, body);
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8);
  cen.writeUInt16LE(useDeflate ? 8 : 0, 10); cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0x21, 14);
  cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(body.length, 20); cen.writeUInt32LE(data.length, 24);
  cen.writeUInt16LE(nameBuf.length, 28); cen.writeUInt32LE(offset, 42);
  central.push(cen, nameBuf);
  offset += head.length + nameBuf.length + body.length;
  total += data.length;
}

const cenSize = central.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(list.length, 8); end.writeUInt16LE(list.length, 10);
end.writeUInt32LE(cenSize, 12); end.writeUInt32LE(offset, 16);
writeFileSync(out, Buffer.concat([...local, ...central, end]));

const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log(`${out}: ${list.length} files, ${mb(total)} MB unpacked, ${mb(statSync(out).size)} MB zipped`);
if (!list.some((f) => f.name === 'index.html')) { console.error('index.html is missing from the build'); process.exit(1); }
