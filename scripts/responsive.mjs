import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, loadCatalogue } from './catalogue.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const catalogue=await loadCatalogue(), base=path.join(root,'site'), reportOnly=process.env.PORTAL_RESPONSIVE_REPORT_ONLY==='1';
const widths=[320,375,390,701,768,800,1024,1440];
const server=createServer(async(req,res)=>{
  try {
    const file=path.resolve(base,'.'+new URL(req.url,'http://local').pathname);
    if(!file.startsWith(base+path.sep)||!(await stat(file)).isFile()){res.writeHead(404).end();return;}
    res.setHeader('content-type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'})[path.extname(file)]??'text/plain');
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/`, results=[];
await mkdir(path.join(base,'responsive'),{recursive:true});
let browser;
function inspectLayout(){
  const problems=[], describe=node=>`${node.tagName.toLowerCase()}${node.id?'#'+node.id:''}.${String(node.className).trim().replaceAll(' ','.')} ${node.textContent.trim().slice(0,45)}`;
  if(document.documentElement.scrollWidth>innerWidth+1)problems.push(`document overflow ${document.documentElement.scrollWidth}/${innerWidth}`);
  const critical=[...document.querySelectorAll('h1,h2,h3,p,label,summary,button,input,select,textarea,dt,dd,th,td,code,.portal-price')].filter(node=>!node.closest('[aria-hidden="true"]'));
  for(const node of critical){
    const rect=node.getBoundingClientRect();if(!rect.width||!rect.height)continue;
    if(!node.matches('input,select,textarea')&&node.scrollWidth>node.clientWidth+2)problems.push(`text overflow: ${describe(node)} ${node.scrollWidth}/${node.clientWidth}`);
    for(let parent=node.parentElement;parent;parent=parent.parentElement){
      const s=getComputedStyle(parent),r=parent.getBoundingClientRect();
      if(!node.closest('.portal-table-wrap[tabindex="0"],pre[tabindex="0"]')&&['hidden','clip'].includes(s.overflowX)&&(rect.left<r.left-2||rect.right>r.right+2))problems.push(`clipped horizontally: ${describe(node)} by ${describe(parent)}`);
      if(['hidden','clip'].includes(s.overflowY)&&(rect.top<r.top-2||rect.bottom>r.bottom+2))problems.push(`clipped vertically: ${describe(node)} by ${describe(parent)}`);
    }
    if(node.matches('input,select,textarea,button')&&!node.closest('.portal-table-wrap')){
      const field=node.closest('.portal-field')??node.closest('.portal-card__body');
      if(field){const r=field.getBoundingClientRect();if(rect.left<r.left-2||rect.right>r.right+2)problems.push(`control escapes field: ${describe(node)}`);}
      if(rect.left<0||rect.right>innerWidth+1)problems.push(`control escapes viewport: ${describe(node)}`);
    }
  }
  for(const marker of document.querySelectorAll('.portal-timeline-step__marker,.portal-avatar'))if(marker.scrollWidth>marker.clientWidth+2||marker.scrollHeight>marker.clientHeight+2)problems.push(`Marker content does not fit: ${describe(marker)}`);
  for(const table of document.querySelectorAll('.portal-table-wrap')){
    if(table.scrollWidth>table.clientWidth+2&&table.tabIndex<0)problems.push('Overflowing order table has no keyboard-scroll focus target');
  }
  return [...new Set(problems)];
}
// Review focus 3: one long-text fixture per layout. Long product names, German
// compounds, nine-digit prices and unbroken paths must wrap, never overflow.
const longCompound='Hochglanzveredelungsgeschäftsausstattungsvisitenkartenbestellung';
const longText={
  'layout-shop':{'.portal-product-card__title a':longCompound,'.portal-price__amount':'€123.456.789,00','.portal-option-card__label':longCompound},
  'layout-ordering-portal':{'.portal-basket-line__title':longCompound,'.portal-basket-line__total':'€987.654.321,00','.portal-panel__total dd':'€123.456.789.012,00'},
  'layout-tracking':{'.portal-timeline-step__title > span:last-child':longCompound,'.portal-description-item dd':longCompound,'.portal-file-item__name':longCompound+'.pdf'},
  'layout-api':{'.portal-endpoint__title code':'/v1/customers/{customerReference}/deliveryAddresses/{addressReference}/defaultPreferences/{preferenceReference}','.portal-key-display__masked':'pf_live_'+'•'.repeat(48)+'3sYb','.portal-property-table td:first-child code':'deliveryAddressDefaultPreferenceReference'},
};
const presets=['neutral','editorial','studio'];
try{
  browser=await chromium.launch({headless:true});
  for(const layout of catalogue.layouts){
    assert.ok(longText[layout.name],`${layout.name} needs a long-text fixture`);
    const page=await browser.newPage({viewport:{width:1440,height:900},javaScriptEnabled:false});
    await page.goto(address+layout.rendered);
    for(const preset of presets)for(const width of widths){
      await page.evaluate(preset=>{const root=document.querySelector('.portal-layout');if(preset==='neutral')delete root.dataset.preset;else root.dataset.preset=preset;},preset);
      await page.setViewportSize({width,height:900});
      const problems=await page.evaluate(inspectLayout);
      for(const table of await page.locator('.portal-table-wrap').all()) {
        if(await table.evaluate(node=>node.scrollWidth>node.clientWidth+2)) {
          await table.focus();await page.keyboard.press('ArrowRight');
          let moved=false;
          for(let attempt=0;attempt<20&&!moved;attempt++){await new Promise(resolve=>setTimeout(resolve,50));moved=await table.evaluate(node=>node.scrollLeft>0);}
          assert.ok(moved,`${layout.name}/${width}: keyboard arrow must scroll the focused table`);
          const reachesEnd=await table.evaluate(node=>{node.scrollLeft=node.scrollWidth;const cell=node.querySelector('tr:last-child td:last-child'),r=cell.getBoundingClientRect(),box=node.getBoundingClientRect();return r.right<=box.right+2;});
          assert.ok(reachesEnd,'Last table column must be reachable by horizontal scrolling');
          await table.evaluate(node=>node.scrollLeft=0);
        }
      }
      results.push({layout:layout.name,surface:`standalone-${preset}`,width,textScale:1,problems});
      await page.screenshot({path:path.join(base,'responsive',`${layout.name}-${preset}-${width}.png`),fullPage:true});
    }
    await page.evaluate(()=>delete document.querySelector('.portal-layout').dataset.preset);
    // Long text, then the same page right-to-left, at the narrowest widths.
    const missing=await page.evaluate(fixture=>Object.keys(fixture).filter(selector=>{const node=document.querySelector(selector);if(node)node.textContent=fixture[selector];return !node;}),longText[layout.name]);
    assert.deepEqual(missing,[],`${layout.name}: long-text fixture targets exist`);
    for(const dir of ['ltr','rtl'])for(const width of [320,375,768]){
      await page.evaluate(dir=>document.documentElement.dir=dir,dir);
      await page.setViewportSize({width,height:900});
      results.push({layout:layout.name,surface:`long-text-${dir}`,width,textScale:1,problems:await page.evaluate(inspectLayout)});
      await page.screenshot({path:path.join(base,'responsive',`${layout.name}-long-${dir}-${width}.png`),fullPage:true});
    }
    await page.evaluate(()=>document.documentElement.dir='ltr');
    await page.reload();
    // Increased browser default font size exercises rem-based text/spacing without JS.
    for(const width of [320,768,1440]){
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>document.documentElement.style.fontSize='200%');
      results.push({layout:layout.name,surface:'standalone',width,textScale:2,problems:await page.evaluate(inspectLayout)});
      await page.screenshot({path:path.join(base,'responsive',`${layout.name}-${width}-text200.png`),fullPage:true});
      await page.evaluate(()=>document.documentElement.style.fontSize='');
    }
    await page.close();
    const docs=await browser.newPage({viewport:{width:1440,height:900}});
    await docs.goto(`${address}layouts/${layout.name}.html`);await docs.locator('html[data-theme-ready=true]').waitFor();
    for(const width of widths){
      await docs.setViewportSize({width,height:900});
      const problems=await docs.evaluate(()=>{
        const errors=[];
        if(document.documentElement.scrollWidth>innerWidth+1)errors.push('Docs document overflows');
        for(const selector of ['.topbar','.example-toolbar','.layout-preview-controls','.section-heading'])for(const node of document.querySelectorAll(selector)){
          if(node.scrollWidth>node.clientWidth+2)errors.push(`${selector} overflows`);
          const parent=node.getBoundingClientRect();
          for(const child of node.children){const r=child.getBoundingClientRect();if(r.width&&(r.left<parent.left-1||r.right>parent.right+1||r.top<parent.top-1||r.bottom>parent.bottom+1))errors.push(`${selector} clips ${child.tagName}`);}
        }
        return errors;
      });
      const frame=await (await docs.locator('[data-layout-example]').elementHandle()).contentFrame();
      problems.push(...await frame.evaluate(inspectLayout));
      results.push({layout:layout.name,surface:'docs-responsive',width,textScale:1,problems});
      await docs.locator('[data-preview-width="390"]').click();
      results.push({layout:layout.name,surface:'docs-mobile-preview',width,textScale:1,problems:await frame.evaluate(inspectLayout)});
      await docs.locator('[data-preview-width="full"]').click();
      await docs.evaluate(()=>scrollTo(0,0));
      await docs.screenshot({path:path.join(base,'responsive',`${layout.name}-docs-${width}.png`),fullPage:false});
    }
    await docs.close();
  }
  await writeFile(path.join(base,'responsive/report.json'),JSON.stringify(results,null,2)+'\n');
  const failures=results.filter(r=>r.problems.length);
  if(reportOnly)console.log(JSON.stringify(failures,null,2));
  else assert.deepEqual(failures,[],`Responsive checks failed: ${JSON.stringify(failures,null,2)}`);
  console.log(`Checked ${results.length} layout/viewport/text combinations across ${widths.join(', ')} CSS pixels.`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
