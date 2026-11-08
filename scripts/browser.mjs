import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, loadCatalogue } from './catalogue.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8');
const catalogue=await loadCatalogue();
const base=path.join(root,'site');
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
  await page.locator('[data-theme-select]').selectOption('dark');
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
    assert.equal(await iframe.locator('button:not([disabled])').count(),0,'Illustrative business actions must stay disabled');
    assert.equal(await iframe.locator('h1').count(),1);
    for(const theme of ['light','dark','atelier']) {
      await page.locator('[data-theme-select]').selectOption(theme);
      assert.equal(await iframe.locator('.portal-layout').getAttribute('data-theme'),theme);
      const violations=await iframe.evaluate(async()=>{
        const result=await window.axe.run(document.querySelector('.portal-layout'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
        return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
      });
      assert.deepEqual(violations,[],`${layout.name}/${theme}: ${JSON.stringify(violations)}`);
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
    await page.locator('[data-theme-select]').selectOption('light');
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
    for(const theme of ['dark','atelier','light']) {
      await page.locator('[data-theme-select]').selectOption(theme);
      assert.equal(await frame.locator('.portal-theme').getAttribute('data-theme'),theme);
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
  // Test actual computed styles, not only that tokens are declared in CSS.
  await page.goto(`${address}rendered/card.html`);
  const branded = await page.evaluate(()=>{
    const root=document.querySelector('.portal-theme');
    const values={'--portal-font-family':'Georgia, serif','--portal-font-size':'20px','--portal-line-height':'1.8','--portal-heading-font-family':'monospace','--portal-heading-size-1':'40px','--portal-heading-font-weight':'500','--portal-border-width':'3px','--portal-border-style':'dashed','--portal-radius-lg':'0px','--portal-shadow':'rgb(1, 2, 3) 0px 4px 8px 0px'};
    for(const [key,value] of Object.entries(values))root.style.setProperty(key,value);
    const heading=document.createElement('h1');heading.textContent='Brand heading';root.append(heading);
    const card=getComputedStyle(root.querySelector('.portal-card')), h=getComputedStyle(heading), body=getComputedStyle(root);
    return {font:body.fontFamily,size:body.fontSize,line:body.lineHeight,headingFont:h.fontFamily,headingSize:h.fontSize,weight:h.fontWeight,border:card.borderTopWidth,borderStyle:card.borderTopStyle,radius:card.borderTopLeftRadius,shadow:card.boxShadow};
  });
  assert.ok(branded.font.includes('Georgia'));assert.equal(branded.size,'20px');assert.equal(branded.line,'36px');
  assert.equal(branded.headingFont,'monospace');assert.equal(branded.headingSize,'40px');assert.equal(branded.weight,'500');
  assert.equal(branded.border,'3px');assert.equal(branded.borderStyle,'dashed');assert.equal(branded.radius,'0px');assert.ok(branded.shadow.includes('rgb(1, 2, 3)'));
  await page.goto(`${address}rendered/button.html`);
  const buttonTokens=await page.evaluate(()=>{
    const root=document.querySelector('.portal-theme'),button=root.querySelector('.portal-button');
    root.style.setProperty('--portal-primary','#123456');root.style.setProperty('--portal-primary-content','#ffffff');
    root.style.setProperty('--portal-font-weight-medium','500');root.style.setProperty('--portal-shadow-button','rgb(3, 4, 5) 0px 2px 3px');
    button.focus();root.style.setProperty('--portal-focus-width','5px');root.style.setProperty('--portal-focus-offset','6px');
    const inherited=getComputedStyle(button);const result={background:inherited.backgroundColor,weight:inherited.fontWeight,shadow:inherited.boxShadow,focus:inherited.outlineWidth,offset:inherited.outlineOffset};
    const wrapper=document.createElement('div');wrapper.style.setProperty('--portal-primary','#654321');button.replaceWith(wrapper);wrapper.append(button);
    result.localBackground=getComputedStyle(button).backgroundColor;
    wrapper.style.setProperty('--portal-button-background','#345678');result.componentBackground=getComputedStyle(button).backgroundColor;
    return result;
  });
  assert.equal(buttonTokens.background,'rgb(18, 52, 86)');assert.equal(buttonTokens.localBackground,'rgb(101, 67, 33)');assert.equal(buttonTokens.componentBackground,'rgb(52, 86, 120)');
  assert.equal(buttonTokens.weight,'500');assert.ok(buttonTokens.shadow.includes('rgb(3, 4, 5)'));assert.equal(buttonTokens.focus,'5px');assert.equal(buttonTokens.offset,'6px');
  await page.goto(`${address}rendered/input.html`);
  const controlTokens=await page.evaluate(()=>{
    const root=document.querySelector('.portal-theme');
    for(const [key,value] of Object.entries({'--portal-control-font-family':'monospace','--portal-control-font-size':'22px','--portal-control-font-weight':'500','--portal-control-height':'60px','--portal-shadow-control':'rgb(5, 6, 7) 0px 1px 2px inset','--portal-input-background':'#abcdef','--portal-input-color':'#123456'}))root.style.setProperty(key,value);
    const s=getComputedStyle(root.querySelector('input'));return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,height:s.minHeight,shadow:s.boxShadow,bg:s.backgroundColor,color:s.color};
  });
  assert.equal(controlTokens.font,'monospace');assert.equal(controlTokens.size,'22px');assert.equal(controlTokens.weight,'500');assert.equal(controlTokens.height,'60px');assert.ok(controlTokens.shadow.includes('rgb(5, 6, 7)'));assert.equal(controlTokens.bg,'rgb(171, 205, 239)');assert.equal(controlTokens.color,'rgb(18, 52, 86)');
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
  await page.locator('#theme-base').selectOption('dark');
  const primary=page.locator('[data-token="--portal-primary"]');
  await primary.fill('#abcdef');
  await page.locator('details').filter({has:page.locator('[data-token="--portal-font-family"]')}).locator('summary').click();
  await page.locator('[data-token="--portal-font-family"]').fill('Georgia, serif');
  await page.locator('details').filter({has:page.locator('[data-token="--portal-radius-md"]')}).locator('summary').click();
  await page.locator('[data-token="--portal-radius-md"]').fill('0px');
  const preview=page.frameLocator('iframe[title="button theme preview"]').locator('.portal-button').first();
  assert.equal(await preview.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(171, 205, 239)');
  assert.ok((await page.locator('#theme-css').textContent()).includes('color-scheme: dark;'));
  assert.ok(!(await page.locator('#theme-css').textContent()).match(/--portal-[\w-]+:\s*;/));
  assert.ok((await page.locator('#theme-css').textContent()).includes('--portal-control-line-height: inherit;'));
  assert.ok((await page.locator('#theme-css').textContent()).includes('--portal-primary: #abcdef;'));
  await primary.fill('red; background: url(https://example.invalid)');
  assert.equal(await primary.getAttribute('aria-invalid'),'true');assert.ok(await page.locator('#apply-theme').isDisabled());
  assert.ok(!(await page.locator('#theme-css').textContent()).includes('example.invalid'));
  await primary.fill('#abcdef');await page.locator('#apply-theme').click();
  assert.ok(await page.locator('html').evaluate(node=>node.classList.contains('custom-theme')));
  assert.equal(await page.locator('html').evaluate(node=>getComputedStyle(node).getPropertyValue('--portal-primary').trim()),'#abcdef');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await auditDocumentation('applied custom dark theme');
  await page.locator('.mobile-menu').click();await page.locator('#filter').fill('button');await page.locator('.sidebar nav a').filter({hasText:/^button$/}).click();
  await page.locator('html[data-theme-ready=true]').waitFor();
  assert.equal(await page.locator('[data-theme-select]').inputValue(),'custom');
  await page.emulateMedia({colorScheme:'dark'});await page.emulateMedia({colorScheme:'light'});
  assert.equal(await page.frameLocator('iframe').locator('.portal-button').first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(171, 205, 239)');
  await page.reload();await page.locator('html[data-theme-ready=true]').waitFor();assert.equal(await page.locator('[data-theme-select]').inputValue(),'custom');
  await page.getByRole('link',{name:'Examples',exact:true}).click();
  await page.locator('.layout-card').filter({hasText:'Print catalogue'}).click();
  await page.locator('html[data-theme-ready=true]').waitFor();
  assert.equal(await page.locator('[data-theme-select]').inputValue(),'custom');
  assert.equal(await page.frameLocator('iframe').locator('.print-art-cards .print-sheet').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(171, 205, 239)');
  await auditDocumentation('custom theme page recipe');
  await page.getByRole('link',{name:'Build a theme',exact:true}).click();await page.locator('html[data-theme-ready=true]').waitFor();
  assert.equal(await page.locator('#theme-base').inputValue(),'dark');assert.equal(await primary.inputValue(),'#abcdef');
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
  await native.goto(`${address}rendered/disclosure.html`);await native.locator('summary').click();assert.equal(await native.locator('details').getAttribute('open'),'');
  await native.goto(`${address}rendered/field.html`);
  const required=native.locator('input[name=name]');
  assert.equal(await required.evaluate(input=>input.checkValidity()),false);
  await required.fill('Alex Printer');assert.equal(await required.evaluate(input=>input.checkValidity()),true);
  await nojs.close();
  const blocked=await browser.newContext();
  await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Storage blocked')};Storage.prototype.setItem=()=>{throw new Error('Storage blocked')};});
  const temporary=await blocked.newPage();await temporary.goto(`${address}theme.html`);await temporary.locator('html[data-theme-ready=true]').waitFor();
  await temporary.locator('[data-token="--portal-primary"]').fill('#123456');await temporary.locator('#apply-theme').click();
  assert.ok((await temporary.locator('#theme-status').textContent()).includes('storage is unavailable'));
  assert.ok((await temporary.locator('#theme-css').textContent()).includes('--portal-primary: #123456;'));await blocked.close();
  await page.goto(`${address}reference/field.html`);await page.frameLocator('iframe').locator('.portal-theme').waitFor();await page.screenshot({path:path.join(root,'site/field.png'),fullPage:true});
  await page.setViewportSize({width:375,height:812});await page.screenshot({path:path.join(root,'site/field-mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});
  await page.goto(address);await page.screenshot({path:path.join(root,'site/overview.png'),fullPage:true});
  assert.deepEqual(failures,[]);
  console.log(`Verified ${catalogue.components.length} components and ${catalogue.layouts.length} page layouts: accessibility, themes, IDs, mobile, prefix links and native keyboard behavior.`);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
