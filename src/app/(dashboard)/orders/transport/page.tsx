"use client";

import { Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TransportOrdersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Truck className="h-6 w-6" />
          Transport Orders
        </h1>
        <p className="text-muted-foreground">
          Coordinate logistics and supply runs.
        </p>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Truck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Transport orders will allow you to create delivery requests between stockpiles,
            track supply runs, and coordinate logistics with your regiment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
