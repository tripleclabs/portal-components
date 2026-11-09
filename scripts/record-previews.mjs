// Record reviewed expected HTML; this is not a DataXML renderer or compatibility proof.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, loadCatalogue } from './catalogue.mjs';
import { digest, inputFiles } from './site.mjs';
const catalogue = await loadCatalogue();
const inputs = await inputFiles();
const examples = {};
for (const item of [...catalogue.components, ...(catalogue.layouts ?? [])]) {
  const output = await readFile(path.join(root, item.rendered));
  examples[item.name] = { sourceSha256: inputs[item.example], htmlSha256: digest(output) };
}
await writeFile(path.join(root, 'rendered/manifest.json'), JSON.stringify({
  contractVersion: catalogue.contractVersion, libraryVersion: catalogue.version,
  previewRevision: 'reviewed-html-v1', inputFiles: inputs, examples
}, null, 2) + '\n');
console.log('Recorded reviewed HTML fixtures. Runtime compatibility is checked by consuming platforms.');
