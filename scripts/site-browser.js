const menu = document.querySelector('.mobile-menu');
const sidebar = document.querySelector('.sidebar');
function closeMenu() { sidebar?.classList.remove('mobile-open'); menu?.setAttribute('aria-expanded','false'); }
menu?.addEventListener('click',()=>{
  const open=menu.getAttribute('aria-expanded')!=='true';
  sidebar?.classList.toggle('mobile-open',open);menu.setAttribute('aria-expanded',String(open));
  if(open)document.querySelector('#filter')?.focus();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
const filter=document.querySelector('#filter');
filter?.addEventListener('input',()=>{
  const query=filter.value.trim().toLowerCase();
  document.querySelectorAll('.sidebar nav a').forEach(link=>link.hidden=!link.textContent.toLowerCase().includes(query));
});
// Leave the navigation usable without JavaScript too.
sidebar?.classList.add('navigation-enhanced');
const storageKey='portal-components-theme-v1';
const palettes=['light','dark','atelier'];
const systemMode=window.matchMedia('(prefers-color-scheme: dark)');
const frames=[...document.querySelectorAll('[data-example]')];
const selector=document.querySelector('[data-theme-select]');
const editor=document.querySelector('#theme-editor');
const status=document.querySelector('#theme-status');
let schema=[],paletteValues={},draft={base:'light',values:{}},active={mode:'system',base:systemMode.matches?'dark':'light',values:{}};
let persistent=true;
function property(name){
  if(/shadow/.test(name))return 'box-shadow';
  if(/font-family|font-mono/.test(name))return 'font-family';
  if(/font-weight/.test(name))return 'font-weight';
  if(/line-height/.test(name))return 'line-height';
  if(/letter-spacing/.test(name))return 'letter-spacing';
  if(/border-style/.test(name))return 'border-style';
  if(/opacity/.test(name))return 'opacity';
  if(/motion-duration/.test(name))return 'transition-duration';
  if(/font-size|heading-size/.test(name))return 'font-size';
  if(/space|height|width|radius|offset|choice-size/.test(name))return 'width';
  return 'color';
}
function valid(name,value){return value.length<=200&&!/[;{}<>\r\n]|url\s*\(|@|\/\*/i.test(value)&&CSS.supports(property(name),value);}
function clean(value){
  const result={base:palettes.includes(value?.base)?value.base:'light',values:{}};
  for(const token of schema){const v=value?.values?.[token.name];if(typeof v==='string'&&valid(token.name,v))result.values[token.name]=v;}
  return result;
}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({draft,active}));}catch{persistent=false;}}
function announce(message){if(status)status.textContent=message+(persistent?'':' Browser storage is unavailable; this applies only to this page.');}
function baseValues(base){return {...Object.fromEntries(schema.map(t=>[t.name,t.default])),...(paletteValues[base]??{})};}

function styleRoot(root,theme){
  root.dataset.theme=theme.base;
  for(const token of schema)root.style.removeProperty(token.name);
  for(const [name,value]of Object.entries(theme.values))root.style.setProperty(name,value);
}
function applySite(){
  if(active.mode==='system')active.base=systemMode.matches?'dark':'light';
  const root=document.documentElement,custom=active.mode==='custom',themed=custom||active.base!=='light';
  root.classList.toggle('portal-theme',themed);root.classList.toggle('themed-docs',themed);root.classList.toggle('custom-theme',custom);
  styleRoot(root,active);
  if(selector)selector.value=active.mode;
}
function applyFrame(frame){
  const doc=frame.contentDocument;if(!doc)return;
  const theme=frame.hasAttribute('data-builder-preview')?draft:active;
  doc.querySelectorAll('.portal-theme').forEach(root=>styleRoot(root,theme));
  const root=doc.querySelector('.portal-theme');
  if(root){root.style.padding='24px';root.style.minHeight='130px';doc.body.style.margin='0';doc.body.style.background=doc.defaultView.getComputedStyle(root).backgroundColor;
    root.querySelectorAll('.portal-demo-box').forEach(box=>{box.style.padding='16px';box.style.background='var(--portal-surface-muted)';box.style.borderRadius='var(--portal-radius-md)';});}
  requestAnimationFrame(()=>{frame.style.height=`${Math.max(150,doc.documentElement.scrollHeight)}px`;});
}
function previews(){frames.forEach(applyFrame);}
for(const frame of frames){frame.addEventListener('load',()=>{applyFrame(frame);frame.contentDocument?.addEventListener('toggle',()=>applyFrame(frame),true);frame.contentDocument?.addEventListener('submit',event=>event.preventDefault());});}
window.addEventListener('resize',previews);
function exportCSS(){
  const output=document.querySelector('#theme-css');if(!output)return;
  const values={...baseValues(draft.base),...draft.values};
  output.textContent=`/* Portal Components theme; load after bundled styles. */\n.portal-theme.my-theme {\n  color-scheme: ${draft.base==='dark'?'dark':'light'};\n${schema.map(t=>`  ${t.name}: ${values[t.name]};`).join('\n')}\n}\n`;
}
function refreshEditor(){
  if(!editor)return;
  const defaults=baseValues(draft.base);document.querySelector('#theme-base').value=draft.base;
  for(const input of editor.querySelectorAll('[data-token]')){
    input.value=draft.values[input.dataset.token]??'';input.placeholder=defaults[input.dataset.token];input.removeAttribute('aria-invalid');document.getElementById(`${input.id}-error`).hidden=true;
    const colour=input.parentElement.querySelector('[data-color]');if(colour)colour.value=/^#[\da-f]{6}$/i.test(input.value||input.placeholder)?(input.value||input.placeholder):'#000000';
  }
  document.querySelector('#apply-theme').disabled=false;exportCSS();previews();
}
async function initialize(){
  try{
    const script=document.querySelector('script[src$="assets/site.js"]');
    const response=await fetch(new URL('../catalogue.generated.json',script.src));if(!response.ok)throw new Error('Token catalogue unavailable');
    schema=(await response.json()).tokens;
    const paletteResponse=await fetch(new URL('theme-palettes.json',script.src));if(!paletteResponse.ok)throw new Error('Palette catalogue unavailable');paletteValues=await paletteResponse.json();
    let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{persistent=false;}
    draft=clean(saved?.draft);active={...clean(saved?.active),mode:[...palettes,'system','custom'].includes(saved?.active?.mode)?saved.active.mode:'system'};
    if(active.mode!=='custom'){active.base=active.mode==='system'?(systemMode.matches?'dark':'light'):active.mode;active.values={};}
    if(editor){
      editor.addEventListener('submit',event=>event.preventDefault());
      for(const input of editor.querySelectorAll('[data-token]')){
        if(property(input.dataset.token)==='color'){
          const picker=document.createElement('input');picker.type='color';picker.dataset.color=input.dataset.token;picker.setAttribute('aria-label',`Pick ${input.dataset.token.replace('--portal-','').replaceAll('-',' ')}`);
          picker.addEventListener('input',()=>{input.value=picker.value;input.dispatchEvent(new Event('input',{bubbles:true}));});input.after(picker);
        }
        input.addEventListener('input',()=>{
          const value=input.value.trim(),ok=!value||valid(input.dataset.token,value);input.setAttribute('aria-invalid',String(!ok));document.getElementById(`${input.id}-error`).hidden=ok;
          document.querySelector('#apply-theme').disabled=!!editor.querySelector('[aria-invalid="true"]');
          if(!ok)return;
          if(value)draft.values[input.dataset.token]=value;else delete draft.values[input.dataset.token];
          save();exportCSS();previews();
        });
      }
      document.querySelector('#theme-base').addEventListener('change',event=>{draft.base=event.target.value;save();refreshEditor();});
      document.querySelector('#apply-theme').addEventListener('click',()=>{if(editor.querySelector('[aria-invalid="true"]'))return;active={...clean(draft),mode:'custom'};save();applySite();previews();announce('Your theme is applied across the showcase. Open any component to explore it.');});
      document.querySelector('#reset-editor').addEventListener('click',()=>{draft={base:'light',values:{}};save();refreshEditor();announce('Editor reset. Your applied site theme is unchanged.');});
      document.querySelector('#reset-site-theme').addEventListener('click',()=>{active={mode:'system',base:systemMode.matches?'dark':'light',values:{}};save();applySite();previews();announce('Site theme reset to System. Your editor draft is kept.');});
      document.querySelector('#preview-component').addEventListener('change',event=>{document.querySelectorAll('[data-preview-panel]').forEach(panel=>panel.hidden=panel.dataset.previewPanel!==event.target.value);previews();});
      refreshEditor();
    }
    selector?.addEventListener('change',()=>{
      active=selector.value==='custom'?{...clean(draft),mode:'custom'}:{mode:selector.value,base:selector.value==='system'?(systemMode.matches?'dark':'light'):selector.value,values:{}};
      save();applySite();previews();
    });
    applySite();previews();document.documentElement.dataset.themeReady='true';
  }catch{announce('The theme editor could not load. Reload this page to try again.');}
}
systemMode.addEventListener('change',()=>{if(active.mode==='system'){applySite();previews();}});
applySite();
initialize();
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
  const text=document.getElementById(button.dataset.copy)?.textContent??'',status=button.closest('section')?.querySelector('.copy-status');
  try{await navigator.clipboard.writeText(text);if(status)status.textContent=button.dataset.copy==='theme-css'?'Theme CSS copied.':'Source copied.';}
  catch{if(status)status.textContent='Select the code above and copy it with your keyboard.';}
}));
