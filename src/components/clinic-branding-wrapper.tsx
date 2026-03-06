"use client";

import { ReactNode } from "react";

interface ClinicBrandingWrapperProps {
  children: ReactNode;
  primaryColor?: string;
  secondaryColor?: string;
}

export function ClinicBrandingWrapper({
  children,
  primaryColor = "#2563EB",
  secondaryColor = "#1E40AF",
}: ClinicBrandingWrapperProps) {
  return (
    <div
      style={
        {
          "--clinic-primary": primaryColor,
          "--clinic-secondary": secondaryColor,
        } as React.CSSProperties
      }
      className="min-h-screen"
    >
      {children}
    </div>
  );
}
