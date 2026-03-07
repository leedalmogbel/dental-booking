"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, Mail, Clock, ArrowRight, Star, Sparkles } from "lucide-react";
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
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-primary/80 px-6 py-16 text-center text-primary-foreground shadow-xl sm:px-12 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative z-10 mx-auto max-w-2xl space-y-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Your Smile, Our Priority
          </h1>
          <p className="mx-auto max-w-xl text-lg text-primary-foreground/80">
            Book your dental appointment quickly and easily. Choose from our
            available services and find a time that works for you.
          </p>
          <div className="flex justify-center pt-4">
            <Link href={`/book?clinic=${clinicSlug}`}>
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 px-8 py-6 text-base font-semibold shadow-lg transition-transform hover:scale-105"
              >
                Book an Appointment
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Clinic Info */}
      {state.clinicId && (
        <Card className="border-none bg-muted/40 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap justify-center gap-8">
              {state.clinicSlug && (
                <>
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <span>Visit us at the clinic</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <span>Call for inquiries</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <span>Email us anytime</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Our Services</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quality dental care tailored to your needs
            </p>
          </div>
          <Link href={`/book?clinic=${clinicSlug}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              Book Now <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <Separator />

        {loadingServices ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card
                key={service.id}
                className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className="absolute inset-y-0 left-0 w-1.5 transition-all duration-300 group-hover:w-2"
                  style={{ backgroundColor: service.color }}
                />
                <CardContent className="p-5 pl-6">
                  <h3 className="font-semibold text-base">{service.name}</h3>
                  {service.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {service.durationMinutes} min
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-semibold">
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
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Meet Our Dentists</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Experienced professionals dedicated to your care
          </p>
        </div>
        <Separator />

        {loadingDentists ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-5">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dentists.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dentists.map((dentist) => {
              const initials = `${dentist.firstName[0]}${dentist.lastName[0]}`;
              return (
                <Card
                  key={dentist.id}
                  className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar size="lg" className="ring-2 ring-primary/10 transition-all duration-300 group-hover:ring-primary/30">
                        {dentist.photoUrl && (
                          <AvatarImage
                            src={dentist.photoUrl}
                            alt={`Dr. ${dentist.firstName} ${dentist.lastName}`}
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">
                          Dr. {dentist.firstName} {dentist.lastName}
                        </h3>
                        {dentist.specialization && (
                          <Badge variant="outline" className="mt-1.5 text-xs bg-primary/5 text-primary border-primary/20">
                            <Star className="mr-1 h-3 w-3" />
                            {dentist.specialization}
                          </Badge>
                        )}
                        {dentist.bio && (
                          <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground">
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-10 text-center text-primary-foreground shadow-lg sm:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative z-10 space-y-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to Book Your Visit?</h2>
          <p className="mx-auto max-w-md text-primary-foreground/80">
            Scheduling your dental appointment takes less than a minute. Your healthier smile starts here.
          </p>
          <div className="pt-4">
            <Link href={`/book?clinic=${clinicSlug}`}>
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 px-8 py-6 text-base font-semibold shadow-lg transition-transform hover:scale-105"
              >
                Book an Appointment
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
