import { notFound } from "next/navigation";
import HomePage from "../page";

export default async function StorePage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!['shop', 'new', 'journal', 'about', 'collections', 'products', 'wishlist', 'bag', 'checkout', 'account', 'search', 'orders', 'contact'].includes(path[0])) notFound();
  return <HomePage />;
}
