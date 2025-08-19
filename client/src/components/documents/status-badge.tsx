import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Pen, Archive, FileText } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return {
          icon: FileText,
          label: 'Draft',
          className: 'bg-gray-100 text-gray-800',
        };
      case 'IN_REVIEW':
        return {
          icon: Clock,
          label: 'In Review',
          className: 'bg-orange-100 text-orange-800',
        };
      case 'PENDING_SIGNATURE':
        return {
          icon: Pen,
          label: 'Pending Signature',
          className: 'bg-blue-100 text-blue-800',
        };
      case 'APPROVED':
        return {
          icon: CheckCircle,
          label: 'Approved',
          className: 'bg-green-100 text-green-800',
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          label: 'Rejected',
          className: 'bg-red-100 text-red-800',
        };
      case 'ARCHIVED':
        return {
          icon: Archive,
          label: 'Archived',
          className: 'bg-gray-100 text-gray-800',
        };
      default:
        return {
          icon: FileText,
          label: status,
          className: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={`inline-flex items-center text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
