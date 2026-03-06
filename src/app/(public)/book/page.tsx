"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BookingProgress } from "@/components/booking/booking-progress";
import { ServiceCard } from "@/components/booking/service-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBooking } from "@/hooks/use-booking";

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  color: string;
  preInstructions: string | null;
}

export default function SelectServicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { state, setService } = useBooking();

  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch(`/api/clinics/${clinicSlug}/services`);
        if (!res.ok) throw new Error("Failed to load services");
        const data = await res.json();
        setServices(data);
      } catch {
        toast.error("Failed to load services. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [clinicSlug]);

  const handleSelectService = (service: ServiceData) => {
    setService({
      id: service.id,
      name: service.name,
      description: service.description ?? undefined,
      durationMinutes: service.durationMinutes,
      price: service.price,
      color: service.color,
      preInstructions: service.preInstructions ?? undefined,
    });
    router.push(`/book/dentist?clinic=${clinicSlug}`);
  };

  return (
    <div className="space-y-6">
      <BookingProgress currentStep={1} />

      <div>
        <h1 className="text-2xl font-bold">Select a Service</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the dental service you need
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="mb-3 h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : services.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              id={service.id}
              name={service.name}
              description={service.description}
              durationMinutes={service.durationMinutes}
              price={service.price}
              color={service.color}
              selected={state.service?.id === service.id}
              onClick={() => handleSelectService(service)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No services are currently available. Please check back later.
          </p>
        </div>
      )}
    </div>
  );
}
