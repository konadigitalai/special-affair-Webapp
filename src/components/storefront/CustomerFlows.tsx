"use client";
import { useEffect, useState } from "react";

type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
type Perform = (action: () => Promise<void>) => Promise<void>;
type Address = { id: string; full_name: string; street: string; city: string; state: string; pin_code: string; country: string };
type Case = { id: string; subject: string; status: string; messages: { id: string; body: string }[] };
export function AccountDetails({ request, perform, busy }: { request: Request; perform: Perform; busy: boolean }) {
  const [profile, setProfile] = useState({ display_name: "", email: "" });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([request<typeof profile>("/customers/me"), request<{ items: Address[] }>("/customers/me/addresses")])
      .then(([p, a]) => { if (active) { setProfile({ display_name: p.display_name || "", email: p.email || "" }); setAddresses(a.items); } })
      .catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
    // Fetch once when this account panel mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <section>
    <h3>Your details</h3>
    <form className="checkout-form" onSubmit={e => { e.preventDefault(); void perform(async () => { await request("/customers/me", "PUT", profile); setMessage("Your profile is saved."); }); }}>
      <label>Name<input required minLength={1} value={profile.display_name} onChange={e => setProfile({ ...profile, display_name: e.target.value })} /></label>
      <label>Email<input required type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></label>
      <button className="outline-button" disabled={busy}>Save details</button>
    </form>
    <h3>Saved addresses</h3>
    {addresses.map(a => <p key={a.id}>{a.full_name}, {a.street}, {a.city} {a.pin_code} <button disabled={busy} onClick={() => void perform(async () => {
      await request(`/customers/me/addresses/${a.id}`, "DELETE"); setAddresses(current => current.filter(row => row.id !== a.id));
    })}>Remove</button></p>)}
    <details><summary>Add an address</summary><form className="checkout-form" onSubmit={e => {
      e.preventDefault(); const form = e.currentTarget; const data = Object.fromEntries(new FormData(form));
      void perform(async () => { const row = await request<Address>("/customers/me/addresses", "POST", { ...data, country: "IN" }); setAddresses(current => [...current, row]); form.reset(); });
    }}>
      {[["full_name", "Full name"], ["street", "Street"], ["city", "City"], ["state", "State"], ["pin_code", "PIN code"]].map(([name, label]) => <label key={name}>{label}<input name={name} required pattern={name === "pin_code" ? "[1-9][0-9]{5}" : undefined} /></label>)}
      <button className="outline-button" disabled={busy}>Save address</button>
    </form></details>
    <h3>Preferences & data</h3>
    <button className="account-link" disabled={busy} onClick={() => void perform(async () => {
      await request("/customers/me/consents", "POST", { purpose: "newsletter", granted: false, notice_version: "storefront-v1" });
      if (profile.email) await request("/consents", "POST", { email: profile.email, granted: false });
      setMessage("Newsletter consent withdrawn.");
    })}>Unsubscribe from newsletter</button>
    <button className="account-link" disabled={busy} onClick={() => void perform(async () => {
      const data = await request("/customers/me/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "special-affair-data.json"; link.click(); URL.revokeObjectURL(url);
    })}>Download my data</button>
    <details><summary>Request account erasure</summary><p>Submit a request for review. Commercial records may be retained according to the store’s retention policy.</p>
      <button className="outline-button" disabled={busy} onClick={() => void perform(async () => { await request("/customers/me/erasure-requests", "POST"); setMessage("Erasure request submitted for review."); })}>Submit erasure request</button>
    </details>
    {message && <p role="status">{message}</p>}
  </section>;
}

export function ReturnForm({ order, request, perform, busy, refresh }: { order: StoreOrder; request: Request; perform: Perform; busy: boolean; refresh: () => Promise<void> }) {
  const remaining = (id: string, quantity: number) => quantity - (order.returns || []).filter(r => r.status !== "rejected")
    .flatMap(r => r.items || []).filter(i => i.order_item_id === id).reduce((sum, i) => sum + i.quantity, 0);
  return <details><summary>Request a return</summary><form className="checkout-form" onSubmit={e => {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const items = order.items.map(i => ({ order_item_id: i.id, quantity: Number(data.get(i.id)) })).filter(i => i.quantity > 0);
    void perform(async () => { if (!items.length) throw new Error("Choose at least one item to return."); await request("/returns", "POST", { order_id: order.id, reason: data.get("reason"), items }); await refresh(); });
  }}>
    {order.items.map(i => <label key={i.id}>{i.title_snapshot}<input aria-label={`Return quantity for ${i.title_snapshot}`} name={i.id} type="number" min={0} max={Math.max(0, remaining(i.id, i.quantity))} defaultValue={0} /></label>)}
    <label>Reason<textarea name="reason" minLength={5} maxLength={2000} required /></label>
    <button className="outline-button" disabled={busy}>Submit return request</button>
  </form></details>;
}

export function SupportHistory({ request, perform, busy }: { request: Request; perform: Perform; busy: boolean }) {
  const [cases, setCases] = useState<Case[]>([]);
  const refresh = async () => setCases((await request<{ items: Case[] }>("/support-history")).items);
  return <section><button className="account-link" disabled={busy} onClick={() => void perform(refresh)}>Refresh support conversations</button>
    {cases.map(row => <article className="order" key={row.id}><h3>{row.subject}</h3><small>{row.id} · {row.status}</small>
      {row.messages.map(m => <p key={m.id}>{m.body}</p>)}
      <form className="checkout-form" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const body = new FormData(form).get("body"); void perform(async () => { await request(`/support/cases/${row.id}/messages`, "POST", { body }); form.reset(); await refresh(); }); }}>
        <label>Reply<textarea name="body" required maxLength={10000} /></label><button disabled={busy}>Add reply</button>
      </form>
    </article>)}
  </section>;
}

export function ShoppingHelp({ request, perform, busy, onProduct }: { request: Request; perform: Perform; busy: boolean; onProduct: (slug: string) => void }) {
  const [session, setSession] = useState<{ session_id: string; session_token: string } | null>(null);
  const [messages, setMessages] = useState<{ question: string; answer: string; products: { slug: string; name: string }[] }[]>([]);
  return <section><h2>Shopping help</h2><p>Ask about products, materials or finding a piece.</p>
    <div aria-live="polite">{messages.map((m, i) => <article key={i}><p><strong>{m.question}</strong></p><p>{m.answer}</p>{m.products.map(p => <button className="account-link" key={p.slug} onClick={() => onProduct(p.slug)}>{p.name}</button>)}</article>)}</div>
    <form className="checkout-form" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const message = String(new FormData(form).get("message")); void perform(async () => {
      const result = await request<{ session_id: string; session_token: string; answer: string; products: { slug: string; name: string }[] }>("/copilot/chat", "POST", { message, ...session });
      setSession({ session_id: result.session_id, session_token: result.session_token }); setMessages(current => [...current, { question: message, answer: result.answer, products: result.products }]); form.reset();
    }); }}><label>Your question<input name="message" required maxLength={2000} /></label><button className="solid-button" disabled={busy}>Ask</button></form>
  </section>;
}
