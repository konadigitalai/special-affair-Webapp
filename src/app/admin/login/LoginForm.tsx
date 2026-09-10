"use client";

import { useActionState } from "react";
import { loginAdmin, type AdminLoginState } from "../actions";

const initialState: AdminLoginState = { error: "" };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  return (
    <form className="admin-login-form" action={formAction}>
      <label htmlFor="admin-email">Email address</label>
      <input
        id="admin-email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="admin@mail.com"
        required
        autoFocus
      />

      <div className="admin-password-label">
        <label htmlFor="admin-password">Password</label>
        <span>Private access</span>
      </div>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      {state.error && (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending}>
        <span>{pending ? "Checking access…" : "Enter control room"}</span>
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
