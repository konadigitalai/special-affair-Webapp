// Called by the separately compiled client.ts browser script.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createBackendTransport(raw, signedIn, origin) {
    const storageKey = 'sa:api:v1:' + origin;
    let credentials = { orders: {}, cases: {} };
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved && saved.orders && saved.cases)
            credentials = saved;
    }
    catch { /* Unavailable storage leaves this session usable. */ }
    const save = () => { try {
        localStorage.setItem(storageKey, JSON.stringify(credentials));
    }
    catch { /* Session only. */ } };
    let catalog = [];
    let bag = null;
    let cartPromise;
    let catalogPromise;
    let merged = false;
    let wishlistPromise;
    let wishlistMerged = false;
    const wishlistHeaders = () => credentials.wishlist?.token ? { 'X-Wishlist-Token': credentials.wishlist.token } : {};
    async function ensureWishlist() {
        if (wishlistPromise)
            return wishlistPromise;
        wishlistPromise = (async () => {
            const authenticated = await signedIn();
            if (credentials.wishlist?.account && !authenticated) {
                credentials.wishlist = undefined;
                save();
            }
            let row;
            if (credentials.wishlist) {
                try {
                    row = await raw(`/wishlists/${credentials.wishlist.id}`, 'GET', undefined, wishlistHeaders());
                }
                catch (error) {
                    if (error.status !== 404)
                        throw error;
                    credentials.wishlist = undefined;
                }
            }
            if (!row) {
                row = await raw('/wishlists', 'POST');
                credentials.wishlist = { id: row.id, token: row.wishlist_token, account: authenticated };
                save();
            }
            if (authenticated && !wishlistMerged && !credentials.wishlist?.account) {
                row = await raw(`/wishlists/${row.id}/merge`, 'POST', undefined, wishlistHeaders());
                credentials.wishlist = { id: row.id, account: true };
                save();
            }
            wishlistMerged = true;
            return row;
        })();
        try {
            return await wishlistPromise;
        }
        finally {
            wishlistPromise = undefined;
        }
    }
    const orderHeaders = (id) => {
        const entry = credentials.orders[id];
        return { ...(entry?.token ? { 'X-Order-Token': entry.token } : {}),
            ...(entry?.cartToken ? { 'X-Cart-Token': entry.cartToken } : {}) };
    };
    const cartHeaders = () => credentials.cart ? { 'X-Cart-Token': credentials.cart.token } : {};
    const normalizeOrder = (row) => ({ ...row, guest_email: row.email,
        items: (row.items || []).map(i => ({ ...i, title_snapshot: `${i.product_name} / ${i.variant_name}` })),
        payments: row.payments || [], shipments: row.shipments || [], returns: row.returns || [], expires_at: 0 });
    function normalizeCart(row) {
        if (row.cart_token) {
            credentials.cart = { id: row.id, token: row.cart_token };
            save();
        }
        bag = { ...row, discount_minor: row.discount_minor || 0, tax_minor: row.tax_minor || 0, coupon: row.coupon || '',
            items: row.items.map(i => ({
                id: i.variant_id, product_id: '', slug: i.product_slug, name: i.product_name, colour: i.colour || '',
                category: '', material: '', description: '', available: 20, media: [],
                ...catalog.find(p => p.id === i.variant_id), size: i.size,
                cart_item_id: i.id, quantity: i.quantity, price_minor: i.unit_price_minor, currency: i.currency,
                line_total_minor: i.line_total_minor, line_discount_minor: i.line_discount_minor || 0, line_tax_minor: i.line_tax_minor || 0,
            })) };
        return bag;
    }
    async function readBag() {
        if (!credentials.cart)
            return ensureCart();
        return normalizeCart(await raw(`/carts/${credentials.cart.id}/quote`, 'GET', undefined, cartHeaders()));
    }
    async function ensureCart() {
        if (cartPromise)
            return cartPromise;
        cartPromise = (async () => {
            if (credentials.cart) {
                try {
                    await raw(`/carts/${credentials.cart.id}`, 'GET', undefined, cartHeaders());
                }
                catch (error) {
                    if (error.status !== 404)
                        throw error;
                    if (credentials.checkout) {
                        try {
                            const recovered = await raw(`/carts/${credentials.cart.id}/checkout-result`, 'GET', undefined, { ...cartHeaders(), 'Idempotency-Key': credentials.checkout.key });
                            credentials.orders[recovered.id] = { token: recovered.order_token, cartToken: credentials.cart.token };
                        }
                        catch (recoveryError) {
                            if (recoveryError.status !== 404)
                                throw recoveryError;
                        }
                    }
                    credentials.cart = undefined;
                    save();
                }
            }
            if (!credentials.cart)
                normalizeCart(await raw('/carts', 'POST'));
            if (!merged && await signedIn()) {
                normalizeCart(await raw(`/carts/${credentials.cart.id}/merge`, 'POST', undefined, cartHeaders()));
                merged = true;
            }
            return readBag();
        })();
        try {
            return await cartPromise;
        }
        finally {
            cartPromise = undefined;
        }
    }
    async function allProducts() {
        if (catalogPromise)
            return catalogPromise;
        catalogPromise = (async () => {
            const items = [];
            let offset = 0;
            for (;;) {
                const page = await raw(`/storefront/catalog?limit=100&offset=${offset}`);
                items.push(...page.items);
                if (!page.has_more)
                    break;
                if (page.next_offset <= offset)
                    throw new Error('Invalid catalogue pagination.');
                offset = page.next_offset;
            }
            catalog = items;
            return { items };
        })();
        try {
            return await catalogPromise;
        }
        finally {
            catalogPromise = undefined;
        }
    }
    async function allOrders() {
        const ids = new Set(Object.keys(credentials.orders));
        if (await signedIn()) {
            const result = await raw('/customers/me/orders');
            result.items.forEach(row => ids.add(row.id));
        }
        const rows = [];
        for (const id of ids) {
            try {
                rows.push(normalizeOrder(await raw(`/orders/${id}`, 'GET', undefined, orderHeaders(id))));
            }
            catch (error) {
                if (error.status !== 404)
                    throw error;
            }
        }
        return { items: rows.reverse() };
    }
    return async (path, method = 'GET', body, headers = {}) => {
        if (path === '/wishlist')
            return ensureWishlist();
        const wishItem = path.match(/^\/wishlist\/items\/([^/]+)$/);
        if (wishItem) {
            const list = await ensureWishlist();
            return raw(`/wishlists/${list.id}/items/${wishItem[1]}`, method, body, wishlistHeaders());
        }
        if (path === '/products')
            return allProducts();
        if (path === '/carts')
            return ensureCart();
        const itemPath = path.match(/^\/carts\/([^/]+)\/items$/);
        if (itemPath && method === 'POST') {
            await ensureCart();
            const input = body;
            const line = bag?.items.find(i => i.id === input.variant_id);
            if (input.quantity === 0 && line)
                await raw(`/carts/${credentials.cart.id}/items/${line.cart_item_id}`, 'DELETE', undefined, cartHeaders());
            else if (input.quantity > 0)
                await raw(`/carts/${credentials.cart.id}/items`, 'POST', input, cartHeaders());
            return readBag();
        }
        if (/^\/carts\/[^/]+\/coupon$/.test(path)) {
            return normalizeCart(await raw(path, method, body, cartHeaders()));
        }
        if (path === '/checkout') {
            const input = body;
            const address = input.address;
            const payload = { cart_id: input.cart_id, email: input.email, phone: address.phone, expected_total_minor: input.expected_total_minor,
                shipping_address: { full_name: address.name, street: address.street, city: address.city,
                    state: address.state || '', pin_code: address.postal_code, country: 'IN' }, payment_method: input.payment_method || 'cod' };
            const bytes = new TextEncoder().encode(JSON.stringify(payload));
            const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
            if (credentials.checkout?.digest !== digest) {
                credentials.checkout = { digest, key: crypto.randomUUID() };
                save();
            }
            const row = await raw(path, method, payload, { ...cartHeaders(), 'Idempotency-Key': credentials.checkout.key });
            credentials.orders[row.id] = { token: row.order_token, cartToken: credentials.cart?.token };
            // Keep checkout replay evidence until another payload is submitted, including across reloads.
            save();
            return { order_id: row.id, payment_attempt_id: row.payment?.attempt_id || '', status: row.status,
                payment: row.payment ? { ...row.payment, payment_attempt_id: row.payment.attempt_id } : undefined };
        }
        if (path === '/orders')
            return allOrders();
        const orderPath = path.match(/^\/orders\/([^/]+)(.*)$/);
        if (orderPath) {
            if (orderPath[2] === '/access')
                return { order_id: orderPath[1], order_token: credentials.orders[orderPath[1]]?.token };
            const row = await raw(path, method, body, { ...headers, ...orderHeaders(orderPath[1]) });
            if (orderPath[2] === '/retry-payment') {
                const result = row;
                return { ...result, payment: { ...result.payment, payment_attempt_id: result.payment.attempt_id } };
            }
            return orderPath[2] ? row : normalizeOrder(row);
        }
        if (path === '/guest-order') {
            const input = body;
            const row = await raw(`/orders/${encodeURIComponent(input.id)}`, 'GET', undefined, { 'X-Order-Token': input.token });
            credentials.orders[row.id] = { ...credentials.orders[row.id], token: input.token };
            save();
            return normalizeOrder(row);
        }
        if (path === '/returns' && method === 'POST') {
            const input = body;
            return raw(path, method, body, orderHeaders(input.order_id));
        }
        if (path === '/consents') {
            const input = body;
            return raw('/newsletter/' + (input.granted ? 'subscribe' : 'unsubscribe'), 'POST', { email: input.email });
        }
        if (path === '/account')
            return raw('/customers/me', method, body);
        if (path === '/account/privacy-requests')
            return raw('/customers/me/export');
        if (path === '/support') {
            const input = body;
            const loggedIn = await signedIn();
            const row = await raw('/support/cases' + (loggedIn ? '' : '/guest'), 'POST', {
                subject: input.subject, body: input.message, ...(!loggedIn ? { email: input.email } : {}),
            });
            credentials.cases[row.id] = row.case_token || '';
            save();
            return row;
        }
        if (path === '/support-history') {
            const ids = new Set(Object.keys(credentials.cases));
            if (await signedIn()) {
                const result = await raw('/support/cases');
                result.items.forEach(row => ids.add(row.id));
            }
            const items = [];
            for (const id of ids) {
                try {
                    items.push(await raw(`/support/cases/${id}`, 'GET', undefined, { 'X-Case-Token': credentials.cases[id] || '' }));
                }
                catch (error) {
                    if (error.status !== 404)
                        throw error;
                }
            }
            return { items };
        }
        const casePath = path.match(/^\/support\/cases\/([^/]+)/);
        if (casePath)
            return raw(path, method, body, { 'X-Case-Token': credentials.cases[casePath[1]] || '' });
        if (path.startsWith('/preview/'))
            throw new Error('Preview actions are unavailable in the connected store.');
        return raw(path, method, body, headers);
    };
}
(() => {
    const config = new URLSearchParams(window.CommerceConfig || location.search);
    const preview = config.get('mode') !== 'api';
    let backendRequest;
    let auth = null;
    const backend = (config.get('api') || '').replace(/\/$/, '');
    const fixtureRows = [
        ['performance-t-shirt', 'Performance T-shirt', 'Black', 2490, 'Essential Affair'],
        ['training-tank', 'Training Tank', 'Black', 1990, 'Form'],
        ['performance-short', 'Performance Short', 'Black', 2290, 'First Affair'],
        ['performance-hoodie', 'Performance Hoodie', 'Black', 3490, 'Inner Affair'],
        ['shell-jacket', 'Shell Jacket', 'Taupe', 4490, 'Shell'],
        ['lounge-pant', 'Lounge Pant', 'Warm Grey', 2490, 'Inner Affair'],
    ];
    const products = fixtureRows.map(([slug, name, colour, price, category], index) => ({
        id: `preview-variant-${index}`, product_id: `preview-product-${index}`, slug, name, colour,
        category, material: 'Fabric details coming soon',
        description: 'Considered essentials for movement and everyday life.', price_minor: price * 100,
        currency: 'INR', available: 12, media: [],
    }));
    const cart = { id: 'preview-cart', version: 1, status: 'open', coupon: '', items: [], subtotal_minor: 0, total_minor: 0, discount_minor: 0, tax_minor: 0 };
    let orders = [];
    let returns = [];
    const replays = new Map();
    const profile = { name: 'Preview customer', preferences: {}, addresses: [], consents: [] };
    let initialized = false;
    function loadPreview() {
        if (initialized)
            return;
        initialized = true;
        try {
            const saved = JSON.parse(localStorage.getItem('sa:preview:apparel:v2') || 'null');
            if (saved && Array.isArray(saved.quantities)) {
                for (const entry of saved.quantities) {
                    const product = products.find(p => p.id === entry.id);
                    if (product && Number.isInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= 12) {
                        cart.items.push({ ...product, quantity: entry.quantity, line_total_minor: 0, line_tax_minor: 0, line_discount_minor: 0 });
                    }
                }
                if (Array.isArray(saved.orders))
                    orders = saved.orders;
                if (Array.isArray(saved.returns))
                    returns = saved.returns;
                cart.coupon = saved.coupon === 'WELCOME10' ? 'WELCOME10' : '';
            }
        }
        catch { /* Corrupt or unavailable storage starts a fresh UI preview. */ }
        recalculate();
    }
    function persist() {
        try {
            localStorage.setItem('sa:preview:apparel:v2', JSON.stringify({
                quantities: cart.items.map(p => ({ id: p.id, quantity: p.quantity })), coupon: cart.coupon,
                // Do not persist contact/address form data in preview storage.
                orders: orders.map(o => ({ ...o, guest_email: 'Preview customer' })), returns,
            }));
        }
        catch { /* In-memory preview remains available. */ }
    }
    function recalculate() {
        cart.items = cart.items.map(item => {
            const gross = item.quantity * item.price_minor;
            const discount = cart.coupon === 'WELCOME10' ? Math.round(gross / 10) : 0;
            return { ...item, line_discount_minor: discount, line_total_minor: gross - discount,
                line_tax_minor: Math.round((gross - discount) * 18 / 118) };
        });
        cart.subtotal_minor = cart.items.reduce((sum, p) => sum + p.price_minor * p.quantity, 0);
        cart.discount_minor = cart.items.reduce((sum, p) => sum + p.line_discount_minor, 0);
        cart.total_minor = cart.subtotal_minor - cart.discount_minor;
        cart.tax_minor = cart.items.reduce((sum, p) => sum + p.line_tax_minor, 0);
        persist();
    }
    function fail(message, status = 422) {
        throw Object.assign(new Error(message), { status });
    }
    function previewRequest(path, method, input, headers) {
        loadPreview();
        const body = (input || {});
        const key = headers['Idempotency-Key'];
        if (key && replays.has(key)) {
            const replay = replays.get(key);
            if (replay.body !== JSON.stringify(body))
                fail('Your checkout changed. Review it and try again.', 409);
            return structuredClone(replay.response);
        }
        if (path === '/guest-sessions')
            return { token: crypto.randomUUID() };
        if (path === '/products')
            return { items: products, total: products.length };
        if (path.startsWith('/carts')) {
            if (path.endsWith('/items') && method === 'POST') {
                if (body.version !== cart.version)
                    fail('Your bag changed. Please review it.', 409);
                const product = products.find(p => p.id === body.variant_id);
                const quantity = Number(body.quantity);
                if (!product || !Number.isInteger(quantity) || quantity < 0 || quantity > product.available)
                    fail('That quantity is unavailable in this preview.', 409);
                cart.items = cart.items.filter(p => p.id !== product.id);
                if (quantity)
                    cart.items.push({ ...product, quantity, line_total_minor: 0, line_tax_minor: 0, line_discount_minor: 0 });
                cart.version += 1;
            }
            if (path.endsWith('/coupon') && method === 'POST') {
                const code = String(body.code || '').toUpperCase();
                if (code && code !== 'WELCOME10')
                    fail('Try WELCOME10 in the frontend preview.');
                cart.coupon = code;
                cart.version += 1;
            }
            recalculate();
            return { ...structuredClone(cart), adjustments: [] };
        }
        if (path === '/checkout' && method === 'POST') {
            const address = body.address;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || '')))
                fail('Enter a valid email address.');
            if (!address || !address.name?.trim() || !address.street?.trim() || !address.city?.trim())
                fail('Complete your shipping address.');
            if (!/^[1-9][0-9]{5}$/.test(address.postal_code || ''))
                fail('Enter a six-digit Indian PIN code.');
            if (!/^\+?[0-9 ()-]{10,18}$/.test(address.phone || ''))
                fail('Enter a valid phone number.');
            if (!cart.items.length)
                fail('Your bag is empty.');
            if (body.cart_version !== cart.version)
                fail('Your bag changed. Review it before checkout.', 409);
            const id = crypto.randomUUID();
            const attempt = crypto.randomUUID();
            orders.unshift({ id, order_number: 'PREVIEW-' + id.slice(0, 8).toUpperCase(), status: 'pending_payment',
                guest_email: 'Preview customer', total_minor: cart.total_minor,
                items: cart.items.map(p => ({ id: p.id, quantity: p.quantity, title_snapshot: p.name })),
                payments: [{ id: attempt, status: 'initiated' }], shipments: [], expires_at: Date.now() + 900000 });
            const result = { order_id: id, payment_attempt_id: attempt, payment: { provider: 'preview', payment_attempt_id: attempt } };
            if (key)
                replays.set(key, { body: JSON.stringify(body), response: result });
            persist();
            return result;
        }
        if (path.startsWith('/preview/payments/')) {
            const order = orders.find(o => o.payments.some(p => path.endsWith(p.id)));
            if (!order)
                fail('Preview order not found.', 404);
            if (order.expires_at < Date.now()) {
                order.status = 'expired';
                persist();
                fail('The preview reservation expired.', 409);
            }
            if (order.status !== 'pending_payment')
                fail('This preview payment is already complete.', 409);
            order.status = body.action === 'authorized' ? 'confirmed' : 'payment_failed';
            order.payments.at(-1).status = body.action === 'authorized' ? 'authorized' : 'failed';
            if (order.status === 'confirmed') {
                cart.items = [];
                cart.coupon = '';
                cart.version += 1;
                recalculate();
            }
            persist();
            return { accepted: true };
        }
        if (path === '/orders' && method === 'GET')
            return { items: structuredClone(orders) };
        if (path === '/preview/orders/delivered') {
            if (!orders.some(order => order.id === 'sample-delivered'))
                orders.push({
                    id: 'sample-delivered', order_number: 'PREVIEW-DELIVERED', status: 'delivered', guest_email: 'Preview customer',
                    total_minor: 249000, items: [{ id: 'sample-item', title_snapshot: 'Performance T-shirt', quantity: 1 }],
                    payments: [{ id: 'sample-payment', status: 'captured' }],
                    shipments: [{ carrier: 'Sample carrier', tracking_number: 'PREVIEW-TRACKING', status: 'delivered' }], expires_at: 0,
                });
            persist();
            return { loaded: true };
        }
        if (path.startsWith('/orders/')) {
            const id = path.split('/')[2];
            const order = orders.find(o => o.id === id);
            if (!order)
                fail('Order not found in this preview session.', 404);
            if (order.status === 'pending_payment' && order.expires_at < Date.now())
                order.status = 'expired';
            if (path.endsWith('/cancel') && method === 'POST') {
                if (!['confirmed', 'allocated'].includes(order.status))
                    fail('This order can no longer be cancelled.', 409);
                order.status = 'cancelled';
                persist();
            }
            if (path.endsWith('/retry-payment') && method === 'POST') {
                if (order.status !== 'payment_failed')
                    fail('There is no failed payment to retry.', 409);
                order.status = 'pending_payment';
                const attempt = crypto.randomUUID();
                order.payments.push({ id: attempt, status: 'initiated' });
                persist();
                return { order_id: id, payment: { provider: 'preview', payment_attempt_id: attempt } };
            }
            return structuredClone(order);
        }
        if (path === '/returns') {
            if (method === 'GET')
                return { items: structuredClone(returns) };
            const order = orders.find(o => o.id === body.order_id);
            if (!order || order.status !== 'delivered')
                fail('Returns become available after delivery.', 409);
            if (String(body.reason || '').trim().length < 5)
                fail('Please tell us why you are returning these items.');
            const requested = body.items;
            if (!Array.isArray(requested) || !requested.length)
                fail('Choose at least one return item.');
            const seen = new Set();
            for (const item of requested) {
                const ordered = order.items.find(p => p.id === item.order_item_id);
                const alreadyReturned = returns.filter(r => r.order_id === order.id).flatMap(r => r.items)
                    .filter(p => p.order_item_id === item.order_item_id).reduce((sum, p) => sum + p.quantity, 0);
                if (!ordered || seen.has(item.order_item_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity + alreadyReturned > ordered.quantity)
                    fail('Review your item quantities; an item may already have a return request.');
                seen.add(item.order_item_id);
            }
            const row = { id: 'PREVIEW-' + crypto.randomUUID().slice(0, 8), order_id: order.id,
                status: 'requested', items: body.items };
            returns.push(row);
            persist();
            return row;
        }
        if (path === '/account') {
            if (method === 'PUT') {
                if (String(body.name || '').trim().length < 2)
                    fail('Enter your name.');
                profile.name = String(body.name);
            }
            return structuredClone(profile);
        }
        if (path === '/support') {
            if (String(body.subject || '').trim().length < 3 || String(body.message || '').trim().length < 10)
                fail('Enter a subject and a message of at least 10 characters.');
            return { id: 'PREVIEW-' + crypto.randomUUID().slice(0, 8) };
        }
        if (path === '/consents') {
            if (body.granted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || '')))
                fail('Enter a valid email address.');
            return { id: crypto.randomUUID(), granted: body.granted };
        }
        if (path === '/account/privacy-requests')
            return { id: crypto.randomUUID(), status: 'preview' };
        fail('This screen is awaiting integration with your backend.', 501);
    }
    window.CommerceAPI = {
        preview,
        async initialize() {
            if (preview)
                return { configured: false, authenticated: false, user: null };
            const domain = config.get('authDomain');
            const clientId = config.get('authClient');
            if (domain && clientId) {
                auth = await window.auth0.createAuth0Client({ domain, clientId, cacheLocation: 'memory',
                    authorizationParams: { audience: config.get('authAudience') || undefined, redirect_uri: location.origin + '/' } });
                const outerUrl = window.top?.location.href || location.href;
                if (new URL(outerUrl).searchParams.has('code') && new URL(outerUrl).searchParams.has('state')) {
                    await auth.handleRedirectCallback(outerUrl);
                    window.top?.history.replaceState({}, '', '/');
                }
                return { configured: true, authenticated: await auth.isAuthenticated(), user: await auth.getUser() || null };
            }
            return { configured: false, authenticated: false, user: null };
        },
        async request(path, method = 'GET', body, headers = {}) {
            if (preview)
                return previewRequest(path, method, body, headers);
            backendRequest ||= createBackendTransport(networkRequest, async () => !!auth && await auth.isAuthenticated(), backend);
            return backendRequest(path, method, body, headers);
        },
        async login() {
            if (!auth)
                fail('Sign-in is awaiting your Auth0 frontend configuration.');
            await auth.loginWithRedirect({ openUrl: url => window.top?.location.assign(url) });
        },
        async logout() {
            if (auth)
                await auth.logout({ logoutParams: { returnTo: location.origin + '/' }, openUrl: url => window.top?.location.assign(url) });
        },
    };
    async function networkRequest(path, method = 'GET', body, headers = {}) {
        if (!backend)
            fail('The API URL has not been configured.', 503);
        if (!path.startsWith('/') || path.includes('..'))
            fail('Invalid API path.');
        const requestHeaders = { 'Content-Type': 'application/json', ...headers };
        if (auth && await auth.isAuthenticated())
            requestHeaders.Authorization = 'Bearer ' + await auth.getTokenSilently();
        let response;
        try {
            response = await fetch(backend + path, { method, headers: requestHeaders,
                body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20000) });
        }
        catch {
            fail('The store is unavailable. Please try again shortly.', 503);
        }
        let data;
        try {
            data = await response.json();
        }
        catch {
            fail('The store returned an unreadable response.', 502);
        }
        if (!response.ok) {
            const detail = data.detail;
            fail(data.error?.message || (Array.isArray(detail) ? detail.map((entry) => entry.msg).join('; ') :
                typeof detail === 'string' ? detail : 'Unable to complete this request.'), response.status);
        }
        return data;
    }
})();
