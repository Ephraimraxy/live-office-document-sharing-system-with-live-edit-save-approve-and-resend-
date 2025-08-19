import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import { OfficeManagement } from "@/pages/office-management";
import { OfficeDashboard } from "@/pages/office-dashboard";
import { OfficeLogin } from "@/pages/office-login";
import { OfficeDashboardLive } from "@/pages/office-dashboard-live";
import { AdminMessaging } from "@/pages/admin-messaging";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes for office access */}
      <Route path="/office-login" component={OfficeLogin} />
      <Route path="/office-dashboard/:officeId" component={OfficeDashboardLive} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/admin/offices" component={OfficeManagement} />
          <Route path="/admin/messages" component={AdminMessaging} />
          <Route path="/office/:officeId" component={OfficeDashboard} />
          {/* Add more authenticated routes here */}
          {/* <Route path="/tasks" component={Tasks} /> */}
          {/* <Route path="/workflows" component={Workflows} /> */}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
