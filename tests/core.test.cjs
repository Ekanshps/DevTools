const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJwt, clampModel, decodeBase64Url, formatNumber } = require('../assets/core.js');

const HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const PAYLOAD = 'eyJzdWIiOiJkZW1vLXVzZXIiLCJuYW1lIjoiRXhhbXBsZSBEZXZlbG9wZXIiLCJpc3MiOiJodHRwczovL2V4YW1wbGUudGVzdCIsImF1ZCI6ImRldmFyZWEtdG9vbHMiLCJpYXQiOjE3NjcyMjU2MDAsImV4cCI6MTg5MzQ1NjAwMH0';
const TOKEN = `${HEADER}.${PAYLOAD}.ZGVtby1zaWduYXR1cmU`;

test('decodes a Base64url JSON header', () => {
  assert.equal(JSON.parse(decodeBase64Url(HEADER)).alg, 'HS256');
});
test('parses JWT and known claim details', () => {
  const result = parseJwt(TOKEN, 1800000000);
  assert.equal(result.header.alg, 'HS256');
  assert.equal(result.payload.sub, 'demo-user');
  assert.equal(result.claims.find(c => c.name === 'exp').status, 'Not expired by time');
  assert.equal(result.signature, 'ZGVtby1zaWduYXR1cmU');
});
test('accepts a common Bearer prefix and outer whitespace', () => {
  assert.equal(parseJwt(`  Bearer ${TOKEN}  `, 1800000000).payload.sub, 'demo-user');
});
test('rejects empty input and wrong segment count', () => {
  assert.throws(() => parseJwt(' '), /Paste a token/);
  assert.throws(() => parseJwt('one.two'), /Expected 3/);
  assert.throws(() => parseJwt('one.two.three.four.five'), /encrypted JWE/);
});
test('rejects a payload that decodes to invalid JSON', () => {
  const badPayload = Buffer.from('not-json').toString('base64url');
  assert.throws(() => parseJwt(`${HEADER}.${badPayload}.sig`), /not valid JSON/);
});
test('identifies expired and not-yet-active claims', () => {
  const payload = Buffer.from(JSON.stringify({ exp: 100, nbf: 200 })).toString('base64url');
  const r = parseJwt(`${HEADER}.${payload}.sig`, 150);
  assert.equal(r.claims.find(c => c.name === 'exp').status, 'Expired');
  assert.equal(r.claims.find(c => c.name === 'nbf').status, 'Not active yet');
});
test('keeps claim handling data-oriented rather than executing it', () => {
  const payload = Buffer.from(JSON.stringify({ message: '<img src=x onerror=alert(1)>' })).toString('base64url');
  const r = parseJwt(`${HEADER}.${payload}.sig`);
  assert.equal(r.payload.message, '<img src=x onerror=alert(1)>');
});
test('clamp model generates a valid rem expression for endpoint values', () => {
  const m = clampModel({ minSize: 1, maxSize: 3, minViewport: 360, maxViewport: 1440, unit: 'rem', rootFontSize: 16, precision: 4, property: 'font-size' });
  assert.equal(m.evaluateText(360), '1rem');
  assert.equal(m.evaluateText(1440), '3rem');
  assert.match(m.value, /^clamp\(1rem, calc\(.*vw\), 3rem\)$/);
  assert.equal(m.declaration, `font-size: ${m.value};`);
});
test('clamp model supports px units and properties', () => {
  const m = clampModel({ minSize: 24, maxSize: 80, minViewport: 360, maxViewport: 1440, unit: 'px', rootFontSize: 16, precision: 3, property: 'padding-block' });
  assert.equal(m.evaluateText(360), '24px');
  assert.equal(m.evaluateText(1440), '80px');
  assert.ok(m.tailwind.startsWith('[padding-block:'));
});
test('clamp model rejects invalid size and viewport bounds', () => {
  assert.throws(() => clampModel({ minSize: 3, maxSize: 3, minViewport: 360, maxViewport: 1440 }), /Maximum size/);
  assert.throws(() => clampModel({ minSize: 1, maxSize: 3, minViewport: 1440, maxViewport: 360 }), /Maximum viewport/);
  assert.throws(() => clampModel({ minSize: -1, maxSize: 3, minViewport: 360, maxViewport: 1440 }), /Negative values/);
  const negativeMargin = clampModel({ minSize: -2, maxSize: 1, minViewport: 360, maxViewport: 1440, unit: 'rem', property: 'margin-block' });
  assert.ok(negativeMargin.value.startsWith('clamp(-2rem,'));
  assert.throws(() => clampModel({ minSize: 1, maxSize: 3, minViewport: 360, maxViewport: 1440, unit: 'em' }), /Choose px or rem/);
});
test('number formatter trims insignificant trailing zeroes', () => {
  assert.equal(formatNumber(1.5, 4), '1.5');
  assert.equal(formatNumber(100, 3), '100');
  assert.equal(formatNumber(0.333333, 4), '0.3333');
});
