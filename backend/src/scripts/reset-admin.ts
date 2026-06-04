/**
 * One-time script: find HR_ADMIN accounts and create a temporary one if needed.
 * Run from the backend/ directory:
 *   npx tsx src/scripts/reset-admin.ts
 */
import { db } from "../db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../auth";

const TEMP_EMAIL = "temp.admin@hrms.internal";
const TEMP_PASSWORD = "TempAdmin@9999";

async function main() {
  // 1. Show all existing HR_ADMIN accounts
  const admins = await db
    .select({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.role, "HR_ADMIN"));

  console.log("\n─── Existing HR_ADMIN accounts ─────────────────────────");
  if (admins.length === 0) {
    console.log("  (none found)");
  } else {
    admins.forEach(a =>
      console.log(`  Name: ${a.name}  |  Email: ${a.email}  |  Created: ${new Date(a.createdAt).toLocaleDateString()}`)
    );
  }

  // 2. Check if temp account already exists
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, TEMP_EMAIL));

  if (existing) {
    console.log("\n─── Temporary admin already exists ─────────────────────");
    console.log(`  Email:    ${TEMP_EMAIL}`);
    console.log(`  Password: ${TEMP_PASSWORD}`);
    console.log("\nLog in with these credentials now.");
    process.exit(0);
  }

  // 3. Create a fresh temporary HR_ADMIN
  try {
    await auth.api.signUpEmail({
      body: {
        email: TEMP_EMAIL,
        password: TEMP_PASSWORD,
        name: "Temp HR Admin",
        role: "HR_ADMIN",
      },
    });

    console.log("\n─── Temporary HR_ADMIN created ──────────────────────────");
    console.log(`  Email:    ${TEMP_EMAIL}`);
    console.log(`  Password: ${TEMP_PASSWORD}`);
    console.log("\nNext steps:");
    console.log("  1. Log in with the credentials above");
    console.log("  2. Go to Users → find your real account → Link Employee");
    console.log("  3. Change your real account's role back to HR_ADMIN if needed");
    console.log("  4. Delete the temp account from Users page or run:");
    console.log(`     DELETE FROM "user" WHERE email = '${TEMP_EMAIL}';`);
  } catch (err: any) {
    console.error("\nFailed to create temp admin:", err?.body ?? err?.message ?? err);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
