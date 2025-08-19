import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CloudUpload, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const formSchema = insertDocumentSchema.extend({
  reviewers: z.array(z.string()).optional(),
  approvers: z.array(z.string()).optional(),
  file: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: any[];
  onSuccess: () => void;
}

export default function CreateDocumentModal({ isOpen, onClose, departments, onSuccess }: CreateDocumentModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      departmentId: '',
      participants: {
        editors: [],
        reviewers: [],
        approvers: [],
        viewers: [],
      },
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // First create the document
      const documentResponse = await apiRequest('POST', '/api/documents', {
        title: data.title,
        departmentId: data.departmentId,
        participants: {
          editors: [],
          reviewers: selectedReviewers,
          approvers: selectedApprovers,
          viewers: [],
        },
      });

      const document = await documentResponse.json();

      // Then upload the file if provided
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('changeSummary', 'Initial version');

        await fetch(`/api/documents/${document.id}/versions`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
      }

      return document;
    },
    onSuccess: () => {
      toast({
        title: "Document Created",
        description: "Your document has been created successfully.",
      });
      handleClose();
      onSuccess();
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
        description: "Failed to create document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    reset();
    setSelectedFile(null);
    setSelectedReviewers([]);
    setSelectedApprovers([]);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, DOC, DOCX, or TXT file.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const onSubmit = (data: FormData) => {
    createDocumentMutation.mutate(data);
  };

  // Mock users for reviewers/approvers selection
  const mockUsers = [
    { id: 'user1', name: 'Mike Johnson', role: 'HR Manager' },
    { id: 'user2', name: 'Lisa Wilson', role: 'Finance Director' },
    { id: 'user3', name: 'Anna Silva', role: 'Legal Counsel' },
    { id: 'user4', name: 'Robert Brown', role: 'Operations Manager' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-create-document">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Document</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} data-testid="button-close-modal">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Document Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter document title"
              data-testid="input-title"
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="department">Department</Label>
            <Select onValueChange={(value) => setValue('departmentId', value)}>
              <SelectTrigger data-testid="select-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.departmentId && (
              <p className="text-sm text-red-600 mt-1">{errors.departmentId.message}</p>
            )}
          </div>
          
          <div>
            <Label>Upload Document</Label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <CloudUpload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-blue-500 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input 
                      type="file" 
                      className="sr-only" 
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      data-testid="input-file"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>
                {selectedFile && (
                  <p className="text-sm text-green-600 font-medium">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <Label>Assign Reviewers</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 mt-1">
              {mockUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`reviewer-${user.id}`}
                    checked={selectedReviewers.includes(user.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedReviewers([...selectedReviewers, user.id]);
                      } else {
                        setSelectedReviewers(selectedReviewers.filter(id => id !== user.id));
                      }
                    }}
                    data-testid={`checkbox-reviewer-${user.id}`}
                  />
                  <Label htmlFor={`reviewer-${user.id}`} className="text-sm text-gray-700">
                    {user.name} ({user.role})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Assign Approvers</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 mt-1">
              {mockUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`approver-${user.id}`}
                    checked={selectedApprovers.includes(user.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedApprovers([...selectedApprovers, user.id]);
                      } else {
                        setSelectedApprovers(selectedApprovers.filter(id => id !== user.id));
                      }
                    }}
                    data-testid={`checkbox-approver-${user.id}`}
                  />
                  <Label htmlFor={`approver-${user.id}`} className="text-sm text-gray-700">
                    {user.name} ({user.role})
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-primary text-white hover:bg-blue-700"
              disabled={createDocumentMutation.isPending}
              data-testid="button-create"
            >
              {createDocumentMutation.isPending ? 'Creating...' : 'Create Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
