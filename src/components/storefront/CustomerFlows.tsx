"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

type ProposedAction = { command: string; payload: { path?: string; body?: Record<string, unknown> }; requires_confirmation: boolean };
type PaymentResult = { order_id: string; payment: { payment_attempt_id: string; provider?: string; redirect_url?: string } };
type Evidence = { slug: string; name: string; variant_id: string; colour: string | null; price_minor: number };
type HelpMessage = {
  question: string; status: "sending" | "failed" | "answered"; answer?: string;
  products: Evidence[]; actions: ProposedAction[]; disclaimer?: string | null;
};
type ChatResponse = { session_id: string; session_token: string; answer: string; products: Evidence[]; proposed_actions?: ProposedAction[]; disclaimer?: string | null };
const SUGGESTIONS = ["Black pieces under ₹5,000", "Help me find leggings", "Something in sage", "Where is my order?"];
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value / 100);
const ACTION_LABELS: Record<string, [string, string]> = {
  cancel_order: ["Cancel this order", "Cancel this order? Items go back into stock and this cannot be undone."],
  retry_payment: ["Retry payment", "Start a new payment attempt for this order?"],
  request_return: ["Start a return", "Choose the items and reason for your return below."],
  create_support_case: ["Contact support", "Open a support case with your message so our team can help?"],
};
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// The agent only proposes actions; the order ID is validated here and each action uses the normal, authorised endpoint.
function actionOrderId(action: ProposedAction): string | null {
  const fromPath = action.payload.path?.match(new RegExp(`^/api/v1/orders/(${UUID})/(cancel|retry-payment)$`, "i"))?.[1];
  const fromBody = typeof action.payload.body?.order_id === "string" ? action.payload.body.order_id : undefined;
  const id = fromPath || fromBody;
  return id && new RegExp(`^${UUID}$`, "i").test(id) ? id : null;
}

function HelpProduct({ evidence, products, onProduct }: { evidence: Evidence; products: StoreProduct[]; onProduct: (item: StoreProduct) => void }) {
  const item = products.find(p => p.id === evidence.variant_id) || products.find(p => p.slug === evidence.slug);
  const image = item?.media[0]?.url;
  const colour = item?.colour || evidence.colour;
  return <button className="help-product" disabled={!item} onClick={() => item && onProduct(item)} aria-label={`View ${evidence.name}${colour ? ` in ${colour}` : ""}`}>
    <span className="help-product-image">{image ? <Image src={image} alt="" fill unoptimized sizes="140px" /> : <span aria-hidden="true">{evidence.name.slice(0, 1)}</span>}</span>
    <span className="help-product-name">{evidence.name}</span>
    <span className="help-product-meta">{colour ? `${colour} · ` : ""}{money(item?.price_minor ?? evidence.price_minor)}</span>
  </button>;
}

export function ShoppingHelp({ request, perform, busy, products, onProduct, onPayment, refreshOrders }: {
  request: Request; perform: Perform; busy: boolean; products: StoreProduct[]; onProduct: (item: StoreProduct) => void;
  onPayment: (result: PaymentResult) => Promise<void>; refreshOrders: () => Promise<void>;
}) {
  const [session, setSession] = useState<{ session_id: string; session_token: string } | null>(null);
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [returnOrder, setReturnOrder] = useState<{ key: string; order: StoreOrder } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const sending = messages.some(m => m.status === "sending");
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages, pending, returnOrder]);

  const update = (index: number, patch: Partial<HelpMessage>) => setMessages(current => current.map((m, i) => i === index ? { ...m, ...patch } : m));
  const send = (text: string, retryIndex?: number) => {
    const question = text.trim();
    if (!question || busy) return;
    const index = retryIndex ?? messages.length;
    if (retryIndex === undefined) setMessages(current => [...current, { question, status: "sending", products: [], actions: [] }]);
    else update(index, { status: "sending" });
    setDraft("");
    void perform(async () => {
      try {
        const result = await request<ChatResponse>("/copilot/chat", "POST", { message: question, ...session });
        setSession({ session_id: result.session_id, session_token: result.session_token });
        update(index, { status: "answered", answer: result.answer, products: result.products, actions: result.proposed_actions || [], disclaimer: result.disclaimer });
      } catch (error) { update(index, { status: "failed" }); throw error; }
    });
  };
  const run = (key: string, action: ProposedAction) => void perform(async () => {
    const orderId = actionOrderId(action);
    if (!orderId) throw new Error("This action is no longer available.");
    setPending(null);
    if (action.command === "cancel_order") {
      await request(`/orders/${orderId}/cancel`, "POST"); await refreshOrders();
      setDone(current => ({ ...current, [key]: "Your order is cancelled." }));
    } else if (action.command === "retry_payment") {
      const result = await request<Omit<PaymentResult, "order_id">>(`/orders/${orderId}/retry-payment`, "POST");
      await onPayment({ order_id: orderId, payment: result.payment });
    } else if (action.command === "request_return") {
      setReturnOrder({ key, order: await request<StoreOrder>(`/orders/${orderId}`) });
    } else if (action.command === "create_support_case") {
      const body = action.payload.body || {};
      await request("/support/cases", "POST", { order_id: orderId, subject: String(body.subject || "Order help"), body: String(body.body || "") });
      setDone(current => ({ ...current, [key]: "Support case opened. You can follow it under Support conversations." }));
    }
  });

  function actionsFor(m: HelpMessage, i: number) {
    const actions = m.actions.filter(a => ACTION_LABELS[a.command]);
    if (!actions.length) return null;
    return <div className="help-actions">
      {actions.map((action, j) => {
        const key = `${i}:${j}`; const [label, question] = ACTION_LABELS[action.command];
        if (done[key]) return <p key={key} className="help-status" role="status"><span aria-hidden="true">✓</span> {done[key]}</p>;
        if (returnOrder?.key === key) return <div key={key} className="help-return"><ReturnForm order={returnOrder.order} request={request} perform={perform} busy={busy}
          refresh={async () => { await refreshOrders(); setReturnOrder(null); setDone(current => ({ ...current, [key]: "Your return request is submitted." })); }} /></div>;
        if (pending === key) return <div key={key} className="help-confirm" role="group" aria-label={label}>
          <p>{question}</p>
          <div className="help-confirm-buttons">
            <button className="help-button primary" disabled={busy} onClick={() => run(key, action)}>Confirm</button>
            <button className="help-button" disabled={busy} onClick={() => setPending(null)}>Not now</button>
          </div>
        </div>;
        return <button key={key} className="help-button" disabled={busy}
          onClick={() => action.command === "request_return" ? run(key, action) : setPending(key)}>{label}</button>;
      })}
      {m.disclaimer && <small className="help-note">{m.disclaimer}</small>}
    </div>;
  }

  return <section className="help-chat">
    <header className="help-intro">
      <h2>Shopping help</h2>
      <p>Ask about pieces, colours and budgets, or about your orders: tracking, cancellations, payments and returns.</p>
    </header>
    <div className="help-thread" aria-live="polite">
      {!messages.length && <div className="help-empty">
        <span className="help-sender">Try asking</span>
        <div className="help-chips">{SUGGESTIONS.map(s => <button key={s} className="help-chip" disabled={busy} onClick={() => send(s)}>{s}</button>)}</div>
      </div>}
      {messages.map((m, i) => <div className="help-turn" key={i}>
        <p className="help-bubble user">{m.question}</p>
        {m.status === "failed" && <p className="help-failed">Not sent. <button className="help-link" disabled={busy} onClick={() => send(m.question, i)}>Try again</button></p>}
        {m.status === "sending" && <div className="help-bubble bot help-typing" role="status" aria-label="Special Affair is typing"><span /><span /><span /></div>}
        {m.status === "answered" && <div className="help-bubble bot">
          <span className="help-sender">Special Affair</span>
          <p>{m.answer}</p>
          {m.products.length > 0 && <div className="help-products">{m.products.map(p => <HelpProduct key={p.variant_id} evidence={p} products={products} onProduct={onProduct} />)}</div>}
          {actionsFor(m, i)}
        </div>}
      </div>)}
      <div ref={end} className="help-end" />
    </div>
    <form className="help-composer" onSubmit={e => { e.preventDefault(); send(draft); }}>
      <label className="help-label" htmlFor="help-message">Your question</label>
      <input id="help-message" name="message" value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} autoComplete="off"
        placeholder={sending ? "Waiting for a reply…" : "Ask about a piece or your order"} />
      <button className="help-send" disabled={busy || !draft.trim()}>Ask</button>
    </form>
  </section>;
}

