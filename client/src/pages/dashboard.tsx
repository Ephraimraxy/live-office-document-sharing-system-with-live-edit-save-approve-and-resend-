import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import DocumentTable from "@/components/documents/document-table";
import DocumentDetailPanel from "@/components/documents/document-detail-panel";
import CreateDocumentModal from "@/components/documents/create-document-modal";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    search: '',
  });

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

  const { data: documents = [], refetch: refetchDocuments } = useQuery<any[]>({
    queryKey: ['/api/documents', filters],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['/api/departments'],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['/api/tasks'],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const pendingTasksCount = tasks.filter((task: any) => task.state === 'OPEN').length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        user={user} 
        pendingTasksCount={pendingTasksCount}
        currentPage="documents"
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Documents"
          subtitle="Manage and track document workflows"
          onCreateDocument={() => setIsCreateModalOpen(true)}
          onSearch={(search) => setFilters({ ...filters, search })}
        />
        
        <div className="flex-1 overflow-auto p-6">
          <DocumentTable 
            documents={documents}
            departments={departments}
            filters={filters}
            onFiltersChange={setFilters}
            onDocumentSelect={setSelectedDocumentId}
            onRefresh={refetchDocuments}
          />
        </div>
      </main>

      {selectedDocumentId && (
        <DocumentDetailPanel 
          documentId={selectedDocumentId}
          onClose={() => setSelectedDocumentId(null)}
          onRefresh={refetchDocuments}
        />
      )}

      <CreateDocumentModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        departments={departments}
        onSuccess={() => {
          refetchDocuments();
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}
