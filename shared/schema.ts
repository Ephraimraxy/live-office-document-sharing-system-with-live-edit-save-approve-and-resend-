import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  pgEnum,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'OFFICER', 'REVIEWER', 'APPROVER', 'VIEWER']);
export const documentStatusEnum = pgEnum('document_status', ['DRAFT', 'IN_REVIEW', 'PENDING_SIGNATURE', 'APPROVED', 'REJECTED', 'ARCHIVED']);
export const workflowStateEnum = pgEnum('workflow_state', ['DRAFT', 'REVIEW', 'SIGN', 'APPROVAL', 'DONE', 'REJECTED']);
export const taskTypeEnum = pgEnum('task_type', ['REVIEW', 'SIGN', 'APPROVE']);
export const taskStateEnum = pgEnum('task_state', ['OPEN', 'DONE', 'CANCELLED']);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  roles: userRoleEnum("roles").array().default(sql`ARRAY[]::user_role[]`),
  departments: varchar("departments").array().default(sql`ARRAY[]::varchar[]`),
  officeId: varchar("office_id"), // User's assigned office
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  members: varchar("members").array().default(sql`ARRAY[]::varchar[]`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const offices = pgTable("offices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").notNull().unique(), // Admin-assigned office ID
  name: varchar("name").notNull(),
  description: text("description"),
  officeCode: varchar("office_code").notNull().unique(), // Unique code for office access
  officePassword: varchar("office_password").notNull(), // Password for office head login
  headUserId: varchar("head_user_id"), // Office head user ID
  adminUsers: varchar("admin_users").array().default(sql`ARRAY[]::varchar[]`),
  members: varchar("members").array().default(sql`ARRAY[]::varchar[]`),
  departmentId: varchar("department_id").references(() => departments.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  senderUserId: varchar("sender_user_id").notNull().references(() => users.id),
  messageType: varchar("message_type").notNull(), // 'office_specific', 'general_memo'
  targetOfficeId: varchar("target_office_id"), // null for general memos, specific office ID for office messages
  isRead: jsonb("is_read").default(sql`'{}'::jsonb`), // Track read status per user {userId: boolean}
  priority: varchar("priority").default('normal'), // 'high', 'normal', 'low'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const officeLogins = pgTable("office_logins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").notNull().references(() => offices.officeId),
  userId: varchar("user_id"), // null for guest access with code
  loginTime: timestamp("login_time").defaultNow(),
  ipAddress: varchar("ip_address"),
  sessionToken: varchar("session_token").notNull(),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").default(""),
  ownerUid: varchar("owner_uid").notNull().references(() => users.id),
  departmentId: varchar("department_id").references(() => departments.id),
  status: documentStatusEnum("status").default('DRAFT'),
  currentVersionId: varchar("current_version_id"),
  tags: varchar("tags").array().default(sql`ARRAY[]::varchar[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  dueAt: timestamp("due_at"),
  // Participants stored as JSON for flexibility
  participants: jsonb("participants").$type<{
    editors: string[];
    reviewers: string[];
    approvers: string[];
    viewers: string[];
  }>().default(sql`'{}'::jsonb`),
  // ACL stored as JSON
  acl: jsonb("acl").$type<{
    read: string[];
    write: string[];
  }>().default(sql`'{}'::jsonb`),
});

export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docId: varchar("doc_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: varchar("version_number").notNull(),
  storagePath: varchar("storage_path").notNull(),
  sha256: varchar("sha256"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  changeSummary: text("change_summary"),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
});

export const documentComments = pgTable("document_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docId: varchar("doc_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  authorUid: varchar("author_uid").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  resolved: boolean("resolved").default(false),
});

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docId: varchar("doc_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  state: workflowStateEnum("state").default('DRAFT'),
  assignees: jsonb("assignees").$type<{
    review: string[];
    sign: string[];
    approve: string[];
  }>().default(sql`'{}'::jsonb`),
  history: jsonb("history").$type<Array<{
    at: number;
    byUid: string;
    action: string;
    meta?: any;
  }>>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: taskTypeEnum("type").notNull(),
  docId: varchar("doc_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  workflowId: varchar("workflow_id").notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  state: taskStateEnum("state").default('OPEN'),
  assignedTo: varchar("assigned_to").array().default(sql`ARRAY[]::varchar[]`),
  createdAt: timestamp("created_at").defaultNow(),
  doneAt: timestamp("done_at"),
  notes: text("notes"),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUid: varchar("actor_uid").notNull().references(() => users.id),
  action: varchar("action").notNull(),
  target: jsonb("target").$type<{
    type: 'document' | 'workflow' | 'task' | 'user';
    id: string;
  }>().notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  ip: varchar("ip"),
  userAgent: varchar("user_agent"),
  diff: jsonb("diff"),
  metadata: jsonb("metadata"),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toUid: varchar("to_uid").notNull().references(() => users.id),
  type: varchar("type").notNull(),
  payload: jsonb("payload").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  documentVersions: many(documentVersions),
  comments: many(documentComments),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, {
    fields: [documents.ownerUid],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [documents.departmentId],
    references: [departments.id],
  }),
  versions: many(documentVersions),
  comments: many(documentComments),
  workflows: many(workflows),
  tasks: many(tasks),
  auditLogs: many(auditLogs),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.docId],
    references: [documents.id],
  }),
  createdBy: one(users, {
    fields: [documentVersions.createdBy],
    references: [users.id],
  }),
}));

export const documentCommentsRelations = relations(documentComments, ({ one }) => ({
  document: one(documents, {
    fields: [documentComments.docId],
    references: [documents.id],
  }),
  author: one(users, {
    fields: [documentComments.authorUid],
    references: [users.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  document: one(documents, {
    fields: [workflows.docId],
    references: [documents.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  document: one(documents, {
    fields: [tasks.docId],
    references: [documents.id],
  }),
  workflow: one(workflows, {
    fields: [tasks.workflowId],
    references: [workflows.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUid],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.toUid],
    references: [users.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  documents: many(documents),
  offices: many(offices),
}));

export const officesRelations = relations(offices, ({ one, many }) => ({
  department: one(departments, {
    fields: [offices.departmentId],
    references: [departments.id],
  }),
  messages: many(messages),
  logins: many(officeLogins),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderUserId],
    references: [users.id],
  }),
  targetOffice: one(offices, {
    fields: [messages.targetOfficeId],
    references: [offices.officeId],
  }),
}));

export const officeLoginsRelations = relations(officeLogins, ({ one }) => ({
  office: one(offices, {
    fields: [officeLogins.officeId],
    references: [offices.officeId],
  }),
  user: one(users, {
    fields: [officeLogins.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentVersionId: true,
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(documentComments).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  doneAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export const insertOfficeSchema = createInsertSchema(offices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfficeLoginSchema = createInsertSchema(officeLogins).omit({
  id: true,
  loginTime: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentComment = typeof documentComments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Workflow = typeof workflows.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Office = typeof offices.$inferSelect;
export type InsertOffice = z.infer<typeof insertOfficeSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type OfficeLogin = typeof officeLogins.$inferSelect;
export type InsertOfficeLogin = z.infer<typeof insertOfficeLoginSchema>;
