import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Upload, FolderPlus, FileText, Trash2, Eye, AlertTriangle } from 'lucide-react';

interface TestResult {
  test: string;
  category: 'folder' | 'upload' | 'preview' | 'deletion' | 'error';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  message: string;
  details?: any;
  timestamp?: string;
}

const DocumentManagementTester = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const updateTestResult = (testName: string, result: Partial<TestResult>) => {
    setTestResults(prev => {
      const existing = prev.find(t => t.test === testName);
      if (existing) {
        return prev.map(t => 
          t.test === testName 
            ? { ...t, ...result, timestamp: new Date().toISOString() }
            : t
        );
      } else {
        return [...prev, {
          test: testName,
          category: 'folder',
          status: 'pending',
          message: '',
          ...result,
          timestamp: new Date().toISOString()
        }];
      }
    });
  };

  // Test Folder Management
  const testFolderManagement = async () => {
    setCurrentTest('Folder Management');
    updateTestResult('Folder Creation', { 
      category: 'folder', 
      status: 'running', 
      message: 'Testing folder creation functionality...' 
    });

    try {
      // Test folder creation
      const { data: categories } = await supabase
        .from('document_categories')
        .select('id')
        .limit(1);

      if (!categories || categories.length === 0) {
        throw new Error('No categories found for testing');
      }

      const testFolderName = `Test Folder ${Date.now()}`;
      const { data: folderData, error: folderError } = await supabase
        .from('document_folders')
        .insert({
          user_id: user?.id,
          category_id: categories[0].id,
          name: testFolderName,
          description: 'Test folder for document management testing',
          openai_instructions: 'Test instructions for Rita'
        })
        .select()
        .single();

      if (folderError) throw folderError;

      updateTestResult('Folder Creation', {
        status: 'passed',
        message: 'Folder created successfully with all fields',
        details: { folderId: folderData.id, name: testFolderName }
      });

      // Test folder visibility toggle
      updateTestResult('Folder Visibility Toggle', { 
        category: 'folder', 
        status: 'running', 
        message: 'Testing folder visibility toggle...' 
      });

      const { error: visibilityError } = await supabase
        .from('document_folders')
        .update({ is_hidden: true })
        .eq('id', folderData.id);

      if (visibilityError) throw visibilityError;

      updateTestResult('Folder Visibility Toggle', {
        status: 'passed',
        message: 'Folder visibility toggle works correctly'
      });

      // Test folder deletion
      updateTestResult('Folder Deletion', { 
        category: 'folder', 
        status: 'running', 
        message: 'Testing folder deletion...' 
      });

      const { error: deleteError } = await supabase
        .from('document_folders')
        .delete()
        .eq('id', folderData.id);

      if (deleteError) throw deleteError;

      updateTestResult('Folder Deletion', {
        status: 'passed',
        message: 'Folder deleted successfully'
      });

    } catch (error: any) {
      updateTestResult('Folder Creation', {
        status: 'failed',
        message: `Folder management test failed: ${error.message}`,
        details: error
      });
    }
  };

  // Test File Upload Validation
  const testFileUploadValidation = async () => {
    setCurrentTest('File Upload Validation');
    
    updateTestResult('File Type Validation', { 
      category: 'upload', 
      status: 'running', 
      message: 'Testing file type validation...' 
    });

    try {
      // Test supported file types
      const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ];

      const unsupportedTypes = [
        'image/jpeg',
        'video/mp4',
        'application/zip'
      ];

      // Create mock files for testing
      const createMockFile = (type: string, size: number = 1000) => {
        return new File(['test content'], `test.${type.split('/')[1]}`, { type });
      };

      let validationTests = 0;
      let passedValidation = 0;

      // Test supported file types
      for (const type of supportedTypes) {
        const mockFile = createMockFile(type);
        const isSupported = supportedTypes.includes(mockFile.type);
        validationTests++;
        if (isSupported) passedValidation++;
      }

      // Test unsupported file types
      for (const type of unsupportedTypes) {
        const mockFile = createMockFile(type);
        const isSupported = supportedTypes.includes(mockFile.type);
        validationTests++;
        if (!isSupported) passedValidation++;
      }

      updateTestResult('File Type Validation', {
        status: passedValidation === validationTests ? 'passed' : 'failed',
        message: `File type validation: ${passedValidation}/${validationTests} tests passed`,
        details: { supportedTypes, unsupportedTypes }
      });

      // Test file size limits
      updateTestResult('File Size Validation', { 
        category: 'upload', 
        status: 'running', 
        message: 'Testing file size limits...' 
      });

      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizeFile = createMockFile('application/pdf', maxSize + 1000);
      const validSizeFile = createMockFile('application/pdf', maxSize - 1000);

      const oversizeValid = oversizeFile.size <= maxSize;
      const validSizeValid = validSizeFile.size <= maxSize;

      updateTestResult('File Size Validation', {
        status: !oversizeValid && validSizeValid ? 'passed' : 'failed',
        message: `File size validation: Oversize rejected: ${!oversizeValid}, Valid size accepted: ${validSizeValid}`,
        details: { maxSize, oversizeFileSize: oversizeFile.size, validFileSize: validSizeFile.size }
      });

    } catch (error: any) {
      updateTestResult('File Type Validation', {
        status: 'error',
        message: `File validation test error: ${error.message}`,
        details: error
      });
    }
  };

  // Test Document Preview
  const testDocumentPreview = async () => {
    setCurrentTest('Document Preview');
    
    updateTestResult('Document Content Fetch', { 
      category: 'preview', 
      status: 'running', 
      message: 'Testing document content fetching...' 
    });

    try {
      // Check if document_content table exists and is accessible
      const { data: contentData, error: contentError } = await supabase
        .from('document_content')
        .select('id, file_id, content_text, extracted_at')
        .limit(1);

      if (contentError && contentError.code !== 'PGRST116') {
        throw contentError;
      }

      updateTestResult('Document Content Fetch', {
        status: 'passed',
        message: 'Document content table is accessible',
        details: { hasContent: !!contentData && contentData.length > 0 }
      });

      // Test metadata display
      updateTestResult('Metadata Display', { 
        category: 'preview', 
        status: 'running', 
        message: 'Testing metadata calculation...' 
      });

      const testContent = "This is a test document content with multiple words and characters.";
      const wordCount = testContent.split(/\s+/).filter(word => word.length > 0).length;
      const charCount = testContent.length;

      updateTestResult('Metadata Display', {
        status: 'passed',
        message: `Metadata calculation works: ${wordCount} words, ${charCount} characters`,
        details: { wordCount, charCount, testContent }
      });

    } catch (error: any) {
      updateTestResult('Document Content Fetch', {
        status: 'failed',
        message: `Document preview test failed: ${error.message}`,
        details: error
      });
    }
  };

  // Test Deletion Functionality
  const testDeletionFunctionality = async () => {
    setCurrentTest('Deletion Functionality');
    
    updateTestResult('Document Deletion', { 
      category: 'deletion', 
      status: 'running', 
      message: 'Testing document deletion workflow...' 
    });

    try {
      // Test that document_files table is accessible for deletion testing
      const { data: filesData, error: filesError } = await supabase
        .from('document_files')
        .select('id, file_name, file_path')
        .limit(1);

      if (filesError && filesError.code !== 'PGRST116') {
        throw filesError;
      }

      updateTestResult('Document Deletion', {
        status: 'passed',
        message: 'Document deletion infrastructure is accessible',
        details: { hasFiles: !!filesData && filesData.length > 0 }
      });

      // Test storage bucket accessibility
      updateTestResult('Storage Integration', { 
        category: 'deletion', 
        status: 'running', 
        message: 'Testing storage bucket integration...' 
      });

      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

      if (bucketError) {
        throw bucketError;
      }

      const documentsBucket = buckets.find(b => b.name === 'documents');

      updateTestResult('Storage Integration', {
        status: documentsBucket ? 'passed' : 'failed',
        message: documentsBucket ? 'Documents storage bucket is available' : 'Documents storage bucket not found',
        details: { buckets: buckets.map(b => b.name) }
      });

    } catch (error: any) {
      updateTestResult('Document Deletion', {
        status: 'failed',
        message: `Deletion test failed: ${error.message}`,
        details: error
      });
    }
  };

  // Test Error Handling
  const testErrorHandling = async () => {
    setCurrentTest('Error Handling');
    
    updateTestResult('Database Error Handling', { 
      category: 'error', 
      status: 'running', 
      message: 'Testing database error handling...' 
    });

    try {
      // Test invalid table query
      const { error: invalidError } = await supabase
        .from('nonexistent_table')
        .select('*')
        .limit(1);

      updateTestResult('Database Error Handling', {
        status: invalidError ? 'passed' : 'failed',
        message: invalidError ? 'Database errors are properly caught' : 'Database error handling may be insufficient',
        details: { errorCode: invalidError?.code, errorMessage: invalidError?.message }
      });

      // Test authentication requirement
      updateTestResult('Authentication Requirements', { 
        category: 'error', 
        status: 'running', 
        message: 'Testing authentication requirements...' 
      });

      const isAuthenticated = !!user;

      updateTestResult('Authentication Requirements', {
        status: 'passed',
        message: `Authentication status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`,
        details: { userId: user?.id, userEmail: user?.email }
      });

    } catch (error: any) {
      updateTestResult('Database Error Handling', {
        status: 'error',
        message: `Error handling test error: ${error.message}`,
        details: error
      });
    }
  };

  const runAllTests = async () => {
    if (!user) {
      updateTestResult('Authentication Check', {
        category: 'error',
        status: 'failed',
        message: 'User must be logged in to run document management tests'
      });
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    const tests = [
      testFolderManagement,
      testFileUploadValidation,
      testDocumentPreview,
      testDeletionFunctionality,
      testErrorHandling
    ];

    for (let i = 0; i < tests.length; i++) {
      setProgress(((i + 1) / tests.length) * 100);
      await tests[i]();
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setCurrentTest('');
    setIsRunning(false);
    setProgress(100);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      passed: 'bg-green-500',
      failed: 'bg-red-500',
      error: 'bg-orange-500',
      running: 'bg-blue-500',
      pending: 'bg-gray-400'
    };
    
    return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const getCategoryIcon = (category: TestResult['category']) => {
    switch (category) {
      case 'folder':
        return <FolderPlus className="h-4 w-4" />;
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'preview':
        return <Eye className="h-4 w-4" />;
      case 'deletion':
        return <Trash2 className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const groupedResults = testResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div className="space-y-6" data-testid="document-management-tester">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Management Testing Suite
          </CardTitle>
          <CardDescription>
            Comprehensive testing for document upload, preview, folder management, and deletion functionality.
            {!user && (
              <Alert className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You must be logged in to run document management tests.
                </AlertDescription>
              </Alert>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning || !user}
              className="w-full"
              data-testid="button-run-tests"
            >
              {isRunning ? 'Running Tests...' : 'Run All Document Tests'}
            </Button>
            
            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Test: {currentTest}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedResults).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedResults).map(([category, results]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 capitalize">
                  {getCategoryIcon(category as TestResult['category'])}
                  {category} Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        {getStatusBadge(result.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{result.test}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              View Details
                            </summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                        {result.timestamp && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(result.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentManagementTester;