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
    assert.ok(component.usage.includes(`<ui:${component.name}`));
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
    for(const [foreground,background,minimum] of [['text','surface',4.5],['text-muted','surface',4.5],['primary-content','primary',4.5],['danger-content','danger',4.5],['secondary-content','secondary',4.5],['accent-content','accent',4.5],['info-content','info',4.5],['success-content','success',4.5],['warning-content','warning',4.5],['border','surface',3]]) {
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

test('component styling references declared tokens or documented optional overrides', async()=>{
  const tokens=await read('styles/tokens.css'), css=await read('styles/components.css');
  const declared=new Set([...tokens.matchAll(/(--portal-[a-z0-9-]+):/g)].map(m=>m[1]));
  const optional=new Set(['--portal-button-background','--portal-button-color','--portal-input-background','--portal-input-color','--portal-card-shadow']);
  for(const [,token] of css.matchAll(/var\((--portal-[a-z0-9-]+)/g)) assert.ok(declared.has(token)||optional.has(token),`Undocumented token ${token}`);
  assert.ok(!/font-weight:\s*\d/.test(css),'Component font weights must be theme driven');
});

test('layout recipes are complete, script-free compositions with explicit integration notes',async()=>{
  const catalogue=await loadCatalogue();
  assert.equal(catalogue.layouts.length,4);
  for(const recipe of catalogue.layouts) {
    assert.ok(recipe.usage.includes('portal-theme portal-layout'));
    assert.ok(recipe.components.length>=4);
    assert.ok(recipe.integration.length>100);
    assert.ok(!/<script|<form|on(?:click|submit)=/i.test(recipe.usage),'Static examples must not execute scripts or submit data');
    assert.ok(recipe.usage.includes('Business actions are disabled'));
  }
});


test('queued preview sizing ignores detached or replaced documents', async () => {
  const { runInNewContext } = await import('node:vm');
  const source = await read('scripts/site-browser.js');
  const functionSource = source.slice(source.indexOf('function applyFrame('), source.indexOf('function previews('));
  for (const change of ['detached', 'replaced', 'cleared', 'current']) {
    const document = { documentElement: { scrollHeight: 240 }, querySelectorAll:()=>[], querySelector:()=>null };
    const frame = { contentDocument:document, isConnected:true, hasAttribute:()=>false, style:{} };
    let scheduled;
    const context = { frame, active:{}, draft:{}, requestAnimationFrame:callback=>{ scheduled=callback; } };
    runInNewContext(functionSource+';applyFrame(frame);', context);
    if(change==='detached')frame.isConnected=false;
    if(change==='replaced')frame.contentDocument={};
    if(change==='cleared')document.documentElement=null;
    assert.doesNotThrow(()=>scheduled());
    assert.equal(frame.style.height,change==='current'?'240px':undefined);
  }
});
