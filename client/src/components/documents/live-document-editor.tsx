import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, 
  FileSignature, 
  Check, 
  XCircle, 
  Download,
  History,
  MessageSquare,
  Edit,
  Eye
} from "lucide-react";
import StatusBadge from "./status-badge";
import { formatDistanceToNow } from "date-fns";

interface LiveDocumentEditorProps {
  documentId: string;
  document: any;
  onClose: () => void;
  onRefresh: () => void;
}

export default function LiveDocumentEditor({ 
  documentId, 
  document, 
  onClose, 
  onRefresh 
}: LiveDocumentEditorProps) {
  const { toast } = useToast();
  const [content, setContent] = useState(document?.content || "");
  const [title, setTitle] = useState(document?.title || "");
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (document) {
      setContent(document.content || "");
      setTitle(document.title || "");
    }
  }, [document]);

  useEffect(() => {
    const hasChanges = content !== (document?.content || "") || title !== (document?.title || "");
    setHasUnsavedChanges(hasChanges);
  }, [content, title, document]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', `/api/documents/${documentId}`, {
        title,
        content,
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Saved",
        description: "Your changes have been saved successfully.",
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      onRefresh();
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
        description: "Failed to save document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/documents/${documentId}/submit`);
    },
    onSuccess: () => {
      toast({
        title: "Document Submitted",
        description: "The document has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      onRefresh();
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
        description: "Failed to submit document. Please try again.",
        variant: "destructive",
      });
    },
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
        description: "Failed to reject document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!commentText.trim()) {
        throw new Error("Comment cannot be empty");
      }
      await apiRequest('POST', `/api/documents/${documentId}/comments`, {
        body: commentText,
      });
    },
    onSuccess: () => {
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      onRefresh();
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

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleSubmitForReview = () => {
    if (hasUnsavedChanges) {
      toast({
        title: "Unsaved Changes",
        description: "Please save your changes before submitting for review.",
        variant: "destructive",
      });
      return;
    }
    submitForReviewMutation.mutate();
  };

  const canEdit = document?.status === 'DRAFT' || document?.status === 'REJECTED';
  const canApprove = document?.status === 'IN_REVIEW' || document?.status === 'PENDING_SIGNATURE';
  const canSubmit = document?.status === 'DRAFT';

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {canEdit ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-semibold border-none p-0 h-auto focus:ring-0"
                placeholder="Document title..."
                data-testid="input-document-title"
              />
            ) : (
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            )}
            <StatusBadge status={document?.status} />
          </div>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                Unsaved Changes
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              data-testid={isEditing ? "button-view-mode" : "button-edit-mode"}
            >
              {isEditing ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              {isEditing ? "View" : "Edit"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} data-testid="button-close-editor">
              Close
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {canEdit && (
            <>
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saveMutation.isPending}
                data-testid="button-save-document"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
              {canSubmit && (
                <Button
                  variant="outline"
                  onClick={handleSubmitForReview}
                  disabled={hasUnsavedChanges || submitForReviewMutation.isPending}
                  data-testid="button-submit-review"
                >
                  <FileSignature className="w-4 h-4 mr-2" />
                  {submitForReviewMutation.isPending ? "Submitting..." : "Submit for Review"}
                </Button>
              )}
            </>
          )}
          
          {canApprove && (
            <div className="flex items-center space-x-2">
              <Textarea
                placeholder="Add notes (optional for approval, required for rejection)..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={1}
                className="max-w-xs"
                data-testid="textarea-action-notes"
              />
              <Button
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                data-testid="button-approve-document"
              >
                <Check className="w-4 h-4 mr-2" />
                {approveMutation.isPending ? "Approving..." : "Approve"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate()}
                disabled={!actionNotes.trim() || rejectMutation.isPending}
                data-testid="button-reject-document"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {rejectMutation.isPending ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Main content area */}
        <div className="flex-1 p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                Document Content
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              {canEdit && (isEditing || !content) ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your document content here..."
                  className="w-full h-full min-h-96 resize-none font-mono text-sm"
                  data-testid="textarea-document-content"
                />
              ) : (
                <div className="w-full h-full min-h-96 p-4 border rounded-md bg-gray-50">
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {content || "No content available"}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with comments and history */}
        <div className="w-80 border-l border-gray-200 bg-gray-50">
          <Tabs defaultValue="comments" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comments">
                <MessageSquare className="w-4 h-4 mr-2" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="comments" className="flex-1 p-4 space-y-4">
              {/* Add comment form */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  data-testid="textarea-new-comment"
                />
                <Button
                  size="sm"
                  onClick={() => addCommentMutation.mutate()}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  data-testid="button-add-comment"
                >
                  {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                </Button>
              </div>

              {/* Comments list */}
              <div className="space-y-3">
                {document?.comments?.map((comment: any) => (
                  <div key={comment.id} className="bg-white p-3 rounded-md border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.author?.firstName} {comment.author?.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.body}</p>
                  </div>
                )) || []}
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 p-4 space-y-4">
              <div className="space-y-3">
                {document?.versions?.map((version: any) => (
                  <div key={version.id} className="bg-white p-3 rounded-md border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900">
                        Version {version.versionNumber}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                    </p>
                    {version.changeSummary && (
                      <p className="text-sm text-gray-700">{version.changeSummary}</p>
                    )}
                  </div>
                )) || []}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}