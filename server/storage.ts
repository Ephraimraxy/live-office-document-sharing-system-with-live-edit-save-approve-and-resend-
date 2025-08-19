import {
  users,
  documents,
  documentVersions,
  documentComments,
  workflows,
  tasks,
  auditLogs,
  notifications,
  departments,
  type User,
  type UpsertUser,
  type Document,
  type InsertDocument,
  type DocumentVersion,
  type InsertDocumentVersion,
  type DocumentComment,
  type InsertComment,
  type Workflow,
  type Task,
  type InsertTask,
  type AuditLog,
  type Notification,
  type Department,
  type InsertDepartment,
  type Office,
  type InsertOffice,
  type Message,
  type InsertMessage,
  type OfficeLogin,
  type InsertOfficeLogin,
  offices,
  messages,
  officeLogins,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, inArray, like, ilike } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocuments(filters?: {
    status?: string;
    departmentId?: string;
    ownerUid?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Document[]>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  
  // Document version operations
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  getDocumentVersions(docId: string): Promise<DocumentVersion[]>;
  getLatestVersion(docId: string): Promise<DocumentVersion | undefined>;
  
  // Comment operations
  createComment(comment: InsertComment): Promise<DocumentComment>;
  getDocumentComments(docId: string): Promise<DocumentComment[]>;
  updateComment(id: string, updates: Partial<DocumentComment>): Promise<DocumentComment | undefined>;
  
  // Workflow operations
  createWorkflow(docId: string, assignees?: any): Promise<Workflow>;
  getWorkflow(docId: string): Promise<Workflow | undefined>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTasks(filters?: {
    assignedTo?: string;
    state?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  
  // Audit operations
  createAuditLog(log: Omit<typeof auditLogs.$inferInsert, 'id' | 'timestamp'>): Promise<AuditLog>;
  getAuditLogs(targetId: string, targetType: string): Promise<AuditLog[]>;
  
  // Notification operations
  createNotification(notification: Omit<typeof notifications.$inferInsert, 'id' | 'createdAt'>): Promise<Notification>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  
  // Department operations
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  
  // Office operations
  getOffices(): Promise<Office[]>;
  getOfficeByOfficeId(officeId: string): Promise<Office | undefined>;
  getOfficeByCode(officeCode: string): Promise<Office | undefined>;
  validateOfficeLogin(officeCode: string, password: string): Promise<Office | null>;
  createOffice(office: InsertOffice): Promise<Office>;
  updateOffice(id: string, updates: Partial<Office>): Promise<Office | undefined>;
  deleteOffice(id: string): Promise<boolean>;
  getOfficeMembers(officeId: string): Promise<User[]>;
  assignUserToOffice(userId: string, officeId: string): Promise<User | undefined>;
  
  // Message operations
  getMessages(filters?: { targetOfficeId?: string; messageType?: string; userId?: string }): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string, officeId?: string): Promise<number>;
  
  // Office login operations
  createOfficeLogin(login: InsertOfficeLogin): Promise<OfficeLogin>;
  validateOfficeSession(sessionToken: string): Promise<OfficeLogin | undefined>;
  invalidateOfficeSession(sessionToken: string): Promise<void>;
  
  // User management
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByOffice(officeId: string): Promise<User[]>;
  updateUserRoles(userId: string, roles: string[]): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(document).returning();
    return doc;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const [doc] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }

  async getDocuments(filters?: {
    status?: string;
    departmentId?: string;
    ownerUid?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Document[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(documents.status, filters.status as any));
    }
    
    if (filters?.departmentId) {
      conditions.push(eq(documents.departmentId, filters.departmentId));
    }
    
    if (filters?.ownerUid) {
      conditions.push(eq(documents.ownerUid, filters.ownerUid));
    }
    
    if (filters?.search) {
      conditions.push(ilike(documents.title, `%${filters.search}%`));
    }
    
    let query = db.select().from(documents);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(documents.updatedAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const [doc] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.ownerUid, userId));
  }

  // Document version operations
  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [ver] = await db.insert(documentVersions).values(version).returning();
    return ver;
  }

  async getDocumentVersions(docId: string): Promise<DocumentVersion[]> {
    return await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.docId, docId))
      .orderBy(desc(documentVersions.createdAt));
  }

  async getLatestVersion(docId: string): Promise<DocumentVersion | undefined> {
    const [version] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.docId, docId))
      .orderBy(desc(documentVersions.createdAt))
      .limit(1);
    return version;
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<DocumentComment> {
    const [com] = await db.insert(documentComments).values(comment).returning();
    return com;
  }

  async getDocumentComments(docId: string): Promise<DocumentComment[]> {
    return await db
      .select()
      .from(documentComments)
      .where(eq(documentComments.docId, docId))
      .orderBy(desc(documentComments.createdAt));
  }

  async updateComment(id: string, updates: Partial<DocumentComment>): Promise<DocumentComment | undefined> {
    const [comment] = await db
      .update(documentComments)
      .set(updates)
      .where(eq(documentComments.id, id))
      .returning();
    return comment;
  }

  // Workflow operations
  async createWorkflow(docId: string, assignees?: any): Promise<Workflow> {
    const [workflow] = await db
      .insert(workflows)
      .values({
        docId,
        assignees: assignees || {},
        history: [],
      })
      .returning();
    return workflow;
  }

  async getWorkflow(docId: string): Promise<Workflow | undefined> {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.docId, docId));
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const [workflow] = await db
      .update(workflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return workflow;
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const [t] = await db.insert(tasks).values(task).returning();
    return t;
  }

  async getTasks(filters?: {
    assignedTo?: string;
    state?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    const conditions = [];
    
    if (filters?.assignedTo) {
      conditions.push(eq(tasks.assignedTo, [filters.assignedTo]));
    }
    
    if (filters?.state) {
      conditions.push(eq(tasks.state, filters.state as any));
    }
    
    if (filters?.type) {
      conditions.push(eq(tasks.type, filters.type as any));
    }
    
    let query = db.select().from(tasks);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(tasks.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  // Audit operations
  async createAuditLog(log: Omit<typeof auditLogs.$inferInsert, 'id' | 'timestamp'>): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(targetId: string, targetType: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.target, { type: targetType as any, id: targetId })
        )
      )
      .orderBy(desc(auditLogs.timestamp));
  }

  // Notification operations
  async createNotification(notification: Omit<typeof notifications.$inferInsert, 'id' | 'createdAt'>): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(notification).returning();
    return notif;
  }

  async getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    const conditions = [eq(notifications.toUid, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }
    
    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  // Department operations
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(departments.name);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [dept] = await db.insert(departments).values(department).returning();
    return dept;
  }

  // User management
  async getUsersByRole(role: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.roles, [role as any]));
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ roles: roles as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

// In-memory storage implementation for development
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private documents: Map<string, Document> = new Map();
  private documentVersions: Map<string, DocumentVersion> = new Map();
  private documentComments: Map<string, DocumentComment> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private tasks: Map<string, Task> = new Map();
  private auditLogs: AuditLog[] = [];
  private notifications: Map<string, Notification> = new Map();
  private departments: Map<string, Department> = new Map();
  private offices: Map<string, Office> = new Map();
  private messages: Map<string, Message> = new Map();
  private officeLogins: Map<string, OfficeLogin> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private initializeSampleData() {
    // Create sample admin user
    const adminId = this.generateId();
    const adminUser: User = {
      id: adminId,
      email: "admin@company.com",
      firstName: "System",
      lastName: "Administrator",
      profileImageUrl: null,
      roles: ["ADMIN"],
      departments: [],
      officeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminId, adminUser);

    // Sample offices with access codes
    const office1Id = this.generateId();
    const office1: Office = {
      id: office1Id,
      officeId: "NYC001",
      name: "New York Office",
      description: "Main office in Manhattan - headquarters for East Coast operations",
      officeCode: "NYC001",
      officePassword: "secure123",
      headUserId: null,
      adminUsers: [adminId],
      members: [],
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.offices.set(office1Id, office1);

    const office2Id = this.generateId();
    const office2: Office = {
      id: office2Id,
      officeId: "LA002",
      name: "Los Angeles Office",
      description: "West coast operations center - technology and media hub",
      officeCode: "LA002",
      officePassword: "westcoast456",
      headUserId: null,
      adminUsers: [adminId],
      members: [],
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.offices.set(office2Id, office2);

    const office3Id = this.generateId();
    const office3: Office = {
      id: office3Id,
      officeId: "CHI003",
      name: "Chicago Office",
      description: "Midwest regional office - logistics and distribution center",
      officeCode: "CHI003",
      officePassword: "midwest789",
      headUserId: null,
      adminUsers: [adminId],
      members: [],
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.offices.set(office3Id, office3);

    // Sample messages
    const message1Id = this.generateId();
    const message1: Message = {
      id: message1Id,
      title: "Welcome to the Office Management System",
      content: "This is a general memo for all offices. Please familiarize yourself with the new system and review the updated procedures for document workflow management.",
      senderUserId: adminId,
      messageType: "general_memo",
      targetOfficeId: null,
      isRead: {},
      priority: "normal",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.messages.set(message1Id, message1);

    const message2Id = this.generateId();
    const message2: Message = {
      id: message2Id,
      title: "NYC Office Quarterly Review",
      content: "Please review the quarterly reports for the New York office. They are due by the end of this week. Focus on client acquisition metrics and revenue projections.",
      senderUserId: adminId,
      messageType: "office_specific",
      targetOfficeId: "NYC001",
      isRead: {},
      priority: "high",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.messages.set(message2Id, message2);

    const message3Id = this.generateId();
    const message3: Message = {
      id: message3Id,
      title: "LA Office Technology Update",
      content: "New server infrastructure has been deployed. Please ensure all staff complete the system migration training by next Friday.",
      senderUserId: adminId,
      messageType: "office_specific",
      targetOfficeId: "LA002",
      isRead: {},
      priority: "normal",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.messages.set(message3Id, message3);
  }

  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = Array.from(this.users.values()).find(u => u.email === userData.email);
    const id = existingUser?.id || this.generateId();
    
    const user: User = {
      id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      roles: userData.roles || [],
      departments: userData.departments || [],
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(id, user);
    return user;
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.generateId();
    const doc: Document = {
      id,
      title: document.title,
      content: document.content || "",
      ownerUid: document.ownerUid,
      departmentId: document.departmentId || null,
      status: document.status || 'DRAFT',
      currentVersionId: document.currentVersionId || null,
      tags: document.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      dueAt: document.dueAt || null,
      participants: document.participants || { editors: [], reviewers: [], approvers: [], viewers: [] },
      acl: document.acl || { read: [], write: [] },
    };
    
    this.documents.set(id, doc);
    return doc;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocuments(filters?: {
    status?: string;
    departmentId?: string;
    ownerUid?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Document[]> {
    let docs = Array.from(this.documents.values());
    
    if (filters?.status) {
      docs = docs.filter(d => d.status === filters.status);
    }
    
    if (filters?.departmentId) {
      docs = docs.filter(d => d.departmentId === filters.departmentId);
    }
    
    if (filters?.ownerUid) {
      docs = docs.filter(d => d.ownerUid === filters.ownerUid);
    }
    
    if (filters?.search) {
      docs = docs.filter(d => d.title.toLowerCase().includes(filters.search!.toLowerCase()));
    }
    
    // Sort by updated date
    docs.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    
    if (filters?.offset) {
      docs = docs.slice(filters.offset);
    }
    
    if (filters?.limit) {
      docs = docs.slice(0, filters.limit);
    }
    
    return docs;
  }



  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(d => d.ownerUid === userId);
  }

  // Document version operations
  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const id = this.generateId();
    const ver: DocumentVersion = {
      id,
      docId: version.docId,
      versionNumber: version.versionNumber,
      storagePath: version.storagePath,
      sha256: version.sha256 || null,
      createdBy: version.createdBy,
      createdAt: new Date(),
      changeSummary: version.changeSummary || null,
      fileName: version.fileName,
      fileSize: version.fileSize || null,
      mimeType: version.mimeType || null,
    };
    
    this.documentVersions.set(id, ver);
    return ver;
  }

  async getDocumentVersions(docId: string): Promise<DocumentVersion[]> {
    return Array.from(this.documentVersions.values())
      .filter(v => v.docId === docId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getLatestVersion(docId: string): Promise<DocumentVersion | undefined> {
    const versions = await this.getDocumentVersions(docId);
    return versions[0];
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<DocumentComment> {
    const id = this.generateId();
    const com: DocumentComment = {
      id,
      docId: comment.docId,
      authorUid: comment.authorUid,
      body: comment.body,
      createdAt: new Date(),
      resolved: comment.resolved || false,
    };
    
    this.documentComments.set(id, com);
    return com;
  }

  async getDocumentComments(docId: string): Promise<DocumentComment[]> {
    return Array.from(this.documentComments.values())
      .filter(c => c.docId === docId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateComment(id: string, updates: Partial<DocumentComment>): Promise<DocumentComment | undefined> {
    const comment = this.documentComments.get(id);
    if (!comment) return undefined;
    
    const updatedComment = { ...comment, ...updates };
    this.documentComments.set(id, updatedComment);
    return updatedComment;
  }

  // Workflow operations
  async createWorkflow(docId: string, assignees?: any): Promise<Workflow> {
    const id = this.generateId();
    const workflow: Workflow = {
      id,
      docId,
      state: 'DRAFT',
      assignees: assignees || { review: [], sign: [], approve: [] },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.workflows.set(id, workflow);
    return workflow;
  }

  async getWorkflow(docId: string): Promise<Workflow | undefined> {
    return Array.from(this.workflows.values()).find(w => w.docId === docId);
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;
    
    const updatedWorkflow = { ...workflow, ...updates, updatedAt: new Date() };
    this.workflows.set(id, updatedWorkflow);
    return updatedWorkflow;
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const id = this.generateId();
    const t: Task = {
      id,
      type: task.type,
      docId: task.docId,
      workflowId: task.workflowId,
      state: task.state || 'OPEN',
      assignedTo: task.assignedTo || [],
      createdAt: new Date(),
      doneAt: task.doneAt || null,
      notes: task.notes || null,
    };
    
    this.tasks.set(id, t);
    return t;
  }

  async getTasks(filters?: {
    assignedTo?: string;
    state?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());
    
    if (filters?.assignedTo) {
      tasks = tasks.filter(t => t.assignedTo?.includes(filters.assignedTo!));
    }
    
    if (filters?.state) {
      tasks = tasks.filter(t => t.state === filters.state);
    }
    
    if (filters?.type) {
      tasks = tasks.filter(t => t.type === filters.type);
    }
    
    tasks.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    
    if (filters?.offset) {
      tasks = tasks.slice(filters.offset);
    }
    
    if (filters?.limit) {
      tasks = tasks.slice(0, filters.limit);
    }
    
    return tasks;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Audit operations
  async createAuditLog(log: Omit<typeof auditLogs.$inferInsert, 'id' | 'timestamp'>): Promise<AuditLog> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      actorUid: log.actorUid,
      action: log.action,
      target: log.target,
      timestamp: new Date(),
      ip: log.ip || null,
      userAgent: log.userAgent || null,
      diff: log.diff || null,
      metadata: log.metadata || null,
    };
    
    this.auditLogs.push(auditLog);
    return auditLog;
  }

  async getAuditLogs(targetId: string, targetType: string): Promise<AuditLog[]> {
    return this.auditLogs
      .filter(log => log.target.id === targetId && log.target.type === targetType)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
  }

  // Notification operations
  async createNotification(notification: Omit<typeof notifications.$inferInsert, 'id' | 'createdAt'>): Promise<Notification> {
    const id = this.generateId();
    const notif: Notification = {
      id,
      toUid: notification.toUid,
      type: notification.type,
      payload: notification.payload,
      read: notification.read || false,
      createdAt: new Date(),
    };
    
    this.notifications.set(id, notif);
    return notif;
  }

  async getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    let notifs = Array.from(this.notifications.values()).filter(n => n.toUid === userId);
    
    if (unreadOnly) {
      notifs = notifs.filter(n => !n.read);
    }
    
    return notifs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async markNotificationRead(id: string): Promise<void> {
    const notif = this.notifications.get(id);
    if (notif) {
      notif.read = true;
      this.notifications.set(id, notif);
    }
  }

  // Department operations
  async getDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const id = this.generateId();
    const dept: Department = {
      id,
      name: department.name,
      members: department.members || [],
      createdAt: new Date(),
    };
    
    this.departments.set(id, dept);
    return dept;
  }

  // User management
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.roles?.includes(role as any));
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, roles: roles as any, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Office operations
  async getOffices(): Promise<Office[]> {
    return Array.from(this.offices.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getOfficeByOfficeId(officeId: string): Promise<Office | undefined> {
    return Array.from(this.offices.values()).find(o => o.officeId === officeId);
  }

  async createOffice(office: InsertOffice): Promise<Office> {
    const id = this.generateId();
    const newOffice: Office = {
      id,
      officeId: office.officeId,
      name: office.name,
      description: office.description || null,
      adminUsers: office.adminUsers || [],
      members: office.members || [],
      departmentId: office.departmentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.offices.set(id, newOffice);
    return newOffice;
  }

  async updateOffice(id: string, updates: Partial<Office>): Promise<Office | undefined> {
    const office = this.offices.get(id);
    if (!office) return undefined;
    
    const updatedOffice = { ...office, ...updates, updatedAt: new Date() };
    this.offices.set(id, updatedOffice);
    return updatedOffice;
  }

  async deleteOffice(id: string): Promise<boolean> {
    return this.offices.delete(id);
  }

  async getOfficeMembers(officeId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.officeId === officeId);
  }

  async assignUserToOffice(userId: string, officeId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, officeId, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUsersByOffice(officeId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.officeId === officeId);
  }

  async getOfficeByCode(officeCode: string): Promise<Office | undefined> {
    return Array.from(this.offices.values()).find(o => o.officeCode === officeCode);
  }

  async validateOfficeLogin(officeCode: string, password: string): Promise<Office | null> {
    const office = await this.getOfficeByCode(officeCode);
    if (!office || office.officePassword !== password) {
      return null;
    }
    return office;
  }

  // Message operations
  async getMessages(filters?: { targetOfficeId?: string; messageType?: string; userId?: string }): Promise<Message[]> {
    let messages = Array.from(this.messages.values());
    
    if (filters?.targetOfficeId) {
      messages = messages.filter(m => m.targetOfficeId === filters.targetOfficeId || m.messageType === 'general_memo');
    }
    
    if (filters?.messageType) {
      messages = messages.filter(m => m.messageType === filters.messageType);
    }
    
    return messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.generateId();
    const newMessage: Message = {
      id,
      title: message.title,
      content: message.content,
      senderUserId: message.senderUserId,
      messageType: message.messageType,
      targetOfficeId: message.targetOfficeId || null,
      isRead: {},
      priority: message.priority || 'normal',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      const isRead = typeof message.isRead === 'object' ? message.isRead : {};
      (isRead as any)[userId] = true;
      message.isRead = isRead;
      message.updatedAt = new Date();
      this.messages.set(messageId, message);
    }
  }

  async getUnreadMessageCount(userId: string, officeId?: string): Promise<number> {
    const messages = await this.getMessages({ targetOfficeId: officeId });
    return messages.filter(m => {
      const isRead = typeof m.isRead === 'object' ? m.isRead : {};
      return !(isRead as any)[userId];
    }).length;
  }

  // Office login operations
  async createOfficeLogin(login: InsertOfficeLogin): Promise<OfficeLogin> {
    const id = this.generateId();
    const sessionToken = login.sessionToken || this.generateId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const newLogin: OfficeLogin = {
      id,
      officeId: login.officeId,
      userId: login.userId || null,
      loginTime: new Date(),
      ipAddress: login.ipAddress || null,
      sessionToken,
      isActive: true,
      expiresAt,
    };
    
    this.officeLogins.set(sessionToken, newLogin);
    return newLogin;
  }

  async validateOfficeSession(sessionToken: string): Promise<OfficeLogin | undefined> {
    const login = this.officeLogins.get(sessionToken);
    if (!login || !login.isActive || new Date() > login.expiresAt) {
      return undefined;
    }
    return login;
  }

  async invalidateOfficeSession(sessionToken: string): Promise<void> {
    const login = this.officeLogins.get(sessionToken);
    if (login) {
      login.isActive = false;
      this.officeLogins.set(sessionToken, login);
    }
  }
}

// Use MemStorage for development, DatabaseStorage for production
export const storage = process.env.NODE_ENV === 'production' ? new DatabaseStorage() : new MemStorage();
