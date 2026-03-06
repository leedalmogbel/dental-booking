"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, Mail, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBooking } from "@/hooks/use-booking";

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  color: string;
}

interface DentistData {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  bio: string | null;
  photoUrl: string | null;
}

export default function ClinicLandingPage() {
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { state } = useBooking();

  const [services, setServices] = useState<ServiceData[]>([]);
  const [dentists, setDentists] = useState<DentistData[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingDentists, setLoadingDentists] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch(`/api/clinics/${clinicSlug}/services`);
        if (res.ok) {
          const data = await res.json();
          setServices(data);
        }
      } catch {
        // Silently handle
      } finally {
        setLoadingServices(false);
      }
    }

    async function fetchDentists() {
      try {
        const res = await fetch(`/api/clinics/${clinicSlug}/dentists`);
        if (res.ok) {
          const data = await res.json();
          setDentists(data);
        }
      } catch {
        // Silently handle
      } finally {
        setLoadingDentists(false);
      }
    }

    fetchServices();
    fetchDentists();
  }, [clinicSlug]);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="space-y-4 py-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome to Your Dental Care
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Book your dental appointment quickly and easily. Choose from our
          available services and find a time that works for you.
        </p>
        <div className="flex justify-center pt-2">
          <Link href={`/book?clinic=${clinicSlug}`}>
            <Button size="lg" className="gap-2">
              Book an Appointment
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Clinic Info */}
      {state.clinicId && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-6">
              {state.clinicSlug && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>Visit us at the clinic</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>Call for inquiries</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>Email us anytime</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Our Services</h2>
          <Link href={`/book?clinic=${clinicSlug}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              Book Now <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <Separator />

        {loadingServices ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="mb-3 h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id} className="relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ backgroundColor: service.color }}
                />
                <CardContent className="p-4 pl-5">
                  <h3 className="font-semibold">{service.name}</h3>
                  {service.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {service.durationMinutes} min
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      P{parseFloat(service.price).toLocaleString()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No services available at this time.
          </p>
        )}
      </section>

      {/* Dentists Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Our Dentists</h2>
        <Separator />

        {loadingDentists ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dentists.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dentists.map((dentist) => {
              const initials = `${dentist.firstName[0]}${dentist.lastName[0]}`;
              return (
                <Card key={dentist.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar size="lg">
                        {dentist.photoUrl && (
                          <AvatarImage
                            src={dentist.photoUrl}
                            alt={`Dr. ${dentist.firstName} ${dentist.lastName}`}
                          />
                        )}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          Dr. {dentist.firstName} {dentist.lastName}
                        </h3>
                        {dentist.specialization && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {dentist.specialization}
                          </Badge>
                        )}
                        {dentist.bio && (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {dentist.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No dentists listed at this time.
          </p>
        )}
      </section>

      {/* CTA Section */}
      <section className="rounded-lg border bg-muted/30 p-8 text-center">
        <h2 className="text-2xl font-bold">Ready to Book?</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Scheduling your dental appointment takes less than a minute.
        </p>
        <div className="mt-4">
          <Link href={`/book?clinic=${clinicSlug}`}>
            <Button size="lg" className="gap-2">
              Book an Appointment
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
