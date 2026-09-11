"use client";

import Image from "next/image";
import Link from "next/link";
import Flagship, { CampaignPhoto, ProductCard, worldPages, type JournalStory } from "./Flagship";
import ProductDetail from "./ProductDetail";
import { AccountDetails, ReturnForm, SupportHistory, ShoppingHelp } from "./CustomerFlows";
import { productImages } from "./catalog-imagery";
import { useEffect, useRef, useState, type FormEvent } from "react";

const names = [
  "Performance T-shirt",
  "Training Tank",
  "Performance Short",
  "Performance Hoodie",
  "Shell Jacket",
  "Lounge Pant",
];
const prices = [2490, 1990, 2290, 3490, 4490, 2490];
const sitePages = {
  "size-guide": { title: "Size guide", apiSlug: "size-guide" },
  "shipping-returns": { title: "Shipping & returns", apiSlug: "shipping" },
} as const;
const initialProducts: StoreProduct[] = names.map((name, i) => ({
  id: `preview-variant-${i}`,
  product_id: `preview-product-${i}`,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  name,
  price_minor: prices[i] * 100,
  colour: i === 4 ? "Taupe" : i === 5 ? "Warm Grey" : "Black",
  category: [
    "Essential Affair",
    "Form",
    "First Affair",
    "Inner Affair",
    "Shell",
    "Inner Affair",
  ][i],
  currency: "INR",
  material: "Fabric details coming soon",
  description: "Considered essentials for movement and everyday life.",
  available: 12,
  media: [],
}));
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);
let scriptPromise: Promise<void> | undefined;
function loadCommerce(config: Record<string, string>) {
  window.CommerceConfig = config;
  if (!scriptPromise)
    scriptPromise = (async () => {
      for (const src of ["/auth0-spa-js.js", "/commerce-api.js"])
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("The store could not load. Please refresh."));
          document.head.append(script);
        });
    })();
  return scriptPromise;
}
function Photo({
  index,
  name,
  className = "",
  url,
}: {
  index: number;
  name: string;
  className?: string;
  url?: string;
}) {
  if (index < 0 && !url) return <div className={`product-photo ${className}`} aria-label={name}>Image coming soon</div>;
  return (
    <div className={`product-photo product-photo-${index} ${className}`}>
      <Image
        src={url || productImages[index] || productImages[0]}
        unoptimized={!!url}
        alt={name}
        fill
        sizes="(max-width: 480px) 50vw, (max-width: 800px) 33vw, 33vw"
      />
    </div>
  );
}

type Panel =
  | "wishlist"
  | "bag"
  | "product"
  | "search"
  | "account"
  | "checkout"
  | "payment"
  | "orders"
  | "support"
  | "story"
  | "help"
  | null;
export default function Storefront({
  config,
}: {
  config: Record<string, string>;
}) {
  const preview = config.mode !== "api";
  const { mode, api, authDomain, authClient, authAudience } = config;
  const [products, setProducts] = useState<StoreProduct[]>(
    preview ? initialProducts : [],
  );
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [view, setView] = useState("House");
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [sizes] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [payment, setPayment] = useState<{
    order_id: string;
    payment_attempt_id: string;
  } | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [commerce, setCommerce] = useState({ sandbox_payments: false, payment_methods: ["cod"] });
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; full_name: string; street: string; city: string; state: string; pin_code: string }[]>([]);
  const [storyContent, setStoryContent] = useState("");
  const [story, setStory] = useState("Our philosophy");
  const dialog = useRef<HTMLDialogElement>(null);
  const store = useRef<HTMLDivElement>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [stories, setStories] = useState<JournalStory[]>([]);
  const [storyImage, setStoryImage] = useState("/images/flagship/material.webp");
  const [announcement, setAnnouncement] = useState("FREE SHIPPING ON ALL ORDERS ABOVE ₹5,000");
  const request = async <T,>(
    path: string,
    method = "GET",
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> =>
    window.CommerceAPI.request(path, method, body, headers) as Promise<T>;
  useEffect(() => {
    let live = true;
    loadCommerce({ mode, api, authDomain, authClient, authAudience })
      .then(async () => {
        const auth = await window.CommerceAPI.initialize();
        if (live) { setAuthenticated(auth.authenticated); setAuthConfigured(auth.configured); }
        if (!preview) {
          const [commerceSettings, homepage, journal] = await Promise.all([
            window.CommerceAPI.request("/commerce/config") as Promise<typeof commerce>,
            window.CommerceAPI.request("/home") as Promise<{ settings?: { announcement?: { text?: string } } }>,
            window.CommerceAPI.request("/stories") as Promise<{ items: JournalStory[] }>,
          ]);
          if (live) {
            setCommerce(commerceSettings);
            setAnnouncement(homepage.settings?.announcement?.text || "FREE SHIPPING ON ALL ORDERS ABOVE ₹5,000");
            setStories(journal.items.map(s => ({ ...s, category: ({ "a-different-kind-of-movement": "Places", "material-matters": "Material", "the-first-affair": "Culture", "people-in-motion": "People", "a-closer-look": "Movement", "our-philosophy": "Culture" } as Record<string, string>)[s.slug] || "Culture" })));
          }
        }
        const [catalog, bag] = await Promise.all([
          window.CommerceAPI.request("/products"),
          window.CommerceAPI.request("/carts", "POST"),
        ]);
        if (live) {
          const entries = (catalog as { items: StoreProduct[] }).items;
          setProducts(entries);
          const loadedBag = bag as StoreCart;
          setCart({ ...loadedBag, items: loadedBag.items.map(line => {
            const details = entries.find(p => p.id === line.id);
            return { ...line, media: details?.media || line.media, available: details?.available ?? line.available };
          }) });
          setAuthenticated(auth.authenticated);
          setReady(true);
          if (!preview) {
            const saved = await window.CommerceAPI.request("/wishlist") as { variant_ids: string[] };
            if (live) setWishlist(saved.variant_ids);
          }
          if (new URLSearchParams(location.search).get("order") || new URLSearchParams(location.search).has("reference")) {
            setOrders((await window.CommerceAPI.request("/orders") as { items: StoreOrder[] }).items);
            setPanel("orders");
            window.history.replaceState({}, "", "/orders");
          }
        }
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [mode, api, authDomain, authClient, authAudience, preview]);
  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
    if (!panel) dialog.current?.close();
    document.body.style.overflow = panel ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [panel]);
  useEffect(() => {
    if (!ready) return;
    const restore = () => {
      const [section, slug] = location.pathname.split("/").filter(Boolean);
      const panels: Record<string, Panel> = { bag: "bag", checkout: "checkout", account: "account", search: "search", orders: "orders", wishlist: "wishlist", contact: "support" };
      const sitePage = sitePages[section as keyof typeof sitePages];
      if (section === "products") {
        const variant = new URLSearchParams(location.search).get("variant");
        const item = products.find(p => p.slug === slug && p.id === variant) || products.find(p => p.slug === slug);
        if (item) { setProduct(item); setPanel("product"); }
      } else if (panels[section]) { setPanel(panels[section]); if (section === "orders") void perform(refreshOrders); }
      else if (sitePage) storyPanel(sitePage.title, sitePage.apiSlug, false);
      else { setPanel(null); setView(section === "collections" ? worldPages.find(w => w.name.toLowerCase().replaceAll(" ", "-") === slug)?.name || "Shop" : ({shop:"Shop",new:"New",journal:"Journal",about:"About"} as Record<string,string>)[section] || "House"); }
    };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
    // Re-evaluate route only when catalogue is ready, then on navigation events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, products]);
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function open(next: Panel) {
    setError("");
    setNotice("");
    setPanel(next);
    if (next && ["bag", "checkout", "account", "search", "wishlist", "orders", "support"].includes(next)) window.history.pushState({}, "", "/" + (next === "support" ? "contact" : next));
    if (next === "checkout" && authenticated) {
      void perform(async () => setSavedAddresses((await request<{ items: typeof savedAddresses }>("/customers/me/addresses")).items));
    }
  }
  function navigate(next: string) {
    setView(next);
    const route = next === "House" ? "/" : worldPages.some(w => w.name === next) ? "/collections/" + next.toLowerCase().replaceAll(" ", "-") : "/" + next.toLowerCase();
    window.history.pushState({}, "", route);
    setQuery("");
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function closePanel() {
    setPanel(null);
    const route = view === "House" ? "/" : worldPages.some(w => w.name === view) ? "/collections/" + view.toLowerCase().replaceAll(" ", "-") : "/" + view.toLowerCase();
    window.history.pushState({}, "", route);
  }
  function showProduct(item: StoreProduct) {
    setProduct(item);
    open("product");
    window.history.pushState({}, "", `/products/${item.slug}?variant=${item.id}`);
    dialog.current?.scrollTo({ top: 0 });
  }
  async function toggleWishlist(item: StoreProduct) {
    if (preview) { setWishlist(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]); return; }
    await perform(async () => {
      const saved = wishlist.find(id => products.some(p => p.id === id && p.product_id === item.product_id));
      const result = await request<{ variant_ids: string[] }>(`/wishlist/items/${saved || item.id}`, saved ? "DELETE" : "PUT");
      setWishlist(result.variant_ids);
      setNotice(saved ? "Removed from your wishlist." : "Saved to your wishlist.");
    });
  }
  function indexOf(item: StoreProduct) {
    return names.indexOf(item.name);
  }
  async function quantity(item: StoreProduct, count: number) {
    if (!cart) return;
    setCart(
      await request<StoreCart>(`/carts/${cart.id}/items`, "POST", {
        variant_id: item.id,
        quantity: count,
        version: cart.version,
      }),
    );
  }
  function quickAdd(item: StoreProduct) {
    const variant = products.find(candidate => candidate.product_id === item.product_id && candidate.colour === item.colour && candidate.available > 0) || item;
    void perform(async () => {
      const existing = cart?.items.find(cartItem => cartItem.id === variant.id)?.quantity || 0;
      await quantity(variant, existing + 1);
      setNotice(`${variant.name} added to your bag.`);
    });
  }
  function showOrders() {
    open("orders");
    void perform(async () =>
      setOrders((await request<{ items: StoreOrder[] }>("/orders")).items),
    );
  }
  async function refreshOrders() { setOrders((await request<{ items: StoreOrder[] }>("/orders")).items); }
  async function paymentHandoff(result: { order_id: string; payment_attempt_id?: string; status?: string; payment?: { provider?: string; payment_attempt_id?: string; redirect_url?: string } }) {
    if (preview || result.payment?.provider === "sandbox") {
      setPayment({ order_id: result.order_id, payment_attempt_id: result.payment_attempt_id || result.payment?.payment_attempt_id || "" });
      setPanel("payment");
    } else if (result.payment?.redirect_url) {
      const url = new URL(result.payment.redirect_url);
      if (url.protocol !== "https:") throw new Error("The payment provider returned an invalid link.");
      window.location.assign(url.href);
    } else {
      await refreshOrders(); open("orders");
      setNotice(result.status === "confirmed" ? "Your order is confirmed." : "Check your order for the latest payment status.");
    }
    setCart(await request<StoreCart>("/carts", "POST"));
  }
  const displayProducts = products.filter((item, index, all) => all.findIndex(p => p.product_id === item.product_id && p.colour === item.colour) === index);
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  function card(item: StoreProduct) {
    return <ProductCard key={item.id} item={item} products={products} onProduct={showProduct} saved={wishlist.some(id => products.some(p => p.id === id && p.product_id === item.product_id))} onSave={item => void toggleWishlist(item)} />;
  }
  function storyPanel(title: string, suppliedSlug?: string, updateRoute = true) {
    setStory(title); setStoryContent(""); open("story");
    const contentRoute = Object.entries(sitePages).find(([, page]) => page.title === title)?.[0];
    if (updateRoute && contentRoute) window.history.pushState({}, "", `/${contentRoute}`);
    if (!preview) void perform(async () => {
      const slug = suppliedSlug || title.toLowerCase().replaceAll(" ", "-");
      const page = await request<{ body: string; hero_url?: string }>(["terms", "privacy", "shipping", "size-guide"].includes(slug) ? `/pages/${slug}` : `/stories/${slug}`);
      setStoryContent(page.body); setStoryImage(page.hero_url || "/images/flagship/material.webp");
    });
  }

  return (
    <div ref={store} className="store flagship-store">
      <Flagship view={view} navigate={navigate} products={products} ready={ready} busy={busy} count={count} onProduct={showProduct} onQuickAdd={quickAdd} onPanel={open} onStory={storyPanel} stories={stories} wishlist={wishlist} onSave={item => void toggleWishlist(item)} announcement={announcement} newsletter={email => void perform(async () => { await request("/consents", "POST", { email, granted: true, purpose: "newsletter" }); setNotice("Thank you for joining the affair."); })} />
      {!panel && (error || notice) && (
        <div className="toast" role={error ? "alert" : "status"}>
          {error || notice}
          <button
            aria-label="Dismiss message"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            ×
          </button>
        </div>
      )}

      <dialog
        ref={dialog}
        className={`store-dialog ${panel === "product" ? "product-dialog" : ""}`}
        onCancel={closePanel}
        onClick={(e) => {
          if (e.target === e.currentTarget) closePanel();
        }}
        aria-label={panel ? `${panel} panel` : "Store panel"}
      >
        <div className="dialog-body">
          <div className="dialog-heading">
            <button className="brand" onClick={() => navigate("House")}>Special Affair</button>
            <button
              className="close-button"
              aria-label="Close panel"
              onClick={closePanel}
            >
              ×
            </button>
          </div>
          {panel && ["bag", "checkout", "account", "wishlist", "orders"].includes(panel) && <div className="utility-campaign"><CampaignPhoto name={panel === "checkout" ? "form" : panel === "account" ? "shell" : "first-affair"} alt="Special Affair campaign" /><h2>{({ bag: "Your cart", checkout: "Checkout", account: "My account", wishlist: "My wishlist", orders: "Your orders" } as Record<string, string>)[panel]}</h2></div>}
          {panel === "product" && product && <ProductDetail key={product.product_id} product={product} products={products} wishlist={wishlist} onVariant={showProduct} onSave={item => void toggleWishlist(item)} saved={wishlist.some(id => products.some(p => p.id === id && p.product_id === product.product_id))} ready={ready} busy={busy} onAdd={amount => void perform(async () => { await quantity(product, (cart?.items.find(i => i.id === product.id)?.quantity || 0) + amount); open("bag"); })} />}
          {panel === "wishlist" && <><h2>My wishlist.</h2><p>For what comes next.</p><div className="wishlist-grid">{products.filter(p => wishlist.includes(p.id)).map(card)}</div>{!wishlist.length && <p className="empty-state">Save the pieces you love with the heart on any product.</p>}</>}
          {panel === "bag" && (
            <>
              <h2>
                Your bag <sup>({count})</sup>
              </h2>
              <button className="account-link" disabled={!ready || busy} onClick={() => void perform(async () => setCart(await request<StoreCart>("/carts", "POST")))}>Refresh bag</button>
              {!count ? (
                <div className="empty-state">
                  <p>Your next affair starts here.</p>
                  <button
                    className="solid-button"
                    onClick={() => {
                      navigate("Shop");
                    }}
                  >
                    Explore the collection ⟶
                  </button>
                </div>
              ) : (
                <>
                  <div className="bag-items">
                    {cart?.items.map((item) => (
                      <div className="bag-item" key={item.id}>
                        <Photo index={indexOf(item)} name={item.name} url={item.media[0]?.url} />
                        <div>
                          <h3>{item.name}</h3>
                          <p>
                            {item.colour}
                            {item.size || sizes[item.id] ? ` / ${item.size || sizes[item.id]}` : ""}
                          </p>
                          <p>{money(item.price_minor)}</p>
                          <div className="quantity">
                            <button
                              aria-label={`Decrease ${item.name} quantity`}
                              disabled={busy}
                              onClick={() =>
                                void perform(() =>
                                  quantity(item, item.quantity - 1),
                                )
                              }
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              aria-label={`Increase ${item.name} quantity`}
                              disabled={busy || item.quantity >= item.available}
                              onClick={() =>
                                void perform(() =>
                                  quantity(item, item.quantity + 1),
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <button
                          className="remove"
                          aria-label={`Remove ${item.name}`}
                          disabled={busy}
                          onClick={() => void perform(() => quantity(item, 0))}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <form
                    className="coupon"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const code = new FormData(e.currentTarget).get("coupon");
                      void perform(async () =>
                        setCart(
                          await request<StoreCart>(
                            `/carts/${cart?.id}/coupon`,
                            "POST",
                            { code, version: cart?.version },
                          ),
                        ),
                      );
                    }}
                  >
                    <input
                      name="coupon"
                      aria-label="Promo code"
                      placeholder="Promo code"
                    />
                    <button disabled={busy}>Apply</button>
                  </form>
                  {!!cart?.coupon && <button className="text-link" disabled={busy} onClick={() => void perform(async () => setCart(await request<StoreCart>(`/carts/${cart.id}/coupon`, "POST", { code: "", version: cart.version })))}>Remove coupon {cart.coupon}</button>}
                  <div className="totals">
                    {cart?.coupon_error && <p role="alert">{cart.coupon_error}</p>}
                    <p>
                      <span>Subtotal</span>
                      {money(cart?.subtotal_minor || 0)}
                    </p>
                    {!!cart?.discount_minor && (
                      <p>
                        <span>Saving</span>−{money(cart.discount_minor)}
                      </p>
                    )}
                    <p>
                      <span>Shipping</span>
                      <span>{preview ? "Calculated at checkout" : money(cart?.shipping_minor || 0)}</span>
                    </p>
                    <p className="grand-total">
                      <span>Total</span>
                      {money(cart?.total_minor || 0)}
                    </p>
                  </div>
                  <button
                    className="solid-button"
                    disabled={busy || !!cart?.coupon_error}
                    onClick={() => open("checkout")}
                  >
                    Checkout ⟶
                  </button>
                  <button className="continue" onClick={closePanel}>
                    Continue exploring
                  </button>
                </>
              )}
            </>
          )}
          {panel === "search" && (
            <>
              <h2>Find your affair.</h2>
              <input
                className="search-input"
                autoFocus
                aria-label="Search products"
                placeholder="Search pieces, colours, worlds…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="search-results">
                {displayProducts
                  .filter((p) =>
                    `${p.name} ${p.colour} ${p.category}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map(card)}
              </div>
              {!products.some((p) =>
                `${p.name} ${p.colour} ${p.category}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              ) && <p>No pieces found. Try “Shell” or “Black”.</p>}
            </>
          )}
          {panel === "checkout" && (
            <>
              <h2>A smoother tomorrow.</h2>
              <div className="checkout-summary"><h3>Order summary ({count})</h3>{cart?.items.map(i => <p key={i.id}><span>{i.name} / {i.colour} / {i.size || "One size"} x {i.quantity}</span><span>{money(i.line_total_minor)}</span></p>)}<p><span>Shipping</span>{money(cart?.shipping_minor || 0)}</p><p><strong>Total</strong><strong>{money(cart?.total_minor || 0)}</strong></p></div>
              {preview && (
                <p className="preview-notice">
                  Frontend preview — no payment is collected and no real order
                  is placed.
                </p>
              )}
              <form
                className="checkout-form"
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const values = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  void perform(async () => {
                    const result = await request<{
                      order_id: string;
                      payment_attempt_id: string;
                      status?: string; payment?: { provider?: string; redirect_url?: string };
                    }>(
                      "/checkout",
                      "POST",
                      {
                        cart_id: cart?.id,
                        cart_version: cart?.version,
                        expected_total_minor: cart?.total_minor,
                        email: values.email,
                        payment_method: values.payment_method || "cod",
                        address: { ...values, country: "IN" },
                      },
                      { "Idempotency-Key": crypto.randomUUID() },
                    );
                    await paymentHandoff(result);
                  });
                }}
              >
                {!!savedAddresses.length && <label>Use a saved address<select defaultValue="" onChange={e => {
                  const address = savedAddresses.find(a => a.id === e.target.value);
                  const form = e.currentTarget.form;
                  if (!address || !form) return;
                  for (const [name, value] of Object.entries({ name: address.full_name, street: address.street, city: address.city, state: address.state, postal_code: address.pin_code })) {
                    const input = form.elements.namedItem(name); if (input instanceof HTMLInputElement) input.value = value;
                  }
                }}><option value="">Enter a new address</option>{savedAddresses.map(a => <option key={a.id} value={a.id}>{a.street}, {a.city}</option>)}</select></label>}
                {!preview && <label>Payment method<select name="payment_method" defaultValue="cod">{commerce.payment_methods.map(method => <option key={method} value={method}>{method === "cod" ? "Cash on delivery" : method.toUpperCase() + " (sandbox)"}</option>)}</select></label>}
                {[
                  { name: "email", label: "Email", type: "email" },
                  { name: "name", label: "Full name", type: "text" },
                  { name: "street", label: "Street address", type: "text" },
                  { name: "city", label: "City", type: "text" },
                  { name: "state", label: "State", type: "text" },
                  { name: "postal_code", label: "PIN code", type: "text" },
                  { name: "phone", label: "Phone", type: "tel" },
                ].map((field) => (
                  <label key={field.name}>
                    {field.label}
                    <input
                      name={field.name}
                      type={field.type}
                      minLength={field.name === "name" || field.name === "city" ? 2 : field.name === "street" ? 3 : undefined}
                      pattern={field.name === "postal_code" ? "[1-9][0-9]{5}" : field.name === "phone" ? "[+]?[0-9 ]{8,18}" : undefined}
                      required
                      autoComplete={
                        field.name === "email"
                          ? "email"
                          : field.name === "name"
                            ? "name"
                            : field.name === "street"
                              ? "street-address"
                              : field.name === "postal_code"
                                ? "postal-code"
                                : field.name === "phone"
                                  ? "tel"
                                  : "address-level2"
                      }
                    />
                  </label>
                ))}
                <p className="grand-total">
                  Total <span>{money(cart?.total_minor || 0)}</span>
                </p>
                <button className="solid-button" disabled={busy || !count}>
                  {busy
                    ? "Preparing…"
                    : preview
                      ? "Continue to preview payment"
                      : "Place order"}
                </button>
              </form>
            </>
          )}
          {panel === "payment" && (
            <>
              <h2>Payment status</h2>
              <p>{preview ? "Preview payment. No money is charged." : "Sandbox payment. No money is charged. Confirmation is recorded by the backend."}</p>
              {(preview || commerce.sandbox_payments) && ["captured", "failed"].map(status => <button key={status} className="outline-button" disabled={busy || !payment?.payment_attempt_id} onClick={() => void perform(async () => {
                if (!payment) return;
                await request(preview ? `/preview/payments/${payment.payment_attempt_id}` : `/orders/${payment.order_id}/sandbox-payment/${payment.payment_attempt_id}`, "POST", preview ? { action: status === "captured" ? "authorized" : "failed" } : { status });
                await refreshOrders(); setCart(await request<StoreCart>("/carts", "POST")); setPanel("orders");
              })}>{status === "captured" ? "Simulate successful payment" : "Simulate declined payment"}</button>)}
              {!preview && !commerce.sandbox_payments && <p>Sandbox browser payments are disabled. Use a server-side sandbox callback or choose cash on delivery.</p>}
              <button className="account-link" disabled={busy} onClick={() => void perform(async () => { await refreshOrders(); setPanel("orders"); })}>Refresh order status</button>
            </>
          )}
          {panel === "account" && (
            <>
              <h2>Your world.</h2>
              <p>A place for your details, orders and next affair.</p>
              {preview && (
                <p className="preview-notice">
                  You are exploring a frontend preview. Authentication requires
                  the connected backend and Auth0 configuration.
                </p>
              )}
              <button
                className="solid-button"
                disabled={busy || preview || !authConfigured}
                onClick={() =>
                  void perform(async () => {
                    if (authenticated) await window.CommerceAPI.logout();
                    else await window.CommerceAPI.login();
                  })
                }
              >
                {authenticated ? "Sign out" : "Sign in / create account"}
              </button>
              {!preview && !authConfigured && <p className="development-note">Account sign-in is awaiting the store?s identity configuration. Guest checkout and guest order access are available.</p>}
              <button className="account-link" onClick={() => open("wishlist")}>Wishlist &rarr;</button>
              <button className="account-link" onClick={() => open("help")}>Shopping help &rarr;</button>
              {!preview && authenticated && <AccountDetails request={request} perform={perform} busy={busy} />}
              <button className="account-link" onClick={showOrders}>
                Orders & returns ⟶
              </button>
              <button className="account-link" onClick={() => open("support")}>
                Contact the house ⟶
              </button>
              <Link className="account-link admin-entry" href="/admin/login">
                Administration <span aria-hidden="true">↗</span>
              </Link>
              <button
                className="account-link"
                onClick={() => storyPanel("Privacy")}
              >
                Privacy & your data ⟶
              </button>
            </>
          )}
          {panel === "orders" && (
            <>
              <h2>Orders & returns.</h2>
              <button className="account-link" disabled={busy} onClick={() => void perform(refreshOrders)}>Refresh orders</button>
              {!preview && <details><summary>Find a guest order</summary><p>Use the order ID and access token saved when you placed your order.</p><form className="checkout-form" onSubmit={e => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); void perform(async () => { await request("/guest-order", "POST", data); await refreshOrders(); }); }}><label>Order ID<input name="id" required /></label><label>Order access token<input name="token" required type="password" /></label><button disabled={busy}>Find order</button></form></details>}
              {preview && (
                <p className="preview-notice">
                  These are simulated orders saved in this browser.
                </p>
              )}
              {!orders.length && (
                <p className="empty-state">
                  Your story is just beginning. No orders yet.
                </p>
              )}
              {orders.map((order) => (
                <article className="order" key={order.id}>
                  <div className="section-heading">
                    <h3>{order.order_number}</h3>
                    <span>{order.status.replaceAll("_", " ")}</span>
                  </div>
                  {order.items.map((item) => (
                    <p key={item.id}>
                      {item.title_snapshot} × {item.quantity}
                    </p>
                  ))}
                  <p>{money(order.total_minor)}</p>
                  {!preview && <button className="account-link" disabled={busy} onClick={() => void perform(async () => {
                    const access = await request<{ order_id: string; order_token?: string }>(`/orders/${order.id}/access`);
                    if (!access.order_token) { setNotice("This order is available through your signed-in account."); return; }
                    const url = URL.createObjectURL(new Blob([JSON.stringify(access, null, 2)], { type: "application/json" }));
                    const link = document.createElement("a"); link.href = url; link.download = `${order.order_number}-access.json`; link.click(); URL.revokeObjectURL(url);
                  })}>Save guest order access</button>}
                  {order.status === "cancelled" && order.payments.some(p => p.status === "captured") && <p>Cancellation recorded. Any payment refund will be processed separately by the store.</p>}
                  {["confirmed", "allocated"].includes(order.status) && (
                    <button
                      className="outline-button"
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          await request(`/orders/${order.id}/cancel`, "POST");
                          setOrders(
                            (await request<{ items: StoreOrder[] }>("/orders"))
                              .items,
                          );
                        })
                      }
                    >
                      Cancel order
                    </button>
                  )}
                  {["payment_failed", "pending_payment"].includes(order.status) && (
                    <button
                      className="outline-button"
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          const result = await request<{
                            payment: {
                              payment_attempt_id: string;
                              provider?: string; redirect_url?: string;
                            };
                          }>(`/orders/${order.id}/retry-payment`, "POST");
                          await paymentHandoff({ order_id: order.id, payment: result.payment });
                        })
                      }
                    >
                      {order.status === "pending_payment" ? "Continue payment" : "Retry payment"}
                    </button>
                  )}
                  {order.shipments.map((shipment, index) => <p key={index}>{shipment.carrier} · {shipment.tracking_number} · {shipment.status}</p>)}
                  {(order.returns || []).map(row => <p key={row.id}>Return {row.id}: {row.status}</p>)}
                  {order.status === "delivered" && <ReturnForm order={order} request={request} perform={perform} busy={busy} refresh={refreshOrders} />}
                </article>
              ))}
              {preview && (
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await request("/preview/orders/delivered", "POST");
                      setOrders(
                        (await request<{ items: StoreOrder[] }>("/orders"))
                          .items,
                      );
                    })
                  }
                >
                  Add delivered sample to preview returns ⟶
                </button>
              )}
            </>
          )}
          {panel === "support" && (
            <>
              <h2>At your service.</h2>
              {!preview && <SupportHistory request={request} perform={perform} busy={busy} />}
              <p>Tell us how we can help.</p>
              <form
                className="checkout-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  void perform(async () => {
                    const support = await request<{ id: string }>("/support", "POST", data);
                    setNotice(
                      preview
                        ? "Support request saved in preview. No message was sent."
                        : "Your request has been received. Reference: " + support.id,
                    );
                  });
                }}
              >
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Subject
                  <input name="subject" required />
                </label>
                <label>
                  Message
                  <textarea name="message" rows={5} required />
                </label>
                <button className="solid-button" disabled={!ready || busy}>
                  Send request ⟶
                </button>
              </form>
            </>
          )}
          {panel === "help" && <ShoppingHelp request={request} perform={perform} busy={busy} onProduct={slug => { const item = products.find(p => p.slug === slug); if (item) showProduct(item); }} />}
          {panel === "story" && (
            <>
              <span className="eyebrow">THE HOUSE OF SPECIAL AFFAIR</span>
              <h2>{story}.</h2>
              <div className="story-image">
                <Image
                  src={storyImage}
                  alt="The Special Affair collection"
                  fill
                  sizes="550px"
                />
              </div>
              <p className="story-copy">
                {storyContent || (!preview ? "This information has not been published yet. Please contact the house for details." : story === "Our philosophy"
                  ? "We believe confidence begins closest to the body and radiates outward. Special Affair is a contemporary lifestyle house: different worlds, connected by a shared language of simplicity, movement and quiet expression."
                  : story === "Size guide"
                    ? "The collection preview offers XS–XL. Product-specific measurements and fit advice will be added with the final catalogue."
                    : story === "Shipping & returns"
                      ? "Shipping estimates, charges and return windows will be provided by the connected store before purchase. This frontend preview does not ship physical products."
                      : story === "Privacy"
                        ? "Preview bag and simulated orders are stored in this browser. Contact and address form data are not saved to preview storage. The production privacy policy will be supplied before launch."
                        : story === "Terms"
                          ? "This storefront is a collection preview. Final product specifications, availability and purchase terms will be published before launch."
                          : story === "A private affair"
                            ? "A world of rarity and intimacy. Explore a quieter expression of the house through evening silhouettes, deep tones and considered detail. The Exclusive collection is coming soon."
                            : "A shared design language: minimal, sensual, functional and timeless. Thoughtful silhouettes that move between the everyday and the extraordinary. More from the house, coming soon.")}
              </p>
              {story === "Privacy" && (
                <button
                  className="outline-button"
                  disabled={!ready || busy}
                  onClick={() =>
                    void perform(async () => {
                      const data = await request("/account/privacy-requests", "POST", { request_type: "export" });
                      if (!preview) {
                        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
                        const link = document.createElement("a"); link.href = url; link.download = "special-affair-data.json"; link.click(); URL.revokeObjectURL(url);
                      }
                      setNotice(
                        preview
                          ? "Data export request recorded in preview."
                          : "Your data download is ready.",
                      );
                    })
                  }
                >
                  Request my data
                </button>
              )}
            </>
          )}
          {(error || notice) && (
            <p
              className={error ? "panel-message error" : "panel-message"}
              role={error ? "alert" : "status"}
            >
              {error || notice}
            </p>
          )}
        </div>
      </dialog>
    </div>
  );
}
