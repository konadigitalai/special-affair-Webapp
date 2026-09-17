"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CampaignPhoto, ProductCard, swatchColour, worldPages } from "./Flagship";

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n / 100);
// Editorial frames per world complete the gallery until approved campaign photography per product exists.
const worldPortrait: Record<string, string> = {
  "Inner Affair": "/images/flagship/inner-affair-hd-v2.png",
  "Essential Affair": "/images/flagship/essential-affair-hd-v2.png",
  "Form": "/images/flagship/form.webp",
  "Shell": "/images/flagship/shell.webp",
};
const detailFrames = ["/images/flagship/material.webp", "/images/flagship/movement-film-hd-v2.png"];
const fitNotes: Record<string, string> = {
  "Sports Bras": "True to size. Designed for a gently supportive fit.",
  "Tops": "True to size. Relaxed through the body with a clean shoulder.",
  "Bottoms": "True to size. Sits comfortably at the natural waist.",
  "Outerwear": "True to size. Cut to layer over everyday pieces.",
  "Accessories": "One size. Made to fit into every day.",
};

type Frame = { url: string; editorial: boolean };

export default function ProductDetail({ product, products, wishlist, onVariant, onAdd, onSave, onQuickAdd, onNavigate, onStory, saved, busy, ready, returnWindowDays }: {
  product: StoreProduct; products: StoreProduct[]; wishlist: string[]; onVariant: (p: StoreProduct) => void;
  onAdd: (quantity: number) => void; onSave: (p: StoreProduct) => void; onQuickAdd: (p: StoreProduct) => void;
  onNavigate: (view: string) => void; onStory: (title: string, slug?: string) => void;
  saved: boolean; busy: boolean; ready: boolean; returnWindowDays?: number;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [amount, setAmount] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [open, setOpen] = useState<string>("Details");
  const family = products.filter(p => p.product_id === product.product_id);
  const colours = family.filter((p, i) => family.findIndex(v => v.colour === p.colour) === i);
  const sizes = family.filter(p => p.colour === product.colour);
  const world = worldPages.find(w => w.name === product.category);
  const productMedia = product.media.map(m => m.url).filter((url): url is string => !!url);
  const frames: Frame[] = [];
  const push = (url: string | undefined, editorial: boolean) => { if (url && !frames.some(f => f.url === url)) frames.push({ url, editorial }); };
  push(worldPortrait[product.category], true);
  productMedia.forEach(url => push(url, url === detailFrames[0]));
  detailFrames.forEach(url => push(url, true));
  const frame = frames[imageIndex] || frames[0];
  // Pair across the wardrobe: bottoms and tops before same-category pieces.
  const wardrobe = ["Bottoms", "Tops", "Outerwear", "Sports Bras", "Accessories"];
  const kind = (p: StoreProduct) => p.categories?.find(c => wardrobe.includes(c)) || "";
  const pairingRank = (p: StoreProduct) => kind(p) && kind(p) === kind(product) ? 8 : kind(p) ? wardrobe.indexOf(kind(p)) : 9;
  const pairings = products
    .filter((p, i) => p.product_id !== product.product_id && products.findIndex(v => v.product_id === p.product_id) === i)
    .sort((a, b) => pairingRank(a) - pairingRank(b))
    .slice(0, 4);
  const fit = fitNotes[kind(product)] || "True to size. Designed to move with you.";
  const panels: [string, string][] = [
    ["Details", product.description],
    ["Fabric", product.material || "Contact the house for fabric details."],
    ["Care", product.care || "Check the garment care label before washing."],
    ["Shipping & returns", `Free shipping on orders above ₹5,000. Shipping charges are shown in your bag before checkout. Returns are accepted within ${returnWindowDays || 30} days of delivery, checked against your order.`],
  ];

  useEffect(() => {
    if (!zoomed) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setZoomed(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [zoomed]);

  const selectVariant = (next: StoreProduct) => { onVariant(next); setImageIndex(0); };

  return <div className="pdp">
    <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
      <button onClick={() => onNavigate("House")}>Home</button><span aria-hidden="true">›</span>
      <button onClick={() => onNavigate(world ? world.name : "Shop")}>{product.category}</button><span aria-hidden="true">›</span>
      <span aria-current="page">{product.name}</span>
    </nav>

    <section className="pdp-hero">
      <div className="pdp-gallery">
        <div className="pdp-thumbnails" role="group" aria-label="Product images">
          {frames.map((f, i) => <button key={f.url} onClick={() => setImageIndex(i)} aria-label={`Product image ${i + 1} of ${frames.length}`} aria-pressed={imageIndex === i}><Image src={f.url} alt="" fill unoptimized sizes="90px" /></button>)}
          {frames.length > 1 && <button className="pdp-thumb-next" aria-label="Next image" onClick={() => setImageIndex((imageIndex + 1) % frames.length)}>⌄</button>}
        </div>
        <figure className="pdp-stage">
          {frame ? <Image key={frame.url} src={frame.url} alt={frame.editorial ? `${product.category} campaign, ${world?.tagline || product.name}` : `${product.name}, ${product.colour}`} fill unoptimized priority sizes="(max-width: 700px) 100vw, 48vw" /> : <span className="pdp-stage-empty">Image coming soon</span>}
          {frame?.editorial && world && <figcaption className="pdp-caption"><span>{world.name}</span><span>{world.tagline}</span></figcaption>}
          {frame && <button className="pdp-zoom" aria-label="View larger image" onClick={() => setZoomed(true)}>+</button>}
        </figure>
      </div>

      <div className="pdp-info">
        <span className="tiny-label">{product.category}</span>
        <h1>{product.name}</h1>
        <div className="pdp-price-row">
          <p className="pdp-price">{money(product.price_minor)}</p>
          {product.development_sample && <p className="pdp-rating" title="Illustrative rating for the development sample" aria-label="Illustrative rating 4.8 out of 5 from 124 reviews"><span aria-hidden="true">★★★★<i>★</i></span><small>4.8 (124)</small></p>}
        </div>
        <p className="pdp-description">{product.description}</p>
        {product.development_sample && <p className="pdp-sample-note">Development sample · illustrative product, price and photography for review.</p>}

        <div className="pdp-option"><span className="pdp-option-label">Colour <b>{product.colour}</b></span>
          <div className="pdp-swatches">{colours.map(p => <button key={p.id} style={{ backgroundColor: swatchColour(p.colour) }} title={p.colour} aria-label={`Select ${p.colour}`} aria-pressed={product.colour === p.colour} onClick={() => selectVariant(family.find(v => v.colour === p.colour && v.size === product.size) || p)} />)}</div>
        </div>

        <div className="pdp-option">
          <div className="pdp-size-heading"><span className="pdp-option-label">Size</span></div>
          <div className="pdp-size-row">
            <div className="pdp-sizes" role="group" aria-label="Select size">{sizes.map(p => <button key={p.id} aria-pressed={product.id === p.id} disabled={!p.available} onClick={() => selectVariant(p)}>{p.size || "One size"}</button>)}</div>
            <button className="pdp-size-guide" onClick={() => onStory("Size guide", "size-guide")}>Size Guide <span aria-hidden="true">→</span></button>
          </div>
          <p className="pdp-fit">{fit}</p>
        </div>

        <div className="pdp-option"><span className="pdp-option-label">Quantity</span>
          <div className="pdp-quantity"><button aria-label="Decrease quantity" disabled={amount <= 1} onClick={() => setAmount(n => n - 1)}>−</button><span aria-live="polite">{amount}</span><button aria-label="Increase quantity" disabled={amount >= Math.min(product.available, 20)} onClick={() => setAmount(n => n + 1)}>+</button></div>
        </div>

        <div className="pdp-purchase">
          <button className="pdp-add" disabled={!ready || busy || !product.available || amount > product.available} onClick={() => onAdd(amount)}>{!product.available ? "Out of stock" : busy ? "Adding…" : <>Add to bag <span>{money(product.price_minor * amount)}</span></>}</button>
          <button className="pdp-wishlist" aria-label={`${saved ? "Remove from" : "Add to"} wishlist`} aria-pressed={saved} onClick={() => onSave(product)} disabled={busy}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4"><path d="M12 20.5s-7.5-4.6-9.3-9.6C1.5 7.6 3.6 4.5 6.8 4.5c2 0 3.5 1.1 5.2 3 1.7-1.9 3.2-3 5.2-3 3.2 0 5.3 3.1 4.1 6.4-1.8 5-9.3 9.6-9.3 9.6Z" /></svg>
          </button>
        </div>
        <p className="pdp-shipping"><svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z" /><circle cx="6" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></svg>Free shipping on orders above ₹5,000<span aria-hidden="true">|</span>Easy {returnWindowDays || 30}-day returns</p>

        <div className="pdp-accordion">{panels.map(([title, body]) => {
          const expanded = open === title;
          const id = `pdp-panel-${title.replaceAll(/\W+/g, "-").toLowerCase()}`;
          return <div key={title} className="pdp-accordion-item">
            <button aria-expanded={expanded} aria-controls={id} onClick={() => setOpen(expanded ? "" : title)}>{title}<span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
            <div id={id} hidden={!expanded}><p>{body}</p></div>
          </div>;
        })}</div>
      </div>
    </section>

    <section className="material-panels pdp-stories">
      <button className="image-story" onClick={() => onStory("Material Matters", "material-matters")}><CampaignPhoto name="material" alt="Close-up of black ribbed fabric" /><div><h2>Made to move<br />with you.</h2><p>Our signature rib blend is buttery soft, breathable and holds you, without holding you back.</p><span className="underlined-link">Discover the fabric <span>→</span></span></div></button>
      <button className="image-story pdp-story-detail" onClick={() => onStory("A Closer Look", "a-closer-look")}><CampaignPhoto name="/images/flagship/movement-film-hd-v2.png" alt="A quiet monogram on black activewear" /><span className="pdp-story-mark" aria-hidden="true">Sa</span><div><h2>Subtle details.<br />A deeper connection.</h2><p>A quiet mark of what moves you.</p></div></button>
    </section>

    <section className="pdp-pairings">
      <div className="flagship-section-title"><h2>Pair it with.</h2><button className="underlined-link" onClick={() => onNavigate("Shop")}>Complete the look <span>→</span></button></div>
      <div className="flagship-product-grid">{pairings.map(p => <ProductCard key={p.id} item={p} products={products} listing onProduct={selectVariant} saved={wishlist.some(id => products.some(v => v.id === id && v.product_id === p.product_id))} onSave={onSave} onQuickAdd={onQuickAdd} quickAddDisabled={busy || !ready || p.available < 1} />)}</div>
    </section>

    {zoomed && frame && <div className="pdp-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} image`} onClick={() => setZoomed(false)}>
      <Image src={frame.url} alt={`${product.name}, ${product.colour}`} fill unoptimized sizes="100vw" />
      <button aria-label="Close larger image" onClick={() => setZoomed(false)}>×</button>
    </div>}
  </div>;
}
