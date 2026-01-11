import { Map } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Cities Page
 *
 * Shows all cities/hexes where stockpiles can be located.
 * (Placeholder - will be implemented in Phase 2)
 */

export default function CitiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Map className="h-6 w-6" />
            Cities
          </h1>
          <p className="text-muted-foreground">
            Manage locations where stockpiles can be stored
          </p>
        </div>
        <Button>Add City</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Cities Configured</CardTitle>
          <CardDescription>
            Add cities to organize your stockpiles by location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Map className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Cities will be added automatically when you save stockpile data
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
