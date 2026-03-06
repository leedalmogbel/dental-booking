"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, ReactNode } from "react";
import Link from "next/link";
import { useClinic } from "@/hooks/use-clinic";
import { ClinicBrandingWrapper } from "@/components/clinic-branding-wrapper";
import { BookingProvider, useBooking } from "@/hooks/use-booking";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Menu, X, CalendarDays, LogIn, UserPlus, LayoutDashboard, UserCircle, LogOut } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clinicId: string;
}

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
  const router = useRouter();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { clinic, loading, error } = useClinic(clinicSlug);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    try {
      // Clear cookies by setting them to expire
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      setUser(null);
      setMobileMenuOpen(false);
      router.push(`/?clinic=${clinicSlug}`);
    } catch {
      // Silently handle logout errors
    }
  };

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

  const authLinks = user
    ? [
        { href: `/dashboard?clinic=${clinicSlug}`, label: "Dashboard", icon: LayoutDashboard },
        { href: `/dashboard/profile?clinic=${clinicSlug}`, label: "Profile", icon: UserCircle },
      ]
    : [
        { href: `/login?clinic=${clinicSlug}`, label: "Login", icon: LogIn },
        { href: `/register?clinic=${clinicSlug}`, label: "Register", icon: UserPlus },
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

            {!authLoading && (
              <>
                <Separator orientation="vertical" className="mx-1 h-6" />
                {authLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button variant="ghost" size="sm">
                      <link.icon className="mr-1.5 h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
                {user && (
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-1.5 h-4 w-4" />
                    Logout
                  </Button>
                )}
              </>
            )}
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

              {!authLoading && (
                <>
                  <Separator className="my-1" />
                  {authLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <link.icon className="mr-1.5 h-4 w-4" />
                        {link.label}
                      </Button>
                    </Link>
                  ))}
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-1.5 h-4 w-4" />
                      Logout
                    </Button>
                  )}
                </>
              )}
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
