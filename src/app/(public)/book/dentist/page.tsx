"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingProgress } from "@/components/booking/booking-progress";
import { DentistCard } from "@/components/booking/dentist-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBooking } from "@/hooks/use-booking";

interface DentistData {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  bio: string | null;
  photoUrl: string | null;
}

export default function SelectDentistPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { state, setDentist } = useBooking();

  const [dentists, setDentists] = useState<DentistData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.service) {
      router.replace(`/book?clinic=${clinicSlug}`);
      return;
    }

    async function fetchDentists() {
      try {
        const res = await fetch(`/api/clinics/${clinicSlug}/dentists`);
        if (!res.ok) throw new Error("Failed to load dentists");
        const data = await res.json();
        setDentists(data);
      } catch {
        toast.error("Failed to load dentists. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchDentists();
  }, [clinicSlug, state.service, router]);

  const handleSelectDentist = (dentist: DentistData) => {
    setDentist({
      id: dentist.id,
      name: `Dr. ${dentist.firstName} ${dentist.lastName}`,
      specialization: dentist.specialization ?? undefined,
      photoUrl: dentist.photoUrl ?? undefined,
    });
    router.push(`/book/schedule?clinic=${clinicSlug}`);
  };

  const handleSkip = () => {
    setDentist(null);
    router.push(`/book/schedule?clinic=${clinicSlug}`);
  };

  return (
    <div className="space-y-6">
      <BookingProgress currentStep={2} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Choose a Dentist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select your preferred dentist, or skip to see all available times
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/book?clinic=${clinicSlug}`)}
          className="gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Button>
      </div>

      {/* Skip option */}
      <Button
        variant="outline"
        className="w-full gap-2 py-6"
        onClick={handleSkip}
      >
        <Users className="h-4 w-4" />
        Any Available Dentist
      </Button>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : dentists.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {dentists.map((dentist) => (
            <DentistCard
              key={dentist.id}
              id={dentist.id}
              name={`Dr. ${dentist.firstName} ${dentist.lastName}`}
              specialization={dentist.specialization}
              bio={dentist.bio}
              photoUrl={dentist.photoUrl}
              selected={state.dentist?.id === dentist.id}
              onClick={() => handleSelectDentist(dentist)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No dentists are currently available. Please check back later.
          </p>
        </div>
      )}
    </div>
  );
}
