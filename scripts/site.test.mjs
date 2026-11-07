import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { html, digest, inputFiles, verifyRendered } from './site.mjs';
import { loadCatalogue, generatedDocuments, read } from './catalogue.mjs';

test('HTML escaping keeps copied source inert', () => {
  assert.equal(html('<script a="x">&\'</script>'),'&lt;script a=&quot;x&quot;&gt;&amp;&#39;&lt;/script&gt;');
});
test('all components have an exact contract and executable example', async () => {
  const catalogue=await loadCatalogue();
  assert.ok(catalogue.components.length>=24);
  for(const component of catalogue.components) {
    assert.ok(component.usage.includes(`name="${component.name}"`));
    assert.ok(component.accessibility.length>30);
    assert.ok(component.template.includes('xmlns:t="urn:cococo:dataxml"'));
  }
});
test('generated human and machine references stay synchronized',async()=>{
  for(const [file,content] of await generatedDocuments())assert.equal(await read(file),content,file);
});
test('supplied theme text pairs and control boundaries retain contrast',async()=>{
  const css=await read('styles/tokens.css');
  const blocks=[...css.matchAll(/\.portal-theme(?:\[data-theme="(\w+)"\])?\s*\{([^}]+)\}/g)];
  const base={};
  function luminance(hex) {
    const channels=hex.slice(1).match(/../g).map(part=>parseInt(part,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
  }
  function ratio(a,b) {const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(values[0]+.05)/(values[1]+.05);}
  for(const [,name,body] of blocks) {
    const values=Object.fromEntries([...body.matchAll(/--portal-([\w-]+):\s*(#[\da-f]{6});/g)].map(([,key,value])=>[key,value]));
    if(!name)Object.assign(base,values);
    const theme={...base,...values};
    for(const [foreground,background,minimum] of [['text','surface',4.5],['text-muted','surface',4.5],['primary-content','primary',4.5],['danger-content','danger',4.5],['border','surface',3]]) {
      if(!theme[foreground]||!theme[background])continue;
      assert.ok(ratio(theme[foreground],theme[background])>=minimum,`${name??'light'} ${foreground}/${background}`);
    }
  }
});
test('provenance rejects changed, added, deleted inputs and tampered output',async()=>{
  const base=await mkdtemp(path.join(os.tmpdir(),'portal-components-test-'));
  try {
    for(const dir of ['components','examples','styles','rendered'])await mkdir(path.join(base,dir));
    const catalogue={version:'1',contractVersion:1,components:[{name:'card',example:'examples/card.html',rendered:'rendered/card.html'}]};
    await writeFile(path.join(base,'catalogue.json'),JSON.stringify(catalogue));
    await writeFile(path.join(base,'components/card.html'),'<section/>');
    await writeFile(path.join(base,'examples/card.html'),'<main/>');
    await writeFile(path.join(base,'rendered/card.html'),'<html></html>');
    const inputs=await inputFiles(base);
    const manifest={contractVersion:1,libraryVersion:'1',rendererRevision:'test',inputFiles:inputs,examples:{card:{sourceSha256:inputs['examples/card.html'],htmlSha256:digest('<html></html>')}}};
    await writeFile(path.join(base,'rendered/manifest.json'),JSON.stringify(manifest));
    await verifyRendered(catalogue,base);
    await writeFile(path.join(base,'components/card.html'),'<article/>');
    await assert.rejects(verifyRendered(catalogue,base),/inputs changed/);
    await writeFile(path.join(base,'components/card.html'),'<section/>');
    await writeFile(path.join(base,'styles/extra.css'),'body{}');
    await assert.rejects(verifyRendered(catalogue,base),/inputs changed/);
    await rm(path.join(base,'styles/extra.css'));
    await rm(path.join(base,'components/card.html'));
    await assert.rejects(verifyRendered(catalogue,base),/inputs changed/);
    await writeFile(path.join(base,'components/card.html'),'<section/>');
    await writeFile(path.join(base,'rendered/card.html'),'<html>tampered</html>');
    await assert.rejects(verifyRendered(catalogue,base),/integrity mismatch/);
  } finally { await rm(base,{recursive:true,force:true}); }
});
