import { Search, Plus, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle: string;
  onCreateDocument: () => void;
  onSearch: (query: string) => void;
}

export default function Header({ title, subtitle, onCreateDocument, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Search bar */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-80 pl-10"
              data-testid="input-search"
            />
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          {/* Create document button */}
          <Button
            onClick={onCreateDocument}
            className="bg-primary text-white hover:bg-blue-700"
            data-testid="button-create-document"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
          
          {/* Notifications */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              className="relative"
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
