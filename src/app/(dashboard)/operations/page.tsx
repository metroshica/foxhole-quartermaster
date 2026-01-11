import { Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Operations Page
 *
 * Shows planned and active operations with equipment requirements.
 * (Placeholder - will be implemented in Phase 3)
 */

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6" />
            Operations
          </h1>
          <p className="text-muted-foreground">
            Plan operations and track equipment requirements
          </p>
        </div>
        <Button>New Operation</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Operations Planned</CardTitle>
          <CardDescription>
            Create an operation to define equipment requirements and see gap analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Operations help you plan logistics by comparing requirements against available stockpiles
            </p>
            <Button>Create Operation</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
