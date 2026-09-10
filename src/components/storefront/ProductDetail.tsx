"use client";
import Image from "next/image";
import { useState } from "react";
import { ProductCard, swatchColour } from "./Flagship";

export default function ProductDetail({ product, products, wishlist, onVariant, onAdd, onSave, saved, busy, ready }: {
  product: StoreProduct; products: StoreProduct[]; wishlist: string[]; onVariant: (p: StoreProduct) => void;
  onAdd: (quantity: number) => void; onSave: (p: StoreProduct) => void; saved: boolean; busy: boolean; ready: boolean;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [amount, setAmount] = useState(1);
  const family = products.filter(p => p.product_id === product.product_id);
  const colours = family.filter((p, i) => family.findIndex(v => v.colour === p.colour) === i);
  const sizes = family.filter(p => p.colour === product.colour);
  const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n / 100);
  const pairings = products.filter((p, i) => p.product_id !== product.product_id && products.findIndex(v => v.product_id === p.product_id) === i).slice(0, 4);
  return <>
    <div className="product-detail"><div className="product-gallery"><div className="product-thumbnails">{product.media.map((m, i) => m.url && <button key={i} onClick={() => setImageIndex(i)} aria-label={`Product image ${i + 1}`} aria-pressed={imageIndex === i}><Image src={m.url} alt="" fill unoptimized /></button>)}</div><div className="product-photo">{product.media[imageIndex]?.url || product.media[0]?.url ? <Image src={product.media[imageIndex]?.url || product.media[0].url!} alt={`${product.name}, ${product.colour}`} fill unoptimized sizes="(max-width: 700px) 100vw, 55vw" /> : "Image coming soon"}</div></div>
    <div className="product-info"><span className="eyebrow">{product.category}</span><h2>{product.name}</h2><p>{money(product.price_minor)}</p><p className="description">{product.description}</p>
      {product.development_sample && <p className="development-note">Development sample · Illustrative product, price and photography for review.</p>}
      <div className="option-label">COLOUR / {product.colour}</div><div className="product-colours">{colours.map(p => <button key={p.id} style={{ backgroundColor: swatchColour(p.colour) }} aria-label={`Select ${p.colour}`} aria-pressed={product.colour === p.colour} onClick={() => { onVariant(family.find(v => v.colour === p.colour && v.size === product.size) || p); setImageIndex(0); }} />)}</div>
      <div className="size-heading"><span className="option-label">SIZE / {product.size || "One size"}</span></div><div className="sizes" role="group" aria-label="Select size">{sizes.map(p => <button key={p.id} aria-pressed={product.id === p.id} disabled={!p.available} onClick={() => onVariant(p)}>{p.size || "One size"}</button>)}</div>
      <details><summary>Size guide</summary><p>Choose your usual size, then check the garment measurements with the house if you are between sizes. Sample sizing runs XS–XL; final product measurements will be published with the approved range.</p></details>
      <div className="quantity"><button aria-label="Decrease product quantity" disabled={amount <= 1} onClick={() => setAmount(n => n - 1)}>−</button><span>{amount}</span><button aria-label="Increase product quantity" disabled={amount >= Math.min(product.available, 20)} onClick={() => setAmount(n => n + 1)}>+</button></div>
      <div className="product-purchase"><button className="solid-button" disabled={!ready || busy || !product.available || amount > product.available} onClick={() => onAdd(amount)}>{!product.available ? "Out of stock" : busy ? "Adding…" : "Add to bag"}<span>{money(product.price_minor * amount)}</span></button><button className="wishlist-button" aria-label={`${saved ? "Remove from" : "Add to"} wishlist`} aria-pressed={saved} onClick={() => onSave(product)} disabled={busy}>{saved ? "♥" : "♡"}</button></div>
      {[['Details',product.description],['Fabric',product.material || 'Contact the house for fabric details.'],['Care',product.care || 'Check the garment care label before washing.'],['Shipping & returns','Shipping charges are shown in your bag before checkout. Return eligibility is checked against your order and the store’s return window.']].map(([title,body]) => <details key={title}><summary>{title}</summary><p>{body}</p></details>)}</div></div>
    <section className="product-recommendations"><h2>Pair it with.</h2><div className="flagship-product-grid">{pairings.map(p => <ProductCard key={p.id} item={p} products={products} onProduct={onVariant} saved={wishlist.some(id => products.some(v => v.id === id && v.product_id === p.product_id))} onSave={onSave} />)}</div></section>
  </>;
}
