import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Clock, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">DocFlow</span>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Streamline Your
            <span className="text-primary"> Document Workflows</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
            Professional document management with role-based access control, approval workflows, 
            and comprehensive audit trails. Built for modern teams.
          </p>
          <div className="mt-8">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need</h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful features to manage your document workflows efficiently
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="text-center">
                <FileText className="w-8 h-8 text-primary mx-auto" />
                <CardTitle className="mt-4">Document Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Upload, version, and organize documents with powerful search and filtering capabilities.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Users className="w-8 h-8 text-primary mx-auto" />
                <CardTitle className="mt-4">Role-Based Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Control who can view, edit, review, and approve documents with granular permissions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Clock className="w-8 h-8 text-primary mx-auto" />
                <CardTitle className="mt-4">Workflow Automation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Automate approval processes with customizable workflows and task assignments.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="w-8 h-8 text-primary mx-auto" />
                <CardTitle className="mt-4">Audit & Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Complete audit trails and compliance features to track all document activities.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-primary rounded-2xl">
          <div className="px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">
                Ready to get started?
              </h2>
              <p className="mt-4 text-lg text-blue-100">
                Join teams who trust DocFlow for their document management needs.
              </p>
              <div className="mt-8">
                <Button 
                  variant="secondary" 
                  size="lg"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-sign-up"
                >
                  Sign Up Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200 py-8">
            <div className="text-center text-sm text-gray-500">
              © 2024 DocFlow. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
