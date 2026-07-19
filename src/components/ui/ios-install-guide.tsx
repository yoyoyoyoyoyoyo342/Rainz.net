import { Share, Plus, Home } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface IOSInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IOSInstallGuide({ open, onOpenChange }: IOSInstallGuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Install Rejn on iPhone</DialogTitle>
          <DialogDescription>
            Push notifications only work when Rejn is installed to your home screen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium mb-1">Tap the Share button</p>
              <p className="text-sm text-muted-foreground">
                At the bottom of Safari, tap the <Share className="inline w-4 h-4 mx-1" /> Share icon
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium mb-1">Add to Home Screen</p>
              <p className="text-sm text-muted-foreground">
                Scroll down and tap "Add to Home Screen" <Plus className="inline w-4 h-4 mx-1" />
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium mb-1">Open from Home Screen</p>
              <p className="text-sm text-muted-foreground">
                Find the Rejn icon <Home className="inline w-4 h-4 mx-1" /> on your home screen and open it from there
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <p className="font-medium mb-1">Enable Notifications</p>
              <p className="text-sm text-muted-foreground">
                Once opened from your home screen, you can enable notifications in Settings
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Important:</strong> Notifications only work when you open Rejn from your home screen, not from Safari.
            </p>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
