"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Foxhole Quartermaster!",
    description: "Your regiment's logistics management tool",
    content: (
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">
          Quartermaster helps you track stockpile inventories and coordinate
          production orders with your regiment.
        </p>
        <p className="text-base text-muted-foreground">
          Let&apos;s show you the key features in just a few steps.
        </p>
      </div>
    ),
    image: "/images/tutorial/dashboard-overview.png",
  },
  {
    title: "Keeping Stockpiles Updated",
    description: "Use Quick Scan to update inventory",
    content: (
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">
          From the main dashboard, simply press{" "}
          <kbd className="rounded bg-muted px-2 py-1">Ctrl+V</kbd> with a
          stockpile screenshot in your clipboard. No need to click anything
          first - just paste and go!
        </p>

        {/* Critical Warning Box */}
        <div className="rounded-lg border-2 border-amber-500 bg-amber-500/10 p-5">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-7 w-7 shrink-0 text-amber-500" />
            <div>
              <h4 className="text-lg font-semibold text-amber-500">
                Screenshots MUST be fullscreen!
              </h4>
              <p className="mt-2 text-base text-muted-foreground">
                The scanner uses template matching to identify item icons. If
                your screenshot isn&apos;t fullscreen, the icons will be the
                wrong size and detection will fail.
              </p>
              <p className="mt-3 text-base font-medium">
                Use the Windows Snipping Tool (
                <kbd className="rounded bg-muted px-2 py-1">
                  Win + Shift + S
                </kbd>
                ) and select <strong>&quot;Window&quot;</strong> mode to capture
                the full Foxhole window.
              </p>
            </div>
          </div>
        </div>

        <p className="text-base text-muted-foreground">
          The scanner will automatically detect the stockpile name and match it
          to your existing stockpiles.
        </p>
      </div>
    ),
    image: "/images/tutorial/fullscreen.png",
  },
  {
    title: "Fulfilling Production Orders",
    description: "Track what your regiment is building",
    content: (
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">
          Production Orders help coordinate what items your regiment needs to
          manufacture.
        </p>

        <div className="space-y-3">
          <h4 className="text-base font-medium">How to update progress:</h4>
          <ol className="list-inside list-decimal space-y-2 text-base text-muted-foreground">
            <li>Navigate to the Production Orders page from the sidebar</li>
            <li>Click on an order to see the items needed</li>
            <li>
              Use the <strong>+/-</strong> buttons or type directly to update
              quantities
            </li>
            <li>Progress auto-saves as you type</li>
          </ol>
        </div>

        <p className="text-base text-muted-foreground">
          Your contributions are tracked and shown on the leaderboard!
        </p>
      </div>
    ),
    image: null,
  },
  {
    title: "You're All Set!",
    description: "Start managing your regiment's logistics",
    content: (
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">
          You now know the basics of Quartermaster. Here&apos;s a quick recap:
        </p>

        <ul className="list-inside list-disc space-y-2 text-base text-muted-foreground">
          <li>
            <strong>Quick Scan:</strong> Paste fullscreen stockpile screenshots
            with Ctrl+V
          </li>
          <li>
            <strong>Production Orders:</strong> Track items being manufactured
          </li>
          <li>
            <strong>Leaderboards:</strong> See who&apos;s contributing the most
          </li>
        </ul>

        <p className="mt-4 text-base text-muted-foreground">
          Click the{" "}
          <span className="inline-flex items-center justify-center rounded-full border bg-muted px-2.5 py-1 text-sm font-medium">
            ?
          </span>{" "}
          button in the header anytime to see this tutorial again.
        </p>

        <p className="text-lg font-medium text-primary">Happy logistics!</p>
      </div>
    ),
    image: null,
  },
];

export function TutorialModal({
  isOpen,
  onClose,
  onComplete,
}: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleSkip = () => {
    onComplete();
  };

  // Reset step when modal opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
    if (open) {
      setCurrentStep(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{step.title}</DialogTitle>
          <DialogDescription className="text-base">{step.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step content */}
          {step.content}

          {/* Screenshot */}
          {step.image && (
            <div className="relative w-full overflow-hidden rounded-lg border-2 border-border bg-black/50 p-2">
              <div className="relative">
                <Image
                  src={step.image}
                  alt={step.title}
                  width={800}
                  height={450}
                  className="h-auto w-full rounded"
                  style={{ maxHeight: "500px", objectFit: "contain" }}
                />
              </div>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex justify-center gap-2">
            {TUTORIAL_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {!isLastStep && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip tutorial
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
