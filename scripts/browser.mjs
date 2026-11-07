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
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.md':'text/plain','.txt':'text/plain'};
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
  await page.goto(address);
  await auditDocumentation('index');
  assert.equal(await page.locator('.component-card').count(),catalogue.components.length);
  await page.locator('#filter').fill('disclosure');
  assert.equal(await page.locator('.sidebar nav a:visible').count(),1);
  const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.href));
  for(const link of new Set(links))if(link.startsWith(address))assert.ok((await page.request.get(link)).ok(),link);
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
  await page.goto(`${address}reference/disclosure.html`);
  const disclosure=page.frameLocator('iframe').locator('details');
  await disclosure.locator('summary').focus(); await page.keyboard.press('Enter');
  assert.equal(await disclosure.getAttribute('open'),'');
  await page.keyboard.press('Enter'); assert.equal(await disclosure.getAttribute('open'),null);
  await page.goto(`${address}reference/checkbox.html`);
  const checkbox=page.frameLocator('iframe').locator('input[type=checkbox]');
  await checkbox.focus();await page.keyboard.press('Space');assert.ok(await checkbox.isChecked());
  const nojs=await browser.newContext({javaScriptEnabled:false});const native=await nojs.newPage();
  await native.goto(`${address}rendered/disclosure.html`);await native.locator('summary').click();assert.equal(await native.locator('details').getAttribute('open'),'');
  await native.goto(`${address}rendered/field.html`);
  const required=native.locator('input[name=name]');
  assert.equal(await required.evaluate(input=>input.checkValidity()),false);
  await required.fill('Alex Printer');assert.equal(await required.evaluate(input=>input.checkValidity()),true);
  await nojs.close();
  await page.goto(`${address}reference/field.html`);await page.frameLocator('iframe').locator('.portal-theme').waitFor();await page.screenshot({path:path.join(root,'site/field.png'),fullPage:true});
  await page.setViewportSize({width:375,height:812});await page.screenshot({path:path.join(root,'site/field-mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});
  await page.goto(address);await page.screenshot({path:path.join(root,'site/overview.png'),fullPage:true});
  assert.deepEqual(failures,[]);
  console.log(`Verified ${catalogue.components.length} components: accessibility, themes, IDs, mobile, prefix links and native keyboard behavior.`);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
