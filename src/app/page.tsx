import Storefront from "@/components/storefront/Storefront";

export default function HomePage() {
  const config = {
    mode: process.env.NEXT_PUBLIC_COMMERCE_MODE || "api",
    api: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1",
    authDomain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "",
    authClient: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "",
    authAudience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "",
  };
  return <Storefront config={config} />;
}
