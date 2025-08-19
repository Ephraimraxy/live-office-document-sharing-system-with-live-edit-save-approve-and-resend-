import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Check, Edit, XCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import StatusBadge from "./status-badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";

interface DocumentDetailPanelProps {
  documentId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function DocumentDetailPanel({ documentId, onClose, onRefresh }: DocumentDetailPanelProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  const { data: document, isLoading } = useQuery<any>({
    queryKey: ['/api/documents', documentId],
    enabled: !!documentId,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/documents/${documentId}/approve`, {
        notes: actionNotes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Approved",
        description: "The document has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      onRefresh();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!actionNotes.trim()) {
        throw new Error("Rejection reason is required");
      }
      await apiRequest('POST', `/api/documents/${documentId}/reject`, {
        reason: actionNotes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Rejected",
        description: "The document has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      onRefresh();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to reject document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/documents/${documentId}/comments`, {
        body: commentText,
      });
    },
    onSuccess: () => {
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['/api/documents', documentId] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="w-96 bg-white shadow-lg border-l border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="w-96 bg-white shadow-lg border-l border-gray-200 flex items-center justify-center">
        <p className="text-gray-500">Document not found</p>
      </div>
    );
  }

  const canApprove = document.status === 'IN_REVIEW' || document.status === 'PENDING_SIGNATURE';
  const commentsCount = document.comments?.length || 0;

  return (
    <div className="w-96 bg-white shadow-lg border-l border-gray-200 flex flex-col">
      {/* Document header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate" data-testid="text-document-title">
              {document.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Version {document.versions?.[0]?.versionNumber || '1.0'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            data-testid="button-close-panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Status and workflow actions */}
        <div className="mt-4">
          <div className="flex items-center space-x-2 mb-4">
            <StatusBadge status={document.status} />
            <span className="text-xs text-gray-500">
              Updated {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}
            </span>
          </div>

          {/* Workflow actions */}
          {canApprove && (
            <div className="space-y-2">
              <Textarea
                placeholder="Add notes (optional for approval, required for rejection)..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={2}
                data-testid="textarea-action-notes"
              />
              <div className="flex space-x-2">
                <Button
                  className="flex-1 bg-success text-white hover:bg-green-700"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  className="flex-1 bg-error text-white hover:bg-red-700"
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending || !actionNotes.trim()}
                  data-testid="button-reject"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document details tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="details" className="flex-1 flex flex-col">
          <div className="border-b border-gray-200">
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
              <TabsTrigger 
                value="details" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-details"
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="versions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-versions"
              >
                Versions
              </TabsTrigger>
              <TabsTrigger 
                value="comments"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-comments"
              >
                Comments
                {commentsCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {commentsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="audit"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-audit"
              >
                Audit
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="details" className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Document Information</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Owner</dt>
                    <dd className="text-sm text-gray-900">
                      {document.owner ? 
                        `${document.owner.firstName || ''} ${document.owner.lastName || ''}`.trim() || document.owner.email :
                        'Unknown'
                      }
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Department</dt>
                    <dd className="text-sm text-gray-900">
                      {document.departmentId || 'Unknown'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Created</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(document.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  {document.dueAt && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Due Date</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(document.dueAt).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Participants */}
              {document.participants && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Participants</h3>
                  <div className="space-y-3">
                    {document.participants.reviewers?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reviewers</p>
                        <div className="mt-1 space-y-1">
                          {document.participants.reviewers.map((reviewerId: string) => (
                            <div key={reviewerId} className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-700">
                                  {reviewerId.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm text-gray-900">{reviewerId}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {document.participants.approvers?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approvers</p>
                        <div className="mt-1 space-y-1">
                          {document.participants.approvers.map((approverId: string) => (
                            <div key={approverId} className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-700">
                                  {approverId.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm text-gray-900">{approverId}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="versions" className="p-6">
              <div className="space-y-4">
                {document.versions?.length > 0 ? (
                  document.versions.map((version: any) => (
                    <div key={version.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Version {version.versionNumber}</p>
                          <p className="text-sm text-gray-500">
                            {version.fileName} • {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                          </p>
                          {version.changeSummary && (
                            <p className="text-sm text-gray-600 mt-1">{version.changeSummary}</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" data-testid={`button-download-version-${version.id}`}>
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No versions available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="p-6 space-y-4">
              {/* Add comment form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  data-testid="textarea-comment"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={() => addCommentMutation.mutate()}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    data-testid="button-add-comment"
                  >
                    Add Comment
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-4">
                {document.comments?.length > 0 ? (
                  document.comments.map((comment: any) => (
                    <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-gray-700">
                            {comment.authorUid.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">{comment.authorUid}</p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{comment.body}</p>
                          {comment.resolved && (
                            <span className="text-xs text-green-600 font-medium mt-2 block">✓ Resolved</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No comments yet</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="audit" className="p-6">
              <div className="space-y-4">
                {document.workflow?.history?.length > 0 ? (
                  document.workflow.history.map((entry: any, index: number) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">by {entry.byUid}</p>
                      {entry.meta && (
                        <p className="text-xs text-gray-500 mt-1">
                          {JSON.stringify(entry.meta)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No audit history available</p>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
