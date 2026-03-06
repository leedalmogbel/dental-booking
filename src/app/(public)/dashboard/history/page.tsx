"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Stethoscope,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

interface TreatmentRecord {
  id: string;
  diagnosis: string | null;
  proceduresDone: string | null;
  notes: string | null;
  attachments: unknown;
  createdAt: string;
  appointmentDate: string | null;
  appointmentStartTime: string | null;
  serviceName: string | null;
  serviceDescription: string | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TreatmentHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";

  const [records, setRecords] = useState<TreatmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/patient/treatment-history");
      if (res.status === 401) {
        router.push(`/login?clinic=${clinicSlug}`);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load treatment history");
      }
      const data = await res.json();
      setRecords(data);
    } catch {
      setError("Failed to load treatment history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, clinicSlug]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={fetchRecords} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard?clinic=${clinicSlug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Treatment History</h1>
          <p className="text-muted-foreground">
            Your complete dental treatment records
          </p>
        </div>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              No treatment records yet
            </p>
            <p className="text-sm text-muted-foreground">
              Your treatment records will appear here after your appointments
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    {record.serviceName || "Treatment"}
                  </CardTitle>
                  {record.appointmentDate && (
                    <Badge variant="outline" className="w-fit">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(record.appointmentDate)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {record.diagnosis && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Diagnosis
                    </p>
                    <p className="text-sm">{record.diagnosis}</p>
                  </div>
                )}

                {record.proceduresDone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Procedures Done
                    </p>
                    <p className="text-sm">{record.proceduresDone}</p>
                  </div>
                )}

                {record.notes && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Notes
                        </p>
                        <p className="text-sm">{record.notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
