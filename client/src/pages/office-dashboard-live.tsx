import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, MessageSquare, LogOut, Bell, Mail, Archive } from "lucide-react";

// Custom hook for office session management
const useOfficeSession = () => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [officeData, setOfficeData] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("officeSessionToken");
    const office = localStorage.getItem("officeData");
    
    if (token && office) {
      setSessionToken(token);
      setOfficeData(JSON.parse(office));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("officeSessionToken");
    localStorage.removeItem("officeData");
    setSessionToken(null);
    setOfficeData(null);
  };

  return { sessionToken, officeData, logout };
};

// Custom query client for office API calls
const useOfficeQuery = (endpoint: string, enabled: boolean = true) => {
  const { sessionToken } = useOfficeSession();
  
  return useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      if (!sessionToken) throw new Error("No session token");
      
      const response = await fetch(endpoint, {
        headers: {
          'x-office-session': sessionToken,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: enabled && !!sessionToken,
  });
};

export function OfficeDashboardLive() {
  const { officeId } = useParams<{ officeId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sessionToken, officeData, logout } = useOfficeSession();

  // Redirect to login if no session
  useEffect(() => {
    if (!sessionToken || !officeData) {
      setLocation('/office-login');
    }
  }, [sessionToken, officeData, setLocation]);

  const { data: dashboardData, isLoading, error } = useOfficeQuery(
    `/api/office-dashboard/${officeId}`,
    !!officeId
  );

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!sessionToken) return;
      
      const response = await fetch('/api/office/logout', {
        method: 'POST',
        headers: {
          'x-office-session': sessionToken,
        },
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation('/office-login');
    },
    onError: (error: any) => {
      toast({
        title: "Logout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/office-messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'x-office-session': sessionToken!,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark message as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/office-dashboard/${officeId}`] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading office dashboard...</div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Error</h3>
            <p className="text-muted-foreground text-center mb-4">
              Unable to access office dashboard. Please check your session.
            </p>
            <Button onClick={() => setLocation('/office-login')}>
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { office, messages, members, stats } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 mr-3 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{office.name}</h1>
                <p className="text-sm text-gray-500">Office ID: {office.officeId}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Office description */}
        {office.description && (
          <div className="mb-8">
            <p className="text-gray-600">{office.description}</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">Active office members</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">Total messages</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.unreadMessages}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Office Status</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground">Online now</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Messages Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Messages & Memos
              </CardTitle>
              <CardDescription>
                Office-specific messages and general announcements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messages && messages.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((message: any) => {
                    const isRead = message.isRead && message.isRead[`office_${officeId}`];
                    return (
                      <div
                        key={message.id}
                        className={`p-4 border rounded-lg ${
                          isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{message.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={message.messageType === 'general_memo' ? 'default' : 'secondary'}
                            >
                              {message.messageType === 'general_memo' ? 'General' : 'Office'}
                            </Badge>
                            {message.priority === 'high' && (
                              <Badge variant="destructive">High Priority</Badge>
                            )}
                            {!isRead && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsReadMutation.mutate(message.id)}
                                disabled={markAsReadMutation.isPending}
                              >
                                <Archive className="w-3 h-3 mr-1" />
                                Mark Read
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{message.content}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No messages</h3>
                  <p className="text-muted-foreground">
                    No messages have been sent to this office yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Office Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Office Members
              </CardTitle>
              <CardDescription>People assigned to this office</CardDescription>
            </CardHeader>
            <CardContent>
              {members && members.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {members.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                          {member.firstName?.[0] || member.email?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {member.firstName && member.lastName 
                              ? `${member.firstName} ${member.lastName}`
                              : member.email
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {member.roles?.map((role: string) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No members</h3>
                  <p className="text-muted-foreground">
                    No members have been assigned to this office yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}