import { createAuthClient } from "better-auth/client";

// Use relative URL so cookies work correctly on same domain
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
