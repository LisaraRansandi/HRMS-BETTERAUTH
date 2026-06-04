import {
  pgTable, serial, varchar, text, integer,
  boolean, timestamp, date, pgEnum, real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["HR_ADMIN", "MANAGER", "EMPLOYEE"]);
export const leaveStatusEnum = pgEnum("leave_status", ["PENDING", "APPROVED", "REJECTED"]);
export const leaveTypeEnum = pgEnum("leave_type", ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID"]);
export const employmentStatusEnum = pgEnum("employment_status", ["ACTIVE", "INACTIVE", "ON_LEAVE"]);
export const halfDaySessionEnum = pgEnum("half_day_session", ["FIRST_HALF", "SECOND_HALF", "NONE"]);
export const actingOfficerStatusEnum = pgEnum("acting_officer_status", ["PENDING", "ACCEPTED", "DECLINED"]);
export const hodStatusEnum = pgEnum("hod_status", ["PENDING", "RECOMMENDED", "NOT_RECOMMENDED"]);
export const mdStatusEnum = pgEnum("md_status", ["PENDING", "APPROVED", "NOT_APPROVED"]);

// ── Better Auth Tables ────────────────────────────────────────────────────────
// These are REQUIRED by Better Auth — do not rename or remove columns
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Custom fields we added
  role: roleEnum("role").default("EMPLOYEE").notNull(),
  employeeId: integer("employee_id"),
  epfNo: varchar("epf_no", { length: 50 }),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── HRMS Tables ───────────────────────────────────────────────────────────────
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  managerId: integer("manager_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }),
  epfNo: varchar("epf_no", { length: 50 }),
  position: varchar("position", { length: 100 }),
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "set null" }),
  hireDate: date("hire_date"),
  status: employmentStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").default("PENDING").notNull(),
  reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  // Days consumed by this request (0.5 for half-day, whole number otherwise)
  leaveDays: real("leave_days").notNull().default(1),
  // Half-day fields
  isHalfDay: boolean("is_half_day").default(false).notNull(),
  halfDaySession: halfDaySessionEnum("half_day_session").default("NONE").notNull(),
  // Three-stage approval pipeline
  actingOfficerId: integer("acting_officer_id").references(() => employees.id, { onDelete: "set null" }),
  actingOfficerStatus: actingOfficerStatusEnum("acting_officer_status").default("PENDING").notNull(),
  hodStatus: hodStatusEnum("hod_status").default("PENDING").notNull(),
  mdStatus: mdStatusEnum("md_status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  checkInAt: timestamp("check_in_at"),
  checkOutAt: timestamp("check_out_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Types ─────────────────────────────────────────────────────────────────────
export type User = typeof user.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
