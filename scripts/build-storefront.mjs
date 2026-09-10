import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const clientSource = ['backend.ts', 'client.ts'].map(file => fs.readFileSync(new URL('src/lib/api/' + file, root), 'utf8')).join('\n');
fs.writeFileSync(new URL('public/commerce-api.js', root), ts.transpileModule(clientSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText);
fs.copyFileSync(new URL('node_modules/@auth0/auth0-spa-js/dist/auth0-spa-js.production.js', root), new URL('public/auth0-spa-js.js', root));
const asset = new URL('public/special-affair-reference.html', root);
const original = fs.readFileSync(asset, 'utf8');
const pattern = /(<script type="__bundler\/template"[^>]*>)([\s\S]*?)(<\/script>)/;
const matched = original.match(pattern);
if (!matched) throw new Error('Reference template was not found');
const basePath = new URL('src/storefront/base.html', root);
if (!fs.existsSync(basePath)) fs.writeFileSync(basePath, JSON.parse(matched[2]));
let template = fs.readFileSync(basePath, 'utf8');
const replace = (before, after) => {
  if (!template.includes(before)) throw new Error('Template anchor missing: ' + before.slice(0, 80));
  template = template.replace(before, after);
};
replace('<head>', '<head><script src="/auth0-spa-js.js"></script><script src="/commerce-api.js"></script>');
replace('class Component extends DCLogic', 'class BaseComponent extends DCLogic');
// The inherited video method references Component, which now includes the commerce behaviour.
const logic = fs.readFileSync(new URL('src/storefront/commerce-logic.js', root), 'utf8');
const lastScript = template.lastIndexOf('</script>');
template = template.slice(0, lastScript) + '\n' + logic + '\n' + template.slice(lastScript);
const styles = fs.readFileSync(new URL('src/storefront/commerce.css', root), 'utf8');
replace('</helmet>', `<style>${styles}</style></helmet>`);
const panels = fs.readFileSync(new URL('src/storefront/commerce-panels.html', root), 'utf8');
replace('</x-dc>', panels + '\n</x-dc>');
// Remove prototype card collection; collection belongs to the hosted provider.
template = template.replace(/<sc-if value="\{\{ pm.showCard \}\}"[\s\S]*?<\/sc-if>/, '');
template = template.replace(/<sc-if value="\{\{ pm.showUpi \}\}"[\s\S]*?<\/sc-if>/, '');
replace('Prototype checkout — no payment is processed.', '{{ checkoutNotice }}');
replace('Your order is confirmed. A confirmation has been sent to {{ orderEmail }} — we will write again when your pieces leave the atelier.', '{{ confirmationMessage }}');
replace('>Thank You</h1>', '>{{ confirmationTitle }}</h1>');
replace('<span>Total</span><span>{{ subtotal }}</span>', '<span>Total</span><span>{{ cartTotal }}</span>');
replace('<span>Shipping</span><span>Complimentary</span>', '<span>Shipping</span><span>Complimentary</span>');
const summaryAnchor = '<div style="display:flex;justify-content:space-between;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;padding-top:6px">';
replace(summaryAnchor, '<div style="display:flex;justify-content:space-between;color:#6f6c66"><span>Included GST</span><span>{{ cartTax }}</span></div><sc-if value="{{ hasDiscount }}"><div style="display:flex;justify-content:space-between"><span>Discount</span><span>−{{ cartDiscount }}</span></div></sc-if><div class="commerce-coupon"><input aria-label="Coupon code" placeholder="Coupon code" value="{{ couponCode }}" sc-camel-on-change="{{ setCouponCode }}"><button sc-camel-on-click="{{ applyCoupon }}">Apply</button></div>' + summaryAnchor);
// Add behaviour to existing footer links without moving them.
for (const [label, action] of [['Account', 'openAccount'], ['Contact', 'openSupport'], ['Returns', 'openOrders'], ['Order Tracking', 'openOrders'], ['Newsletter', 'openNewsletter'], ['Privacy', 'openAccount']]) {
  const re = new RegExp('(<a href="#")(?![^>]*sc-camel-on-click)([^>]*>' + label + '</a>)');
  if (!re.test(template)) throw new Error('Footer link missing: ' + label);
  template = template.replace(re, `$1 sc-camel-on-click="{{ ${action} }}"$2`);
}
// Wire the existing newsletter controls without replacing their layout.
replace('<input type="email" placeholder="Email address"', '<input type="email" value="{{ newsletterEmail }}" sc-camel-on-change="{{ setNewsletterEmail }}" placeholder="Email address"');
replace('<button aria-label="Subscribe"', '<button type="button" sc-camel-on-click="{{ openNewsletter }}" aria-label="Subscribe"');
template = template.replace(/(<input[^>]*placeholder="Search[^"]*"[^>]*)(>)/, '$1 value="{{ searchQuery }}" sc-camel-on-change="{{ setSearchQuery }}"$2');
template = template.replace(/(sc-camel-on-click="\{\{ addToBag \}\}"[^>]*>)([^<]*)(<\/button>)/, '$1{{ addLabel }}$3');
// Real colour/material controls reuse the existing filter spacing and typography.
replace('<span style="font-size:12px;color:#6f6c66">Oak Brown · Sand · Black Nappa · Dusty Sage · Blush · Ivory</span>', '<select aria-label="Filter colour" value="{{ colourFilter }}" sc-camel-on-change="{{ setColourFilter }}" style="background:transparent;border:0;font-size:12px;color:#6f6c66"><option value="">All colours</option><sc-for list="{{ colours }}" as="c"><option value="{{ c.name }}">{{ c.name }}</option></sc-for></select>');
replace('<span style="font-size:12px;color:#6f6c66">Full-grain leather · Nappa · Silk-blend lining</span>', '<select aria-label="Filter material" value="{{ materialFilter }}" sc-camel-on-change="{{ setMaterialFilter }}" style="background:transparent;border:0;font-size:12px;color:#6f6c66"><option value="">All materials</option><sc-for list="{{ materials }}" as="m"><option value="{{ m.name }}">{{ m.name }}</option></sc-for></select>');
const output = original.replace(pattern, (_, opening, old, closing) => opening + '\n' + JSON.stringify(template).replace(/<\//g, '<\\/') + '\n  ' + closing);
const manifest = text => text.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/)[1];
if (manifest(original) !== manifest(output)) throw new Error('Reference media unexpectedly changed');
fs.writeFileSync(asset, output);
console.log('Storefront behaviours built; reference media SHA256 ' + crypto.createHash('sha256').update(manifest(output)).digest('hex'));
