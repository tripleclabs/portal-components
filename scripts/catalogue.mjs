import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = relative => readFile(path.join(root, relative), 'utf8');
const escapeCell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
// Examples are page templates: in a .portal file ui: and t: are implicit. A
// component example sits in a showcase-only <main> wrapper, which the docs
// leave out of the snippet.
export function componentSnippet(source) {
  const inner = source.trim().replace(/^<main [^>]*>\n?/, '').replace(/\n?<\/main>$/, '');
  const lines = inner.split('\n');
  const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^ */)[0].length));
  return lines.map(line => line.slice(indent)).join('\n') + '\n';
}
const entities = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const decode = text => text.replace(/&(lt|gt|amp|quot|apos|#x[0-9a-f]+|#\d+);/gi, (_, name) =>
  name[0] === '#' ? String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)) : entities[name]);
const textOf = body => body.replace(/<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+)/g, (_, cdata, text) => cdata ?? decode(text));
// A components/<name>.portal file: top-level <props>, <template>, <style> and
// <server> blocks, each at most once, nothing else.
export function portalBlocks(source, file) {
  const blocks = {};
  const rest = source.replace(/<!--[\s\S]*?-->/g, '').replace(/<(props|template|style|server)((?:\s+[a-z-]+="[^"]*")*)\s*>([\s\S]*?)<\/\1>/g, (_, name, attributes, body) => {
    if (blocks[name]) throw new Error(`${file}: duplicate <${name}>`);
    blocks[name] = { attributes: Object.fromEntries([...attributes.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])), body };
    return '';
  });
  if (rest.trim()) throw new Error(`${file}: only <props>, <template>, <style> and <server> blocks belong at the top level`);
  if (!blocks.template) throw new Error(`${file}: a component needs a <template>`);
  return blocks;
}
function parseValue(text, type, label) {
  switch (type) {
    case 'string': return text;
    case 'boolean': if (text === 'true' || text === 'false') return text === 'true'; break;
    case 'integer': if (/^-?\d+$/.test(text)) return Number(text); break;
    case 'number': if (text.trim() && Number.isFinite(Number(text))) return Number(text); break;
    default: return JSON.parse(text);
  }
  throw new Error(`${label}: "${text}" is not a ${type}`);
}
// The contract <props> declares: the same mapping the Portal compiler makes.
export function contractFromProps(body = '', file = 'component') {
  const stack = [{ children: [] }];
  for (const [, close, name, attributes, selfClosing, text] of body.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-z]+)((?:\s+[a-z-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g)) {
    if (text !== undefined) { if (text.trim()) throw new Error(`${file}: <props> contains declarations only`); continue; }
    if (close) { if (stack.pop().name !== name) throw new Error(`${file}: unbalanced </${name}>`); continue; }
    const node = { name, attributes: Object.fromEntries([...attributes.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])), children: [] };
    stack.at(-1).children.push(node);
    if (!selfClosing) stack.push(node);
  }
  if (stack.length !== 1) throw new Error(`${file}: unclosed <props> element`);
  const shape = (node, label) => {
    const { type, required, nullable, description, enum: options, default: fallback } = node.attributes;
    if (!['string', 'boolean', 'integer', 'number', 'array', 'object', 'any'].includes(type)) throw new Error(`${label}: invalid type ${type}`);
    const contract = { type };
    if (required !== undefined) contract.required = parseValue(required, 'boolean', label);
    if (fallback !== undefined) contract.default = parseValue(fallback, type, `${label} default`);
    if (options !== undefined) contract.enum = options.split(/\s+/).filter(Boolean).map(value => parseValue(value, type, `${label} enum`));
    if (nullable !== undefined) contract.nullable = parseValue(nullable, 'boolean', label);
    if (description !== undefined) contract.description = description;
    if (type === 'object' && node.children.length) contract.properties = Object.fromEntries(node.children.map(child => [child.attributes.name, shape(child, `${label}.${child.attributes.name}`)]));
    if (type === 'array' && node.children.length) contract.items = shape(node.children[0], `${label} items`);
    return contract;
  };
  const definition = { props: {}, slots: {} };
  for (const node of stack[0].children) {
    if (node.name === 'prop') definition.props[node.attributes.name] = shape(node, `${file} prop ${node.attributes.name}`);
    else if (node.name === 'slot') {
      const slot = {};
      if (node.attributes.required !== undefined) slot.required = parseValue(node.attributes.required, 'boolean', `${file} slot ${node.attributes.name}`);
      if (node.attributes.description !== undefined) slot.description = node.attributes.description;
      definition.slots[node.attributes.name] = slot;
    } else throw new Error(`${file}: <props> holds <prop> and <slot>, not <${node.name}>`);
  }
  return definition;
}
// Everything the docs derive from one component file.
export async function readComponent(name) {
  const file = `components/${name}.portal`;
  const source = await read(file);
  const blocks = portalBlocks(source, file);
  return {
    source,
    definition: contractFromProps(blocks.props?.body, file),
    template: blocks.template.body.replace(/^\n+|\s+$/g, '') + '\n',
    style: blocks.style ? textOf(blocks.style.body).replace(/^\n+|\s+$/g, '') + '\n' : '',
    security: blocks.server ? blocks.server.attributes.security ?? 'pure' : 'pure',
  };
}
export async function loadCatalogue() {
  const catalogue = JSON.parse(await read('catalogue.json'));
  if (catalogue.contractVersion !== 1 || !Array.isArray(catalogue.components)) throw new Error('Unsupported catalogue');
  const names = new Set();
  for (const item of catalogue.components) {
    if (!/^[a-z][a-z0-9-]*$/.test(item.name) || names.has(item.name)) throw new Error(`Invalid/duplicate name: ${item.name}`);
    names.add(item.name);
    for (const [key, expected] of [['source', `components/${item.name}.portal`], ['example', `examples/${item.name}.html`], ['rendered', `rendered/${item.name}.html`]]) {
      if (item[key] !== expected) throw new Error(`Unexpected ${key} path for ${item.name}`);
    }
    if (Object.hasOwn(item, 'contract')) throw new Error(`${item.name}: the contract is the <props> block of its .portal file`);
    const { definition, template, style, security } = await readComponent(item.name);
    Object.assign(item, { definition, template, style, security });
    item.usage = await read(item.example);
    if (/\sxmlns(:\w+)?=/.test(item.usage)) throw new Error(`Examples are page templates; ui: and t: are implicit: ${item.name}`);
    if (/<portal-(component|prop|fill|outlet)\b/.test(item.usage + item.template)) throw new Error(`Legacy component authoring: ${item.name}`);
    if (!/^<main [^>]*class="portal-theme portal-example">\n[\s\S]*\n<\/main>\n?$/.test(item.usage)) throw new Error(`Example needs the showcase <main> wrapper: ${item.name}`);
    item.usage = componentSnippet(item.usage);
    for (const [prop, config] of Object.entries(item.definition.props)) {
      if (config.required && Object.hasOwn(config, 'default')) throw new Error(`Required prop has default: ${item.name}.${prop}`);
      if (config.enum && Object.hasOwn(config,'default') && !config.enum.includes(config.default)) throw new Error(`Default outside enum: ${item.name}.${prop}`);
    }
  }
  const layoutNames = new Set();
  for (const item of catalogue.layouts ?? []) {
    if (!/^layout-[a-z][a-z0-9-]*$/.test(item.name) || names.has(item.name) || layoutNames.has(item.name)) throw new Error(`Invalid/duplicate layout: ${item.name}`);
    layoutNames.add(item.name);
    if (item.example !== `examples/${item.name}.html` || item.rendered !== `rendered/${item.name}.html`) throw new Error(`Unexpected layout path: ${item.name}`);
    if (!item.title || !item.integration || !item.components?.every(name=>names.has(name))) throw new Error(`Incomplete layout recipe: ${item.name}`);
    item.usage = await read(item.example);
    if (/\sxmlns(:\w+)?=/.test(item.usage)) throw new Error(`Examples are page templates; ui: and t: are implicit: ${item.name}`);
    if (/<portal-(component|prop|fill|outlet)\b/.test(item.usage)) throw new Error(`Legacy layout authoring: ${item.name}`);
  }
  const files = await readdir(path.join(root, 'components'));
  const expected = [...names].map(n => `${n}.portal`).sort();
  if (JSON.stringify(files.sort()) !== JSON.stringify(expected)) throw new Error('Component directory and catalogue disagree');
  return catalogue;
}
export async function generatedDocuments() {
  const catalogue = await loadCatalogue();
  const sections = catalogue.components.map(c => {
    const props = Object.entries(c.definition.props).map(([name,p]) => `| \`${name}\` | ${p.type}${p.nullable ? ' or null' : ''} | ${p.required ? 'required' : Object.hasOwn(p,'default') ? `\`${escapeCell(JSON.stringify(p.default))}\`` : 'omitted'} | ${p.enum ? p.enum.map(v=>`\`${escapeCell(v)}\``).join(', ') : '—'} |`).join('\n');
    const slots = Object.entries(c.definition.slots).map(([name,s]) => `- \`${name}\`: ${s.required?'required':'optional'}`).join('\n') || 'None.';
    return `## ${c.name}\n\n${c.description}\n\nSource: [${c.source}](../${c.source})${c.security === 'privileged' ? ' · privileged: its server exports run with the visitor\'s Portal access' : ''}\n\n${props ? '| Prop | Type | Default | Allowed values |\n| --- | --- | --- | --- |\n'+props : 'No props.'}\n\nSlots:\n\n${slots}\n\n### Usage\n\n\`\`\`xml\n${c.usage.trim()}\n\`\`\`\n\n### Accessibility and limits\n\n${c.accessibility}\n`;
  });
  const tokensCSS = await read('styles/tokens.css');
  const rootBlock = tokensCSS.slice(tokensCSS.indexOf('.portal-theme {'),tokensCSS.indexOf('.portal-theme[data-theme='));
  const tokens = [...rootBlock.matchAll(/(--portal-[a-z0-9-]+):\s*([^;]+);\s*\/\* @(knob|semantic) \*\//g)].map(([,name,value,tier])=>({name,tier,default:value.trim()}));
  const tierTable = tier => '| Token | Neutral light default |\n| --- | --- |\n'+tokens.filter(t=>t.tier===tier).map(t=>`| \`${t.name}\` | \`${escapeCell(t.default)}\` |`).join('\n');
  const tokenDocs = `# Token reference

Generated from styles/tokens.css. Set tokens on the theme root or on a wrapper around components. Presets (\`data-preset="editorial"\` or \`"studio"\`, absent for Neutral) and dark mode (\`data-theme="dark"\`) change the semantic values; the names stay the same.

## Knobs

The five everyday controls. Changing the brand re-derives hover and pressed (an OKLCH lightness shift toward mid-lightness), tint, focus ring and button text inside each component, so it also works on a nested wrapper. \`--portal-density\` is a unitless multiplier for spacing and control heights (\`data-density="compact"\` is .875, \`"roomy"\` is 1.125).

${tierTable('knob')}

## Semantic tokens

Set by presets. Each \`-content\` colour is the text colour used on its partner.

${tierTable('semantic')}

## Resolved where used

These roles are never declared on the theme root, so a nested \`--portal-brand\` override reaches them. Set them explicitly to decouple from the brand.

| Token | When unset |
| --- | --- |
| \`--portal-primary\` | \`var(--portal-brand)\` |
| \`--portal-primary-content\` | Black or white, whichever suits the primary's OKLCH lightness (threshold 0.62) |
| \`--portal-focus\` | \`var(--portal-brand)\` |

## Component overrides

Optional and undeclared; each falls back to the semantic tokens.

| Token | Falls back to |
| --- | --- |
| \`--portal-button-background\` | primary |
| \`--portal-button-color\` | primary content (derived from the button background when unset) |
| \`--portal-input-background\` | \`--portal-surface\` |
| \`--portal-input-color\` | \`--portal-text\` |
| \`--portal-card-shadow\` | \`--portal-shadow-sm\` |
`;
  const componentDocs = `# Component reference\n\nGenerated from catalogue.json, the component files (components/<name>.portal) and executable example source. Do not edit this file directly. Library ${catalogue.version}, contract ${catalogue.contractVersion}.\n\nUsage snippets go inside a page template. In a \`.portal\` file the \`ui:\` and \`t:\` prefixes are implicit; a plain \`.html\` page declares \`xmlns:ui="urn:cococo:ui"\` and \`xmlns:t="urn:cococo:dataxml"\` on its root.\n\n${sections.join('\n')}\n`;
  const generated = {...catalogue, tokens};
  const layoutDocs = '# Page layout recipes\n\nComplete, themeable compositions rendered by the production Portal renderer. These are documentation recipes, not connected starter portals. All people, addresses, orders and prices are fictional. No login, filtering, upload or business mutation is connected.\n\nCopy the DataXML into a page template. The [layout CSS](../styles/layouts.css) is part of the host\'s bundled stylesheet, so a Portal page needs nothing else. Keep the `portal-theme portal-layout` wrapper. The CSS uses inherited semantic tokens, so the same theme applies to components and layout. Replace illustrative actions with protected Portal flows; never activate them by simply removing `disabled`.\n\n' + (catalogue.layouts??[]).map(l=>`## ${l.title}\n\n${l.description}\n\nComponents: ${l.components.map(n=>'`'+n+'`').join(', ')}.\n\n${l.integration}\n\n[DataXML source](../${l.example}) · [Rendered example](../${l.rendered})\n\n\`\`\`xml\n${l.usage.trim()}\n\`\`\`\n`).join('\n');
  const instructions = await read('LLM.md');
  const authoring = await read('docs/authoring.md');
  const themes = await read('docs/themes.md');
  return new Map([
    ['docs/components.md', componentDocs],
    ['docs/layouts.md', layoutDocs],
    ['docs/tokens.md', tokenDocs],
    ['catalogue.generated.json', JSON.stringify(generated,null,2)+'\n'],
    ['llms.txt', '# Portal Components\n\n> Ownable DataXML presentation components; Lua remains page/server-side.\n\n- [Authoring instructions](LLM.md)\n- [Complete LLM reference](llms-full.txt)\n- [Machine-readable catalogue](catalogue.generated.json)\n- [Authoring](docs/authoring.md)\n- [Components](docs/components.md)\n- [Theme tokens](docs/tokens.md)\n- [Page layout recipes](docs/layouts.md)\n'],
    ['llms-full.txt', [instructions,authoring,themes,tokenDocs,componentDocs,layoutDocs].join('\n\n')]
  ].map(([file, content]) => [file, content.trimEnd() + '\n']));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  for (const [file, content] of await generatedDocuments()) {
    if (check) {
      if (await read(file).catch(()=>null) !== content) throw new Error(`Stale generated file ${file}; run pnpm run docs`);
    } else await writeFile(path.join(root,file),content);
  }
  console.log(check ? 'Catalogue and generated documentation are current.' : 'Generated component, token and LLM references.');
}
