import { readFile, writeFile, readdir, mkdir, rm, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, loadCatalogue } from './catalogue.mjs';
export const digest = value => createHash('sha256').update(value).digest('hex');
export const html = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export async function inputFiles(base = root) {
  const inputs = {};
  async function visit(relative) {
    const entries = await readdir(path.join(base,relative),{withFileTypes:true});
    for (const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
      const name = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Symlink not allowed: ${name}`);
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) inputs[name] = digest(await readFile(path.join(base,name)));
    }
  }
  inputs['catalogue.json'] = digest(await readFile(path.join(base,'catalogue.json')));
  for (const folder of ['components','examples','styles']) await visit(folder);
  return Object.fromEntries(Object.entries(inputs).sort(([a],[b])=>a.localeCompare(b)));
}
export async function verifyRendered(catalogue,base=root) {
  const manifest = JSON.parse(await readFile(path.join(base,'rendered/manifest.json'),'utf8').catch(()=>{throw new Error('Missing actual-renderer manifest; run portal-showcase-render first.')}));
  if (manifest.contractVersion !== catalogue.contractVersion || manifest.libraryVersion !== catalogue.version || !manifest.rendererRevision) throw new Error('Renderer/library compatibility mismatch');
  const actual = await inputFiles(base);
  const expected = Object.fromEntries(Object.entries(manifest.inputFiles??{}).sort(([a],[b])=>a.localeCompare(b)));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Render inputs changed; regenerate examples with the actual Swift renderer.');
  if (JSON.stringify(Object.keys(manifest.examples??{}).sort()) !== JSON.stringify(catalogue.components.map(c=>c.name).sort())) throw new Error('Rendered example inventory differs from catalogue');
  for (const item of catalogue.components) {
    const entry = manifest.examples[item.name];
    if (entry.sourceSha256 !== actual[item.example] || entry.htmlSha256 !== digest(await readFile(path.join(base,item.rendered)))) throw new Error(`Render integrity mismatch: ${item.name}`);
  }
  return manifest;
}
function nav(catalogue, prefix, active) {
  const groups=new Map();
  for(const component of catalogue.components) {
    if(!groups.has(component.category))groups.set(component.category,[]);
    groups.get(component.category).push(component);
  }
  return [...groups].map(([category,components])=>`<h2>${html(category)}</h2>`+components.map(c=>
    `<a href="${prefix}reference/${c.name}.html"${active===c.name?' aria-current="page"':''}>${html(c.name)}</a>`
  ).join('')).join('');
}
function shell(catalogue,title,body,active='') {
  const prefix=active?'../':'';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Ownable DataXML components for server-rendered portals: usage, contracts, themes and live examples."><title>${html(title)} · Portal Components</title><link rel="stylesheet" href="${prefix}assets/site.css"><script src="${prefix}assets/site.js" defer></script></head><body><a class="skip" href="#main">Skip to content</a><header class="topbar"><a class="brand" href="${prefix}index.html"><span class="brand-mark" aria-hidden="true">p.</span>portal<span class="brand-sub">components</span></a><div class="top-links"><a href="${prefix}LLM.md">For agents ↗</a><a href="${prefix}catalogue.generated.json">Catalogue ↗</a><span class="version">v${html(catalogue.version)}</span></div></header><div class="layout"><aside class="sidebar" aria-label="Component navigation"><label for="filter">Find a component</label><input id="filter" type="search" placeholder="Search components…" autocomplete="off"><nav>${nav(catalogue,prefix,active)}</nav><p class="sidebar-note">DataXML presentation.<br>Lua on the server.<br>Your source to own.</p></aside><main id="main">${body}<footer class="page-footer">MIT licensed · Built with actual Portal renderer output · <a href="${prefix}llms-full.txt">Complete LLM reference</a></footer></main></div></body></html>`;
}
function propsTable(c) {
  const entries=Object.entries(c.definition.props);
  return entries.length?`<div class="table-scroll"><table><thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Values</th></tr></thead><tbody>${entries.map(([name,p])=>`<tr><th scope="row"><code>${html(name)}</code></th><td>${html(p.type)}${p.nullable?' / null':''}</td><td>${p.required?'<span class="required">required</span>':Object.hasOwn(p,'default')?`<code>${html(JSON.stringify(p.default))}</code>`:'omitted'}</td><td>${p.enum?p.enum.map(v=>`<code>${html(v)}</code>`).join(' '):'—'}</td></tr>`).join('')}</tbody></table></div>`:'<p>This component has no props.</p>';
}
export async function build() {
  const catalogue=await loadCatalogue(); const manifest=await verifyRendered(catalogue);
  const out=path.join(root,'site'); await rm(out,{recursive:true,force:true});
  for(const dir of ['reference','rendered','styles','assets'])await mkdir(path.join(out,dir),{recursive:true});
  for(const dir of ['styles','rendered','docs','examples'])await cp(path.join(root,dir),path.join(out,dir),{recursive:true});
  await cp(path.join(root,'components'),path.join(out,'components'),{recursive:true});
  for(const file of ['catalogue.json','LLM.md','llms.txt','llms-full.txt','catalogue.generated.json','LICENSE'])await cp(path.join(root,file),path.join(out,file));
  const cards=catalogue.components.map(c=>`<a class="component-card" href="reference/${c.name}.html"><span class="category">${html(c.category)}</span><h3>${html(c.name)} <span aria-hidden="true">↗</span></h3><p>${html(c.description)}</p></a>`).join('');
  const overview=`<section class="hero"><p class="eyebrow">THE PORTAL BUILDING BLOCKS</p><h1>Make it yours.<br><em>Keep it simple.</em></h1><p class="lead">Semantic HTML foundations, readable DataXML, and a theme that belongs to you. Use the bundled components. Copy one when you need more control.</p><div class="hero-actions"><a class="primary-link" href="reference/button.html">Explore components <span aria-hidden="true">→</span></a><a href="docs/authoring.md">Read the authoring guide</a></div><div class="facts"><span><strong>${catalogue.components.length}</strong> native building blocks</span><span><strong>3</strong> token themes</span><span><strong>0</strong> frontend frameworks</span></div></section><section aria-labelledby="components-heading"><div class="section-heading"><h2 id="components-heading">A useful foundation.</h2><span>Composition over complexity</span></div><div class="card-grid">${cards}</div></section><section class="principles"><h2>Readable by people.<br>Reliable for agents.</h2><p>Every example is compiled by the real Swift Portal renderer. The same contracts generate this reference and the machine-readable catalogue—so a copyable example is more than a pretty mockup.</p><a href="llms-full.txt">Open the complete LLM reference →</a><p class="build-note">Renderer: <code>${html(manifest.rendererRevision)}</code></p></section>`;
  await writeFile(path.join(out,'index.html'),shell(catalogue,'Ownable server-rendered UI',overview));
  for(const c of catalogue.components) {
    const slots=Object.entries(c.definition.slots).map(([name,s])=>`<li><code>${html(name)}</code> <span>${s.required?'required':'optional'}</span></li>`).join('');
    const body=`<header class="component-heading"><p class="eyebrow">${html(c.category)}</p><h1>${html(c.name)}</h1><p class="lead">${html(c.description)}</p><a class="source-link" href="../components/${c.name}.html" download="${c.name}.html">Own the source ↗</a> <a class="source-link" href="../components/${c.name}.json">Contract ↗</a></header><section class="example-panel" aria-label="Rendered example"><div class="example-toolbar"><span><span class="live-dot" aria-hidden="true"></span> Actual renderer output</span><label>Theme <select data-theme-select><option value="light">Light</option><option value="dark">Dark</option><option value="atelier">Atelier</option></select></label></div><iframe title="${html(c.name)} component example" src="../${c.rendered}" loading="lazy" data-example></iframe><p class="example-notice">Static demonstration. Controls are native; no business actions or orders are submitted.</p></section><section class="usage"><div class="section-heading"><h2>Usage</h2><button type="button" data-copy="usage-source">Copy source</button></div><pre><code id="usage-source">${html(c.usage.trim())}</code></pre><p class="copy-status" role="status" aria-live="polite"></p></section><details class="source-details"><summary>Component source and contract</summary><h2>Template</h2><pre><code>${html(c.template.trim())}</code></pre><h2>Contract</h2><pre><code>${html(JSON.stringify(c.definition,null,2))}</code></pre></details><section><h2>Props</h2>${propsTable(c)}</section><section><h2>Slots</h2>${slots?`<ul class="slot-list">${slots}</ul>`:'<p>No slots. Configure this component through its props.</p>'}</section><section class="a11y-note"><h2>Accessibility &amp; limits</h2><p>${html(c.accessibility)}</p></section><section><h2>Make it yours</h2><p>Override inherited <code>--portal-*</code> styling tokens, or copy the template and contract pair into your site’s <code>components/</code> folder. Local source wins over the bundled default.</p><a href="../docs/themes.md">Theme guide →</a></section>`;
    await writeFile(path.join(out,'reference',c.name+'.html'),shell(catalogue,c.name,body,c.name));
  }
  await cp(path.join(root,'scripts/site.css'),path.join(out,'assets/site.css'));
  await cp(path.join(root,'scripts/site-browser.js'),path.join(out,'assets/site.js'));
  await writeFile(path.join(out,'.nojekyll'),'');
  console.log(`Built ${catalogue.components.length} component pages from verified Swift output.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
