"use client";

import { useState, useEffect } from "react";

export interface ClinicData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  operatingHours: Record<string, { start: string; end: string }> | null;
  qrCodeUrl?: string | null;
}

export function useClinic(slug: string) {
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("No clinic specified");
      return;
    }

    let cancelled = false;

    async function fetchClinic() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/clinics/${slug}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Clinic not found" : "Failed to load clinic");
        }
        const data = await res.json();
        if (!cancelled) {
          setClinic(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load clinic");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchClinic();
    return () => { cancelled = true; };
  }, [slug]);

  return { clinic, loading, error };
}
