import { Layout } from "@/components/Layout";
import TestRunner from "@/components/TestRunner";
import DashboardTester from "@/components/DashboardTester";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DashboardTest = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-foreground mb-3">Dashboard Testing Suite</h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive testing for metrics loading, permissions, and error boundaries
          </p>
        </div>
        
        <Tabs defaultValue="runner" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="runner">Test Runner</TabsTrigger>
            <TabsTrigger value="interactive">Interactive Tester</TabsTrigger>
          </TabsList>
          
          <TabsContent value="runner" className="space-y-4">
            <TestRunner />
          </TabsContent>
          
          <TabsContent value="interactive" className="space-y-4">
            <DashboardTester />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DashboardTest;