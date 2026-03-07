"use client";

import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Service", step: 1 },
  { label: "Dentist", step: 2 },
  { label: "Schedule", step: 3 },
  { label: "Details", step: 4 },
  { label: "Payment", step: 5 },
  { label: "Done", step: 6 },
];

interface BookingProgressProps {
  currentStep: number;
}

export function BookingProgress({ currentStep }: BookingProgressProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {STEPS.map(({ label, step }, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500 ease-in-out",
                    isCompleted
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-100"
                      : isCurrent
                        ? "border-2 border-primary bg-primary/10 text-primary shadow-sm shadow-primary/15 scale-110"
                        : "border-2 border-muted-foreground/20 bg-muted/50 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-4 w-4 animate-in fade-in zoom-in duration-300" />
                  ) : (
                    <span className="transition-colors duration-300">{step}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium transition-all duration-300 sm:text-xs",
                    isCurrent
                      ? "text-primary font-semibold"
                      : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  )}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="relative mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-muted-foreground/10 sm:mx-3">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700 ease-in-out",
                      step < currentStep ? "w-full" : step === currentStep ? "w-1/2 bg-primary/50" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
