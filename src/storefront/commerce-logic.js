// Runs inside the existing reference component. Layout and media stay in the template.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- consumed by the reference runtime
class Component extends BaseComponent {
  async api(path, method = 'GET', body, key) {
    return window.CommerceAPI.request(path, method, body,
      { 'X-Guest-Token': this.guestToken || '', ...(key ? { 'Idempotency-Key': key } : {}) });
  }

  notify(message) { this.setState({ commerceMessage: message }); }

  async task(action) {
    if (this.busy) return;
    this.busy = true;
    this.setState({ commerceBusy: true, commerceMessage: '' });
    try { await action(); }
    catch (error) { this.notify(error.message || 'Please try again.'); }
    finally { this.busy = false; this.setState({ commerceBusy: false }); }
  }

  storage(key, value) {
    const prefix = window.CommerceAPI.preview ? 'sa:preview:' : 'sa:api:';
    try {
      if (value === undefined) return localStorage.getItem(prefix + key);
      if (value === null) localStorage.removeItem(prefix + key);
      else localStorage.setItem(prefix + key, value);
    } catch { /* The session still works when persistent browser storage is blocked. */ }
  }

  applyCart(snapshot) {
    this.cartSnapshot = snapshot;
    this.storage('cart', snapshot.id);
    this.setState({ cart: snapshot.items.map(item => ({ id: item.slug, qty: item.quantity })), snapshot });
  }

  async initializeCommerce() {
    this.session = await window.CommerceAPI.initialize();
    this.guestToken = this.storage('guest');
    if (!this.guestToken) {
      const session = await this.api('/guest-sessions', 'POST');
      this.guestToken = session.token;
      this.storage('guest', session.token);
    }
    const result = await this.api('/products');
    this.catalogue = result.items;
    this.products = result.items.map(item => {
      const original = this.originalProducts.find(p => p.id === item.slug);
      return { ...original, id: item.slug, variantId: item.id, name: item.name, colour: item.colour,
        price: this.money(item.price_minor), priceN: item.price_minor / 100, cat: item.category,
        material: item.material, available: item.available, desc: item.description,
        img: original ? original.img : (item.media[0] && item.media[0].url) || '', tag: original ? original.tag : '' };
    });
    // Preserve editorial reference slots even when a product is unpublished.
    // Unpublished pieces are never purchasable; listings below use catalogue IDs.
    for (const original of this.originalProducts) {
      if (!this.products.some(p => p.id === original.id)) this.products.push({ ...original, available: 0, unpublished: true });
    }
    const existingId = this.storage('cart');
    let snapshot;
    if (existingId && this.session.authenticated && this.storage('cartOwner') !== 'account') {
      try {
        snapshot = await this.api('/carts/' + existingId + '/merge', 'POST');
        if (snapshot.adjustments.length) this.notify('Some bag quantities changed to match available stock. Please review your bag.');
      } catch (error) { if (![404, 409].includes(error.status)) throw error; }
    } else if (existingId) {
      try { snapshot = await this.api('/carts/' + existingId); }
      catch (error) { if (error.status !== 404) throw error; }
    }
    if (!snapshot || snapshot.status !== 'open') snapshot = await this.api('/carts', 'POST');
    this.storage('cartOwner', this.session.authenticated ? 'account' : 'guest');
    this.applyCart(snapshot);
    this.setState({ commerceReady: true, accountName: this.session.user && this.session.user.name });
    const orderId = this.storage('pendingOrder');
    if (orderId) {
      const order = await this.refreshOrder(orderId);
      if (['pending_payment', 'payment_failed'].includes(order.status)) this.pollOrder(orderId);
    }
  }

  componentDidMount() {
    super.componentDidMount();
    this.originalProducts = [...this.products];
    this.task(() => this.initializeCommerce());
    this._escape = event => {
      if (event.key === 'Escape') this.setState({ searchOpen: false, cartOpen: false, filterOpen: false, commercePanel: '' });
      if (event.key === 'Tab' && this.state.commercePanel) {
        const panel = document.querySelector('.commerce-panel');
        const focusable = panel ? [...panel.querySelectorAll('button, a[href], input, textarea, select')].filter(node => node.getClientRects().length && !node.disabled) : [];
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', this._escape);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    clearInterval(this.orderPoll);
    window.removeEventListener('keydown', this._escape);
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    if (this._activePanel !== this.state.commercePanel) {
      if (this.state.commercePanel) {
        if (!this._activePanel) this._returnFocus = document.activeElement;
        document.querySelector('.commerce-panel button')?.focus();
      } else if (this._returnFocus && this._returnFocus.isConnected) this._returnFocus.focus();
      this._activePanel = this.state.commercePanel;
      document.querySelectorAll('main, header, footer').forEach(node => { node.inert = Boolean(this.state.commercePanel); });
    }
  }

  money(minor) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100); }

  async updateQuantity(product, quantity) {
    if (!this.state.commerceReady || !this.cartSnapshot) throw new Error('The store is connecting. Please try again shortly.');
    if (!product.variantId) throw new Error('This piece is currently unavailable.');
    try {
      const cart = await this.api('/carts/' + this.cartSnapshot.id + '/items', 'POST',
        { variant_id: product.variantId, quantity, version: this.cartSnapshot.version });
      this.applyCart(cart);
    } catch (error) {
      if (error.status === 409) this.applyCart(await this.api('/carts/' + this.cartSnapshot.id));
      throw error;
    }
  }

  async submitCheckout() {
    if (!this.cartSnapshot || !this.cartSnapshot.items.length) throw new Error('Your bag is empty.');
    const co = this.state.co;
    const body = { cart_id: this.cartSnapshot.id, cart_version: this.cartSnapshot.version, email: co.email,
      address: { name: co.name, street: co.addr, city: co.city, postal_code: co.pin, phone: co.phone, country: 'IN' } };
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body)));
    const canonical = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    let pending;
    try { pending = JSON.parse(this.storage('checkout') || 'null'); } catch { pending = null; }
    if (!pending || pending.body !== canonical) {
      pending = { body: canonical, key: crypto.randomUUID() };
      this.storage('checkout', JSON.stringify(pending));
    }
    const result = await this.api('/checkout', 'POST', body, pending.key);
    this.storage('pendingOrder', result.order_id);
    this.setState({ activeOrderId: result.order_id, activeOrder: null, paymentSession: result.payment, commercePanel: 'payment' });
    this.pollOrder(result.order_id);
  }

  pollOrder(identifier) {
    clearInterval(this.orderPoll);
    let polls = 0;
    this.orderPoll = setInterval(() => {
      if (++polls > 180) { clearInterval(this.orderPoll); return; }
      this.refreshOrder(identifier).catch(() => {});
    }, 5000);
  }

  async refreshOrder(identifier) {
    const order = await this.api('/orders/' + identifier);
    this.setState({ activeOrder: order, activeOrderId: order.id });
    if (['confirmed', 'allocated', 'fulfilled', 'delivered', 'partially_fulfilled'].includes(order.status)) {
      clearInterval(this.orderPoll);
      this.storage('pendingOrder', null); this.storage('checkout', null);
      this.setState({ order: { no: order.order_number, email: order.guest_email,
        count: order.items.reduce((sum, item) => sum + item.quantity, 0), total: this.money(order.total_minor), pay: 'Payment authorized' },
        screen: 'confirm', commercePanel: '', cart: [] });
      this.applyCart(await this.api('/carts', 'POST'));
      window.scrollTo(0, 0);
    } else if (['expired', 'cancelled'].includes(order.status)) {
      clearInterval(this.orderPoll); this.storage('pendingOrder', null); this.storage('checkout', null);
      this.setState({ commercePanel: 'orders' });
      this.notify('This order is ' + order.status + '. You can start a new bag.');
    } else {
      this.setState({ commercePanel: 'payment', paymentSession: { provider: window.CommerceAPI.preview ? 'preview' : 'hosted',
        redirect_url: order.payments[order.payments.length - 1].redirect_url,
        payment_attempt_id: order.payments[order.payments.length - 1].id } });
    }
    return order;
  }

  async showOrders() {
    const result = await this.api('/orders');
    const returnResult = await this.api('/returns');
    this.setState({ commercePanel: 'orders', orderList: result.items, returnList: returnResult.items });
  }

  renderVals() {
    const values = super.renderVals();
    const state = this.state;
    const snapshot = state.snapshot;
    const query = (state.searchQuery || '').toLowerCase().trim();
    const decorate = product => ({ ...product, ph: product.name, searchSlotId: 'srch-' + product.id,
      open: event => { if (event) event.preventDefault(); this.setState({ screen: 'product', productId: product.id, searchOpen: false }); window.scrollTo(0, 0); } });
    const set = name => event => this.setState({ [name]: event.target.value });
    const shop = values.shopProducts.filter(p => !p.unpublished && (!state.colourFilter || p.colour === state.colourFilter) && (!state.materialFilter || p.material === state.materialFilter));
    const rows = values.cartItems.map((item, index) => {
      const entry = state.cart[index];
      const product = this.products.find(p => p.id === entry.id);
      const line = snapshot && snapshot.items.find(p => p.slug === entry.id);
      return { ...item, line: line ? this.money(line.line_total_minor) : item.line,
        inc: () => this.task(() => this.updateQuantity(product, entry.qty + 1)),
        dec: () => this.task(() => this.updateQuantity(product, entry.qty - 1)),
        remove: event => { event.preventDefault(); this.task(() => this.updateQuantity(product, 0)); } };
    });
    return { ...values,
      shopProducts: shop, shopCount: shop.length,
      searchQuery: state.searchQuery || '', setSearchQuery: set('searchQuery'),
      searchResults: this.products.filter(p => !p.unpublished && (!query || [p.name, p.colour, p.cat, p.material].join(' ').toLowerCase().includes(query))).map(decorate),
      searchEmpty: Boolean(query) && !this.products.some(p => !p.unpublished && [p.name, p.colour, p.cat, p.material].join(' ').toLowerCase().includes(query)),
      colourFilter: state.colourFilter || '', setColourFilter: set('colourFilter'),
      materialFilter: state.materialFilter || '', setMaterialFilter: set('materialFilter'),
      colours: [...new Set(this.products.filter(p => !p.unpublished).map(p => p.colour))].map(name => ({ name })),
      materials: [...new Set(this.products.filter(p => !p.unpublished).map(p => p.material || 'Full-grain leather'))].map(name => ({ name })),
      cartItems: rows, subtotal: snapshot ? this.money(snapshot.subtotal_minor) : values.subtotal,
      cartTotal: snapshot ? this.money(snapshot.total_minor) : values.subtotal,
      cartTax: snapshot ? this.money(snapshot.tax_minor) : '', cartDiscount: snapshot ? this.money(snapshot.discount_minor) : '',
      hasDiscount: snapshot && snapshot.discount_minor > 0,
      couponCode: state.couponCode || '', setCouponCode: set('couponCode'),
      applyCoupon: () => this.task(async () => this.applyCart(await this.api('/carts/' + this.cartSnapshot.id + '/coupon', 'POST', { code: state.couponCode || '', version: this.cartSnapshot.version }))),
      addLabel: values.p.available === 0 ? 'Currently unavailable' : state.commerceBusy ? 'Please wait…' : 'Add to Bag',
      addToBag: () => this.task(async () => {
        const item = state.cart.find(c => c.id === values.p.id);
        await this.updateQuantity(values.p, (item ? item.qty : 0) + 1); this.setState({ cartOpen: true });
      }),
      goCheckout: () => this.task(async () => {
        if (!this.cartSnapshot) throw new Error('The store is connecting. Please try again.');
        this.applyCart(await this.api('/carts/' + this.cartSnapshot.id));
        if (this.cartSnapshot.items.length) { this.setState({ screen: 'checkout', cartOpen: false }); window.scrollTo(0, 0); }
      }),
      payMethods: [{ name: 'Secure payment', hint: 'Continue to payment', dot: '#171714', showCard: false, showUpi: false, pick: e => e.preventDefault() }],
      placeLabel: state.commerceBusy ? 'Please wait…' : 'Continue to Payment — ' + (snapshot ? this.money(snapshot.total_minor) : ''),
      placeOrder: () => this.task(() => this.submitCheckout()),
      commerceMessage: state.commerceMessage || '', dismissMessage: () => this.setState({ commerceMessage: '' }),
      commercePanel: Boolean(state.commercePanel), closeCommerce: () => this.setState({ commercePanel: '' }),
      showPayment: state.commercePanel === 'payment',
      isPreview: window.CommerceAPI.preview,
      isLive: !window.CommerceAPI.preview,
      checkoutNotice: window.CommerceAPI.preview ? 'Frontend preview only. No order is sent and no money is charged.' : 'Payment is completed securely with our payment provider.',
      confirmationTitle: window.CommerceAPI.preview ? 'Preview complete' : 'Thank you',
      confirmationMessage: window.CommerceAPI.preview ? 'This is a frontend preview. No purchase, payment or stock reservation has been made.' : 'Your payment is authorized and your order is confirmed. Follow its progress using Order Tracking below.',
      paymentFailed: state.activeOrder && state.activeOrder.status === 'payment_failed',
      authorizeSandbox: () => this.task(async () => {
        if (!window.CommerceAPI.preview) throw new Error('Use the secure payment provider.');
        await this.api('/preview/payments/' + state.paymentSession.payment_attempt_id, 'POST', { action: 'authorized' });
        await this.refreshOrder(state.activeOrderId);
      }),
      declineSandbox: () => this.task(async () => {
        if (!window.CommerceAPI.preview) throw new Error('Use the secure payment provider.');
        await this.api('/preview/payments/' + state.paymentSession.payment_attempt_id, 'POST', { action: 'failed' });
        await this.refreshOrder(state.activeOrderId);
      }),
      retryPayment: () => this.task(async () => {
        const result = await this.api('/orders/' + state.activeOrderId + '/retry-payment', 'POST', undefined, crypto.randomUUID());
        this.setState({ paymentSession: result.payment, activeOrder: { ...state.activeOrder, status: 'pending_payment' } });
      }),
      refreshPayment: () => this.task(() => this.refreshOrder(state.activeOrderId)),
      continueHostedPayment: () => this.task(async () => {
        const url = state.paymentSession && state.paymentSession.redirect_url;
        if (!url || new URL(url).protocol !== 'https:') throw new Error('The backend has not supplied a secure payment URL.');
        window.top.location.assign(url);
      }),
      showOrders: state.commercePanel === 'orders', openOrders: event => { if (event) event.preventDefault(); this.task(() => this.showOrders()); },
      ordersEmpty: !(state.orderList || []).length,
      orderRows: (state.orderList || []).map(order => ({ ...order, total: this.money(order.total_minor),
        statusLabel: order.status.replaceAll('_', ' '), canCancel: ['confirmed', 'allocated'].includes(order.status),
        canReturn: order.status === 'delivered', canPay: ['pending_payment', 'payment_failed'].includes(order.status),
        tracking: order.shipments.map(s => s.carrier + ' · ' + s.tracking_number + ' · ' + s.status).join(', '),
        pay: () => this.task(() => this.refreshOrder(order.id)),
        cancel: () => this.task(async () => { await this.api('/orders/' + order.id + '/cancel', 'POST'); await this.showOrders(); }),
        requestReturn: () => this.setState({ commercePanel: 'return', returnOrder: order, returnReason: '',
          returnQuantities: Object.fromEntries(order.items.map(item => [item.id, item.quantity])) }),
      })),
      returnRows: (state.returnList || []).map(row => ({ ...row, statusLabel: row.status.replaceAll('_', ' ') })),
      showReturn: state.commercePanel === 'return', returnReason: state.returnReason || '', setReturnReason: set('returnReason'),
      returnItems: state.returnOrder ? state.returnOrder.items.map(item => ({ name: item.title_snapshot, max: item.quantity,
        quantity: (state.returnQuantities || {})[item.id] || 0,
        change: event => this.setState({ returnQuantities: { ...state.returnQuantities, [item.id]: Number(event.target.value) } }) })) : [],
      submitReturn: () => this.task(async () => {
        const items = state.returnOrder.items.map(item => ({ order_item_id: item.id, quantity: (state.returnQuantities || {})[item.id] || 0 }))
          .filter(item => item.quantity > 0);
        if (!items.length) throw new Error('Choose at least one item to return.');
        await this.api('/returns', 'POST', { order_id: state.returnOrder.id, reason: state.returnReason || '',
          items });
        await this.showOrders(); this.notify('Your return request has been submitted for review.');
      }),
      showSupport: state.commercePanel === 'support', openSupport: e => { e.preventDefault(); this.setState({ commercePanel: 'support' }); },
      supportSubject: state.supportSubject || '', supportMessage: state.supportMessage || '',
      setSupportSubject: set('supportSubject'), setSupportMessage: set('supportMessage'),
      submitSupport: () => this.task(async () => {
        const result = await this.api('/support', 'POST', { subject: state.supportSubject || '', message: state.supportMessage || '' });
        this.setState({ commercePanel: '' }); this.notify('Support request received. Reference: ' + result.id);
      }),
      showAccount: state.commercePanel === 'account', accountSignedIn: window.CommerceAPI.preview || Boolean(this.session && this.session.authenticated),
      openAccount: e => { e.preventDefault(); this.task(async () => {
        if (window.CommerceAPI.preview || this.session && this.session.authenticated) { const profile = await this.api('/account'); this.setState({ profileName: profile.name, profile }); }
        this.setState({ commercePanel: 'account' });
      }); },
      login: () => this.task(() => window.CommerceAPI.login()),
      logout: () => this.task(async () => { this.storage('cart', null); this.storage('cartOwner', null); await window.CommerceAPI.logout(); }),
      profileName: state.profileName || '', setProfileName: set('profileName'),
      saveProfile: () => this.task(async () => { await this.api('/account', 'PUT', { name: state.profileName, preferences: {} }); this.notify('Your profile is saved.'); }),
      requestErasure: () => this.task(async () => { await this.api('/account/privacy-requests', 'POST', { kind: 'erasure' }); this.notify('Your erasure request is awaiting privacy review.'); }),
      requestExport: () => this.task(async () => { await this.api('/account/privacy-requests', 'POST', { kind: 'export' }); this.notify('Your data export request has been recorded.'); }),
      showNewsletter: state.commercePanel === 'newsletter', openNewsletter: e => { e.preventDefault(); this.setState({ commercePanel: 'newsletter' }); },
      newsletterEmail: state.newsletterEmail || '', setNewsletterEmail: set('newsletterEmail'),
      subscribe: () => this.task(async () => {
        await this.api('/consents', 'POST', { purpose: 'marketing', granted: true, notice_version: '2026-09-v1', email: state.newsletterEmail || '' });
        this.setState({ commercePanel: '' }); this.notify('Your newsletter preference is saved.');
      }),
      unsubscribe: () => this.task(async () => { await this.api('/consents', 'POST', { purpose: 'marketing', granted: false, notice_version: '2026-09-v1' }); this.notify('Marketing consent withdrawn.'); }),
      loadSampleOrder: () => this.task(async () => {
        if (!window.CommerceAPI.preview) return;
        await this.api('/preview/orders/delivered', 'POST'); await this.showOrders();
      }),
    };
  }
}
