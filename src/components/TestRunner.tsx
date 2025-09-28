import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { runAllDashboardTests, type TestResult } from '@/utils/dashboardTestRunner';
import { CheckCircle, XCircle, AlertTriangle, Clock, Play, FileText } from 'lucide-react';

const TestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testingSummary, setTestingSummary] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      const results = await runAllDashboardTests();
      setTestResults(results);
      
      // Generate summary
      const passed = results.filter(r => r.status === 'PASS').length;
      const failed = results.filter(r => r.status === 'FAIL').length;
      const errors = results.filter(r => r.status === 'ERROR').length;
      
      setTestingSummary(`
Dashboard Testing Complete!

Summary:
✅ Passed: ${passed}
❌ Failed: ${failed} 
⚠️  Errors: ${errors}
📊 Total Tests: ${results.length}

Key Findings:
${results.map(r => `• ${r.testName}: ${r.status} - ${r.message}`).join('\n')}

Test completed at: ${new Date().toLocaleString()}
      `);
      
    } catch (error) {
      console.error('Test runner error:', error);
      setTestingSummary(`Test execution failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAIL': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'ERROR': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'PASS': return 'bg-green-100 text-green-800 border-green-200';
      case 'FAIL': return 'bg-red-100 text-red-800 border-red-200';
      case 'ERROR': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6" data-testid="test-runner">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Rita Dashboard Test Runner
          </CardTitle>
          <CardDescription>
            Execute comprehensive tests for dashboard metrics, permissions, and error handling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              data-testid="run-tests-button"
              className="flex items-center gap-2"
            >
              {isRunning ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setTestResults([]);
                setTestingSummary('');
              }}
              disabled={isRunning}
              data-testid="clear-results-button"
            >
              Clear Results
            </Button>
          </div>

          {testResults.length > 0 && (
            <Alert className="mb-4">
              <FileText className="w-4 h-4" />
              <AlertDescription>
                <strong>Tests completed:</strong> {testResults.filter(r => r.status === 'PASS').length} passed, 
                {testResults.filter(r => r.status === 'FAIL').length} failed, 
                {testResults.filter(r => r.status === 'ERROR').length} errors
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="summary">Summary Report</TabsTrigger>
          </TabsList>
          
          <TabsContent value="results" className="space-y-4">
            {testResults.map((result, index) => (
              <Card key={index} className={`border ${getStatusColor(result.status)}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      {result.testName}
                    </div>
                    <Badge variant="outline" className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                        View Details
                      </summary>
                      <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Test Summary Report</CardTitle>
                <CardDescription>Complete overview of dashboard testing results</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded">
                  {testingSummary || 'Run tests to generate summary report...'}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default TestRunner;