-- Create approval_stage enum and add approval chain columns to employees and leave_requests
CREATE TYPE "public"."approval_stage" AS ENUM('ACTING', 'HOD', 'MD', 'COMPLETED', 'REJECTED', 'CANCELLED');--> statement-breakpoint

-- Employees: add assigned approver columns and audit flag
ALTER TABLE "employees"
  ADD COLUMN "acting_officer_id" integer,
  ADD COLUMN "hod_id" integer,
  ADD COLUMN "md_id" integer,
  ADD COLUMN "approval_chain_active" boolean DEFAULT false NOT NULL,
  ADD COLUMN "approval_chain_updated_at" timestamp;--> statement-breakpoint

-- Leave requests: snapshot assigned approvers and routing helpers
ALTER TABLE "leave_requests"
  ADD COLUMN "assigned_hod_id" integer,
  ADD COLUMN "assigned_md_id" integer,
  ADD COLUMN "approval_stage" "public"."approval_stage" DEFAULT 'ACTING' NOT NULL,
  ADD COLUMN "current_approver_employee_id" integer;--> statement-breakpoint

-- Foreign key constraints
ALTER TABLE "employees" ADD CONSTRAINT "employees_acting_officer_id_employees_id_fk" FOREIGN KEY ("acting_officer_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_hod_id_employees_id_fk" FOREIGN KEY ("hod_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_md_id_employees_id_fk" FOREIGN KEY ("md_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;--> statement-breakpoint

ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_assigned_hod_id_employees_id_fk" FOREIGN KEY ("assigned_hod_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_assigned_md_id_employees_id_fk" FOREIGN KEY ("assigned_md_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_current_approver_employee_id_employees_id_fk" FOREIGN KEY ("current_approver_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;--> statement-breakpoint
