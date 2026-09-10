"use server";

import {
  adminIsConfigured,
  authenticateAdmin,
  endAdminSession,
  startAdminSession,
} from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export type AdminLoginState = { error: string };

export async function loginAdmin(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  if (!adminIsConfigured()) {
    return { error: "Admin access has not been configured on this server." };
  }

  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const authenticatedEmail = authenticateAdmin(email, password);

  if (!authenticatedEmail) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { error: "The email or password is incorrect." };
  }

  await startAdminSession(authenticatedEmail);
  redirect("/admin");
}

export async function logoutAdmin() {
  await endAdminSession();
  redirect("/admin/login");
}
