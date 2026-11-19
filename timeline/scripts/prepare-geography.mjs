import fs from 'node:fs';
import { geoArea } from 'd3-geo';

// DataV supplies RFC7946 winding; d3-geo expects clockwise exterior rings.
// Preserve the downloaded source, and normalize each polygon independently.
const source = new URL('../public/data/china.json', import.meta.url);
const target = new URL('../public/data/china-d3.json', import.meta.url);
const collection = JSON.parse(fs.readFileSync(source, 'utf8'));
for (const feature of collection.features) {
  const geometry = feature.geometry;
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  for (const polygon of polygons) {
    if (geoArea({ type: 'Polygon', coordinates: polygon }) > 2 * Math.PI) {
      polygon.forEach((ring) => ring.reverse());
    }
  }
}
if (geoArea(collection) > 2 * Math.PI) throw new Error('Invalid geographic winding');
fs.writeFileSync(target, JSON.stringify(collection));
console.log(`Prepared ${collection.features.length} geographic features.`);
