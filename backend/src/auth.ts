import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  // Enable email + password login
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false, // set true in production
  },

  // Allow frontend to call the API
  trustedOrigins: ["http://localhost:3000"],

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 8,        // 8 hours
    updateAge: 60 * 60,             // refresh every 1 hour
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  // User fields — we store role and employeeId on the user
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "EMPLOYEE",
        input: true,
      },
      employeeId: {
        type: "number",
        required: false,
        input: true,
      },
      epfNo: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
