"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, ReactNode } from "react";
import Link from "next/link";
import { useClinic } from "@/hooks/use-clinic";
import { ClinicBrandingWrapper } from "@/components/clinic-branding-wrapper";
import { BookingProvider, useBooking } from "@/hooks/use-booking";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu, X, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

function ClinicSetup({ clinicId, clinicSlug }: { clinicId: string; clinicSlug: string }) {
  const { setClinic } = useBooking();

  useEffect(() => {
    if (clinicId && clinicSlug) {
      setClinic(clinicId, clinicSlug);
    }
  }, [clinicId, clinicSlug, setClinic]);

  return null;
}

function PublicLayoutInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { clinic, loading, error } = useClinic(clinicSlug);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Clinic Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            {error || "The clinic you are looking for does not exist."}
          </p>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: `/?clinic=${clinicSlug}`, label: "Home" },
    { href: `/book?clinic=${clinicSlug}`, label: "Book" },
  ];

  return (
    <ClinicBrandingWrapper
      primaryColor={clinic.primaryColor}
      secondaryColor={clinic.secondaryColor}
    >
      <ClinicSetup clinicId={clinic.id} clinicSlug={clinic.slug} />

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href={`/?clinic=${clinicSlug}`}
            className="flex items-center gap-2"
          >
            <CalendarDays className="h-6 w-6" style={{ color: clinic.primaryColor }} />
            <span className="text-lg font-bold">{clinic.name}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="ghost" size="sm">
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="border-t px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    {link.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            {clinic.name} &mdash; Powered by DentalBook
          </p>
        </div>
      </footer>

      <Toaster />
    </ClinicBrandingWrapper>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <BookingProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Skeleton className="h-8 w-48" />
          </div>
        }
      >
        <PublicLayoutInner>{children}</PublicLayoutInner>
      </Suspense>
    </BookingProvider>
  );
}
