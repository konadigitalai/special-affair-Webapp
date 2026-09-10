import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-auth";
import { logoutAdmin } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Control room",
};

type Product = {
  id: string;
  name: string;
  category?: string;
  colour?: string;
  price_minor?: number;
  available?: number;
};

type StoreSnapshot = {
  connected: boolean;
  products: Product[];
};

async function getStoreSnapshot(): Promise<StoreSnapshot> {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

  try {
    const response = await fetch(api + "/products", {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return { connected: false, products: [] };

    const result = (await response.json()) as { items?: Product[] };
    return { connected: true, products: result.items || [] };
  } catch {
    return { connected: false, products: [] };
  }
}

function money(value?: number) {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export default async function AdminDashboard() {
  const adminEmail = await readAdminSession();
  if (!adminEmail) redirect("/admin/login");

  const { connected, products } = await getStoreSnapshot();
  const totalUnits = products.reduce((sum, product) => sum + (product.available || 0), 0);
  const lowStock = products.filter((product) => (product.available || 0) > 0 && (product.available || 0) <= 5);
  const unavailable = products.filter((product) => (product.available || 0) <= 0);
  const today = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <div className="admin-shell">
      <a className="admin-skip-link" href="#admin-content">Skip to dashboard</a>
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          <strong>Special Affair</strong>
          <span>House administration</span>
        </Link>

        <nav className="admin-nav" aria-label="Administration">
          <a className="is-active" href="#overview"><span>01</span>Overview</a>
          <a href="#catalogue"><span>02</span>Catalogue</a>
          <a href="#operations"><span>03</span>Operations</a>
          <a href="#access"><span>04</span>System access</a>
        </nav>

        <div className="admin-identity">
          <span className="admin-avatar" aria-hidden="true">AM</span>
          <span><strong>Administrator</strong><small>{adminEmail}</small></span>
          <form action={logoutAdmin}>
            <button type="submit" aria-label="Sign out">↗</button>
          </form>
        </div>
      </aside>

      <main className="admin-main" id="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">Administration / Overview</p>
            <h1>Control room</h1>
          </div>
          <div className="admin-topbar-meta">
            <span className={connected ? "admin-status is-live" : "admin-status is-offline"}>
              <i aria-hidden="true" />{connected ? "Store connected" : "Store unavailable"}
            </span>
            <time>{today}</time>
          </div>
        </header>

        <section className="admin-overview" id="overview" aria-labelledby="overview-title">
          <article className="admin-brief">
            <div>
              <p className="admin-eyebrow">Today’s brief</p>
              <span className="admin-brief-number">01</span>
            </div>
            <h2 id="overview-title">
              {!connected
                ? "The commerce service needs attention."
                : unavailable.length
                  ? unavailable.length + " catalogue item" + (unavailable.length === 1 ? " is" : "s are") + " unavailable."
                  : lowStock.length
                    ? lowStock.length + " item" + (lowStock.length === 1 ? " needs" : "s need") + " a stock review."
                    : "The catalogue is ready for the day."}
            </h2>
            <p>
              {connected
                ? "Live catalogue availability is shown below. Review low-stock pieces before opening new promotions."
                : "Start the commerce API to restore live catalogue and inventory visibility. Your admin session is still secure and active."}
            </p>
          </article>

          <div className="admin-metrics" aria-label="Store metrics">
            <article><span>Catalogue</span><strong>{connected ? products.length : "—"}</strong><small>Active product records</small></article>
            <article><span>Sellable stock</span><strong>{connected ? totalUnits : "—"}</strong><small>Units currently available</small></article>
            <article><span>Low stock</span><strong>{connected ? lowStock.length : "—"}</strong><small>Five units or fewer</small></article>
            <article className={unavailable.length ? "needs-attention" : ""}><span>Unavailable</span><strong>{connected ? unavailable.length : "—"}</strong><small>Items needing attention</small></article>
          </div>
        </section>

        <section className="admin-section" id="catalogue" aria-labelledby="catalogue-title">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">02 / Catalogue</p><h2 id="catalogue-title">Product pulse</h2></div>
            <Link href="/shop">View public shop <span aria-hidden="true">↗</span></Link>
          </div>

          <div className="admin-table-wrap">
            {products.length ? (
              <table className="admin-table">
                <thead><tr><th>Product</th><th>World</th><th>Price</th><th>Available</th><th>Status</th></tr></thead>
                <tbody>
                  {products.slice(0, 8).map((product) => (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong><small>{product.colour || "—"}</small></td>
                      <td>{product.category || "Unassigned"}</td>
                      <td>{money(product.price_minor)}</td>
                      <td>{product.available ?? 0}</td>
                      <td><span className={(product.available || 0) > 5 ? "table-status good" : (product.available || 0) > 0 ? "table-status low" : "table-status out"}>{(product.available || 0) > 5 ? "Ready" : (product.available || 0) > 0 ? "Low" : "Unavailable"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="admin-empty-state">
                <span aria-hidden="true">SA / 00</span>
                <h3>{connected ? "No products have been published yet." : "Catalogue data is temporarily unavailable."}</h3>
                <p>{connected ? "Published products will appear here automatically." : "Check the commerce service, then refresh this dashboard."}</p>
                <Link href="/admin">Refresh dashboard</Link>
              </div>
            )}
          </div>
        </section>

        <section className="admin-section" id="operations" aria-labelledby="operations-title">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">03 / Operations</p><h2 id="operations-title">House shortcuts</h2></div>
          </div>
          <div className="admin-actions">
            <Link href="/shop"><span>Catalogue review</span><strong>Inspect the live collection</strong><i>01 ↗</i></Link>
            <Link href="/journal"><span>Editorial</span><strong>Review journal stories</strong><i>02 ↗</i></Link>
            <Link href="/"><span>Storefront</span><strong>Open the customer experience</strong><i>03 ↗</i></Link>
          </div>
        </section>

        <section className="admin-section admin-access" id="access" aria-labelledby="access-title">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">04 / System access</p><h2 id="access-title">Connection ledger</h2></div>
          </div>
          <dl>
            <div><dt>Admin session</dt><dd><span className="ledger-dot is-on" />Protected · Active</dd></div>
            <div><dt>Commerce API</dt><dd><span className={connected ? "ledger-dot is-on" : "ledger-dot"} />{connected ? "Connected" : "Awaiting service"}</dd></div>
            <div><dt>Catalogue sync</dt><dd><span className={connected ? "ledger-dot is-on" : "ledger-dot"} />{connected ? "Live" : "Paused"}</dd></div>
            <div><dt>Customer identity</dt><dd><span className={process.env.NEXT_PUBLIC_AUTH0_DOMAIN ? "ledger-dot is-on" : "ledger-dot"} />{process.env.NEXT_PUBLIC_AUTH0_DOMAIN ? "Configured" : "Not configured"}</dd></div>
          </dl>
        </section>

        <footer className="admin-footer"><span>Special Affair® Administration</span><span>India / INR</span></footer>
      </main>
    </div>
  );
}
