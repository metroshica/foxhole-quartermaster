import { Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Stockpiles List Page
 *
 * Shows all stockpiles grouped by city.
 * (Placeholder - will be implemented in Phase 2)
 */

export default function StockpilesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Stockpiles
          </h1>
          <p className="text-muted-foreground">
            View and manage your regiment&apos;s stockpiles
          </p>
        </div>
        <Button>Add Stockpile</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Stockpiles Yet</CardTitle>
          <CardDescription>
            Start by uploading a stockpile screenshot to create your first stockpile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Stockpiles will appear here once you&apos;ve uploaded inventory data
            </p>
            <Button asChild>
              <Link href="/upload">Upload Screenshot</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
