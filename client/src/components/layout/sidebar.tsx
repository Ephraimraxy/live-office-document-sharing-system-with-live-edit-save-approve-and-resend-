import { FileText, FolderOpen, Clock, BarChart3, Users, Building, History, LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  user?: any;
  pendingTasksCount: number;
  currentPage: string;
}

export default function Sidebar({ user, pendingTasksCount, currentPage }: SidebarProps) {
  const isAdmin = user?.roles?.includes('ADMIN');
  
  const getUserInitials = (user: any) => {
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  const getUserDisplayName = (user: any) => {
    if (!user) return 'User';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email || 'User';
  };

  const getUserRole = (user: any) => {
    if (!user?.roles?.length) return 'User';
    return user.roles[0];
  };

  const navItems = [
    {
      id: 'documents',
      icon: FolderOpen,
      label: 'Documents',
      href: '/',
      active: currentPage === 'documents',
    },
    {
      id: 'tasks',
      icon: Clock,
      label: 'My Tasks',
      href: '/tasks',
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'workflows',
      icon: BarChart3,
      label: 'Workflows',
      href: '/workflows',
    },
    {
      id: 'reports',
      icon: BarChart3,
      label: 'Reports',
      href: '/reports',
    },
  ];

  const adminItems = [
    {
      id: 'users',
      icon: Users,
      label: 'User Management',
      href: '/admin/users',
    },
    {
      id: 'offices',
      icon: Building,
      label: 'Office Management',
      href: '/admin/offices',
    },
    {
      id: 'messages',
      icon: MessageSquare,
      label: 'Message Center',
      href: '/admin/messages',
    },
    {
      id: 'departments',
      icon: Building,
      label: 'Departments',
      href: '/admin/departments',
    },
    {
      id: 'audit',
      icon: History,
      label: 'Audit Logs',
      href: '/admin/audit',
    },
  ];

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo and branding */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">DocFlow</span>
        </div>
      </div>

      {/* User profile section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {getUserInitials(user)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {getUserDisplayName(user)}
            </p>
            <p className="text-xs text-gray-500">{getUserRole(user)}</p>
          </div>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active || currentPage === item.id;
          
          return (
            <a
              key={item.id}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid={`link-${item.id}`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto bg-warning text-white">
                  {item.badge}
                </Badge>
              )}
            </a>
          );
        })}
        
        {/* Admin-only section */}
        {isAdmin && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-3">
              Administration
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium"
                  data-testid={`link-admin-${item.id}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        )}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:bg-gray-100"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}
