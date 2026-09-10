import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/admin-auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default async function AdminLoginPage() {
  if (await readAdminSession()) redirect("/admin");

  return (
    <main className="admin-login-page">
      <Link className="admin-login-brand" href="/" aria-label="Special Affair storefront">
        <strong>Special Affair</strong>
        <span>House administration</span>
      </Link>

      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <div className="admin-login-index" aria-hidden="true">
          <span>SA</span>
          <span>01 / ADMIN</span>
        </div>
        <div className="admin-login-copy">
          <p className="admin-eyebrow">Restricted workspace</p>
          <h1 id="admin-login-title">Welcome<br />back.</h1>
          <p>Sign in to manage the catalogue and monitor store operations.</p>
        </div>
        <LoginForm />
      </section>

      <footer className="admin-login-footer">
        <span>Special Affair®</span>
        <Link href="/">Return to storefront</Link>
      </footer>
    </main>
  );
}
