/* Maps the FastAPI contract to the storefront view models. Tokens are scoped to
 * this API origin and persisted separately from preview state. Never store PII. */
type Transport = (path: string, method?: string, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;
interface WireCart {
  id: string; cart_token?: string; version: number; status: string; coupon: string;
  subtotal_minor: number; total_minor: number; discount_minor?: number; tax_minor?: number; shipping_minor?: number;
  items: { id: string; variant_id: string; product_slug: string; product_name: string; colour: string;
    size?: string; quantity: number; unit_price_minor: number; currency: string; line_total_minor: number;
    line_discount_minor?: number; line_tax_minor?: number }[];
}
interface WirePayment { attempt_id: string; provider: string; redirect_url?: string }
interface WireWishlist { id: string; variant_ids: string[]; wishlist_token?: string }
interface WireOrder {
  id: string; order_number: string; status: string; email: string; total_minor: number; checkout_id: string;
  order_token?: string; payment_method: string; payment?: WirePayment;
  payments: StoreOrder['payments']; shipments: StoreOrder['shipments']; returns?: StoreReturn[];
  items: { id: string; product_name: string; variant_name: string; quantity: number }[];
}
interface Credentials {
  wishlist?: { id: string; token?: string; account?: boolean };
  cart?: { id: string; token: string };
  orders: Record<string, { token?: string; cartToken?: string }>;
  cases: Record<string, string>;
  checkout?: { digest: string; key: string };
}

// Called by the separately compiled client.ts browser script.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createBackendTransport(raw: Transport, signedIn: () => Promise<boolean>, origin: string): Transport {
  const storageKey = 'sa:api:v1:' + origin;
  let credentials: Credentials = { orders: {}, cases: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && saved.orders && saved.cases) credentials = saved;
  } catch { /* Unavailable storage leaves this session usable. */ }
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(credentials)); } catch { /* Session only. */ } };
  let catalog: StoreProduct[] = [];
  let bag: StoreCart | null = null;
  let cartPromise: Promise<StoreCart> | undefined;
  let catalogPromise: Promise<{ items: StoreProduct[] }> | undefined;
  let merged = false;
  let wishlistPromise: Promise<{ id: string; variant_ids: string[] }> | undefined;
  let wishlistMerged = false;
  const wishlistHeaders = (): Record<string, string> => credentials.wishlist?.token ? { 'X-Wishlist-Token': credentials.wishlist.token } : {};
  async function ensureWishlist(): Promise<{ id: string; variant_ids: string[] }> {
    if (wishlistPromise) return wishlistPromise;
    wishlistPromise = (async () => {
      const authenticated = await signedIn();
      if (credentials.wishlist?.account && !authenticated) { credentials.wishlist = undefined; save(); }
      let row: WireWishlist | undefined;
      if (credentials.wishlist) {
        try { row = await raw(`/wishlists/${credentials.wishlist.id}`, 'GET', undefined, wishlistHeaders()) as typeof row; }
        catch (error) { if ((error as { status?: number }).status !== 404) throw error; credentials.wishlist = undefined; }
      }
      if (!row) {
        row = await raw('/wishlists', 'POST') as WireWishlist;
        credentials.wishlist = { id: row.id, token: row.wishlist_token, account: authenticated }; save();
      }
      if (authenticated && !wishlistMerged && !credentials.wishlist?.account) {
        row = await raw(`/wishlists/${row.id}/merge`, 'POST', undefined, wishlistHeaders()) as WireWishlist;
        credentials.wishlist = { id: row.id, account: true }; save();
      }
      wishlistMerged = true;
      return row;
    })();
    try { return await wishlistPromise; } finally { wishlistPromise = undefined; }
  }
  const orderHeaders = (id: string) => {
    const entry = credentials.orders[id];
    return { ...(entry?.token ? { 'X-Order-Token': entry.token } : {}),
      ...(entry?.cartToken ? { 'X-Cart-Token': entry.cartToken } : {}) };
  };
  const cartHeaders = (): Record<string, string> => credentials.cart ? { 'X-Cart-Token': credentials.cart.token } : {};
  const normalizeOrder = (row: WireOrder): StoreOrder => ({ ...row, guest_email: row.email,
    items: (row.items || []).map(i => ({ ...i, title_snapshot: `${i.product_name} / ${i.variant_name}` })),
    payments: row.payments || [], shipments: row.shipments || [], returns: row.returns || [], expires_at: 0 });
  function normalizeCart(row: WireCart): StoreCart {
    if (row.cart_token) { credentials.cart = { id: row.id, token: row.cart_token }; save(); }
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
  async function readBag(): Promise<StoreCart> {
    if (!credentials.cart) return ensureCart();
    return normalizeCart(await raw(`/carts/${credentials.cart.id}/quote`, 'GET', undefined, cartHeaders()) as WireCart);
  }
  async function ensureCart(): Promise<StoreCart> {
    if (cartPromise) return cartPromise;
    cartPromise = (async () => {
      if (credentials.cart) {
        try { await raw(`/carts/${credentials.cart.id}`, 'GET', undefined, cartHeaders()); }
        catch (error) {
          if ((error as { status?: number }).status !== 404) throw error;
          if (credentials.checkout) {
            try {
              const recovered = await raw(`/carts/${credentials.cart.id}/checkout-result`, 'GET', undefined,
                { ...cartHeaders(), 'Idempotency-Key': credentials.checkout.key }) as WireOrder;
              credentials.orders[recovered.id] = { token: recovered.order_token, cartToken: credentials.cart.token };
            } catch (recoveryError) { if ((recoveryError as { status?: number }).status !== 404) throw recoveryError; }
          }
          credentials.cart = undefined; save();
        }
      }
      if (!credentials.cart) normalizeCart(await raw('/carts', 'POST') as WireCart);
      if (!merged && await signedIn()) {
        normalizeCart(await raw(`/carts/${credentials.cart!.id}/merge`, 'POST', undefined, cartHeaders()) as WireCart);
        merged = true;
      }
      return readBag();
    })();
    try { return await cartPromise; } finally { cartPromise = undefined; }
  }
  async function allProducts() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      const items: StoreProduct[] = [];
      let offset = 0;
      for (;;) {
        const page = await raw(`/storefront/catalog?limit=100&offset=${offset}`) as { items: StoreProduct[]; has_more: boolean; next_offset: number };
        items.push(...page.items);
        if (!page.has_more) break;
        if (page.next_offset <= offset) throw new Error('Invalid catalogue pagination.');
        offset = page.next_offset;
      }
      catalog = items;
      return { items };
    })();
    try { return await catalogPromise; } finally { catalogPromise = undefined; }
  }
  async function allOrders() {
    const ids = new Set(Object.keys(credentials.orders));
    if (await signedIn()) {
      const result = await raw('/customers/me/orders') as { items: { id: string }[] };
      result.items.forEach(row => ids.add(row.id));
    }
    const rows: StoreOrder[] = [];
    for (const id of ids) {
      try { rows.push(normalizeOrder(await raw(`/orders/${id}`, 'GET', undefined, orderHeaders(id)) as WireOrder)); }
      catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
    }
    return { items: rows.reverse() };
  }
  return async (path, method = 'GET', body, headers = {}) => {
    if (path === '/wishlist') return ensureWishlist();
    const wishItem = path.match(/^\/wishlist\/items\/([^/]+)$/);
    if (wishItem) {
      const list = await ensureWishlist();
      return raw(`/wishlists/${list.id}/items/${wishItem[1]}`, method, body, wishlistHeaders());
    }
    if (path === '/products') return allProducts();
    if (path === '/carts') return ensureCart();
    const itemPath = path.match(/^\/carts\/([^/]+)\/items$/);
    if (itemPath && method === 'POST') {
      await ensureCart();
      const input = body as { variant_id: string; quantity: number };
      const line = bag?.items.find(i => i.id === input.variant_id);
      if (input.quantity === 0 && line) await raw(`/carts/${credentials.cart!.id}/items/${line.cart_item_id}`, 'DELETE', undefined, cartHeaders());
      else if (input.quantity > 0) await raw(`/carts/${credentials.cart!.id}/items`, 'POST', input, cartHeaders());
      return readBag();
    }
    if (/^\/carts\/[^/]+\/coupon$/.test(path)) {
      return normalizeCart(await raw(path, method, body, cartHeaders()) as WireCart);
    }
    if (path === '/checkout') {
      const input = body as { cart_id: string; email: string; payment_method?: string; expected_total_minor?: number; address: Record<string, string> };
      const address = input.address;
      const payload = { cart_id: input.cart_id, email: input.email, phone: address.phone, expected_total_minor: input.expected_total_minor,
        shipping_address: { full_name: address.name, street: address.street, city: address.city,
          state: address.state || '', pin_code: address.postal_code, country: 'IN' }, payment_method: input.payment_method || 'cod' };
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
      if (credentials.checkout?.digest !== digest) { credentials.checkout = { digest, key: crypto.randomUUID() }; save(); }
      const row = await raw(path, method, payload, { ...cartHeaders(), 'Idempotency-Key': credentials.checkout.key }) as WireOrder;
      credentials.orders[row.id] = { token: row.order_token, cartToken: credentials.cart?.token };
      // Keep checkout replay evidence until another payload is submitted, including across reloads.
      save();
      return { order_id: row.id, payment_attempt_id: row.payment?.attempt_id || '', status: row.status,
        payment: row.payment ? { ...row.payment, payment_attempt_id: row.payment.attempt_id } : undefined };
    }
    if (path === '/orders') return allOrders();
    const orderPath = path.match(/^\/orders\/([^/]+)(.*)$/);
    if (orderPath) {
      if (orderPath[2] === '/access') return { order_id: orderPath[1], order_token: credentials.orders[orderPath[1]]?.token };
      const row = await raw(path, method, body, { ...headers, ...orderHeaders(orderPath[1]) });
      if (orderPath[2] === '/retry-payment') {
        const result = row as { order_id: string; payment: WirePayment };
        return { ...result, payment: { ...result.payment, payment_attempt_id: result.payment.attempt_id } };
      }
      return orderPath[2] ? row : normalizeOrder(row as WireOrder);
    }
    if (path === '/guest-order') {
      const input = body as { id: string; token: string };
      const row = await raw(`/orders/${encodeURIComponent(input.id)}`, 'GET', undefined, { 'X-Order-Token': input.token }) as WireOrder;
      credentials.orders[row.id] = { ...credentials.orders[row.id], token: input.token }; save();
      return normalizeOrder(row);
    }
    if (path === '/returns' && method === 'POST') {
      const input = body as { order_id: string };
      return raw(path, method, body, orderHeaders(input.order_id));
    }
    if (path === '/consents') {
      const input = body as { email: string; granted: boolean };
      return raw('/newsletter/' + (input.granted ? 'subscribe' : 'unsubscribe'), 'POST', { email: input.email });
    }
    if (path === '/account') return raw('/customers/me', method, body);
    if (path === '/account/privacy-requests') return raw('/customers/me/export');
    if (path === '/support') {
      const input = body as { subject: string; message: string; email: string };
      const loggedIn = await signedIn();
      const row = await raw('/support/cases' + (loggedIn ? '' : '/guest'), 'POST', {
        subject: input.subject, body: input.message, ...(!loggedIn ? { email: input.email } : {}),
      }) as { id: string; case_token?: string };
      credentials.cases[row.id] = row.case_token || ''; save(); return row;
    }
    if (path === '/support-history') {
      const ids = new Set(Object.keys(credentials.cases));
      if (await signedIn()) {
        const result = await raw('/support/cases') as { items: { id: string }[] };
        result.items.forEach(row => ids.add(row.id));
      }
      const items = [];
      for (const id of ids) {
        try { items.push(await raw(`/support/cases/${id}`, 'GET', undefined, { 'X-Case-Token': credentials.cases[id] || '' })); }
        catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
      }
      return { items };
    }
    const casePath = path.match(/^\/support\/cases\/([^/]+)/);
    if (casePath) return raw(path, method, body, { 'X-Case-Token': credentials.cases[casePath[1]] || '' });
    if (path.startsWith('/preview/')) throw new Error('Preview actions are unavailable in the connected store.');
    return raw(path, method, body, headers);
  };
}
