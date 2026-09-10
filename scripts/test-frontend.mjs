import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const source = ['backend.ts', 'client.ts'].map(file => readFileSync(new URL('../src/lib/api/' + file, import.meta.url), 'utf8')).join('\n');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const storage = new Map();
function browser(search = '?mode=preview', fetch = () => { throw new Error('Preview must not use network'); }) {
  const window = {};
  const context = vm.createContext({ window, location: { search }, URLSearchParams, URL, crypto: webcrypto,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    structuredClone, fetch, AbortSignal, console });
  vm.runInContext(code, context);
  return window.CommerceAPI;
}
const api = browser();
const call = (path, method, body, key) => api.request(path, method, body, key ? { 'Idempotency-Key': key } : {});
const product = (await call('/products')).items[0];
let cart = await call('/carts', 'POST');
cart = await call('/carts/' + cart.id + '/items', 'POST', { variant_id: product.id, quantity: 2, version: cart.version });
assert.equal(cart.items[0].quantity, 2);
await assert.rejects(call('/carts/' + cart.id + '/items', 'POST', { variant_id: product.id, quantity: 99, version: cart.version }), /unavailable/);
const reloaded = browser();
assert.equal((await reloaded.request('/carts', 'POST')).items[0].quantity, 2, 'Bag survives reload');
cart = await call('/carts/' + cart.id + '/coupon', 'POST', { code: 'WELCOME10', version: cart.version });
assert.equal(cart.total_minor, cart.subtotal_minor * 0.9);
await assert.rejects(call('/checkout', 'POST', { email: 'bad' }), /valid email/);
const body = { cart_id: cart.id, cart_version: cart.version, email: 'preview@example.test', address: {
  name: 'Preview User', street: '12 Example Street', city: 'Hyderabad', postal_code: '500001', phone: '9876543210' } };
const checkout = await call('/checkout', 'POST', body, 'same-key');
assert.equal((await call('/checkout', 'POST', body, 'same-key')).order_id, checkout.order_id);
await assert.rejects(call('/checkout', 'POST', { ...body, email: 'different@example.test' }, 'same-key'), /changed/);
await call('/preview/payments/' + checkout.payment_attempt_id, 'POST', { action: 'failed' });
assert.equal((await call('/orders/' + checkout.order_id)).status, 'payment_failed');
const retry = await call('/orders/' + checkout.order_id + '/retry-payment', 'POST');
await call('/preview/payments/' + retry.payment.payment_attempt_id, 'POST', { action: 'authorized' });
assert.equal((await call('/orders/' + checkout.order_id)).status, 'confirmed');
assert.equal((await call('/carts', 'POST')).items.length, 0);
await call('/preview/orders/delivered', 'POST');
await call('/returns', 'POST', { order_id: 'sample-delivered', reason: 'Not the right size', items: [{ order_item_id: 'sample-item', quantity: 1 }] });
assert.equal((await call('/returns')).items.length, 1);
await assert.rejects(call('/returns', 'POST', { order_id: 'sample-delivered', reason: 'Duplicate request', items: [{ order_item_id: 'sample-item', quantity: 1 }] }), /quantities/);
assert.ok(![...storage.values()].join('').includes('preview@example.test'), 'Contact data is not persisted');
const live = browser('?mode=api&api=https://backend.example.test/api/v1', async () => { throw new Error('offline'); });
await assert.rejects(live.request('/products'), /unavailable/, 'API failures never fall back to preview');
console.log('Frontend checks passed: persistent bag, quantities, coupons, validation, checkout replay, decline/retry, confirmation, returns, storage isolation and API error handling.');
