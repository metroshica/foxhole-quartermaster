"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ shortId: string }>;
}

export default function ShortUrlRedirectPage({ params }: PageProps) {
  const { shortId } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function lookupOrder() {
      try {
        const response = await fetch(`/api/orders/production/by-short-id/${shortId}`);
        if (response.ok) {
          const data = await response.json();
          // Redirect to the full detail page
          router.replace(`/orders/production/${data.id}`);
        } else if (response.status === 404) {
          setError("Order not found");
        } else {
          setError("Failed to load order");
        }
      } catch (err) {
        setError("Failed to load order");
      }
    }
    lookupOrder();
  }, [shortId, router]);

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/orders/production")}
            >
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
