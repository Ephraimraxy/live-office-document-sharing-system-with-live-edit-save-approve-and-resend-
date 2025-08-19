import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { List, Grid, ArrowUpDown } from "lucide-react";
import StatusBadge from "./status-badge";
import { formatDistanceToNow } from "date-fns";

interface DocumentTableProps {
  documents: any[];
  departments: any[];
  filters: {
    status: string;
    department: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
  onDocumentSelect: (id: string) => void;
  onRefresh: () => void;
}

export default function DocumentTable({
  documents,
  departments,
  filters,
  onFiltersChange,
  onDocumentSelect,
  onRefresh,
}: DocumentTableProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const getFileIcon = (title: string) => {
    const ext = title.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      default:
        return '📄';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getUserInitials = (owner: any) => {
    if (!owner) return 'U';
    return owner.initials || 'U';
  };

  return (
    <div className="space-y-6">
      {/* Filter and sort controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter by status:</label>
              <Select
                value={filters.status}
                onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
              >
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="PENDING_SIGNATURE">Pending Signature</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Department:</label>
              <Select
                value={filters.department}
                onValueChange={(value) => onFiltersChange({ ...filters, department: value })}
              >
                <SelectTrigger className="w-48" data-testid="select-department-filter">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              data-testid="button-list-view"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              data-testid="button-grid-view"
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Documents table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>
                  <Button variant="ghost" className="h-auto p-0 font-semibold text-gray-600">
                    Document
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-gray-600 font-semibold">Status</TableHead>
                <TableHead className="text-gray-600 font-semibold">Department</TableHead>
                <TableHead className="text-gray-600 font-semibold">Owner</TableHead>
                <TableHead>
                  <Button variant="ghost" className="h-auto p-0 font-semibold text-gray-600">
                    Last Updated
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-gray-600 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No documents found. Create your first document to get started.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((document) => (
                  <TableRow 
                    key={document.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onDocumentSelect(document.id)}
                    data-testid={`row-document-${document.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm">{getFileIcon(document.title)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900" data-testid={`text-document-title-${document.id}`}>
                            {document.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            Version {document.currentVersion}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={document.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {departments.find(d => d.id === document.departmentId)?.name || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {getUserInitials(document.owner)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {document.owner?.name || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {formatTimeAgo(document.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="link" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/documents/${document.id}`;
                          }}
                          data-testid={`button-edit-live-${document.id}`}
                        >
                          Live Edit
                        </Button>
                        <Button 
                          variant="link" 
                          size="sm"
                          className="text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle download
                          }}
                          data-testid={`button-download-${document.id}`}
                        >
                          Download
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {documents.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{' '}
              <span className="font-medium">{documents.length}</span> of{' '}
              <span className="font-medium">{documents.length}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled data-testid="button-previous-page">
                Previous
              </Button>
              <Button variant="default" size="sm" data-testid="button-page-1">
                1
              </Button>
              <Button variant="outline" size="sm" disabled data-testid="button-next-page">
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
