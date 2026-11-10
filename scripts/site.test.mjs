import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { html, digest, inputFiles, verifyRendered } from './site.mjs';
import { loadCatalogue, generatedDocuments, read, readComponent, componentSnippet, portalBlocks, contractFromProps } from './catalogue.mjs';

test('HTML escaping keeps copied source inert', () => {
  assert.equal(html('<script a="x">&\'</script>'),'&lt;script a=&quot;x&quot;&gt;&amp;&#39;&lt;/script&gt;');
});
test('doc snippets drop the showcase wrapper; examples need no namespace declarations', async () => {
  assert.equal(componentSnippet('<main class="portal-theme portal-example">\n  <ui:stack>\n    <ui:badge>Draft</ui:badge>\n  </ui:stack>\n</main>\n'),'<ui:stack>\n  <ui:badge>Draft</ui:badge>\n</ui:stack>\n');
  assert.equal(componentSnippet('<main class="portal-theme portal-example">\n  <ui:badge>A</ui:badge>\n  <ui:badge>B</ui:badge>\n</main>\n'),'<ui:badge>A</ui:badge>\n<ui:badge>B</ui:badge>\n','several roots keep their relative indentation');
  const catalogue=await loadCatalogue();
  for(const layout of catalogue.layouts)assert.match(layout.usage,/^<div class="portal-theme portal-layout"/,'layouts keep the wrapper the recipe tells readers to keep');
  for(const item of [...catalogue.components,...catalogue.layouts]) {
    assert.doesNotMatch(item.usage,/xmlns:/,`${item.name}: no namespace declarations in the snippet`);
    assert.doesNotMatch(item.usage,/portal-example|^<main/,`${item.name}: no showcase wrapper`);
    assert.doesNotMatch(item.usage,/^\s/,`${item.name}: dedented`);
  }
});
test('all components have an exact contract and executable example', async () => {
  const catalogue=await loadCatalogue();
  assert.ok(catalogue.components.length>=24);
  for(const component of catalogue.components) {
    assert.ok(component.usage.includes(`<ui:${component.name}`));
    assert.ok(component.accessibility.length>30);
    assert.doesNotMatch(component.template,/xmlns/,`${component.name}: ui: and t: are implicit in a .portal file`);
  }
});
test('a component file is read block by block', async () => {
  const source='<props>\n  <prop name="tone" type="string" default="info" enum="info danger"/>\n  <prop name="count" type="integer" default="2"/>\n  <prop name="line" type="object" required="true">\n    <prop name="id" type="string" required="true"/>\n  </prop>\n  <prop name="tags" type="array" nullable="true"><items type="string"/></prop>\n  <slot name="default" required="true"/>\n</props>\n<template>\n<p class="portal-x"/>\n</template>\n<style>\n.portal-x { color: red; }\n</style>\n<server security="privileged"><![CDATA[ return 1 < 2 ]]></server>\n';
  const blocks=portalBlocks(source,'x.portal');
  assert.deepEqual(Object.keys(blocks).sort(),['props','server','style','template']);
  assert.equal(blocks.server.attributes.security,'privileged');
  assert.deepEqual(contractFromProps(blocks.props.body,'x.portal'),{
    props:{tone:{type:'string',default:'info',enum:['info','danger']},count:{type:'integer',default:2},
      line:{type:'object',required:true,properties:{id:{type:'string',required:true}}},tags:{type:'array',nullable:true,items:{type:'string'}}},
    slots:{default:{required:true}}});
  assert.throws(()=>portalBlocks('<template><p/></template><script/>','x.portal'),/top level/);
  assert.throws(()=>portalBlocks('<template><p/></template><template><p/></template>','x.portal'),/duplicate/);
  assert.throws(()=>contractFromProps('<prop name="n" type="integer" default="1.5"/>','x.portal'),/not a integer/);
  const button=await readComponent('button');
  assert.match(button.style,/^\.portal-button \{/m);
  assert.equal(button.security,'pure');
});
test('generated human and machine references stay synchronized',async()=>{
  for(const [file,content] of await generatedDocuments())assert.equal(await read(file),content,file);
});
const knobNames=['--portal-brand','--portal-radius','--portal-font','--portal-font-heading','--portal-density'];
const presets=['neutral','editorial','studio'], modes=['light','dark'];
function blockKey(selector) {
  const preset=selector.match(/\[data-preset="(\w+)"\]/)?.[1]??'neutral';
  const mode=selector.match(/\[data-theme="(\w+)"\]/)?.[1]??'light';
  return `${preset}-${mode}`;
}
// Mirrors the cascade: Neutral light, Neutral dark, preset light, preset dark.
async function themeBlocks() {
  const css=await read('styles/tokens.css');
  const blocks=new Map();
  for(const [,selector,body] of css.matchAll(/^(\.portal-theme(?::where\((?:\[data-(?:preset|theme)="\w+"\])+\))?)\s*\{([^}]*)\}/gm)) {
    blocks.set(blockKey(selector),Object.fromEntries([...body.matchAll(/(--portal-[a-z0-9-]+):\s*([^;]+);/g)].map(([,name,value])=>[name,value.trim()])));
  }
  return {css,blocks};
}
function resolveTheme(blocks,preset,mode) {
  const order=['neutral-light',...(mode==='dark'?['neutral-dark']:[]),...(preset==='neutral'?[]:[`${preset}-light`,...(mode==='dark'?[`${preset}-dark`]:[])])];
  const values={},source={};
  for(const key of order)for(const [name,value] of Object.entries(blocks.get(key)??{})){values[name]=value;source[name]=key;}
  return {values,source};
}
function tierNames(css,tier) {
  return [...css.matchAll(new RegExp(`(--portal-[a-z0-9-]+):[^;]+;\\s*/\\* @${tier} \\*/`,'g'))].map(m=>m[1]);
}
function channels(hex) { return hex.slice(1).match(/../g).map(part=>parseInt(part,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4); }
function luminance(hex) { const [r,g,b]=channels(hex); return r*.2126+g*.7152+b*.0722; }
function ratio(a,b) { const values=[luminance(a),luminance(b)].sort((x,y)=>y-x); return (values[0]+.05)/(values[1]+.05); }
function oklchLightness(hex) {
  const [r,g,b]=channels(hex);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return .2104542553*l+.793617785*m-.0040720468*s;
}
// The CSS derivation: oklch(from primary clamp(0, (0.62 - l) * 1000, 1) 0 0).
const derivedContent=hex=>oklchLightness(hex)<.62?'#ffffff':'#000000';

test('token model exposes five knobs and at most 32 public tokens',async()=>{
  const {css}=await themeBlocks();
  assert.deepEqual(tierNames(css,'knob').sort(),[...knobNames].sort());
  const declared=new Set([...css.matchAll(/(--portal-[a-z0-9-]+):/g)].map(m=>m[1]));
  assert.ok(declared.size<=32,`${declared.size} declared tokens`);
  for(const name of declared)assert.ok(knobNames.includes(name)||tierNames(css,'semantic').includes(name),`${name} carries no tier comment`);
});
test('every preset and mode declares the full semantic set',async()=>{
  const {css,blocks}=await themeBlocks();
  const semantic=tierNames(css,'semantic');
  assert.ok(semantic.length>=20);
  for(const preset of presets)for(const mode of modes) {
    assert.ok(preset==='neutral'&&mode==='light'||blocks.has(`${preset}-${mode}`),`missing ${preset}-${mode} block`);
    const {values,source}=resolveTheme(blocks,preset,mode);
    for(const name of [...knobNames,...semantic])assert.ok(values[name],`${preset}-${mode} lacks ${name}`);
    // A dark mode never shows a colour that was chosen for a light surface.
    if(mode==='dark')for(const [name,value] of Object.entries(values))if(/^#/.test(value)||/shadow/.test(name))assert.match(source[name],/-dark$/,`${preset}-dark inherits ${name} from ${source[name]}`);
  }
});
test('supplied presets keep text, content and input boundaries legible',async()=>{
  const {blocks}=await themeBlocks();
  for(const preset of presets)for(const mode of modes) {
    assert.ok(preset==='neutral'&&mode==='light'||blocks.has(`${preset}-${mode}`),`missing ${preset}-${mode} block`);
    const theme=Object.fromEntries(Object.entries(resolveTheme(blocks,preset,mode).values).map(([name,value])=>[name.replace('--portal-',''),value]));
    theme.primary??=theme.brand;
    theme['primary-content']??=derivedContent(theme.primary);
    const pairs=[['text','surface',4.5],['text','canvas',4.5],['text','surface-muted',4.5],['text-muted','surface',4.5],['text-muted','canvas',4.5],['text-muted','surface-muted',4.5],['primary-content','primary',4.5],['secondary-content','secondary',4.5],['accent-content','accent',4.5],
      ['success-content','success',4.5],['warning-content','warning',4.5],['danger-content','danger',4.5],['info-content','info',4.5],['border','surface',3],['border','canvas',3]];
    for(const [foreground,background,minimum] of pairs) {
      assert.match(theme[foreground],/^#[\da-f]{6}$/,`${preset}-${mode} ${foreground} must be a hex colour`);
      assert.match(theme[background],/^#[\da-f]{6}$/,`${preset}-${mode} ${background} must be a hex colour`);
      assert.ok(ratio(theme[foreground],theme[background])>=minimum,`${preset}-${mode} ${foreground}/${background} ${ratio(theme[foreground],theme[background]).toFixed(2)}`);
    }
  }
});
// The CSS a page can receive: the shared base and every component's own <style>.
async function stylesheets() {
  const catalogue=await loadCatalogue();
  const tokens=await read('styles/tokens.css');
  return [['styles/tokens.css (shared foundations)',tokens.slice(tokens.indexOf('/* Shared foundations'))],['styles/layouts.css',await read('styles/layouts.css')],
    ...catalogue.components.filter(c=>c.style).map(c=>[c.source,c.style])];
}
test('component CSS uses logical properties only',async()=>{
  for(const [file,source] of await stylesheets()) {
    const css=source.replace(/\/\*[\s\S]*?\*\//g,'');
    assert.doesNotMatch(css,/\b(margin|padding|border)-(left|right)\b|\b(left|right)\s*:/,file);
    // Four-value shorthands name physical sides (top right bottom left); use
    // -block/-inline pairs instead so right-to-left pages mirror.
    for(const [,property,value] of css.matchAll(/(?<![\w-])(margin|padding|inset|scroll-margin|scroll-padding)\s*:\s*([^;}]+)/g)) {
      const count=value.trim().replace(/\s*\(\s*/g,'(').replace(/\s*\)\s*/g,') ').trim().split(/\s+(?![^(]*\))/).filter(Boolean).length;
      assert.ok(count<4,`${file}: ${property}: ${value.trim()} is a physical four-value shorthand`);
    }
  }
});
test('provenance rejects changed, added, deleted inputs and tampered output',async()=>{
  const base=await mkdtemp(path.join(os.tmpdir(),'portal-components-test-'));
  try {
    for(const dir of ['components','examples','styles','rendered'])await mkdir(path.join(base,dir));
    const catalogue={version:'1',contractVersion:1,components:[{name:'card',example:'examples/card.html',rendered:'rendered/card.html'}]};
    await writeFile(path.join(base,'catalogue.json'),JSON.stringify(catalogue));
    await writeFile(path.join(base,'components/card.portal'),'<template><section/></template>');
    await writeFile(path.join(base,'examples/card.html'),'<main/>');
    await writeFile(path.join(base,'rendered/card.html'),'<html></html>');
    const inputs=await inputFiles(base);
    const manifest={contractVersion:1,libraryVersion:'1',rendererRevision:'test',inputFiles:inputs,examples:{card:{sourceSha256:inputs['examples/card.html'],htmlSha256:digest('<html></html>')}}};
    await writeFile(path.join(base,'rendered/manifest.json'),JSON.stringify(manifest));
    await verifyRendered(catalogue,base);
    await writeFile(path.join(base,'components/card.portal'),'<template><article/></template>');
    await assert.rejects(verifyRendered(catalogue,base),/inputs changed/);
    await writeFile(path.join(base,'components/card.portal'),'<template><section/></template>');
    await writeFile(path.join(base,'styles/extra.css'),'body{}');
    await assert.rejects(verifyRendered(catalogue,base),/inputs changed/);
    await rm(path.join(base,'styles/extra.css'));
    await rm(path.join(base,'components/card.portal'));
    await assert.rejects(verifyRendered(catalogue,base),/inputs changed/);
    await writeFile(path.join(base,'components/card.portal'),'<template><section/></template>');
    await writeFile(path.join(base,'rendered/card.html'),'<html>tampered</html>');
    await assert.rejects(verifyRendered(catalogue,base),/integrity mismatch/);
  } finally { await rm(base,{recursive:true,force:true}); }
});

test('component styling references declared tokens or documented optional overrides', async()=>{
  const tokens=await read('styles/tokens.css'), css=(await stylesheets()).map(([,source])=>source).join('\n');
  const declared=new Set([...tokens.matchAll(/(--portal-[a-z0-9-]+):/g)].map(m=>m[1]));
  // Optional overrides are read with a fallback where used, never declared on the root.
  const optional=new Set(['--portal-button-background','--portal-button-color','--portal-input-background','--portal-input-color','--portal-card-shadow']);
  // Semantic roles resolved where used (brand fallback) so nested brand overrides re-derive them.
  const resolvedWhereUsed=new Set(['--portal-primary','--portal-primary-content','--portal-focus']);
  for(const token of resolvedWhereUsed) {
    assert.ok(!declared.has(token),`${token} must not be declared on the theme root`);
    assert.match(tokens,new RegExp(`${token}\\b`),`${token} is documented in tokens.css`);
  }
  for(const [,token] of css.matchAll(/var\((--portal-[a-z0-9-]+)/g)) assert.ok(declared.has(token)||optional.has(token)||resolvedWhereUsed.has(token),`Undocumented token ${token}`);
  assert.ok(!/font-weight:\s*\d/.test(css),'Component font weights must be theme driven');
});

test('layout recipes are complete, script-free compositions with explicit integration notes',async()=>{
  const catalogue=await loadCatalogue();
  assert.deepEqual(catalogue.layouts.map(layout=>layout.name),['layout-shop','layout-ordering-portal','layout-tracking','layout-api']);
  for(const recipe of catalogue.layouts) {
    for(const shell of ['<ui:site-header','<ui:site-footer'])assert.ok(recipe.usage.includes(shell),`${recipe.name} uses ${shell}`);
    assert.ok(recipe.usage.includes('Paper &amp; Form'),`${recipe.name} keeps the fictional brand`);
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


test('brand assets are local, licensed and limited to presentation', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const { root } = await import('./catalogue.mjs');
  const files=await readdir(path.join(root,'brand'));
  const fonts=files.filter(name=>name.endsWith('.woff2'));
  assert.equal(fonts.length,6);
  for(const font of fonts)assert.equal((await readFile(path.join(root,'brand',font))).subarray(0,4).toString(),'wOF2');
  assert.match(await read('brand/OFL.txt'),/SIL OPEN FONT LICENSE/);
  for(const name of ['cococo-logo.svg','cococo-outline.svg']) {
    const svg=await read('brand/'+name);
    assert.doesNotMatch(svg,/<script|\son\w+=|(?:href|src)=/i);
  }
  assert.doesNotMatch(await read('brand/fonts.css'),/https?:/);
  assert.match(await read('brand/NOTICE.md'),/MIT license does not relicense/);
});

test('syntax highlighting preserves source and escapes active markup', async () => {
  const { highlight } = await import('./syntax.mjs');
  const samples = [
    ['xml','<ui:button t:bind-disabled="data.busy">Save &amp; close</ui:button>\n'],
    ['xml','</code><script>alert("x")</script><img src=x onerror=alert(1)>'],
    ['css','/* Theme */\n.portal-theme { --name: "<img onerror=x>"; color: #ff79c9; }\n'],
    ['json','{ "count": 3, "enabled": false, "source": "<script>" }\n']
  ];
  for (const [language, source] of samples) {
    const result=highlight(source,language);
    assert.match(result,/<span class="hljs-/);
    assert.doesNotMatch(result,/<(?:script|img|ui:button)\b/i);
    const restored=result.replace(/<\/?span\b[^>]*>/g,'').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&#39;',"'").replaceAll('&amp;','&');
    assert.equal(restored,source);
  }
  assert.throws(()=>highlight('x','unknown'),/Unsupported code language/);
});

// The finished library, by category.
test('catalogue lists every component in its category', async () => {
  const expected={
    Actions:['button','link'],
    Commerce:['basket-line','buy-now','media','option-card','option-cards','order-summary','price','product-card','quantity-input'],
    Data:['table'],
    Developer:['code-block','endpoint','key-display','property-table'],
    Disclosure:['disclosure'],
    Forms:['checkbox','error-summary','field','field-error','input','radio','select','textarea'],
    General:['avatar','icon','kbd'],
    Navigation:['breadcrumbs','pagination'],
    Overlays:['dialog','menu','menu-item','popover','tab-panel','tabs'],
    Status:['alert','badge','description-item','description-list','empty-state','estimate-panel','file-item','file-list','progress','skeleton','stat','timeline','timeline-step'],
    Structure:['card','container','grid','hero','nav-link','page-header','section','separator','site-footer','site-header','stack'],
  };
  const catalogue=await loadCatalogue();
  const actual={};
  for(const {name,category} of catalogue.components)(actual[category]??=[]).push(name);
  for(const names of Object.values(actual))names.sort();
  assert.deepEqual(actual,expected);
});

test('site shell components render their landmark and heading contracts', async () => {
  const rendered=async name=>(await read(`rendered/${name}.html`)).replace(/^[\s\S]*<body>/,'');
  const header=await rendered('site-header');
  assert.match(header,/<header class="portal-site-header"[^>]*>/);
  assert.match(header,/<nav aria-label="Main" class="portal-site-header__nav">/);
  assert.match(await rendered('nav-link'),/<a aria-current="page" class="portal-nav-link"/);
  assert.match(await rendered('page-header'),/<h1>/);
  assert.match(await rendered('hero'),/<h1>/);
  assert.match(await rendered('site-footer'),/<footer class="portal-site-footer">/);
  assert.match(await rendered('section'),/<section class="portal-section"/);
  for(const name of ['site-header','nav-link','site-footer','page-header','section','hero']) {
    const {category}=(await loadCatalogue()).components.find(c=>c.name===name)??{};
    assert.equal(category,'Structure',name);
  }
});

test('every icon in the contract enum has exactly one CSS rule and vice versa', async () => {
  const contract=(await readComponent('icon')).definition;
  const names=contract.props.name.enum;
  assert.equal(names.length,40);
  const css=await read('styles/icons.css');
  const rules=[...css.matchAll(/\.portal-icon\[data-icon="([a-z0-9-]+)"\]/g)].map(m=>m[1]);
  assert.deepEqual([...rules].sort(),[...names].sort(),'icon rules and contract enum match');
  assert.equal(new Set(rules).size,rules.length,'one rule per icon');
  assert.match(css,/lucide-static@\d+\.\d+\.\d+/,'header names the Lucide version');
  assert.match(css,/ISC/,'header names the ISC licence');
});
test('the current nav link is marked by more than colour', async () => {
  const css=(await readComponent('nav-link')).style.replace(/\/\*[\s\S]*?\*\//g,'');
  const rule=css.match(/\.portal-nav-link\[aria-current="page"\]\s*\{([^}]*)\}/)[1];
  assert.match(rule,/font-weight:\s*var\(--_portal-weight-strong\)/);
  assert.match(rule,/text-decoration-line:\s*underline/);
});
test('icons are decorative unless labelled', async () => {
  const spans=[...(await read('rendered/icon.html')).matchAll(/<span [^>]*class="portal-icon"[^>]*>/g)].map(m=>m[0]);
  const decorative=spans.filter(span=>!span.includes('role='));
  const labelled=spans.filter(span=>span.includes('role='));
  assert.ok(decorative.length>=2&&labelled.length>=1);
  for(const span of decorative){assert.match(span,/aria-hidden="true"/);assert.doesNotMatch(span,/aria-label/);}
  for(const span of labelled){assert.match(span,/role="img"/);assert.match(span,/aria-label="[^"]+"/);assert.doesNotMatch(span,/aria-hidden/);}
  // An empty label is decorative, never an empty accessible name.
  assert.match((await readComponent('icon')).template,/t:attr-aria-label="props\.label \? props\.label : null"/);
});
test('icon licences ship in icons/NOTICE.md and the bundle keeps a pointer', async () => {
  const notice=await read('icons/NOTICE.md');
  assert.match(notice,/ISC License/);assert.match(notice,/Lucide Icons and Contributors/);
  assert.match(notice,/The MIT License/);assert.match(notice,/Cole Bemis/);
  assert.match(await read('styles/icons.css'),/^\/\*! Icons: Lucide \(lucide-static@[\d.]+\), ISC[^\n]*icons\/NOTICE\.md \*\//);
  assert.ok(JSON.parse(await read('package.json')).files.includes('icons'),'the notice is published with the package');
});
test('mask path data stays equivalent when concatenated', async () => {
  const { standalonePathData } = await import('./icons.mjs');
  assert.equal(standalonePathData('M5 12h14'),'M5 12h14');
  assert.equal(standalonePathData('m12 19-7-7 7-7'),'M12 19l-7-7 7-7');
  assert.equal(standalonePathData('m2.05 2.05 1.099-.028a1 1 0 0 1 1 1'),'M2.05 2.05l1.099-.028a1 1 0 0 1 1 1');
  assert.equal(standalonePathData('m9 18h6'),'M9 18h6');
  assert.equal(standalonePathData('m.5.5-1 1'),'M.5 .5l-1 1');
});
// The host inlines the base stylesheet into every page <head> (font URLs
// restored to the versioned host route), then the CSS of the components the
// page uses and the rules of the icons it shows.
async function iconRules() {
  const css=await read('styles/icons.css');
  return [...css.matchAll(/\.portal-icon\[data-icon="([a-z0-9-]+)"\] \{ --_icon: url\("([^"]+)"\); \}/g)].map(([,name,url])=>({name,rule:`.portal-icon[data-icon="${name}"]{--_icon:url("${url}")}`}));
}
async function renderedStyles(name) {
  const page=await read(`rendered/${name}.html`), {version}=JSON.parse(await read('package.json'));
  return {
    page,
    base:page.match(/<style>([\s\S]*?)<\/style>/)[1].replaceAll('url("../fonts/',`url("/_portal/fonts/${version}/`),
    icons:page.match(/<style data-portal-icons="">([\s\S]*?)<\/style>/)?.[1]??'',
    components:page.match(/<style data-portal-components="">([\s\S]*?)<\/style>/)?.[1]??'',
  };
}
test('every page\'s inline stylesheet stays within 64 KiB', async () => {
  const catalogue=await loadCatalogue(), rules=await iconRules();
  assert.equal(rules.length,40);
  const iconBytes=rules.reduce((sum,{rule})=>sum+Buffer.byteLength(rule),0);
  for(const {name} of [...catalogue.components,...catalogue.layouts]) {
    const {base,components}=await renderedStyles(name);
    assert.doesNotMatch(base,/\.portal-icon\[data-icon="[a-z0-9-]+"\]\{--_icon/,'icon masks are not in the base style');
    assert.doesNotMatch(base+components,/\/\*(?!!)/,'minified: no ordinary comments');
    // Upper bound: the page's base and component CSS, plus every icon rule.
    const size=Buffer.byteLength(base)+Buffer.byteLength(components)+iconBytes;
    assert.ok(size<=64*1024,`${name}: base + component CSS + all ${rules.length} icons is ${size} bytes`);
  }
});
test('a page carries the CSS of the components it uses, not the whole library', async () => {
  const {base,components}=await renderedStyles('badge');
  assert.doesNotMatch(base,/\.portal-badge\b/,'component rules are not in the base style');
  assert.match(components,/^\.portal-badge\{/m);
  assert.match(components,/^\.portal-stack\{/m,'nested components bring their CSS');
  assert.doesNotMatch(components,/\.portal-button\b/,'unused components bring none');
  assert.match(base,/\.layout-split\{/,'layout arrangement is part of the base');
});
test('each rendered page inlines exactly the icon rules it uses', async () => {
  const rules=await iconRules();
  for(const name of ['icon','layout-shop','layout-ordering-portal','layout-tracking','layout-api','code-block','button']) {
    const {page,icons}=await renderedStyles(name);
    const body=page.replace(/<style[\s\S]*?<\/style>/g,'');
    const used=new Set([...body.matchAll(/data-icon="([a-z0-9-]+)"/g)].map(m=>m[1]));
    const expected=rules.filter(({name})=>used.has(name)).map(({rule})=>rule).join('\n');
    assert.equal(icons,expected,`${name}: ${[...used].join(', ')||'no icons'}`);
    if(!used.size)assert.doesNotMatch(page,/data-portal-icons/,`${name}: no icon style`);
  }
});
test('layout CSS uses public tokens only', async () => {
  const css=(await read('styles/layouts.css')).replace(/\/\*[\s\S]*?\*\//g,'');
  assert.doesNotMatch(css,/--_/,'layouts.css must not read the library\'s private --_* derivations');
});
test('every relative colour has a fallback for browsers without it', async () => {
  // Each component carries its own fallback for the relative colours it uses.
  let total=0;
  for(const [file,source] of await stylesheets()) {
    const css=source.replace(/\/\*[\s\S]*?\*\//g,'');
    const at=css.indexOf('@supports not (color: oklch(from red l c h))');
    const outside=at<0?css:css.slice(0,at), fallback=at<0?'':css.slice(css.indexOf('{',at)+1,css.indexOf('\n}',at));
    const selectors=[...outside.matchAll(/([^{}]+)\{[^}]*oklch\(from/g)].map(m=>m[1].trim());
    total+=selectors.length;
    if(!selectors.length)continue;
    assert.ok(at>=0,`${file}: an @supports not (relative colour) block`);
    for(const selector of selectors)assert.ok(fallback.includes(selector+' {'),`${file}: ${selector} has a fallback rule`);
    assert.doesNotMatch(fallback,/oklch\(from/,`${file}: the fallback uses no relative colour`);
    assert.doesNotMatch(fallback,/#fff\b/,`${file}: no fixed white: it is unreadable on dark presets`);
  }
  assert.ok(total>=4);
  const button=(await readComponent('button')).style;
  assert.match(button,/@supports not[^]*--_fg: var\(--portal-button-color, var\(--portal-primary-content, var\(--portal-canvas\)\)\)/);
  assert.match(button,/@supports not[^]*--_state: color-mix\(in oklab, var\(--_bg\)/);
});

test('every @font-face url names a shipped, licensed font', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const { root } = await import('./catalogue.mjs');
  const css=await read('styles/tokens.css');
  const {version}=JSON.parse(await read('package.json'));
  const faces=[...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([,body])=>body);
  assert.ok(faces.length>=6,'latin and latin-ext faces for three families');
  const shipped=new Set(await readdir(path.join(root,'fonts')));
  const notice=await read('fonts/NOTICE.md');
  assert.match(await read('fonts/OFL.txt'),/SIL OPEN FONT LICENSE/);
  for(const body of faces) {
    const family=body.match(/font-family:\s*"?([^";]+)"?;/)[1];
    assert.match(body,/font-display:\s*swap/,family);
    assert.match(body,/unicode-range:/,family);
    const urls=[...body.matchAll(/url\("([^"]+)"\)/g)].map(m=>m[1]);
    assert.ok(urls.length>0,family);
    for(const url of urls) {
      // Versioned by library version so the host can cache fonts as immutable.
      const route=`/_portal/fonts/${version}/`, name=url.replace(route,'');
      assert.ok(url.startsWith(route)&&/^[a-z0-9-]+\.woff2$/.test(name),`${url} uses the versioned host font route ${route}`);
      assert.ok(shipped.has(name),`${name} is shipped in fonts/`);
      assert.equal((await readFile(path.join(root,'fonts',name))).subarray(0,4).toString(),'wOF2',name);
    }
    assert.match(notice,new RegExp(`${family}[^\\n]*SIL Open Font License`),`NOTICE.md names ${family} with its licence`);
  }
  for(const preset of ['--portal-font:','--portal-font-heading:'])for(const [,stack] of css.matchAll(new RegExp(`${preset}\\s*([^;]+);`,'g')))if(!stack.startsWith('var('))assert.match(stack,/(sans-serif|serif)\s*$/,`${stack} ends in a system fallback`);
});

test('buy-now is a privileged component and its reference page says so', async () => {
  const catalogue=await loadCatalogue();
  const buyNow=catalogue.components.find(c=>c.name==='buy-now');
  assert.ok(buyNow,'buy-now is in the catalogue');
  assert.equal(buyNow.security,'privileged');
  assert.equal(catalogue.components.find(c=>c.name==='button').security,'pure');
  const generated=JSON.parse(await read('catalogue.generated.json'));
  assert.equal(generated.components.find(c=>c.name==='buy-now').security,'privileged');
  const { build } = await import('./site.mjs');
  await build();
  const page=await read('site/reference/buy-now.html');
  assert.match(page,/<span class="security-badge"[^>]*>Privileged<\/span>/);
  assert.doesNotMatch(await read('site/reference/button.html'),/security-badge/);
  // Its server code is part of the source a reader copies.
  assert.match(page,/ctx\.script\.load/);
});
test('evented components stay static in the showcase, which has no signer', async () => {
  const buyNow=await read('rendered/buy-now.html');
  assert.match(buyNow,/<button[^>]*\sdisabled[\s=>][^>]*value="submit"/);
  assert.doesNotMatch(buyNow,/data-portal-instance|_portal_instance/,'no token or instance form without a signer');
  const estimate=await read('rendered/estimate-panel.html');
  assert.match(estimate,/data-portal-change="estimate"/);
  assert.match(estimate,/data-portal-region="c1-total"/);
});
