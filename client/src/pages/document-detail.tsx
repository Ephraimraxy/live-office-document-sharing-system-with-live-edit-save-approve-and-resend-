import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useEffect } from "react";
import LiveDocumentEditor from "@/components/documents/live-document-editor";

export default function DocumentDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [match, params] = useRoute("/documents/:id");
  
  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: document, refetch: refetchDocument, isLoading: isLoadingDocument } = useQuery<any>({
    queryKey: ['/api/documents', params?.id],
    enabled: isAuthenticated && !!params?.id,
    retry: false,
  });

  const handleRefresh = () => {
    refetchDocument();
  };

  const handleClose = () => {
    window.location.href = "/dashboard";
  };

  if (isLoading || isLoadingDocument) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
          <p className="text-gray-600 mb-4">The document you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={handleClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <LiveDocumentEditor
        documentId={params?.id!}
        document={document}
        onClose={handleClose}
        onRefresh={handleRefresh}
      />
    </div>
  );
}