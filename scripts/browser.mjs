import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, loadCatalogue, readComponent } from './catalogue.mjs';
import { themeNames } from './site.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8');
const catalogue=await loadCatalogue();
const base=path.join(root,'site');
// The exact document policy the Portal host sends with rendered pages. In the
// platform repository it is read from the renderer, so the two cannot drift;
// the public mirror uses this copy.
const portalCSP=await (async()=>{
  const copy="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
  const swift=await readFile(path.join(root,'../../Sources/PulseApp/Sources/PortalSiteKit/PortalSiteRenderer.swift'),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(swift===null)return copy;
  const actual=swift.match(/static let contentSecurityPolicy = "([^"]+)"/)?.[1];
  assert.equal(actual,copy,'browser.mjs CSP copy matches PortalSiteRenderer.contentSecurityPolicy');
  return actual;
})();
const prefix='/portal-components/';
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://local');
    if(!url.pathname.startsWith(prefix)) {res.writeHead(404).end();return;}
    const relative=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html';
    const file=path.resolve(base,relative);
    if(!file.startsWith(base+path.sep)) {res.writeHead(403).end();return;}
    if(!(await stat(file)).isFile()) {res.writeHead(404).end();return;}
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.md':'text/plain','.txt':'text/plain','.svg':'image/svg+xml','.woff2':'font/woff2'};
    if(url.searchParams.get('csp')==='portal')res.setHeader('content-security-policy',portalCSP);
    res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}${prefix}`;
let browser;
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(address).origin});
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
  async function auditDocumentation(label) {
    await page.addScriptTag({content:axe});
    const violations=await page.evaluate(async()=>{
      // Component documents are audited separately below in every supplied theme.
      const result=await window.axe.run({exclude:[['iframe']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
      return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
    });
    assert.deepEqual(violations,[],`${label} documentation: ${JSON.stringify(violations)}`);
  }
  // System is the default for both the documentation shell and preview documents.
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto(`${address}reference/button.html`);await page.locator('html[data-theme-ready=true]').waitFor();
  assert.equal(await page.locator('[data-theme-select]').inputValue(),'system');
  assert.equal(await page.locator('html').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(37, 22, 32)');
  assert.equal(await page.locator('.topbar').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(37, 22, 32)');
  assert.equal(await page.frameLocator('iframe').locator('.portal-theme').getAttribute('data-theme'),'dark');
  await auditDocumentation('system dark');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  assert.equal(await page.frameLocator('iframe').locator('.portal-theme').getAttribute('data-theme'),'light');
  assert.equal(await page.locator('html').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
  await page.locator('[data-theme-select]').selectOption('neutral-dark');
  await page.emulateMedia({colorScheme:'dark'});await page.emulateMedia({colorScheme:'light'});
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.locator('[data-theme-select]').selectOption('system');
  await page.goto(address);
  await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.locator('.brand img').evaluate(img=>img.complete&&img.naturalWidth>0),'Official logo loads');
  assert.equal(await page.locator('.brand img').getAttribute('alt'),'CoCoCo');
  assert.ok(await page.locator('html').evaluate(node=>getComputedStyle(node).fontFamily.includes('Sofia Sans')));
  assert.ok(await page.locator('.hero h1').evaluate(node=>getComputedStyle(node).fontFamily.includes('Sofia Sans Condensed')));
  assert.ok(await page.evaluate(()=>document.fonts.check('400 17px "Sofia Sans"')&&document.fonts.check('700 48px "Sofia Sans Condensed"')));
  await auditDocumentation('index');
  assert.equal(await page.locator('.component-card').count(),catalogue.components.length);
  await page.locator('#filter').fill('disclosure');
  assert.equal(await page.locator('.sidebar nav a:visible').count(),1);
  const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.href));
  for(const link of new Set(links))if(link.startsWith(address))assert.ok((await page.request.get(link)).ok(),link);
  await page.goto(`${address}layouts.html`);
  await auditDocumentation('page examples');
  assert.equal(await page.locator('.layout-card').count(),4);
  for(const layout of catalogue.layouts??[]) {
    await page.goto(`${address}layouts/${layout.name}.html`);
    await page.locator('html[data-theme-ready=true]').waitFor();
    await auditDocumentation(layout.name);
    assert.equal(await page.locator('#usage-source').textContent(),layout.usage.trim());
    await page.locator('[data-copy="usage-source"]').click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),layout.usage.trim());
    const iframe=await (await page.locator('[data-layout-example]').elementHandle()).contentFrame();
    await iframe.locator('.portal-layout').waitFor();
    await iframe.addScriptTag({content:axe});
    assert.equal(await iframe.locator('form').count(),0,'Static examples must never submit credentials or business data');
    // Interface controls (tabs, overlays, steppers, copy) work; business actions stay disabled.
    assert.equal(await iframe.locator('button:not([disabled], [data-portal-command], [data-portal-tab], [popovertarget])').count(),0,'Illustrative business actions must stay disabled');
    assert.equal(await iframe.locator('h1').count(),1);
    for(const theme of themeNames) {
      await page.locator('[data-theme-select]').selectOption(theme);
      // Colour transitions (--portal-motion) must settle before contrast is measured.
      await page.waitForTimeout(250);
      const [preset,mode]=theme.split('-');
      assert.equal(await iframe.locator('.portal-layout').getAttribute('data-theme'),mode);
      assert.equal(await iframe.locator('.portal-layout').getAttribute('data-preset'),preset==='neutral'?null:preset);
      const violations=await iframe.evaluate(async()=>{
        const result=await window.axe.run(document.querySelector('.portal-layout'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
        return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
      });
      assert.deepEqual(violations,[],`${layout.name}/${theme}: ${JSON.stringify(violations)}`);
      // axe skips disabled controls; their text must still read at 3:1 on what is behind it.
      const disabled=await iframe.evaluate(()=>{
        const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const x=canvas.getContext('2d',{willReadFrequently:true});
        const lum=([r,g,b])=>[r,g,b].map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
        // Layers are [colour, opacity]; a control's opacity fades its own background and text.
        const paint=layers=>{x.globalAlpha=1;x.fillStyle='#fff';x.fillRect(0,0,1,1);for(const [c,o] of layers){x.globalAlpha=o;x.fillStyle='#000';x.fillStyle=c;x.fillRect(0,0,1,1);}return [...x.getImageData(0,0,1,1).data].slice(0,3);};
        return [...document.querySelectorAll('.portal-layout :disabled')].filter(node=>node.getClientRects().length).map(node=>{
          const layers=[];let fade=1;for(let n=node;n;n=n.parentElement)fade*=Number(getComputedStyle(n).opacity);
          for(let n=node.parentElement;n;n=n.parentElement)layers.unshift([getComputedStyle(n).backgroundColor,1]);
          const own=[getComputedStyle(node).backgroundColor,fade];
          const back=paint([...layers,own]), text=paint([...layers,own,[getComputedStyle(node).color,fade]]);
          const [a,b]=[lum(back),lum(text)].sort((p,q)=>q-p);
          return {name:node.textContent.trim()||node.name,ratio:(a+.05)/(b+.05)};
        }).filter(item=>item.ratio<3);
      });
      assert.deepEqual(disabled,[],`${layout.name}/${theme}: disabled controls below 3:1`);
    }
    await page.locator('[data-preview-width="390"]').click();
    assert.equal(await page.locator('[data-preview-width="390"]').getAttribute('aria-pressed'),'true');
    await page.waitForFunction(()=>document.querySelector('[data-layout-example]').clientWidth<=390);
    assert.ok(await iframe.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${layout.name} simulated mobile overflow`);
    await page.locator('[data-preview-width="full"]').click();
    await page.setViewportSize({width:375,height:812});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${layout.name} docs mobile overflow`);
    assert.ok(await iframe.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${layout.name} page mobile overflow`);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(base,`${layout.name}-mobile.png`),fullPage:false});
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-theme-select]').selectOption('neutral-light');
    const standalone=await browser.newPage({viewport:{width:1280,height:900},javaScriptEnabled:false});
    await standalone.goto(`${address}${layout.rendered}`);
    await standalone.screenshot({path:path.join(base,`${layout.name}-desktop.png`),fullPage:true});
    const disclosure=standalone.locator('summary').first();
    if(await disclosure.count()) { const wasOpen=await disclosure.evaluate(n=>n.parentElement.open);await disclosure.click();assert.equal(await disclosure.evaluate(n=>n.parentElement.open),!wasOpen); }
    await standalone.setViewportSize({width:390,height:844});
    assert.ok(await standalone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${layout.name} standalone no-JS mobile overflow`);
    await standalone.screenshot({path:path.join(base,`${layout.name}-page-mobile.png`),fullPage:true});
    await standalone.close();
    await page.setViewportSize({width:1280,height:900});
  }
  for(const component of catalogue.components) {
    await page.goto(`${address}reference/${component.name}.html`);
    await auditDocumentation(component.name);
    const frame=page.frameLocator('iframe');
    await frame.locator('.portal-theme').waitFor();
    assert.equal(await page.locator('#usage-source').textContent(),component.usage.trim());
    assert.ok(await page.locator('#usage-source .hljs-name').count()>0,'DataXML tags are highlighted');
    // The whole .portal file, highlighted, under "Component source".
    assert.equal(await page.locator('.source-details code').textContent(),(await readComponent(component.name)).source.trim(),`${component.name}: component source`);
    assert.ok(await page.locator('.source-details .hljs-name').count()>0,'Component source tags are highlighted');
    assert.equal(await page.locator('.source-link[download]').getAttribute('download'),`${component.name}.portal`);
    if(component.name==='button') {
      await page.locator('[data-copy]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('.copy-status')?.textContent==='Source copied.');
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),component.usage.trim());
    }
    const iframe=await (await page.locator('iframe').elementHandle()).contentFrame();
    await iframe.addScriptTag({content:axe});
    const violations=await iframe.evaluate(async()=>{
      const result=await window.axe.run(document.querySelector('.portal-theme'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
      return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
    });
    assert.deepEqual(violations,[],`${component.name}: ${JSON.stringify(violations)}`);
    for(const theme of [...themeNames.slice(1),themeNames[0]]) {
      await page.locator('[data-theme-select]').selectOption(theme);
      // Colour transitions (--portal-motion) must settle before contrast is measured.
      await page.waitForTimeout(250);
      const [preset,mode]=theme.split('-');
      assert.equal(await frame.locator('.portal-theme').getAttribute('data-theme'),mode);
      assert.equal(await frame.locator('.portal-theme').getAttribute('data-preset'),preset==='neutral'?null:preset);
      assert.notEqual(await frame.locator('.portal-theme').evaluate(root=>getComputedStyle(root).backgroundColor),'rgba(0, 0, 0, 0)',`${theme} must supply its own canvas`);
      const themedViolations=await iframe.evaluate(async()=>{
        const result=await window.axe.run(document.querySelector('.portal-theme'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
        return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
      });
      assert.deepEqual(themedViolations,[],`${component.name}/${theme}: ${JSON.stringify(themedViolations)}`);
    }
    const associations=await iframe.evaluate(()=>{
      const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);
      const errors=ids.filter((id,index)=>ids.indexOf(id)!==index).map(id=>`duplicate ${id}`);
      for(const label of document.querySelectorAll('label[for]'))if(!document.getElementById(label.htmlFor))errors.push(`missing label target ${label.htmlFor}`);
      for(const node of document.querySelectorAll('[aria-describedby]'))for(const id of node.getAttribute('aria-describedby').split(/\s+/))if(id&&!document.getElementById(id))errors.push(`missing description ${id}`);
      return errors;
    });
    assert.deepEqual(associations,[],component.name);
    await page.setViewportSize({width:375,height:812});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${component.name} mobile overflow`);
    await page.setViewportSize({width:1280,height:900});
  }
  // Native overlays and runtime-enhanced components. The Portal host serves the
  // runtime; previews do not, so the checks inject the sibling portal-runtime
  // build (PORTAL_RUNTIME_JS overrides the path).
  const runtime=await readFile(process.env.PORTAL_RUNTIME_JS??path.join(root,'../portal-runtime/dist/portal-runtime.js'),'utf8').catch(()=>null);
  const enhance=async target=>{await target.addScriptTag({content:runtime,type:'module'});await target.waitForFunction(()=>document.querySelector('[data-portal-behavior] [data-portal-enhanced-only]:not([hidden])'));};
  const nojsContext=await browser.newContext({javaScriptEnabled:false});
  const withoutJS=await nojsContext.newPage();
  {
    // Without JS: the dialog trigger and steppers stay hidden, the number input
    // and every tab panel remain, and the dialog content is still in the page.
    await withoutJS.goto(`${address}rendered/dialog.html`);
    assert.ok(await withoutJS.locator('.portal-dialog > button[data-portal-command="open"]').first().isHidden(),'no-JS dialog trigger is hidden');
    assert.ok(await withoutJS.locator('.portal-dialog dialog .portal-dialog__body').first().evaluate(node=>node.textContent.trim().length>0),'no-JS dialog content stays in the page');
    await withoutJS.goto(`${address}rendered/quantity-input.html`);
    assert.ok(await withoutJS.locator('.portal-quantity input[type=number]').first().isVisible(),'no-JS number input remains');
    assert.equal(await withoutJS.locator('.portal-quantity button:visible').count(),0,'no-JS steppers are hidden');
    await withoutJS.goto(`${address}rendered/tabs.html`);
    const panels=withoutJS.locator('.portal-tab-panel');
    assert.ok(await panels.count()>=2);
    for(const panel of await panels.all()){assert.ok(await panel.isVisible(),'no-JS tab panels are all visible');assert.ok(await panel.locator('.portal-tab-panel__title').isVisible(),'no-JS panels show their title');}
    // Popovers are native: the menu opens without JS.
    await withoutJS.goto(`${address}rendered/menu.html`);
    await withoutJS.locator('.portal-menu > button').first().click();
    assert.ok(await withoutJS.locator('.portal-menu__panel').first().evaluate(node=>node.matches(':popover-open')),'no-JS menu opens natively');
  }
  for(const [name,trigger,panel] of [['menu','.portal-menu > button','.portal-menu__panel'],['popover','.portal-popover > button','.portal-popover__panel']]) {
    await page.goto(`${address}rendered/${name}.html`);
    const button=page.locator(trigger).first(), target=page.locator(panel).first(), open=()=>target.evaluate(node=>node.matches(':popover-open'));
    for(const key of ['Enter','Space']) {
      await button.focus();await page.keyboard.press(key);
      assert.ok(await open(),`${name} opens with ${key}`);
      await page.keyboard.press('Escape');
      assert.ok(!(await open()),`${name} closes on Escape`);
    }
    await button.click();assert.ok(await open());
    await page.mouse.click(2,2);
    assert.ok(!(await open()),`${name} light-dismisses`);
  }
  {
    // The stretched title link covers the card; the actions slot sits above it.
    await page.goto(`${address}rendered/product-card.html`);
    const hit=await page.locator('.portal-product-card').first().evaluate(card=>{
      const at=node=>{const r=node.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);};
      const media=card.querySelector('.portal-product-card__media')??card, action=card.querySelector('.portal-product-card__actions button, .portal-product-card__actions a');
      return {media:at(media)?.closest('a')===card.querySelector('.portal-product-card__title a'),action:!!action&&action.contains(at(action))};
    });
    assert.deepEqual(hit,{media:true,action:true},'product card link and action are both clickable');
  }
  if(!runtime)console.warn('SKIPPED runtime-enhanced component checks: portal-runtime build not found (set PORTAL_RUNTIME_JS).');
  else {
    // Dialog, with native invoker commands and with them removed (runtime fallback).
    for(const native of [true,false]) {
      const context=await browser.newContext();
      if(!native)await context.addInitScript(()=>{delete HTMLButtonElement.prototype.commandForElement;delete HTMLButtonElement.prototype.command;});
      const tab=await context.newPage();
      await tab.goto(`${address}rendered/dialog.html`);await enhance(tab);
      const opener=tab.locator('.portal-dialog > button[data-portal-command="open"]').first(), dialog=tab.locator('.portal-dialog dialog').first();
      assert.equal(await tab.evaluate(()=>'commandForElement' in HTMLButtonElement.prototype),native);
      await opener.click();
      assert.ok(await dialog.evaluate(node=>node.open&&node.matches(':modal')),`dialog opens (native invokers: ${native})`);
      await tab.keyboard.press('Escape');
      assert.ok(!(await dialog.evaluate(node=>node.open)),'Escape closes the dialog');
      assert.ok(await opener.evaluate(node=>node===document.activeElement),'focus returns to the trigger');
      await opener.click();await dialog.locator('[data-portal-command="close"]').first().click();
      assert.ok(!(await dialog.evaluate(node=>node.open)),'the close button closes the dialog');
      await context.close();
    }
    await page.goto(`${address}rendered/tabs.html`);await enhance(page);
    const tabs=page.locator('.portal-tabs').first().locator('[data-portal-tab]');
    const first=tabs.nth(0), second=tabs.nth(1);
    assert.equal(await first.getAttribute('aria-selected'),'true');
    await first.focus();await page.keyboard.press('ArrowRight');
    assert.equal(await second.getAttribute('aria-selected'),'true','ArrowRight selects the next tab');
    assert.ok(await second.evaluate(node=>node===document.activeElement));
    assert.ok(await page.locator(`#${await second.getAttribute('aria-controls')}`).isVisible());
    assert.ok(await page.locator(`#${await first.getAttribute('aria-controls')}`).isHidden());
    await page.goto(`${address}rendered/quantity-input.html`);await enhance(page);
    const quantity=page.locator('.portal-quantity').first(), field=quantity.locator('input[type=number]');
    const max=Number(await field.getAttribute('max'));
    assert.ok(max>Number(await field.inputValue()),'example leaves room below max');
    for(let i=0;i<max+2;i++)await quantity.locator('[data-portal-command="increment"]').click();
    assert.equal(Number(await field.inputValue()),max,'+ increments within max');
  }
  {
    // The key display shows only the masked value, with or without the runtime.
    await page.goto(`${address}rendered/key-display.html`);
    const secret=(await page.locator('.portal-key-display [data-portal-copy-source]').first().textContent()).trim();
    assert.ok(secret.length>20);
    assert.ok(!(await page.locator('body').evaluate(node=>node.innerText)).includes(secret),'the secret never appears in visible text');
    // Review focus 5: on a right-to-left page the basket total sits at the inline end (left).
    await page.setViewportSize({width:360,height:800});
    await page.goto(`${address}rendered/basket-line.html`);
    for(const dir of ['ltr','rtl']) {
      const edges=await page.evaluate(dir=>{document.documentElement.dir=dir;const line=document.querySelector('.portal-basket-line'),total=line.querySelector('.portal-basket-line__total');const a=line.getBoundingClientRect(),b=total.getBoundingClientRect();return {start:dir==='rtl'?a.right-b.right:b.left-a.left,end:dir==='rtl'?b.left-a.left:a.right-b.right};},dir);
      assert.ok(Math.abs(edges.end)<2&&edges.start>40,`${dir}: basket total sits at the inline end ${JSON.stringify(edges)}`);
    }
    await page.setViewportSize({width:1280,height:900});
  }
  if(runtime) {
    // A code block copies its text; a key display copies the full secret but
    // only ever shows the server-masked value.
    await page.goto(`${address}rendered/code-block.html`);await enhance(page);
    const block=page.locator('.portal-code-block').first();
    await block.locator('[data-portal-command="copy"]').click();
    await page.waitForFunction(()=>document.querySelector('.portal-code-block')?.hasAttribute('data-portal-copied'));
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),(await block.locator('[data-portal-copy-source]').textContent()).trim(),'code block copies its text');
    await page.goto(`${address}rendered/key-display.html`);await enhance(page);
    const key=page.locator('.portal-key-display').first(), secret=(await key.locator('[data-portal-copy-source]').textContent()).trim();
    assert.ok(!(await page.locator('body').evaluate(node=>node.innerText)).includes(secret),'the secret never appears in visible text, enhanced');
    assert.ok((await key.innerText()).includes(await key.locator('.portal-key-display__masked').textContent()),'the masked value is shown');
    await key.locator('[data-portal-command="copy"]').click();
    await page.waitForFunction(()=>document.querySelector('.portal-key-display')?.hasAttribute('data-portal-copied'));
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),secret,'the key display copies the full secret');
    await page.waitForFunction(()=>document.querySelector('.portal-key-display [data-portal-copy-status]')?.textContent==='Copied');
    // copiedMessage localises the announcement through the scoped hidden text.
    const german=page.locator('[lang="de"] .portal-key-display');
    await german.locator('[data-portal-command="copy"]').click();
    await page.waitForFunction(()=>document.querySelector('[lang="de"] .portal-key-display [data-portal-copy-status]')?.textContent==='Schlüssel kopiert');
    assert.ok(await german.locator('[data-portal-copied-text]').isHidden(),'the localised text is not shown');
  }
  await withoutJS.goto(`${address}rendered/code-block.html`);
  assert.ok(await withoutJS.locator('.portal-code-block [data-portal-command="copy"]').first().isHidden(),'no-JS copy button is hidden');
  await page.goto(`${address}rendered/timeline.html`);
  const steps=await page.locator('.portal-timeline').first().locator('.portal-timeline-step').evaluateAll(nodes=>nodes.map(node=>({state:node.dataset.state,current:node.getAttribute('aria-current'),said:node.querySelector('.portal-visually-hidden')?.textContent.trim()??''})));
  assert.equal(steps.filter(step=>step.current==='step').length,1,'exactly one current step');
  for(const step of steps){assert.equal(step.current,step.state==='current'?'step':null);assert.ok(step.said.length>0,'state is spelled out for screen readers');}
  await nojsContext.close();
  // Test actual computed styles, not only that tokens are declared in CSS.
  // Colours may compute as oklch(); a canvas resolves any CSS colour to sRGB.
  const contrastScript=`window.__srgb=colour=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.fillStyle='#000';x.fillStyle=colour;x.fillRect(0,0,1,1);return [...x.getImageData(0,0,1,1).data].slice(0,3);};
    window.__contrast=(a,b)=>{const l=c=>{const [r,g,bl]=__srgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*bl;};const [x,y]=[l(a),l(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};`;
  await page.goto(`${address}rendered/card.html`);
  const branded = await page.evaluate(()=>{
    const root=document.querySelector('.portal-theme');
    const values={'--portal-font':'Georgia, serif','--portal-font-heading':'monospace','--portal-type-ratio':'1.5','--portal-radius':'4px','--portal-card-shadow':'rgb(1, 2, 3) 0px 4px 8px 0px'};
    for(const [key,value] of Object.entries(values))root.style.setProperty(key,value);
    const heading=document.createElement('h1');heading.textContent='Brand heading';root.append(heading);
    const card=getComputedStyle(root.querySelector('.portal-card')), h=getComputedStyle(heading), body=getComputedStyle(root);
    return {font:body.fontFamily,headingFont:h.fontFamily,headingSize:h.fontSize,radius:card.borderTopLeftRadius,shadow:card.boxShadow};
  });
  assert.ok(branded.font.includes('Georgia'));assert.equal(branded.headingFont,'monospace');
  assert.equal(branded.headingSize,'81px','h1 is 1rem × ratio⁴');assert.equal(branded.radius,'6px','card radius is 1.5 × --portal-radius');
  assert.ok(branded.shadow.includes('rgb(1, 2, 3)'));
  await page.goto(`${address}rendered/button.html`);
  await page.addScriptTag({content:contrastScript});
  const buttonTokens=await page.evaluate(()=>{
    const root=document.querySelector('.portal-theme'),button=root.querySelector('.portal-button');
    // Read settled values: colour transitions would otherwise report the start colour.
    root.style.setProperty('--portal-motion','0ms');
    root.style.setProperty('--portal-brand','#123456');
    button.focus();
    const inherited=getComputedStyle(button);const result={background:inherited.backgroundColor,color:__srgb(inherited.color).join(),focus:inherited.outlineWidth};
    const wrapper=document.createElement('div');wrapper.style.setProperty('--portal-primary','#654321');button.replaceWith(wrapper);wrapper.append(button);
    result.localBackground=getComputedStyle(button).backgroundColor;
    wrapper.style.setProperty('--portal-button-background','#fde047');result.componentBackground=getComputedStyle(button).backgroundColor;
    result.componentColor=__srgb(getComputedStyle(button).color).join();
    return result;
  });
  assert.equal(buttonTokens.background,'rgb(18, 52, 86)');assert.equal(buttonTokens.color,'255,255,255','dark brand derives white text');
  assert.equal(buttonTokens.localBackground,'rgb(101, 67, 33)');assert.equal(buttonTokens.componentBackground,'rgb(253, 224, 71)');
  assert.equal(buttonTokens.componentColor,'0,0,0','pale button background derives black text');assert.equal(buttonTokens.focus,'2px');
  // Review focus 1: extreme brands keep legible button text and a visible focus ring.
  // Hover and pressed (:active) states keep legible text and visibly change.
  for(const brand of [null,'#fde047','#0a0a0a']) for(const theme of themeNames) {
    const label=`${brand??'preset brand'}/${theme}`;
    await page.goto(`${address}rendered/button.html`);
    await page.addScriptTag({content:contrastScript});
    const result=await page.evaluate(([brand,theme])=>{
      const root=document.querySelector('.portal-theme'),[preset,mode]=theme.split('-');
      root.style.setProperty('--portal-motion','0ms');
      root.dataset.theme=mode;if(preset!=='neutral')root.dataset.preset=preset;
      if(brand)root.style.setProperty('--portal-brand',brand);
      for(const variant of ['primary','secondary','danger']){const probe=document.createElement('button');probe.type='button';probe.className='portal-button';probe.dataset.variant=variant;probe.id=`probe-${variant}`;probe.textContent=variant;root.append(probe);}
      const button=root.querySelector('#probe-primary');
      button.focus();
      const style=getComputedStyle(button);
      return {text:__contrast(style.color,style.backgroundColor),focusVisible:button.matches(':focus-visible'),outline:parseFloat(style.outlineWidth),outlineStyle:style.outlineStyle,ring:__contrast(style.outlineColor,getComputedStyle(root).backgroundColor)};
    },[brand,theme]);
    assert.ok(result.text>=4.5,`${label} button text contrast ${result.text.toFixed(2)}`);
    assert.ok(result.focusVisible&&result.outline>0&&result.outlineStyle!=='none',`${label} focus outline`);
    assert.ok(result.ring>=3,`${label} focus ring is distinguishable from the canvas (${result.ring.toFixed(2)})`);
    for(const variant of ['primary','secondary','danger']) {
      const probe=page.locator(`#probe-${variant}`);
      const read=()=>probe.evaluate(node=>{const s=getComputedStyle(node);return {bg:s.backgroundColor,text:__contrast(s.color,s.backgroundColor)};});
      await page.mouse.move(0,0);const rest=await read();
      await probe.hover();const hover=await read();
      await page.mouse.down();const pressed=await read();await page.mouse.up();
      for(const [state,value] of [['rest',rest],['hover',hover],['pressed',pressed]])assert.ok(value.text>=4.5,`${label} ${variant} ${state} text contrast ${value.text.toFixed(2)}`);
      assert.notEqual(hover.bg,rest.bg,`${label} ${variant} hover is visible`);
      assert.notEqual(pressed.bg,hover.bg,`${label} ${variant} pressed differs from hover`);
    }
  }
  // Review focus 2: a nested brand override re-derives hover inside the wrapper.
  await page.goto(`${address}rendered/button.html`);
  await page.evaluate(()=>{
    const root=document.querySelector('.portal-theme');
    for(const id of ['outside','inside']) {
      const button=document.createElement('button');button.type='button';button.className='portal-button';button.id=id;button.textContent=id;
      if(id==='inside'){const wrapper=document.createElement('div');wrapper.style.setProperty('--portal-brand','#e11d48');wrapper.append(button);root.append(wrapper);}else root.append(button);
    }
  });
  const hovered=async id=>{await page.locator(`#${id}`).hover();await page.waitForTimeout(250);return page.locator(`#${id}`).evaluate(node=>getComputedStyle(node).backgroundColor);};
  const outside=await hovered('outside'), inside=await hovered('inside');
  assert.notEqual(inside,outside,'hover inside a brand wrapper derives from the wrapper brand');
  assert.notEqual(inside,'rgb(225, 29, 72)','hover differs from the resting brand');
  await page.locator('#inside').focus();
  assert.notEqual(await page.locator('#inside').evaluate(node=>getComputedStyle(node).outlineColor),await page.locator('#outside').evaluate(node=>{node.focus();return getComputedStyle(node).outlineColor;}),'focus derives from the wrapper brand');
  // Reduced motion removes transitions.
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.portal-button').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await page.locator('.portal-button').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0.14s');
  // Previews load the bundled preset fonts from the static site's fonts/ folder.
  for(const [preset,family,selector] of [['neutral','Inter','.portal-theme'],['editorial','Fraunces','h1'],['studio','Plus Jakarta Sans','.portal-theme']]) {
    await page.goto(`${address}rendered/layout-tracking.html`);
    const loaded=await page.evaluate(async([preset,family,selector])=>{
      const root=document.querySelector('.portal-theme');if(preset!=='neutral')root.dataset.preset=preset;
      await document.fonts.load(`600 16px "${family}"`,'Order');await document.fonts.ready;
      return {check:document.fonts.check(`16px "${family}"`),face:[...document.fonts].some(face=>face.family.replaceAll('"','')===family&&face.status==='loaded'),used:getComputedStyle(document.querySelector(selector)).fontFamily.startsWith(family.includes(' ')?`"${family}"`:family)};
    },[preset,family,selector]);
    assert.deepEqual(loaded,{check:true,face:true,used:true},`${preset} loads ${family}`);
  }
  await page.goto(`${address}rendered/button.html`);
  await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.fonts.check('16px Inter')&&[...document.fonts].some(face=>face.family.replaceAll('"','')==='Inter'&&face.status==='loaded')),'Neutral previews show Inter');
  await page.goto(`${address}rendered/input.html`);
  const controlTokens=await page.evaluate(()=>{
    const root=document.querySelector('.portal-theme');
    for(const [key,value] of Object.entries({'--portal-motion':'0ms','--portal-density':'1.5','--portal-input-background':'#abcdef','--portal-input-color':'#123456'}))root.style.setProperty(key,value);
    const s=getComputedStyle(root.querySelector('input'));const result={height:s.minHeight,bg:s.backgroundColor,color:s.color};
    root.style.removeProperty('--portal-density');root.dataset.density='compact';result.compact=getComputedStyle(root.querySelector('input')).minHeight;
    return result;
  });
  assert.equal(controlTokens.height,'60px');assert.equal(controlTokens.compact,'35px');assert.equal(controlTokens.bg,'rgb(171, 205, 239)');assert.equal(controlTokens.color,'rgb(18, 52, 86)');
  // Mask icons are reshaped (merged paths, short stroke colour); their alpha must
  // still match the Lucide source drawn as an image at 48px.
  {
    const lucide=path.dirname(require.resolve('lucide-static/package.json'));
    const css=await readFile(path.join(root,'styles/icons.css'),'utf8');
    const icons=[];
    for(const [,name,url] of css.matchAll(/\.portal-icon\[data-icon="([a-z0-9-]+)"\] \{ --_icon: url\("([^"]+)"\)/g))
      icons.push({name,mask:url,source:'data:image/svg+xml,'+encodeURIComponent(await readFile(path.join(lucide,'icons',`${name}.svg`),'utf8'))});
    assert.equal(icons.length,40);
    await page.goto(`${address}rendered/icon.html`);
    const drift=await page.evaluate(async icons=>{
      const alpha=async src=>{const image=new Image(48,48);image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=48;const context=canvas.getContext('2d');context.drawImage(image,0,0,48,48);return context.getImageData(0,0,48,48).data.filter((_,i)=>i%4===3);};
      const result={};
      for(const icon of icons){const [a,b]=await Promise.all([alpha(icon.source),alpha(icon.mask)]);let ink=0,changed=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);ink+=a[i];if(d>16)changed++;}result[icon.name]={ink,changed};}
      return result;
    },icons);
    // Merged paths composite overlapping anti-aliased edges as one shape, which
    // moves a handful of edge pixels; a misplaced stroke would move hundreds.
    for(const [name,{ink,changed}] of Object.entries(drift)){assert.ok(ink>0,`${name} draws nothing`);assert.ok(changed<=23,`${name} mask differs from Lucide in ${changed} of 2304 pixels`);}
  }
  {
    // Icons are data: mask images. Under the exact production document policy
    // every icon on every page layout must still paint, with no CSP violation.
    const strict=await browser.newPage({viewport:{width:1280,height:900}});
    const refused=[];
    strict.on('console',message=>{if(/Content Security Policy|Refused to/i.test(message.text()))refused.push(message.text());});
    await strict.addInitScript(()=>{window.__violations=[];document.addEventListener('securitypolicyviolation',event=>window.__violations.push(`${event.violatedDirective} ${event.blockedURI}`));});
    for(const layout of catalogue.layouts) {
      const response=await strict.goto(`${address}${layout.rendered}?csp=portal`);
      assert.equal(response.headers()['content-security-policy'],portalCSP);
      await strict.evaluate(()=>document.fonts.ready);
      const icons=[];
      for(const handle of await strict.locator('.portal-icon').elementHandles())if(await handle.isVisible())icons.push(handle);
      assert.ok(icons.length>0,`${layout.name} shows icons`);
      for(const icon of icons) {
        const style=await icon.evaluate(node=>{const s=getComputedStyle(node);return {mask:s.maskImage||s.webkitMaskImage,name:node.dataset.icon,width:node.getBoundingClientRect().width};});
        assert.match(style.mask,/^url\("data:image\/svg\+xml,/,`${layout.name}: ${style.name} has its mask rule`);
        assert.ok(style.width>=10,`${layout.name}: ${style.name} is sized`);
        // Painted pixels: the icon's box differs from the same box with the icon hidden.
        await icon.scrollIntoViewIfNeeded();
        const box=await icon.boundingBox(), clip={x:box.x,y:box.y,width:box.width,height:box.height};
        const shown=await strict.screenshot({clip,animations:'disabled'});
        await icon.evaluate(node=>{node.style.visibility='hidden';});
        const hidden=await strict.screenshot({clip,animations:'disabled'});
        await icon.evaluate(node=>{node.style.visibility='';});
        assert.ok(!shown.equals(hidden),`${layout.name}: ${style.name} paints under the production CSP`);
      }
      assert.deepEqual(await strict.evaluate(()=>window.__violations),[],`${layout.name}: CSP violations`);
    }
    assert.deepEqual(refused,[],'no CSP console errors');
    await strict.close();
  }
  {
    // Browsers without CSS relative colour use the @supports fallback: apply its
    // rules unconditionally and check the button stays legible and responsive.
    // Each component carries its own fallback block; apply all of them.
    const inner=catalogue.components.map(({style})=>{
      const start=style.indexOf('@supports not (color: oklch(from red l c h)) {');
      return start<0?'':style.slice(style.indexOf('{',start)+1,style.indexOf('\n}',start));
    }).join('\n');
    const fallback=await browser.newPage();
    await fallback.goto(`${address}rendered/button.html`);
    await fallback.addStyleTag({content:inner+'\n.portal-theme{--portal-motion:0ms}'});
    const button=fallback.locator('.portal-button[data-variant="primary"]:not(:disabled)').first();
    await fallback.addScriptTag({content:contrastScript});
    const theme=fallback.locator('.portal-theme').first();
    for(const preset of [null,'editorial','studio'])for(const mode of [null,'dark']) {
      await theme.evaluate((node,[p,m])=>{p?node.setAttribute('data-preset',p):node.removeAttribute('data-preset');m?node.setAttribute('data-theme',m):node.removeAttribute('data-theme');},[preset,mode]);
      const ratio=()=>button.evaluate(node=>{const s=getComputedStyle(node);return __contrast(s.color,s.backgroundColor);});
      await fallback.mouse.move(0,0);
      const states=[['rest',await ratio()]];
      await button.hover();states.push(['hover',await ratio()]);
      await fallback.mouse.down();states.push(['pressed',await ratio()]);await fallback.mouse.up();
      for(const [state,value] of states)assert.ok(value>=4.5,`fallback ${preset??'neutral'}${mode?' dark':''} ${state} button text contrast ${value.toFixed(2)}`);
    }
    await theme.evaluate(node=>{node.removeAttribute('data-preset');node.removeAttribute('data-theme');});
    await fallback.mouse.move(0,0);
    const rest=await button.evaluate(node=>{const s=getComputedStyle(node);return {bg:s.backgroundColor,fg:s.color};});
    await button.hover();
    const hover=await button.evaluate(node=>getComputedStyle(node).backgroundColor);
    await fallback.mouse.down();
    const pressed=await button.evaluate(node=>getComputedStyle(node).backgroundColor);
    await fallback.mouse.up();
    assert.notEqual(hover,rest.bg,'fallback hover differs from rest');
    assert.notEqual(pressed,hover,'fallback pressed differs from hover');
    assert.doesNotMatch(hover+pressed,/oklch\(from/);
    await fallback.close();
  }
  // Mobile navigation must reach any component directly, not just the overview CTA.
  await page.setViewportSize({width:375,height:812});
  await page.goto(`${address}reference/button.html`);
  await page.locator('.mobile-menu').click();
  assert.equal(await page.locator('.mobile-menu').getAttribute('aria-expanded'),'true');
  await page.locator('#filter').fill('table');
  await page.locator('.sidebar nav a').filter({hasText:/^table$/}).click();
  await page.waitForURL('**/reference/table.html');
  await page.locator('.mobile-menu').click();await page.keyboard.press('Escape');
  assert.equal(await page.locator('.mobile-menu').getAttribute('aria-expanded'),'false');
  assert.ok(await page.locator('.mobile-menu').evaluate(node=>node===document.activeElement));
  await page.getByRole('link',{name:'Build a theme',exact:true}).click();
  await page.waitForURL('**/theme.html');
  await page.locator('html[data-theme-ready=true]').waitFor();
  await auditDocumentation('theme builder');
  await page.locator('#theme-base').selectOption('neutral-dark');
  const primary=page.locator('[data-token="--portal-brand"]');
  await primary.fill('#abcdef');
  // Knobs are the first, open group.
  await page.locator('[data-token="--portal-font"]').fill('Georgia, serif');
  await page.locator('[data-token="--portal-radius"]').fill('0px');
  const preview=page.frameLocator('iframe[title="button theme preview"]').locator('.portal-button').first();
  await page.waitForTimeout(300); // let colour transitions settle
  assert.equal(await preview.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(171, 205, 239)');
  assert.ok((await page.locator('#theme-css').textContent()).includes('color-scheme: dark;'));
  assert.ok(!(await page.locator('#theme-css').textContent()).match(/--portal-[\w-]+:\s*;/));
  // The export carries only the preset's own values and edits, never library defaults.
  const exported=await page.locator('#theme-css').textContent();
  assert.doesNotMatch(exported,/--portal-(density|motion):/);
  assert.ok(exported.includes('--portal-canvas: #09090b;'),'starting preset values are exported');
  {
    // Applied exported CSS must not defeat reduced motion or data-density, even if
    // the author also sets --portal-motion.
    const applied=await browser.newPage({reducedMotion:'reduce'});
    // A page carries only its own components' CSS, so use one with an input.
    await applied.goto(`${address}rendered/input.html`);
    await applied.addStyleTag({content:exported+'\n.portal-theme.my-theme { --portal-motion: 300ms; }'});
    const result=await applied.evaluate(()=>{
      const root=document.querySelector('.portal-theme');root.classList.add('my-theme');
      const field=root.querySelector('.portal-input');
      const duration=getComputedStyle(field).transitionDuration;
      root.dataset.density='compact';
      return {duration,compact:getComputedStyle(field).minHeight,brand:getComputedStyle(root).getPropertyValue('--portal-brand').trim()};
    });
    assert.deepEqual(result,{duration:'0s',compact:'35px',brand:'#abcdef'},'exported theme keeps reduced motion and density');
    await applied.close();
  }
  {
    // Preset and mode selectors weigh no more than .portal-theme, so an author
    // class rule wins in every preset × mode even when it loads before the
    // library, and an exported theme keeps its edits with data-theme="dark".
    const specific=await browser.newPage();
    await specific.goto(`${address}rendered/button.html`);
    const results=await specific.evaluate(({exported,presets})=>{
      const author=document.createElement('style');
      author.textContent='.portal-theme.my-brand { --portal-brand: #e11d48; }\n'+exported;
      document.head.prepend(author);
      const root=document.querySelector('.portal-theme');root.style.setProperty('--portal-motion','0ms');
      const button=root.querySelector('.portal-button[data-variant="primary"]:not(:disabled)');
      const out={};
      for(const preset of presets)for(const mode of ['light','dark']) {
        if(preset==='neutral')delete root.dataset.preset;else root.dataset.preset=preset;
        if(mode==='light')delete root.dataset.theme;else root.dataset.theme=mode;
        root.className='portal-theme portal-example my-brand';
        const brand=getComputedStyle(root).getPropertyValue('--portal-brand').trim(), background=getComputedStyle(button).backgroundColor;
        root.className='portal-theme portal-example my-theme';
        const theme=getComputedStyle(root);
        out[`${preset}-${mode}`]={brand,background,themeBrand:theme.getPropertyValue('--portal-brand').trim(),themeCanvas:theme.getPropertyValue('--portal-canvas').trim()};
      }
      return out;
    },{exported,presets:['neutral','editorial','studio']});
    for(const [name,result] of Object.entries(results)) {
      assert.equal(result.brand,'#e11d48',`${name}: author class rule wins`);
      assert.equal(result.background,'rgb(225, 29, 72)',`${name}: the button uses the author brand`);
      assert.equal(result.themeBrand,'#abcdef',`${name}: exported theme keeps its brand`);
      assert.equal(result.themeCanvas,'#09090b',`${name}: exported theme keeps its canvas`);
    }
    await specific.close();
  }
  assert.ok((await page.locator('#theme-css').textContent()).includes('--portal-brand: #abcdef;'));
  assert.ok(await page.locator('#theme-css .hljs-attribute').count()>0,'Live CSS remains highlighted after editing');
  await page.locator('[data-copy="theme-css"]').click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await page.locator('#theme-css').textContent());
  await primary.fill('red; background: url(https://example.invalid)');
  assert.equal(await primary.getAttribute('aria-invalid'),'true');assert.ok(await page.locator('#apply-theme').isDisabled());
  assert.ok(!(await page.locator('#theme-css').textContent()).includes('example.invalid'));
  await primary.fill('#abcdef');await page.locator('#apply-theme').click();
  assert.ok(await page.locator('html').evaluate(node=>node.classList.contains('custom-theme')));
  assert.equal(await page.locator('html').evaluate(node=>getComputedStyle(node).getPropertyValue('--portal-brand').trim()),'#abcdef');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await auditDocumentation('applied custom dark theme');
  await page.locator('.mobile-menu').click();await page.locator('#filter').fill('button');await page.locator('.sidebar nav a').filter({hasText:/^button$/}).click();
  await page.locator('html[data-theme-ready=true]').waitFor();
  assert.equal(await page.locator('[data-theme-select]').inputValue(),'custom');
  await page.emulateMedia({colorScheme:'dark'});await page.emulateMedia({colorScheme:'light'});
  await page.waitForTimeout(300); // let colour transitions settle
  assert.equal(await page.frameLocator('iframe').locator('.portal-button').first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(171, 205, 239)');
  await page.reload();await page.locator('html[data-theme-ready=true]').waitFor();assert.equal(await page.locator('[data-theme-select]').inputValue(),'custom');
  await page.getByRole('link',{name:'Examples',exact:true}).click();
  await page.locator('.layout-card').filter({hasText:'Print shop'}).click();
  await page.locator('html[data-theme-ready=true]').waitFor();
  assert.equal(await page.locator('[data-theme-select]').inputValue(),'custom');
  await page.waitForTimeout(300); // let colour transitions settle
  assert.equal(await page.frameLocator('iframe').locator('.portal-hero .portal-link[data-variant="button"]').first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(171, 205, 239)');
  await auditDocumentation('custom theme page recipe');
  await page.getByRole('link',{name:'Build a theme',exact:true}).click();await page.locator('html[data-theme-ready=true]').waitFor();
  assert.equal(await page.locator('#theme-base').inputValue(),'neutral-dark');assert.equal(await primary.inputValue(),'#abcdef');
  await page.locator('#reset-editor').click();assert.equal(await primary.inputValue(),'');
  assert.ok(await page.locator('html').evaluate(node=>node.classList.contains('custom-theme')));
  await page.locator('#reset-site-theme').click();assert.ok(await page.locator('html').evaluate(node=>!node.classList.contains('custom-theme')));
  await page.screenshot({path:path.join(root,'site/theme-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.goto(`${address}reference/disclosure.html`);
  const disclosure=page.frameLocator('iframe').locator('details');
  await disclosure.locator('summary').focus(); await page.keyboard.press('Enter');
  assert.equal(await disclosure.getAttribute('open'),'');
  await page.keyboard.press('Enter'); assert.equal(await disclosure.getAttribute('open'),null);
  await page.goto(`${address}reference/checkbox.html`);
  const checkbox=page.frameLocator('iframe').locator('input[type=checkbox]');
  await checkbox.focus();await page.keyboard.press('Space');assert.ok(await checkbox.isChecked());
  const nojs=await browser.newContext({javaScriptEnabled:false});const native=await nojs.newPage();
  await native.setViewportSize({width:375,height:812});await native.goto(`${address}reference/button.html`);assert.ok(await native.locator('.sidebar nav a').filter({hasText:/^table$/}).isVisible());
  assert.ok(await native.locator('#usage-source .hljs-name').count()>0,'Highlighting works without JavaScript');
  assert.equal(await native.locator('#usage-source').textContent(),catalogue.components.find(c=>c.name==='button').usage.trim());
  await native.goto(`${address}rendered/disclosure.html`);await native.locator('summary').click();assert.equal(await native.locator('details').getAttribute('open'),'');
  await native.goto(`${address}rendered/field.html`);
  const required=native.locator('input[name=name]');
  assert.equal(await required.evaluate(input=>input.checkValidity()),false);
  await required.fill('Alex Printer');assert.equal(await required.evaluate(input=>input.checkValidity()),true);
  await nojs.close();
  const blocked=await browser.newContext();
  await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Storage blocked')};Storage.prototype.setItem=()=>{throw new Error('Storage blocked')};});
  const temporary=await blocked.newPage();await temporary.goto(`${address}theme.html`);await temporary.locator('html[data-theme-ready=true]').waitFor();
  await temporary.locator('[data-token="--portal-brand"]').fill('#123456');await temporary.locator('#apply-theme').click();
  assert.ok((await temporary.locator('#theme-status').textContent()).includes('storage is unavailable'));
  assert.ok((await temporary.locator('#theme-css').textContent()).includes('--portal-brand: #123456;'));await blocked.close();
  await page.goto(`${address}reference/field.html`);await page.frameLocator('iframe').locator('.portal-theme').waitFor();await page.screenshot({path:path.join(root,'site/field.png'),fullPage:true});
  await page.setViewportSize({width:375,height:812});await page.screenshot({path:path.join(root,'site/field-mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});
  await page.goto(address);await page.screenshot({path:path.join(root,'site/overview.png'),fullPage:true});
  assert.deepEqual(failures,[]);
  console.log(`Verified ${catalogue.components.length} components and ${catalogue.layouts.length} page layouts: accessibility, themes, IDs, mobile, prefix links and native keyboard behavior.`);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
