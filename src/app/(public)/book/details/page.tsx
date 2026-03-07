"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Clock, DollarSign, CalendarDays, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookingProgress } from "@/components/booking/booking-progress";
import { useBooking } from "@/hooks/use-booking";
import { useClinic } from "@/hooks/use-clinic";

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export default function PatientDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { state, setPatientDetails } = useBooking();
  const { clinic } = useClinic(clinicSlug);

  const [firstName, setFirstName] = useState(state.patientDetails?.firstName || "");
  const [lastName, setLastName] = useState(state.patientDetails?.lastName || "");
  const [email, setEmail] = useState(state.patientDetails?.email || "");
  const [phone, setPhone] = useState(state.patientDetails?.phone || "");
  const [notes, setNotes] = useState(state.patientDetails?.notes || "");
  const [loadingUser, setLoadingUser] = useState(true);

  // OTP state
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => {
    if (!state.service || !state.timeSlot) {
      router.replace(`/book?clinic=${clinicSlug}`);
      return;
    }

    // Try to pre-fill from auth
    async function prefillUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setFirstName((prev) => prev || data.user.firstName || "");
            setLastName((prev) => prev || data.user.lastName || "");
            setEmail((prev) => prev || data.user.email || "");
          }
        }
      } catch {
        // Not logged in, no prefill
      } finally {
        setLoadingUser(false);
      }
    }

    prefillUser();
  }, [state.service, state.timeSlot, router, clinicSlug]);

  // Reset OTP state when email changes
  useEffect(() => {
    setOtpRequired(false);
    setOtpSent(false);
    setOtpCode("");
    setOtpVerified(false);
    setOtpError("");
  }, [email]);

  const sendOtp = async () => {
    if (!clinic) {
      setOtpError("Clinic information not available. Please try again.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          clinicId: clinic.id,
          clinicName: clinic.name,
          purpose: "booking_verify",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Failed to send verification code.");
        return;
      }

      setOtpSent(true);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!clinic) {
      setOtpError("Clinic information not available. Please try again.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          clinicId: clinic.id,
          code: otpCode,
          purpose: "booking_verify",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Invalid or expired code. Please try again.");
        return;
      }

      setOtpVerified(true);

      // Save patient details and navigate to payment
      setPatientDetails({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      });

      router.push(`/book/payment?clinic=${clinicSlug}`);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    // If already verified via OTP, proceed directly
    if (otpVerified) {
      setPatientDetails({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      });
      router.push(`/book/payment?clinic=${clinicSlug}`);
      return;
    }

    // Check if email exists for this clinic
    const clinicId = state.clinicId || clinic?.id;
    if (!clinicId) {
      toast.error("Clinic information not available. Please try again.");
      return;
    }

    setCheckingEmail(true);

    try {
      const res = await fetch(
        `/api/users/check-email?email=${encodeURIComponent(email.trim())}&clinicId=${encodeURIComponent(clinicId)}`
      );
      const data = await res.json();

      if (data.exists) {
        // Email exists — require OTP verification
        setOtpRequired(true);
        await sendOtp();
        return;
      }

      // Email is new — proceed to payment
      setPatientDetails({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      });

      router.push(`/book/payment?clinic=${clinicSlug}`);
    } catch {
      toast.error("Failed to verify email. Please try again.");
    } finally {
      setCheckingEmail(false);
    }
  };

  if (!state.service || !state.timeSlot) return null;

  return (
    <div className="space-y-6">
      <BookingProgress currentStep={4} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your contact information
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/book/schedule?clinic=${clinicSlug}`)}
          className="gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or information for your dentist..."
                  rows={3}
                />
              </div>

              {state.service.preInstructions && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-sm font-medium text-amber-800">
                    Pre-appointment Instructions
                  </h4>
                  <p className="mt-1 text-sm text-amber-700">
                    {state.service.preInstructions}
                  </p>
                </div>
              )}

              {/* OTP Verification Section */}
              {otpRequired && !otpVerified && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <p className="text-sm text-blue-800">
                    This email is linked to an existing account. Please verify with the code sent to{" "}
                    <span className="font-medium">{email}</span>.
                  </p>

                  {otpError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                      {otpError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="otpCode">6-Digit Code</Label>
                    <Input
                      id="otpCode"
                      type="text"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={verifyOtp}
                      disabled={otpLoading || otpCode.length !== 6}
                      className="gap-2"
                    >
                      {otpLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify & Continue"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpLoading}
                      className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>
              )}

              {!otpRequired && (
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="gap-2" disabled={checkingEmail}>
                    {checkingEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Summary Sidebar */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Appointment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: state.service.color }}
                />
                <span className="font-medium">{state.service.name}</span>
              </div>

              {state.dentist && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>{state.dentist.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                <span>{state.date}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>
                  {formatTime(state.timeSlot.start)} -{" "}
                  {formatTime(state.timeSlot.end)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{state.service.durationMinutes} minutes</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold">
                P{parseFloat(state.service.price).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
