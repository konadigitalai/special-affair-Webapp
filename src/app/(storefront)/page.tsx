"use client";

import Image from "next/image";
import { useState } from "react";

const products = [
  { id: "sway-hobo", name: "Sway Hobo", colour: "Oak Brown", price: 29500, category: "Shoulder Bags", tag: "New", image: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=1100&auto=format&fit=crop" },
  { id: "draw-pouch", name: "Draw Pouch", colour: "Sand", price: 18500, category: "Small Leather Goods", tag: "New", image: "https://images.unsplash.com/photo-1486218119243-13883505764c?q=80&w=1100&auto=format&fit=crop" },
  { id: "mini-aria", name: "Mini Aria", colour: "Black Nappa", price: 31500, category: "Mini Bags", tag: "", image: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=1100&auto=format&fit=crop" },
  { id: "bow-tote", name: "Bow Tote", colour: "Dusty Sage", price: 33500, category: "Totes", tag: "New", image: "https://images.unsplash.com/photo-1502904550040-7534597429ae?q=80&w=1100&auto=format&fit=crop" },
  { id: "fold-wallet", name: "Fold Wallet", colour: "Blush", price: 8500, category: "Small Leather Goods", tag: "", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1100&auto=format&fit=crop" },
  { id: "petal-shoulder", name: "Petal Shoulder", colour: "Ivory", price: 27500, category: "Shoulder Bags", tag: "", image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=1100&auto=format&fit=crop" },
  { id: "crescent-mini", name: "Crescent Mini", colour: "Terracotta", price: 24500, category: "Mini Bags", tag: "", image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1100&auto=format&fit=crop" },
  { id: "column-tote", name: "Column Tote", colour: "Espresso", price: 35500, category: "Totes", tag: "", image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=1100&auto=format&fit=crop" },
];

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
type Product = (typeof products)[number];

export default function HomePage() {
  const [screen, setScreen] = useState<"home" | "shop" | "about">("home");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(products[0]);
  const [cart, setCart] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openProduct = (product: Product) => {
    setSelected(product);
    setScreen("shop");
    window.scrollTo(0, 0);
  };
  const visibleProducts = products.filter((product) => filter === "All" || product.category === filter);
  const addToBag = () => {
    setCart((items) => [...items, selected.id]);
    setCartOpen(true);
  };

  return (
    <main className="reference-storefront">
      <div className="reference-announcement">Complimentary shipping across India</div>
      <header className="reference-header">
        <button className="reference-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu"><span /><span /></button>
        <nav className={`reference-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <button onClick={() => { setScreen("shop"); setMenuOpen(false); }}>Shop</button>
          <button onClick={() => { setScreen("about"); setMenuOpen(false); }}>Our World</button>
          <button onClick={() => setSearchOpen(true)}>Search</button>
        </nav>
        <button className="reference-logo" onClick={() => setScreen("home")} aria-label="Special Affair home"><strong>SA</strong><span>Special Affair</span></button>
        <div className="reference-tools"><button onClick={() => setSearchOpen(true)}>Search</button><button onClick={() => setCartOpen(true)}>Bag ({cart.length})</button></div>
      </header>

      {screen === "home" && <>
        <section className="reference-hero"><Image src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=85&w=2000&auto=format&fit=crop" alt="Special Affair leather bag" fill priority sizes="100vw" /><div className="hero-shade" /><div className="reference-hero-copy"><p className="reference-kicker">Spring / Summer 2027</p><h1>An Affair<br /><em>with craft.</em></h1><button className="light-action" onClick={() => setScreen("shop")}>Explore the collection <span>→</span></button></div><p className="hero-index">01 / 03</p></section>
        <section className="reference-intro"><p className="reference-kicker">Special Affair</p><h2>Objects designed<br /><em>to be lived with.</em></h2><p>Contemporary craft from Hyderabad. Premium leather, considered forms and the quiet pleasure of something made well.</p></section>
        <section className="reference-feature"><div className="feature-image"><Image src="https://images.unsplash.com/photo-1559563458-527698bf5295?q=85&w=1000&auto=format&fit=crop" alt="Petal Collection bag" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div className="feature-copy"><p className="reference-kicker">The collection</p><h2>The Petal<br />Collection</h2><p>Soft architecture expressed through leather, curved lines and considered handwork.</p><button className="dark-link" onClick={() => setScreen("shop")}>Explore the collection <span>→</span></button></div></section>
        <ProductSection items={products.slice(0, 5)} onProduct={openProduct} onAll={() => setScreen("shop")} />
        <section className="reference-story"><div className="story-copy"><p className="reference-kicker">The story</p><h2>Crafted in<br />Hyderabad</h2><p>Our atelier brings together master craftsmanship, considered materials and thoughtful design to create pieces that last beyond a season.</p><button className="dark-link" onClick={() => setScreen("about")}>Discover our world <span>→</span></button></div><div className="story-image"><Image src="https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=85&w=1100&auto=format&fit=crop" alt="Craft workshop" fill sizes="(max-width: 800px) 100vw, 50vw" /></div></section>
        <section className="reference-campaign"><Image src="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=85&w=2000&auto=format&fit=crop" alt="Special Affair craft campaign" fill sizes="100vw" /><div className="campaign-shade" /><div><h2>An Affair<br />with Craft</h2><p>Chapter 01 — The art of embellishment</p><button className="light-action" onClick={() => setScreen("about")}>Read the story <span>→</span></button></div></section>
        <section className="reference-signature"><p className="reference-kicker">Signature objects</p><p className="signature-subtitle">Designed to remain.</p><div className="signature-grid"><button className="signature-main" onClick={() => openProduct(products[7])}><Image src={products[7].image} alt={products[7].name} fill sizes="50vw" /><span>Column Tote<br /><small>Espresso — {money(products[7].price)}</small></span></button><div className="signature-tiles">{products.slice(3, 6).map((product) => <button key={product.id} onClick={() => openProduct(product)}><Image src={product.image} alt={product.name} fill sizes="25vw" /><span>{product.name}<small>{money(product.price)}</small></span></button>)}</div></div></section>
        <section className="reference-journal"><p className="reference-kicker">Journal</p><div className="journal-grid">{[["The making", "Inside the Special Affair atelier", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop"], ["Materials", "Leather, silk and memory", "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=900&auto=format&fit=crop"], ["Campaign", "Objects of longing", "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=900&auto=format&fit=crop"]].map(([type, title, image]) => <article key={title}><div><Image src={image} alt={title} fill sizes="(max-width: 800px) 100vw, 33vw" /></div><p>{type}</p><h3>{title}</h3><button className="dark-link">Read story <span>→</span></button></article>)}</div></section>
      </>}

      {screen === "shop" && <ShopView items={visibleProducts} filter={filter} setFilter={setFilter} onProduct={openProduct} selected={selected} onAdd={addToBag} />}
      {screen === "about" && <AboutView />}
      <Newsletter />
      <Footer onShop={() => setScreen("shop")} onAbout={() => setScreen("about")} />

      {searchOpen && <div className="overlay" role="dialog" aria-label="Search"><button className="overlay-close" onClick={() => setSearchOpen(false)}>Close ×</button><input autoFocus placeholder="Search bags, materials, stories…" aria-label="Search" /><div className="search-suggestions"><p>Suggested</p><button onClick={() => { setFilter("Totes"); setScreen("shop"); setSearchOpen(false); }}>Totes</button><button onClick={() => { setFilter("Mini Bags"); setScreen("shop"); setSearchOpen(false); }}>Mini bags</button><button onClick={() => { setFilter("Small Leather Goods"); setScreen("shop"); setSearchOpen(false); }}>Small leather goods</button></div></div>}
      {cartOpen && <><button className="cart-backdrop" aria-label="Close bag" onClick={() => setCartOpen(false)} /><aside className="cart-drawer" role="dialog" aria-label="Shopping bag"><div className="drawer-head"><span>Bag ({cart.length})</span><button onClick={() => setCartOpen(false)}>×</button></div>{cart.length === 0 ? <div className="empty-bag"><em>Your bag is empty.</em><button onClick={() => { setScreen("shop"); setCartOpen(false); }}>Explore the collection</button></div> : <div className="bag-items">{cart.map((id, index) => { const item = products.find((product) => product.id === id)!; return <div className="bag-item" key={`${id}-${index}`}><Image src={item.image} alt={item.name} width={80} height={100} /><span>{item.name}<small>{item.colour}</small>{money(item.price)}</span></div>; })}<button className="checkout-button">Checkout — {money(cart.reduce((sum, id) => sum + products.find((product) => product.id === id)!.price, 0))}</button></div>}</aside></>}
    </main>
  );
}

function ProductSection({ items, onProduct, onAll }: { items: Product[]; onProduct: (product: Product) => void; onAll: () => void }) {
  return <section className="reference-products"><div className="section-line"><h2>New arrivals</h2><button onClick={onAll}>View all</button></div><div className="arrival-grid">{items.map((product) => <button className="arrival-card" key={product.id} onClick={() => onProduct(product)}><div><Image src={product.image} alt={product.name} fill sizes="20vw" />{product.tag && <span>{product.tag}</span>}</div><span>{product.name}<small>{product.colour}</small></span><strong>{money(product.price)}</strong></button>)}</div></section>;
}

function ShopView({ items, filter, setFilter, onProduct, selected, onAdd }: { items: Product[]; filter: string; setFilter: (filter: string) => void; onProduct: (product: Product) => void; selected: Product; onAdd: () => void }) {
  return <div className="shop-view"><div className="shop-heading"><div><h1>Bags</h1><p>A study in form, material and contemporary craft.</p></div><span>{items.length} Pieces</span></div><div className="filter-bar">{["All", "Totes", "Shoulder Bags", "Mini Bags", "Small Leather Goods"].map((name) => <button className={filter === name ? "selected" : ""} key={name} onClick={() => setFilter(name)}>{name}</button>)}</div><div className="shop-grid">{items.map((product) => <button className="shop-card" key={product.id} onClick={() => onProduct(product)}><div><Image src={product.image} alt={product.name} fill sizes="25vw" />{product.tag && <span>{product.tag}</span>}</div><span>{product.name}<small>{product.colour}</small></span><strong>{money(product.price)}</strong></button>)}</div><div className="quick-product"><div><Image src={selected.image} alt={selected.name} fill sizes="50vw" /></div><div><button className="back-link">← Bags</button><h2>{selected.name}</h2><strong>{money(selected.price)}</strong><p>A soft, considered form in full-grain leather, gathered at the strap so it folds naturally against the body.</p><p className="detail-label">Colour<br /><span>{selected.colour}</span></p><button className="add-button" onClick={onAdd}>Add to bag</button></div></div></div>;
}

function AboutView() { return <div className="about-view"><p className="reference-kicker">Our world</p><h1>An Affair<br />with Craft</h1><p>Special Affair is a study in contemporary Indian craftsmanship — premium leather shaped by hand in our Hyderabad atelier, carrying the memory of textiles, sarees and embroidery into objects made for daily life.</p><div className="about-images"><Image src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900&auto=format&fit=crop" alt="Atelier" fill sizes="33vw" /><Image src="https://images.unsplash.com/photo-1520975958225-5e6c2f3c55b0?q=80&w=900&auto=format&fit=crop" alt="Craft detail" fill sizes="33vw" /><Image src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=900&auto=format&fit=crop" alt="Portrait" fill sizes="33vw" /></div><blockquote>“Handwork that carries heritage — each piece begins with cloth, thread and time.”</blockquote></div>; }

function Newsletter() { return <section className="newsletter"><p className="reference-kicker">Private notes</p><p>Join us for collection previews,<br />atelier stories and private releases.</p><form><input type="email" placeholder="Email address" aria-label="Email address" /><button aria-label="Subscribe">→</button></form><small>We write rarely, and never share your details.</small></section>; }

function Footer({ onShop, onAbout }: { onShop: () => void; onAbout: () => void }) { return <footer className="reference-footer"><div className="footer-grid"><div className="footer-intro"><strong>SA <span>Special Affair</span></strong><p>Contemporary craft from Hyderabad. Objects designed to be lived with, every day.</p></div><div><p>Shop</p><button onClick={onShop}>New in</button><button onClick={onShop}>Bags</button><button onClick={onShop}>Small leather goods</button><button onClick={onShop}>Accessories</button></div><div><p>Our world</p><button onClick={onAbout}>Our story</button><button onClick={onAbout}>Craftsmanship</button><button onClick={onAbout}>Journal</button><button>Care guide</button></div><div><p>Customer care</p><button>Contact</button><button>Shipping & delivery</button><button>Returns</button><button>FAQs</button></div><div><p>Stay in touch</p><button>Newsletter</button><button>Instagram</button><button>Pinterest</button></div></div><div className="footer-bottom"><span>© Special Affair 2027</span><span>Terms & Conditions　 Privacy　 Accessibility</span><span>India · INR ₹</span></div></footer>; }