import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export function AffiliateCard() {
  return (
    <Card className="mb-4 rounded-2xl border border-border/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-medium text-foreground">Rejn weather is powered by:</span>
        </p>

        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">No one!</span> Get this spot{" "}
            <a
              href="https://rainz.net/affiliate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              here
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
