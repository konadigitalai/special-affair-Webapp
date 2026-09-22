// End-to-end verification of a deployed API through the real frontend API client.
// Usage: TEST_API_URL=https://special-affair-api.vercel.app/api/v1 node scripts/verify-deployed.mjs
// Creates one cancelled COD order, one confirmed sandbox UPI order and one support case
// for verification@example.com in the connected database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const base = process.env.TEST_API_URL;
if (!base || !/^https?:\/\//.test(base)) throw Error('Set TEST_API_URL to the deployed API base, e.g. https://host/api/v1');
const source = ['backend.ts', 'client.ts'].map(file => fs.readFileSync(new URL('../src/lib/api/' + file, import.meta.url), 'utf8')).join('\n');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const storage = new Map();
function browser() {
  const window = { CommerceConfig: { mode: 'api', api: base } };
  vm.runInContext(code, vm.createContext({ window, location: { search: '' }, URLSearchParams, URL, crypto: webcrypto,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    structuredClone, fetch, AbortSignal, TextEncoder, console }));
  return window.CommerceAPI;
}
const steps = [];
const step = (name) => { steps.push(name); console.log('  ok  ' + name); };
const api = browser();
const call = (...args) => api.request(...args);
const email = 'verification@example.com';

await api.initialize();
const products = (await call('/products')).items;
assert.ok(products.length > 0, 'catalogue has products');
const bySlug = new Map();
for (const p of products) { if (p.available > 0) bySlug.set(p.slug, [...(bySlug.get(p.slug) || []), p]); }
const [slug, variants] = [...bySlug.entries()].find(([, v]) => new Set(v.map(x => x.size)).size >= 2) || [];
assert.ok(slug, 'a product with two available sizes exists');
const first = variants[0];
const second = variants.find(v => v.size !== first.size);
step(`catalogue: ${products.length} variants, using ${first.name} (${first.colour}) sizes ${first.size} and ${second.size}`);

await call(`/wishlist/items/${first.id}`, 'PUT');
assert.ok((await browser().request('/wishlist')).variant_ids.includes(first.id), 'wishlist persists across reloads');
await call(`/wishlist/items/${first.id}`, 'DELETE');
assert.equal((await call('/wishlist')).variant_ids.length, 0);
step('wishlist add, persist across reload, remove');

let bag = await call('/carts', 'POST');
bag = await call(`/carts/${bag.id}/items`, 'POST', { variant_id: first.id, quantity: 2, version: bag.version });
bag = await call(`/carts/${bag.id}/items`, 'POST', { variant_id: second.id, quantity: 1, version: bag.version });
assert.equal(bag.items.length, 2);
assert.equal((await browser().request('/carts', 'POST')).id, bag.id, 'cart survives a reload');
bag = await call(`/carts/${bag.id}/items`, 'POST', { variant_id: second.id, quantity: 0, version: bag.version });
assert.equal(bag.items.length, 1);
assert.ok(bag.total_minor > 0, 'server-calculated total');
step(`bag add two items, persist, remove one, total ${bag.total_minor / 100} ${first.currency}`);

await assert.rejects(call(`/carts/${bag.id}/coupon`, 'POST', { code: 'INVALID' }), /coupon/i);
step('invalid promo code rejected');

const payload = { cart_id: bag.id, email, payment_method: 'cod', expected_total_minor: bag.total_minor,
  address: { name: 'Client Demo', street: '12 Demo Street', city: 'Hyderabad', state: 'Telangana', postal_code: '500001', phone: '9000000000' } };
const cod = await call('/checkout', 'POST', payload);
assert.equal(cod.status, 'confirmed');
assert.equal((await call('/checkout', 'POST', payload)).order_id, cod.order_id, 'checkout retry is idempotent');
step(`COD checkout confirmed, order ${cod.order_id}`);

const access = await call(`/orders/${cod.order_id}/access`);
assert.ok(access.order_token);
const orders = (await browser().request('/orders')).items;
assert.ok(orders.find(o => o.id === cod.order_id), 'order appears in Orders & returns');
await call(`/orders/${cod.order_id}/cancel`, 'POST');
assert.equal((await call(`/orders/${cod.order_id}`)).status, 'cancelled');
step('order listed, guest access token issued, COD order cancelled');

bag = await call('/carts', 'POST');
assert.equal(bag.items.length, 0, 'cart is emptied after checkout');
bag = await call(`/carts/${bag.id}/items`, 'POST', { variant_id: second.id, quantity: 1, version: bag.version });
const pending = await call('/checkout', 'POST', { ...payload, cart_id: bag.id, expected_total_minor: bag.total_minor, payment_method: 'upi' });
assert.equal(pending.payment.provider, 'sandbox');
await call(`/orders/${pending.order_id}/sandbox-payment/${pending.payment_attempt_id}`, 'POST', { status: 'failed' });
assert.equal((await call(`/orders/${pending.order_id}`)).status, 'payment_failed');
const retry = await call(`/orders/${pending.order_id}/retry-payment`, 'POST');
await call(`/orders/${pending.order_id}/sandbox-payment/${retry.payment.payment_attempt_id}`, 'POST', { status: 'captured' });
assert.equal((await call(`/orders/${pending.order_id}`)).status, 'confirmed');
step(`UPI sandbox: declined, retried, captured, order ${pending.order_id} confirmed`);

await call('/guest-order', 'POST', { id: cod.order_id, token: access.order_token });
await assert.rejects(call('/guest-order', 'POST', { id: cod.order_id, token: 'wrong' }), /not found/i);
step('save guest order access works, wrong token rejected');

await call('/consents', 'POST', { email, granted: true });
await call('/consents', 'POST', { email, granted: false });
step('newsletter subscribe and unsubscribe');

const support = await call('/support', 'POST', { email, subject: 'Deployment verification', message: 'Automated verification of the deployed store.' });
await call(`/support/cases/${support.id}/messages`, 'POST', { body: 'Follow-up message from verification.' });
const cases = (await call('/support-history')).items;
assert.equal(cases.find(c => c.id === support.id).messages.length, 2);
step('support case created with follow-up message and history');

await assert.rejects(call('/account'), /bearer|sign|token/i);
step('account endpoint requires sign-in');

const answer = await call('/copilot/chat', 'message' && 'POST', { message: 'Show black products under 5000' });
assert.ok(answer.answer && answer.session_token, 'copilot answered');
step('shopping help answered: ' + String(answer.answer).slice(0, 80).replace(/\s+/g, ' ') + '...');

assert.ok(![...storage.values()].join('').includes(email), 'PII never saved in browser storage');
console.log(`\nDeployed flow passed: ${steps.length} steps against ${base}`);
