import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertDocumentSchema, insertCommentSchema, insertDocumentVersionSchema, insertOfficeSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Document routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const { status, department, search, limit = 20, offset = 0 } = req.query;
      const documents = await storage.getDocuments({
        status,
        departmentId: department,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
      
      // Enrich documents with owner and department info
      const enrichedDocs = await Promise.all(documents.map(async (doc) => {
        const owner = await storage.getUser(doc.ownerUid);
        const latestVersion = await storage.getLatestVersion(doc.id);
        const commentsCount = (await storage.getDocumentComments(doc.id)).length;
        
        return {
          ...doc,
          owner: owner ? {
            id: owner.id,
            name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email,
            initials: `${owner.firstName?.[0] || ''}${owner.lastName?.[0] || ''}`.toUpperCase() || owner.email?.[0]?.toUpperCase(),
          } : null,
          currentVersion: latestVersion?.versionNumber || '1.0',
          commentsCount,
        };
      }));
      
      res.json(enrichedDocs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check access permissions
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canAccessDocument(document, user)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Enrich with additional data
      const owner = await storage.getUser(document.ownerUid);
      const versions = await storage.getDocumentVersions(document.id);
      const comments = await storage.getDocumentComments(document.id);
      const workflow = await storage.getWorkflow(document.id);
      
      res.json({
        ...document,
        owner,
        versions,
        comments,
        workflow,
      });
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        ownerUid: userId,
        content: req.body.content || "",
      });
      
      const document = await storage.createDocument(validatedData);
      
      // Create initial workflow
      await storage.createWorkflow(document.id, req.body.assignees);
      
      // Create audit log
      await storage.createAuditLog({
        actorUid: userId,
        action: 'DOCUMENT_CREATED',
        target: { type: 'document', id: document.id },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.patch('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, content } = req.body;
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if user can edit this document
      if (document.ownerUid !== userId && !document.participants?.editors?.includes(userId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if document is in editable state
      if (!['DRAFT', 'REJECTED'].includes(document.status || '')) {
        return res.status(400).json({ message: "Document cannot be edited in current state" });
      }
      
      const updatedDocument = await storage.updateDocument(req.params.id, {
        title,
        content,
        updatedAt: new Date(),
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // File upload for document versions
  app.post('/api/documents/:id/versions', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const docId = req.params.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const document = await storage.getDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check permissions
      const user = await storage.getUser(userId);
      if (!canEditDocument(document, user)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Move file to permanent storage
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const permanentPath = path.join('storage', 'documents', docId, fileName);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(permanentPath), { recursive: true });
      await fs.rename(req.file.path, permanentPath);
      
      // Get current version number and increment
      const versions = await storage.getDocumentVersions(docId);
      const latestVersion = versions[0];
      const newVersionNumber = latestVersion ? 
        `${parseInt(latestVersion.versionNumber.split('.')[0]) + 1}.0` : '1.0';
      
      const version = await storage.createDocumentVersion({
        docId,
        versionNumber: newVersionNumber,
        storagePath: permanentPath,
        createdBy: userId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        changeSummary: req.body.changeSummary || 'New version uploaded',
      });
      
      // Update document's current version
      await storage.updateDocument(docId, {
        currentVersionId: version.id,
      });
      
      // Create audit log
      await storage.createAuditLog({
        actorUid: userId,
        action: 'VERSION_UPLOADED',
        target: { type: 'document', id: docId },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { versionId: version.id, versionNumber: newVersionNumber },
      });
      
      res.status(201).json(version);
    } catch (error) {
      console.error("Error uploading version:", error);
      res.status(500).json({ message: "Failed to upload version" });
    }
  });

  // Document workflow transitions
  app.post('/api/documents/:id/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const docId = req.params.id;
      
      const document = await storage.getDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.status !== 'DRAFT') {
        return res.status(400).json({ message: "Document must be in DRAFT status" });
      }
      
      // Check permissions
      const user = await storage.getUser(userId);
      if (!canEditDocument(document, user)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update document status
      await storage.updateDocument(docId, {
        status: 'IN_REVIEW',
      });
      
      // Update workflow
      const workflow = await storage.getWorkflow(docId);
      if (workflow) {
        const history = workflow.history || [];
        history.push({
          at: Date.now(),
          byUid: userId,
          action: 'SUBMIT_FOR_REVIEW',
        });
        
        await storage.updateWorkflow(workflow.id, {
          state: 'REVIEW',
          history,
        });
      }
      
      // Create tasks for reviewers
      if (document.participants?.reviewers?.length) {
        for (const reviewerId of document.participants.reviewers) {
          await storage.createTask({
            type: 'REVIEW',
            docId,
            workflowId: workflow?.id || '',
            assignedTo: [reviewerId],
          });
        }
      }
      
      // Create audit log
      await storage.createAuditLog({
        actorUid: userId,
        action: 'SUBMIT_FOR_REVIEW',
        target: { type: 'document', id: docId },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json({ message: "Document submitted for review" });
    } catch (error) {
      console.error("Error submitting document:", error);
      res.status(500).json({ message: "Failed to submit document" });
    }
  });

  app.post('/api/documents/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const docId = req.params.id;
      
      const document = await storage.getDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if user can approve
      const user = await storage.getUser(userId);
      if (!canApproveDocument(document, user)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update document status
      await storage.updateDocument(docId, {
        status: 'APPROVED',
      });
      
      // Update workflow
      const workflow = await storage.getWorkflow(docId);
      if (workflow) {
        const history = workflow.history || [];
        history.push({
          at: Date.now(),
          byUid: userId,
          action: 'APPROVE',
          meta: req.body,
        });
        
        await storage.updateWorkflow(workflow.id, {
          state: 'DONE',
          history,
        });
      }
      
      // Complete any open tasks for this user
      const userTasks = await storage.getTasks({
        assignedTo: userId,
        state: 'OPEN',
      });
      
      for (const task of userTasks.filter(t => t.docId === docId)) {
        await storage.updateTask(task.id, {
          state: 'DONE',
          doneAt: new Date(),
          notes: req.body.notes || 'Approved',
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        actorUid: userId,
        action: 'APPROVE_DOCUMENT',
        target: { type: 'document', id: docId },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: req.body,
      });
      
      res.json({ message: "Document approved" });
    } catch (error) {
      console.error("Error approving document:", error);
      res.status(500).json({ message: "Failed to approve document" });
    }
  });

  app.post('/api/documents/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const docId = req.params.id;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const document = await storage.getDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check permissions
      const user = await storage.getUser(userId);
      if (!canApproveDocument(document, user) && !canReviewDocument(document, user)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update document status
      await storage.updateDocument(docId, {
        status: 'REJECTED',
      });
      
      // Update workflow
      const workflow = await storage.getWorkflow(docId);
      if (workflow) {
        const history = workflow.history || [];
        history.push({
          at: Date.now(),
          byUid: userId,
          action: 'REJECT',
          meta: { reason },
        });
        
        await storage.updateWorkflow(workflow.id, {
          state: 'REJECTED',
          history,
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        actorUid: userId,
        action: 'REJECT_DOCUMENT',
        target: { type: 'document', id: docId },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { reason },
      });
      
      res.json({ message: "Document rejected" });
    } catch (error) {
      console.error("Error rejecting document:", error);
      res.status(500).json({ message: "Failed to reject document" });
    }
  });

  // Comments
  app.post('/api/documents/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const docId = req.params.id;
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        docId,
        authorUid: userId,
      });
      
      const comment = await storage.createComment(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        actorUid: userId,
        action: 'ADD_COMMENT',
        target: { type: 'document', id: docId },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Tasks
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { state = 'OPEN', type, limit = 20, offset = 0 } = req.query;
      
      const tasks = await storage.getTasks({
        assignedTo: userId,
        state,
        type,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
      
      // Enrich tasks with document info
      const enrichedTasks = await Promise.all(tasks.map(async (task) => {
        const document = await storage.getDocument(task.docId);
        return {
          ...task,
          document,
        };
      }));
      
      res.json(enrichedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Departments
  app.get('/api/departments', isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // User management (Admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // For now, just return basic user list - in production you'd want pagination
      res.json([]);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Office management (Admin only)
  app.get('/api/offices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const offices = await storage.getOffices();
      res.json(offices);
    } catch (error) {
      console.error("Error fetching offices:", error);
      res.status(500).json({ message: "Failed to fetch offices" });
    }
  });

  app.post('/api/offices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertOfficeSchema.parse(req.body);
      
      // Check if office ID already exists
      const existingOffice = await storage.getOfficeByOfficeId(validatedData.officeId);
      if (existingOffice) {
        return res.status(400).json({ message: "Office ID already exists" });
      }
      
      const office = await storage.createOffice(validatedData);
      res.status(201).json(office);
    } catch (error) {
      console.error("Error creating office:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create office" });
    }
  });

  app.patch('/api/offices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const office = await storage.updateOffice(req.params.id, req.body);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }
      
      res.json(office);
    } catch (error) {
      console.error("Error updating office:", error);
      res.status(500).json({ message: "Failed to update office" });
    }
  });

  app.delete('/api/offices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const deleted = await storage.deleteOffice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Office not found" });
      }
      
      res.json({ message: "Office deleted successfully" });
    } catch (error) {
      console.error("Error deleting office:", error);
      res.status(500).json({ message: "Failed to delete office" });
    }
  });

  // Office dashboard access
  app.get('/api/offices/:officeId/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const officeId = req.params.officeId;
      
      // Check if user has access to this office
      if (user?.officeId !== officeId && !user?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Access denied to this office" });
      }
      
      const office = await storage.getOfficeByOfficeId(officeId);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }
      
      // Get office statistics
      const members = await storage.getOfficeMembers(officeId);
      const officeDocuments = await storage.getDocuments({ ownerUid: userId }); // This would need to be updated to filter by office
      
      res.json({
        office,
        members,
        stats: {
          totalMembers: members.length,
          totalDocuments: officeDocuments.length,
          // Add more stats as needed
        }
      });
    } catch (error) {
      console.error("Error fetching office dashboard:", error);
      res.status(500).json({ message: "Failed to fetch office dashboard" });
    }
  });

  // Assign user to office (Admin only)
  app.post('/api/users/:userId/assign-office', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      
      if (!adminUser?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { officeId } = req.body;
      const userId = req.params.userId;
      
      if (!officeId) {
        return res.status(400).json({ message: "Office ID is required" });
      }

      // Check if office exists
      const office = await storage.getOfficeByOfficeId(officeId);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }

      const updatedUser = await storage.assignUserToOffice(userId, officeId);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User assigned to office successfully", user: updatedUser });
    } catch (error) {
      console.error("Error assigning user to office:", error);
      res.status(500).json({ message: "Failed to assign user to office" });
    }
  });

  // Notifications
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { unread } = req.query;
      
      const notifications = await storage.getUserNotifications(userId, unread === 'true');
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Office login system (public endpoint)
  app.post('/api/office/login', async (req, res) => {
    try {
      const { officeCode, password } = req.body;
      
      if (!officeCode || !password) {
        return res.status(400).json({ message: "Office code and password are required" });
      }

      const office = await storage.validateOfficeLogin(officeCode, password);
      if (!office) {
        return res.status(401).json({ message: "Invalid office code or password" });
      }

      // Create office session
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const officeLogin = await storage.createOfficeLogin({
        officeId: office.officeId,
        sessionToken,
        ipAddress: req.ip,
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      res.json({
        message: "Login successful",
        sessionToken: officeLogin.sessionToken,
        office: {
          id: office.id,
          officeId: office.officeId,
          name: office.name,
          description: office.description,
        },
      });
    } catch (error) {
      console.error("Error during office login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Office session validation middleware
  const validateOfficeSession = async (req: any, res: any, next: any) => {
    const sessionToken = req.headers['x-office-session'] || req.query.session;
    
    if (!sessionToken) {
      return res.status(401).json({ message: "Office session required" });
    }

    const session = await storage.validateOfficeSession(sessionToken);
    if (!session) {
      return res.status(401).json({ message: "Invalid or expired office session" });
    }

    req.officeSession = session;
    next();
  };

  // Office dashboard (requires office session)
  app.get('/api/office-dashboard/:officeId', validateOfficeSession, async (req: any, res) => {
    try {
      const { officeId } = req.params;
      const session = req.officeSession;

      // Verify session matches office
      if (session.officeId !== officeId) {
        return res.status(403).json({ message: "Access denied to this office" });
      }

      const office = await storage.getOfficeByOfficeId(officeId);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }

      // Get office-specific and general messages
      const messages = await storage.getMessages({ targetOfficeId: officeId });
      const members = await storage.getOfficeMembers(officeId);

      // Get unread message count (using a dummy user ID for session-based access)
      const unreadCount = await storage.getUnreadMessageCount('office_' + officeId, officeId);

      res.json({
        office,
        messages,
        members,
        stats: {
          totalMembers: members.length,
          totalMessages: messages.length,
          unreadMessages: unreadCount,
        }
      });
    } catch (error) {
      console.error("Error fetching office dashboard:", error);
      res.status(500).json({ message: "Failed to fetch office dashboard" });
    }
  });

  // Mark message as read (office session)
  app.patch('/api/office-messages/:messageId/read', validateOfficeSession, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      const session = req.officeSession;
      
      // Use office-specific user ID for tracking reads
      await storage.markMessageAsRead(messageId, 'office_' + session.officeId);
      res.json({ message: "Message marked as read" });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Office logout
  app.post('/api/office/logout', validateOfficeSession, async (req: any, res) => {
    try {
      const session = req.officeSession;
      await storage.invalidateOfficeSession(session.sessionToken);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Error during office logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Message management (Admin only)
  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { targetOfficeId, messageType } = req.query;
      const messages = await storage.getMessages({ targetOfficeId, messageType });
      
      // Enrich with sender information
      const enrichedMessages = await Promise.all(messages.map(async (message) => {
        const sender = await storage.getUser(message.senderUserId);
        return {
          ...message,
          sender: sender ? {
            id: sender.id,
            email: sender.email,
            firstName: sender.firstName,
            lastName: sender.lastName,
          } : null,
        };
      }));
      
      res.json(enrichedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.roles?.includes('ADMIN')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderUserId: userId,
      });
      
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for permissions
function canAccessDocument(document: any, user: any): boolean {
  if (!user) return false;
  
  // Admin can access everything
  if (user.roles?.includes('ADMIN')) return true;
  
  // Owner can access
  if (document.ownerUid === user.id) return true;
  
  // Check participants
  const participants = document.participants || {};
  const allParticipants = [
    ...(participants.editors || []),
    ...(participants.reviewers || []),
    ...(participants.approvers || []),
    ...(participants.viewers || []),
  ];
  
  return allParticipants.includes(user.id);
}

function canEditDocument(document: any, user: any): boolean {
  if (!user) return false;
  
  // Admin can edit everything
  if (user.roles?.includes('ADMIN')) return true;
  
  // Owner can edit
  if (document.ownerUid === user.id) return true;
  
  // Editors can edit
  const participants = document.participants || {};
  return participants.editors?.includes(user.id) || false;
}

function canReviewDocument(document: any, user: any): boolean {
  if (!user) return false;
  
  // Admin can review everything
  if (user.roles?.includes('ADMIN')) return true;
  
  // Reviewers can review
  const participants = document.participants || {};
  return participants.reviewers?.includes(user.id) || false;
}

function canApproveDocument(document: any, user: any): boolean {
  if (!user) return false;
  
  // Admin can approve everything
  if (user.roles?.includes('ADMIN')) return true;
  
  // Users with APPROVER role can approve
  if (user.roles?.includes('APPROVER')) return true;
  
  // Specific approvers can approve
  const participants = document.participants || {};
  return participants.approvers?.includes(user.id) || false;
}
