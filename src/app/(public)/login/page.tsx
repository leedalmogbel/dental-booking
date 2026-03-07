"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogIn } from "lucide-react";
import { useClinic } from "@/hooks/use-clinic";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { clinic } = useClinic(clinicSlug);

  // Password tab state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP tab state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clinic-slug": clinicSlug,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      router.push(`/dashboard?clinic=${clinicSlug}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) {
      setOtpError("Clinic information not available. Please try again.");
      return;
    }

    setOtpError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpEmail,
          clinicId: clinic.id,
          clinicName: clinic.name,
          purpose: "login",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Failed to send code. Please try again.");
        return;
      }

      setOtpSent(true);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) {
      setOtpError("Clinic information not available. Please try again.");
      return;
    }

    setOtpError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpEmail,
          clinicId: clinic.id,
          code: otpCode,
          purpose: "login",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Invalid code. Please try again.");
        return;
      }

      router.push(`/dashboard?clinic=${clinicSlug}`);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpBack = () => {
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <LogIn className="h-6 w-6" />
            Sign In
          </CardTitle>
          <CardDescription>
            Sign in to your patient account to manage appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="password" className="flex-1">
                Password
              </TabsTrigger>
              <TabsTrigger value="otp" className="flex-1">
                Email Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4">
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="otp">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4 pt-4">
                  {otpError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                      {otpError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder="your@email.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={otpLoading}>
                    {otpLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending code...
                      </>
                    ) : (
                      "Send Code"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 pt-4">
                  {otpError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                      {otpError}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Code sent to <span className="font-medium text-foreground">{otpEmail}</span>
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="otp-code">6-Digit Code</Label>
                    <Input
                      id="otp-code"
                      type="text"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      maxLength={6}
                      inputMode="numeric"
                      required
                      autoComplete="one-time-code"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={otpLoading || otpCode.length !== 6}>
                    {otpLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify"
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={handleOtpBack}
                      className="font-medium text-primary hover:underline"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={`/register?clinic=${clinicSlug}`}
              className="font-medium text-primary hover:underline"
            >
              Register here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
