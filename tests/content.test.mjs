import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { compile } from '@mdx-js/mdx';
import { remarkD2 } from '@vanhiep99w/docs-kit/d2';
import { remarkCodeWalkthrough, parseCodeWalkthroughDescriptor } from '@vanhiep99w/docs-kit/code-walkthrough';
import { remarkCodeDiff, parseCodeDiffDescriptor } from '@vanhiep99w/docs-kit/code-diff';
import { remarkTerminalSession, parseTerminalSession } from '@vanhiep99w/docs-kit/terminal-session';
import { remarkProtocolExchange, parseProtocolExchangeDescriptor } from '@vanhiep99w/docs-kit/protocol-exchange';
import { remarkSpanWaterfall, parseSpanWaterfallDescriptor } from '@vanhiep99w/docs-kit/span-waterfall';

const read = (file) => readFile(file, 'utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const inventory = JSON.parse(await read('tests/migration-inventory.json'));
const contracts = JSON.parse(await read('tests/page-contracts.json'));
const pages = Object.keys(contracts).filter((file) => file.endsWith('.md'));
const documents = new Map(await Promise.all(pages.map(async (file) => [file, await read(file)])));
const fences = (text) => [...text.matchAll(/^```([^\n]*)\n(.*?)^```/gms)].map((m) => ({
  language: m[1].trim().split(/\s+/)[0], meta: m[1], code: m[2], raw: m[0],
}));
const all = [...documents].flatMap(([file, text]) => fences(text).map((f) => ({ ...f, file })));

test('page URLs, metadata, frontmatter and existing links are unchanged', async () => {
  const actual = (await readdir('content/docs', { recursive: true })).filter((p) => /\.(md|json)$/.test(p)).map((p) => `content/docs/${p}`).sort();
  assert.deepEqual(actual, Object.keys(contracts).sort());
  assert.equal(pages.length, 35);
  for (const [file, contract] of Object.entries(contracts)) {
    const text = await read(file);
    if (contract.sha256) assert.equal(sha(text), contract.sha256, file);
    else {
      assert.equal(text.match(/^---\n.*?\n---/s)?.[0], contract.frontmatter, file);
      const links = [...text.matchAll(/(?<!!)\[[^\]\n]+\]\(([^)]+)\)/g)].map((m) => m[1]);
      for (const link of contract.links) assert.ok(links.includes(link), `${file}: missing ${link}`);
    }
  }
});

test('all 65 legacy diagrams have a named D2 replacement; retained artifacts remain byte-identical', async () => {
  const diagrams = inventory.filter((r) => r.action === 'D2');
  assert.equal(diagrams.length, 65);
  assert.equal(all.filter((f) => f.language === 'd2').length, diagrams.length);
  for (const entry of diagrams) {
    assert.ok(all.some((f) => f.file === `content/docs/${entry.file}` && f.language === 'd2' && f.meta.includes(`title="${entry.title}"`)), entry.title);
  }
  for (const entry of inventory.filter((r) => r.action === 'keep-artifact')) {
    assert.ok(fences(documents.get(`content/docs/${entry.file}`)).some((f) => sha(f.raw) === entry.sha256), `${entry.file}:${entry.line}: original artifact changed`);
  }
  const walkthrough = await parseCodeWalkthroughDescriptor(all.find((f) => f.language === 'code-walkthrough').code);
  const diff = await parseCodeDiffDescriptor(all.find((f) => f.language === 'code-diff').code);
  assert.equal(sha(walkthrough.snapshots[0].code), inventory.find((r) => r.action === 'code-walkthrough').codeSha256);
  assert.equal(sha(`${diff.before.code}\n${diff.after.code}`), inventory.find((r) => r.action === 'code-diff').codeSha256);
});

test('no Mermaid or hand-drawn diagrams survive outside genuine artifacts', async () => {
  for (const [file, text] of documents) {
    assert.doesNotMatch(text, /```mermaid|<Mermaid(?:Diagram)?\b/, file);
    const prose = text.replace(/^```[^\n]*\n.*?^```/gms, '');
    assert.doesNotMatch(prose, /[┌┐└┘├┤│╔═╚▶►]|─{2,}|-->|<--|↓/, file);
    for (const f of fences(text)) {
      if (f.language === 'd2') continue;
      // Real source comments and the literal app/ directory listing are not diagrams.
      if (['js', 'javascript', 'ts', 'typescript', 'code-diff', 'code-walkthrough'].includes(f.language)) continue;
      if (file.endsWith('/web-workers.md') && f.code === 'app/\n├── main.js\n└── sum.worker.js\n') continue;
      assert.doesNotMatch(f.code, /[┌┐└┘├┤│╔═╚▶►]|─{2,}|-->|<--|↓/, file);
      if (['text', 'plaintext', ''].includes(f.language)) {
        // Every remaining text fence is explicitly reviewed in the immutable inventory.
        assert.ok(inventory.some((r) => r.action === 'keep-artifact' && r.sha256 === sha(f.raw)), file);
      }
    }
  }
  for (const file of ['package.json', 'source.config.ts', 'src/app/[[...slug]]/page.tsx']) {
    assert.doesNotMatch(await read(file), /mermaid/i, file);
  }
});

test('the five learning descriptors satisfy the installed 0.12.0 schemas', async () => {
  const parsers = {
    'code-walkthrough': parseCodeWalkthroughDescriptor,
    'code-diff': parseCodeDiffDescriptor,
    'terminal-session': parseTerminalSession,
    'protocol-exchange': parseProtocolExchangeDescriptor,
    'span-waterfall': parseSpanWaterfallDescriptor,
  };
  for (const [language, parse] of Object.entries(parsers)) {
    const blocks = all.filter((f) => f.language === language);
    assert.equal(blocks.length, 1, language);
    await parse(blocks[0].code);
  }
  const pkg = JSON.parse(await read('node_modules/@vanhiep99w/docs-kit/package.json'));
  assert.equal(pkg.version, '0.12.0');
  const timeline = parseSpanWaterfallDescriptor(all.find((f) => f.language === 'span-waterfall').code);
  assert.equal(timeline.provenance.kind, 'illustrative');
  assert.equal(timeline.spans.find((s) => s.id === 'concurrent-fast').start, 0);
  assert.equal(timeline.spans.find((s) => s.id === 'sequential-fast').start, 2);
});

test('all 35 pages compile with D2 and learning plugins; both icon themes embed locally', { timeout: 120_000 }, async () => {
  for (const [file, value] of documents) {
    const output = String(await compile({ path: file, value }, {
      format: 'md',
      remarkPlugins: [
        [remarkD2, { assetsRoot: 'content/icons', poolIdleTimeoutMs: 1000 }],
        remarkCodeWalkthrough, remarkCodeDiff, remarkTerminalSession, remarkProtocolExchange, remarkSpanWaterfall,
      ],
    }));
    for (const fence of fences(value)) {
      const component = { d2: /\binteractive=false\b/.test(fence.meta) && !/mode=(steps|tabs|explorer|animation)/.test(fence.meta) ? 'D2Diagram' : 'D2InteractiveDiagram', 'code-walkthrough': 'CodeWalkthrough', 'code-diff': 'CodeDiff', 'terminal-session': 'TerminalSession', 'protocol-exchange': 'ProtocolExchange', 'span-waterfall': 'SpanWaterfall' }[fence.language];
      if (component) assert.ok(output.includes(component), `${file}: missing ${component}`);
    }
    if (value.includes('icon: ../../icons/nodejs.svg')) {
      assert.ok((output.match(/data:image\/svg\+xml;base64/g) ?? []).length >= 2);
      assert.doesNotMatch(output, /https:\/\/icons\.d2lang\.com/);
    }
  }
});

test('catalog icon checksum and SVG safety', async () => {
  const svg = await read('content/icons/nodejs.svg');
  assert.equal(sha(svg), '7489d17d434c5d2e45960eb5f5afbcca2bf20d6d113375ecf06935c4ce86b05b');
  assert.doesNotMatch(svg, /<script|on\w+=|<foreignObject|(?:href|src)=["']https?:/i);
});
