import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, MessageCircle, Users, Settings, Upload, Search, Shield, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: string;
}

export function OnboardingTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Check if user has seen the tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(`tutorial-seen-${user?.id}`);
    if (!hasSeenTutorial && user) {
      setIsOpen(true);
    }
  }, [user]);

  const isAdmin = profile?.role === 'admin';

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Rita Recruit AI!',
      description: 'Your AI-powered document search and recruitment assistant',
      icon: <MessageCircle className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            Welcome to Rita Recruit AI! This platform helps you manage documents, search through them using AI, and collaborate with your team.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">What makes Rita special:</h4>
            <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
              <li>• AI-powered document search that understands context</li>
              <li>• Secure multi-tenant architecture for your organization</li>
              <li>• Easy document upload and management</li>
              <li>• Team collaboration and user management</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'documents',
      title: 'Document Management',
      description: 'Upload and organize your documents for AI-powered search',
      icon: <FileText className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <Upload className="h-6 w-6 text-green-600 mb-2" />
              <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Upload Files</h4>
              <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                <li>• PDF documents</li>
                <li>• Word files (.doc, .docx)</li>
                <li>• Excel spreadsheets</li>
                <li>• Text files and more</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <Search className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Smart Search</h4>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <li>• AI understands your questions</li>
                <li>• Finds relevant content across all docs</li>
                <li>• Provides source citations</li>
                <li>• Context-aware responses</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Go to the <strong>Documents</strong> page to start uploading your files. Rita will automatically process and index them for search.
          </p>
        </div>
      ),
      action: 'Go to Documents'
    },
    {
      id: 'chat',
      title: 'AI Chat with Rita',
      description: 'Ask questions and get intelligent answers from your documents',
      icon: <MessageCircle className="h-8 w-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">How to chat with Rita:</h4>
            <div className="space-y-2 text-sm text-purple-600 dark:text-purple-400">
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="text-xs">1</Badge>
                <span>Ask natural language questions about your documents</span>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="text-xs">2</Badge>
                <span>Rita searches through all your uploaded documents</span>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="text-xs">3</Badge>
                <span>Get intelligent answers with source citations</span>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="text-xs">4</Badge>
                <span>Follow up with additional questions for deeper insights</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border-l-4 border-purple-500">
            <p className="text-sm">
              <strong>Example questions:</strong> "What are the key requirements in the job descriptions?" or "Show me resumes with Python experience"
            </p>
          </div>
        </div>
      ),
      action: 'Try Rita Chat'
    }
  ];

  // Add admin-specific steps
  if (isAdmin) {
    tutorialSteps.push(
      {
        id: 'users',
        title: 'User Management',
        description: 'Invite team members and manage user access',
        icon: <Users className="h-8 w-8 text-orange-500" />,
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <Users className="h-6 w-6 text-orange-600 mb-2" />
                <h4 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">Invite Users</h4>
                <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
                  <li>• Send email invitations</li>
                  <li>• Set user roles (Admin/User)</li>
                  <li>• Manage organization access</li>
                  <li>• Track invitation status</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <Shield className="h-6 w-6 text-red-600 mb-2" />
                <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">User Controls</h4>
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                  <li>• Deactivate user accounts</li>
                  <li>• Remove access instantly</li>
                  <li>• Monitor user activity</li>
                  <li>• Manage permissions</li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use the <strong>Users</strong> and <strong>Managers</strong> pages to invite team members and control access to your organization's documents.
            </p>
          </div>
        ),
        action: 'Manage Users'
      },
      {
        id: 'admin',
        title: 'Admin Features',
        description: 'Access admin dashboard and organization settings',
        icon: <Settings className="h-8 w-8 text-indigo-500" />,
        content: (
          <div className="space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-3">Admin Dashboard Features:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-indigo-600 dark:text-indigo-400">
                <div>
                  <strong>Organization Settings</strong>
                  <ul className="space-y-1 ml-2">
                    <li>• Update company info</li>
                    <li>• Manage branding</li>
                    <li>• Configure limits</li>
                  </ul>
                </div>
                <div>
                  <strong>Subscription Management</strong>
                  <ul className="space-y-1 ml-2">
                    <li>• Monitor usage</li>
                    <li>• Upgrade/downgrade plans</li>
                    <li>• View billing history</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Pro Tip:</strong> Regular users only see the Chat interface, while admins have access to all management features.
              </p>
            </div>
          </div>
        ),
        action: 'Open Settings'
      }
    );
  }

  tutorialSteps.push({
    id: 'billing',
    title: 'Subscription & Billing',
    description: 'Manage your subscription and understand usage limits',
    icon: <CreditCard className="h-8 w-8 text-emerald-500" />,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
            <CreditCard className="h-6 w-6 text-emerald-600 mb-2" />
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Subscription Plans</h4>
            <ul className="text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
              <li>• <strong>Starter:</strong> $29/month</li>
              <li>• <strong>Pro:</strong> $99/month</li>
              <li>• Different usage limits</li>
              <li>• Easy plan changes</li>
            </ul>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <Badge className="mb-2">Usage Tracking</Badge>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              <li>• Document upload limits</li>
              <li>• Monthly search queries</li>
              <li>• User seat limitations</li>
              <li>• Real-time usage monitoring</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Visit the <strong>Billing</strong> page to manage your subscription, view usage, and upgrade your plan as needed.
        </p>
      </div>
    ),
    action: 'View Billing'
  });

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (user?.id) {
      localStorage.setItem(`tutorial-seen-${user.id}`, 'true');
    }
    setIsOpen(false);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'Go to Documents':
        navigate(isAdmin ? '/dashboard/documents' : '/documents');
        break;
      case 'Try Rita Chat':
        navigate(isAdmin ? '/dashboard/chat' : '/chat');
        break;
      case 'Manage Users':
        navigate(isAdmin ? '/dashboard/users' : '/users');
        break;
      case 'Open Settings':
        navigate('/organization/settings');
        break;
      case 'View Billing':
        navigate('/billing');
        break;
    }
    handleComplete();
  };

  const currentTutorialStep = tutorialSteps[currentStep];

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="onboarding-tutorial">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            {currentTutorialStep.icon}
            <div>
              <CardTitle className="text-xl">{currentTutorialStep.title}</CardTitle>
              <CardDescription>{currentTutorialStep.description}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComplete}
            data-testid="close-tutorial"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {currentTutorialStep.content}
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              data-testid="tutorial-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm text-gray-500">
              {currentStep + 1} of {tutorialSteps.length}
            </span>
            
            <div className="space-x-2">
              {currentTutorialStep.action && (
                <Button
                  variant="outline"
                  onClick={() => handleAction(currentTutorialStep.action!)}
                  data-testid="tutorial-action"
                >
                  {currentTutorialStep.action}
                </Button>
              )}
              
              {currentStep === tutorialSteps.length - 1 ? (
                <Button onClick={handleComplete} data-testid="tutorial-complete">
                  Get Started!
                </Button>
              ) : (
                <Button onClick={handleNext} data-testid="tutorial-next">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}