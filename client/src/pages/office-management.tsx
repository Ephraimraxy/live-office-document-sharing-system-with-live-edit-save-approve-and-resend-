import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2, Users, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const createOfficeSchema = z.object({
  officeId: z.string().min(1, "Office ID is required"),
  name: z.string().min(1, "Office name is required"),
  description: z.string().optional(),
  officeCode: z.string().min(3, "Office code must be at least 3 characters"),
  officePassword: z.string().min(6, "Password must be at least 6 characters"),
  departmentId: z.string().optional(),
});

type CreateOfficeData = z.infer<typeof createOfficeSchema>;

export function OfficeManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateOfficeData>({
    resolver: zodResolver(createOfficeSchema),
    defaultValues: {
      officeId: "",
      name: "",
      description: "",
      officeCode: "",
      officePassword: "",
    },
  });

  const { data: offices, isLoading } = useQuery({
    queryKey: ["/api/offices"],
  });

  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
  });

  const createOfficeMutation = useMutation({
    mutationFn: async (data: CreateOfficeData) => {
      const response = await fetch("/api/offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create office");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Office created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOfficeMutation = useMutation({
    mutationFn: async (officeId: string) => {
      const response = await fetch(`/api/offices/${officeId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete office");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      toast({
        title: "Success",
        description: "Office deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateOfficeData) => {
    createOfficeMutation.mutate(data);
  };

  const handleDeleteOffice = (officeId: string) => {
    if (confirm("Are you sure you want to delete this office?")) {
      deleteOfficeMutation.mutate(officeId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading offices...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Office Management</h1>
          <p className="text-muted-foreground">Create and manage office locations for your organization</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Office
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Office</DialogTitle>
              <DialogDescription>
                Add a new office location for your organization
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="officeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., NYC-001, LON-HQ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., New York Headquarters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Office description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="officeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Access Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., NYC001, LON001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="officePassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Login Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter secure password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createOfficeMutation.isPending}>
                    {createOfficeMutation.isPending ? "Creating..." : "Create Office"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {offices && offices.length > 0 ? (
          offices.map((office: any) => (
            <Card key={office.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    {office.name}
                  </CardTitle>
                  <CardDescription>
                    Office ID: {office.officeId} | Code: {office.officeCode}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteOffice(office.id)}
                    disabled={deleteOfficeMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {office.description && (
                  <p className="text-muted-foreground mb-4">{office.description}</p>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  {office.members?.length || 0} members
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No offices found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by creating your first office location
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Office
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}