/* Frontend transport and isolated UI preview fixtures.
 * Connected requests use the FastAPI adapter in backend.ts.
 * No commerce state is authoritative in this module.
 */
interface StoreProduct {
  development_sample?: boolean;
  size?: string | null; care?: string; categories?: string[]; collections?: string[];
  id: string; product_id: string; slug: string; name: string; colour: string;
  category: string; material: string; description: string; price_minor: number;
  currency: string; available: number; media: { url?: string }[];
}
interface StoreLine extends StoreProduct {
  cart_item_id?: string;
  quantity: number; line_discount_minor: number; line_tax_minor: number; line_total_minor: number;
}
interface StoreCart {
  coupon_error?: string;
  shipping_minor?: number;
  id: string; version: number; status: string; coupon: string; items: StoreLine[];
  subtotal_minor: number; total_minor: number; discount_minor: number; tax_minor: number;
}
interface StoreOrder {
  checkout_id?: string; payment_method?: string; returns?: StoreReturn[];
  id: string; order_number: string; status: string; guest_email: string; total_minor: number;
  items: { id: string; quantity: number; title_snapshot: string }[];
  payments: { id: string; status: string; redirect_url?: string }[];
  shipments: { carrier: string; tracking_number: string; status: string }[];
  expires_at: number;
}
interface StoreReturn { id: string; order_id: string; status: string; items: { order_item_id: string; quantity: number }[] }
interface BrowserAuth {
  handleRedirectCallback(url?: string): Promise<unknown>;
  isAuthenticated(): Promise<boolean>;
  getUser(): Promise<{ name?: string; email?: string } | undefined>;
  getTokenSilently(): Promise<string>;
  loginWithRedirect(options: { openUrl: (url: string) => void }): Promise<void>;
  logout(options: { logoutParams: { returnTo: string }; openUrl: (url: string) => void }): Promise<void>;
}
// Browser globals used by the preserved iframe runtime.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Window {
  CommerceConfig?: Record<string, string>;
  auth0: { createAuth0Client(options: object): Promise<BrowserAuth> };
  CommerceAPI: {
    preview: boolean;
    initialize(): Promise<{ configured: boolean; authenticated: boolean; user: { name?: string; email?: string } | null }>;
    request(path: string, method?: string, body?: unknown, headers?: Record<string, string>): Promise<unknown>;
    login(): Promise<void>;
    logout(): Promise<void>;
  };
}

(() => {
  const config = new URLSearchParams(window.CommerceConfig || location.search);
  const preview = config.get('mode') !== 'api';
  let backendRequest: Transport | undefined;
  let auth: BrowserAuth | null = null;
  const backend = (config.get('api') || '').replace(/\/$/, '');
  const fixtureRows: [string, string, string, number, string][] = [
    ['performance-t-shirt', 'Performance T-shirt', 'Black', 2490, 'Essential Affair'],
    ['training-tank', 'Training Tank', 'Black', 1990, 'Form'],
    ['performance-short', 'Performance Short', 'Black', 2290, 'First Affair'],
    ['performance-hoodie', 'Performance Hoodie', 'Black', 3490, 'Inner Affair'],
    ['shell-jacket', 'Shell Jacket', 'Taupe', 4490, 'Shell'],
    ['lounge-pant', 'Lounge Pant', 'Warm Grey', 2490, 'Inner Affair'],
  ];
  const products: StoreProduct[] = fixtureRows.map(([slug, name, colour, price, category], index) => ({
    id: `preview-variant-${index}`, product_id: `preview-product-${index}`, slug, name, colour,
    category, material: 'Fabric details coming soon',
    description: 'Considered essentials for movement and everyday life.', price_minor: price * 100,
    currency: 'INR', available: 12, media: [],
  }));
  const cart: StoreCart = { id: 'preview-cart', version: 1, status: 'open', coupon: '', items: [], subtotal_minor: 0, total_minor: 0, discount_minor: 0, tax_minor: 0 };
  let orders: StoreOrder[] = [];
  let returns: StoreReturn[] = [];
  const replays = new Map<string, { body: string; response: unknown }>();
  const profile = { name: 'Preview customer', preferences: {}, addresses: [], consents: [] };
  let initialized = false;

  function loadPreview() {
    if (initialized) return;
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
        if (Array.isArray(saved.orders)) orders = saved.orders;
        if (Array.isArray(saved.returns)) returns = saved.returns;
        cart.coupon = saved.coupon === 'WELCOME10' ? 'WELCOME10' : '';
      }
    } catch { /* Corrupt or unavailable storage starts a fresh UI preview. */ }
    recalculate();
  }

  function persist() {
    try {
      localStorage.setItem('sa:preview:apparel:v2', JSON.stringify({
        quantities: cart.items.map(p => ({ id: p.id, quantity: p.quantity })), coupon: cart.coupon,
        // Do not persist contact/address form data in preview storage.
        orders: orders.map(o => ({ ...o, guest_email: 'Preview customer' })), returns,
      }));
    } catch { /* In-memory preview remains available. */ }
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

  function fail(message: string, status = 422): never {
    throw Object.assign(new Error(message), { status });
  }

  function previewRequest(path: string, method: string, input: unknown, headers: Record<string, string>): unknown {
    loadPreview();
    const body = (input || {}) as Record<string, unknown>;
    const key = headers['Idempotency-Key'];
    if (key && replays.has(key)) {
      const replay = replays.get(key)!;
      if (replay.body !== JSON.stringify(body)) fail('Your checkout changed. Review it and try again.', 409);
      return structuredClone(replay.response);
    }
    if (path === '/guest-sessions') return { token: crypto.randomUUID() };
    if (path === '/products') return { items: products, total: products.length };
    if (path.startsWith('/carts')) {
      if (path.endsWith('/items') && method === 'POST') {
        if (body.version !== cart.version) fail('Your bag changed. Please review it.', 409);
        const product = products.find(p => p.id === body.variant_id);
        const quantity = Number(body.quantity);
        if (!product || !Number.isInteger(quantity) || quantity < 0 || quantity > product.available) fail('That quantity is unavailable in this preview.', 409);
        cart.items = cart.items.filter(p => p.id !== product.id);
        if (quantity) cart.items.push({ ...product, quantity, line_total_minor: 0, line_tax_minor: 0, line_discount_minor: 0 });
        cart.version += 1;
      }
      if (path.endsWith('/coupon') && method === 'POST') {
        const code = String(body.code || '').toUpperCase();
        if (code && code !== 'WELCOME10') fail('Try WELCOME10 in the frontend preview.');
        cart.coupon = code; cart.version += 1;
      }
      recalculate();
      return { ...structuredClone(cart), adjustments: [] };
    }
    if (path === '/checkout' && method === 'POST') {
      const address = body.address as Record<string, string> | undefined;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || ''))) fail('Enter a valid email address.');
      if (!address || !address.name?.trim() || !address.street?.trim() || !address.city?.trim()) fail('Complete your shipping address.');
      if (!/^[1-9][0-9]{5}$/.test(address.postal_code || '')) fail('Enter a six-digit Indian PIN code.');
      if (!/^\+?[0-9 ()-]{10,18}$/.test(address.phone || '')) fail('Enter a valid phone number.');
      if (!cart.items.length) fail('Your bag is empty.');
      if (body.cart_version !== cart.version) fail('Your bag changed. Review it before checkout.', 409);
      const id = crypto.randomUUID();
      const attempt = crypto.randomUUID();
      orders.unshift({ id, order_number: 'PREVIEW-' + id.slice(0, 8).toUpperCase(), status: 'pending_payment',
        guest_email: 'Preview customer', total_minor: cart.total_minor,
        items: cart.items.map(p => ({ id: p.id, quantity: p.quantity, title_snapshot: p.name })),
        payments: [{ id: attempt, status: 'initiated' }], shipments: [], expires_at: Date.now() + 900000 });
      const result = { order_id: id, payment_attempt_id: attempt, payment: { provider: 'preview', payment_attempt_id: attempt } };
      if (key) replays.set(key, { body: JSON.stringify(body), response: result });
      persist(); return result;
    }
    if (path.startsWith('/preview/payments/')) {
      const order = orders.find(o => o.payments.some(p => path.endsWith(p.id)));
      if (!order) fail('Preview order not found.', 404);
      if (order.expires_at < Date.now()) { order.status = 'expired'; persist(); fail('The preview reservation expired.', 409); }
      if (order.status !== 'pending_payment') fail('This preview payment is already complete.', 409);
      order.status = body.action === 'authorized' ? 'confirmed' : 'payment_failed';
      order.payments.at(-1)!.status = body.action === 'authorized' ? 'authorized' : 'failed';
      if (order.status === 'confirmed') { cart.items = []; cart.coupon = ''; cart.version += 1; recalculate(); }
      persist(); return { accepted: true };
    }
    if (path === '/orders' && method === 'GET') return { items: structuredClone(orders) };
    if (path === '/preview/orders/delivered') {
      if (!orders.some(order => order.id === 'sample-delivered')) orders.push({
        id: 'sample-delivered', order_number: 'PREVIEW-DELIVERED', status: 'delivered', guest_email: 'Preview customer',
        total_minor: 249000, items: [{ id: 'sample-item', title_snapshot: 'Performance T-shirt', quantity: 1 }],
        payments: [{ id: 'sample-payment', status: 'captured' }],
        shipments: [{ carrier: 'Sample carrier', tracking_number: 'PREVIEW-TRACKING', status: 'delivered' }], expires_at: 0,
      });
      persist(); return { loaded: true };
    }
    if (path.startsWith('/orders/')) {
      const id = path.split('/')[2];
      const order = orders.find(o => o.id === id);
      if (!order) fail('Order not found in this preview session.', 404);
      if (order.status === 'pending_payment' && order.expires_at < Date.now()) order.status = 'expired';
      if (path.endsWith('/cancel') && method === 'POST') {
        if (!['confirmed', 'allocated'].includes(order.status)) fail('This order can no longer be cancelled.', 409);
        order.status = 'cancelled'; persist();
      }
      if (path.endsWith('/retry-payment') && method === 'POST') {
        if (order.status !== 'payment_failed') fail('There is no failed payment to retry.', 409);
        order.status = 'pending_payment';
        const attempt = crypto.randomUUID();
        order.payments.push({ id: attempt, status: 'initiated' }); persist();
        return { order_id: id, payment: { provider: 'preview', payment_attempt_id: attempt } };
      }
      return structuredClone(order);
    }
    if (path === '/returns') {
      if (method === 'GET') return { items: structuredClone(returns) };
      const order = orders.find(o => o.id === body.order_id);
      if (!order || order.status !== 'delivered') fail('Returns become available after delivery.', 409);
      if (String(body.reason || '').trim().length < 5) fail('Please tell us why you are returning these items.');
      const requested = body.items as StoreReturn['items'];
      if (!Array.isArray(requested) || !requested.length) fail('Choose at least one return item.');
      const seen = new Set<string>();
      for (const item of requested) {
        const ordered = order.items.find(p => p.id === item.order_item_id);
        const alreadyReturned = returns.filter(r => r.order_id === order.id).flatMap(r => r.items)
          .filter(p => p.order_item_id === item.order_item_id).reduce((sum, p) => sum + p.quantity, 0);
        if (!ordered || seen.has(item.order_item_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity + alreadyReturned > ordered.quantity) fail('Review your item quantities; an item may already have a return request.');
        seen.add(item.order_item_id);
      }
      const row: StoreReturn = { id: 'PREVIEW-' + crypto.randomUUID().slice(0, 8), order_id: order.id,
        status: 'requested', items: body.items as StoreReturn['items'] };
      returns.push(row); persist(); return row;
    }
    if (path === '/account') {
      if (method === 'PUT') {
        if (String(body.name || '').trim().length < 2) fail('Enter your name.');
        profile.name = String(body.name);
      }
      return structuredClone(profile);
    }
    if (path === '/support') {
      if (String(body.subject || '').trim().length < 3 || String(body.message || '').trim().length < 10) fail('Enter a subject and a message of at least 10 characters.');
      return { id: 'PREVIEW-' + crypto.randomUUID().slice(0, 8) };
    }
    if (path === '/consents') {
      if (body.granted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || ''))) fail('Enter a valid email address.');
      return { id: crypto.randomUUID(), granted: body.granted };
    }
    if (path === '/account/privacy-requests') return { id: crypto.randomUUID(), status: 'preview' };
    fail('This screen is awaiting integration with your backend.', 501);
  }

  window.CommerceAPI = {
    preview,
    async initialize() {
      if (preview) return { configured: false, authenticated: false, user: null };
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
      if (preview) return previewRequest(path, method, body, headers);
      backendRequest ||= createBackendTransport(networkRequest, async () => !!auth && await auth.isAuthenticated(), backend);
      return backendRequest(path, method, body, headers);
    },
    async login() {
      if (!auth) fail('Sign-in is awaiting your Auth0 frontend configuration.');
      await auth.loginWithRedirect({ openUrl: url => window.top?.location.assign(url) });
    },
    async logout() {
      if (auth) await auth.logout({ logoutParams: { returnTo: location.origin + '/' }, openUrl: url => window.top?.location.assign(url) });
    },
  };

  async function networkRequest(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
      if (!backend) fail('The API URL has not been configured.', 503);
      if (!path.startsWith('/') || path.includes('..')) fail('Invalid API path.');
      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
      if (auth && await auth.isAuthenticated()) requestHeaders.Authorization = 'Bearer ' + await auth.getTokenSilently();
      let response: Response;
      try {
        response = await fetch(backend + path, { method, headers: requestHeaders,
          body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20000) });
      } catch { fail('The store is unavailable. Please try again shortly.', 503); }
      let data;
      try { data = await response.json(); } catch { fail('The store returned an unreadable response.', 502); }
      if (!response.ok) {
        const detail = data.detail;
        fail(data.error?.message || (Array.isArray(detail) ? detail.map((entry: { msg: string }) => entry.msg).join('; ') :
          typeof detail === 'string' ? detail : 'Unable to complete this request.'), response.status);
      }
      return data;
    }
})();
