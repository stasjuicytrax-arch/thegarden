// STL пиона → оптимизированный public/models/peony.glb (TZ.md §6.1: «готовая модель .glb ≤ 400 КБ draco»,
// здесь по решению пользователя ≈50–60k треугольников + meshopt, ≤ 1.5 МБ).
// node scripts/make-peony.mjs [src.stl] [out.glb]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, simplify, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const SRC = process.argv[2] ?? 'assets/models/peony.stl';
const OUT = process.argv[3] ?? 'public/models/peony.glb';
const TARGET_TRIS = 55000;
const MAX_BYTES = 1.5 * 1024 * 1024;

const buf = readFileSync(SRC);
let geo = new STLLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
console.log('STL треугольников:', geo.attributes.position.count / 3);

// сварка вершин и гладкие нормали
geo.deleteAttribute('normal');
geo = mergeVertices(geo, 1e-4);
geo.computeVertexNormals();

// центрирование: центр бокса в X/Z, низ в Y=0; масштаб — высота 2 (как у процедурной сцены ≈ 1.6–2)
geo.computeBoundingBox();
let bb = geo.boundingBox;
console.log('bbox до:', bb.min.toArray().map((n) => +n.toFixed(2)), bb.max.toArray().map((n) => +n.toFixed(2)));

// Модель лежит в плоскости XY (лицом к +Z, толщина по Z ≈ 0.23): поворачиваем Z → Y, чтобы цветок смотрел вверх.
// PEONY_YUP=1 — если модель уже Y-up.
if (process.env.PEONY_YUP !== '1') {
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  bb = geo.boundingBox;
}

// плоское основание: если нижний слой вершин (нижние 2% высоты) образует широкий плоский диск — срезаем
const pos = geo.attributes.position;
const h = bb.max.y - bb.min.y;
const yCut = bb.min.y + h * 0.02;
let low = 0;
for (let i = 0; i < pos.count; i++) if (pos.getY(i) < yCut) low++;
console.log('вершин в нижних 2%:', low, 'из', pos.count);
if (low / pos.count > 0.03) {
  const idx = geo.index.array;
  const keep = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    const maxY = Math.max(pos.getY(a), pos.getY(b), pos.getY(c));
    if (maxY > yCut + h * 0.01) keep.push(a, b, c);
  }
  geo.setIndex(keep);
  console.log('основание срезано, осталось треугольников:', keep.length / 3);
}

geo.computeBoundingBox();
bb = geo.boundingBox;
const c = bb.getCenter(new THREE.Vector3());
geo.translate(-c.x, -bb.min.y, -c.z);
// масштаб по горизонтальному размаху: диаметр цветка 2.5 (как у процедурной сцены)
const s = 2.5 / Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
geo.scale(s, s, s);
geo.computeVertexNormals();

// gltf-transform
const doc = new Document();
const buffer = doc.createBuffer();
const p = geo.attributes.position;
const n = geo.attributes.normal;
const idx = geo.index.array;
const prim = doc
  .createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(p.array)).setBuffer(buffer))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(n.array)).setBuffer(buffer))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer));
const mesh = doc.createMesh('peony').addPrimitive(prim);
const node = doc.createNode('peony').setMesh(mesh);
doc.createScene('scene').addChild(node);

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const trisBefore = idx.length / 3;
await doc.transform(
  weld({ tolerance: 1e-5 }),
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, TARGET_TRIS / trisBefore), error: 0.01, lockBorder: false }),
  quantize({ quantizePosition: 14, quantizeNormal: 10 })
);

doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const glb = await io.writeBinary(doc);

const outPrim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
console.log('треугольников:', outPrim.getIndices().getCount() / 3);
console.log('размер glb:', (glb.byteLength / 1024).toFixed(0), 'КБ');
if (glb.byteLength > MAX_BYTES) {
  console.error('ПРЕВЫШЕН лимит 1.5 МБ');
  process.exit(1);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, glb);
console.log('записано', OUT);
