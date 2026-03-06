"use client";

import { createContext, useContext, useState, useCallback, ReactNode, createElement } from "react";

export interface BookingService {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: string;
  color: string;
  preInstructions?: string;
}

export interface BookingDentist {
  id: string;
  name: string;
  specialization?: string;
  photoUrl?: string;
}

export interface BookingTimeSlot {
  start: string;
  end: string;
  dentistId: string;
  dentistName: string;
}

export interface PatientDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface BookingState {
  clinicId: string;
  clinicSlug: string;
  service: BookingService | null;
  dentist: BookingDentist | null;
  date: string;
  timeSlot: BookingTimeSlot | null;
  patientDetails: PatientDetails | null;
  appointmentId: string | null;
  paymentProofUploaded: boolean;
}

interface BookingContextType {
  state: BookingState;
  setClinic: (clinicId: string, clinicSlug: string) => void;
  setService: (service: BookingService) => void;
  setDentist: (dentist: BookingDentist | null) => void;
  setDate: (date: string) => void;
  setTimeSlot: (slot: BookingTimeSlot) => void;
  setPatientDetails: (details: PatientDetails) => void;
  setAppointmentId: (id: string) => void;
  setPaymentProofUploaded: (uploaded: boolean) => void;
  reset: () => void;
  currentStep: number;
}

const initialState: BookingState = {
  clinicId: "",
  clinicSlug: "",
  service: null,
  dentist: null,
  date: "",
  timeSlot: null,
  patientDetails: null,
  appointmentId: null,
  paymentProofUploaded: false,
};

const BookingContext = createContext<BookingContextType | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(initialState);

  const setClinic = useCallback((clinicId: string, clinicSlug: string) => {
    setState((prev) => ({ ...prev, clinicId, clinicSlug }));
  }, []);

  const setService = useCallback((service: BookingService) => {
    setState((prev) => ({
      ...prev,
      service,
      // Reset downstream selections when service changes
      dentist: null,
      date: "",
      timeSlot: null,
    }));
  }, []);

  const setDentist = useCallback((dentist: BookingDentist | null) => {
    setState((prev) => ({
      ...prev,
      dentist,
      // Reset downstream selections
      date: "",
      timeSlot: null,
    }));
  }, []);

  const setDate = useCallback((date: string) => {
    setState((prev) => ({ ...prev, date, timeSlot: null }));
  }, []);

  const setTimeSlot = useCallback((slot: BookingTimeSlot) => {
    setState((prev) => ({ ...prev, timeSlot: slot }));
  }, []);

  const setPatientDetails = useCallback((details: PatientDetails) => {
    setState((prev) => ({ ...prev, patientDetails: details }));
  }, []);

  const setAppointmentId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, appointmentId: id }));
  }, []);

  const setPaymentProofUploaded = useCallback((uploaded: boolean) => {
    setState((prev) => ({ ...prev, paymentProofUploaded: uploaded }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...initialState,
      clinicId: prev.clinicId,
      clinicSlug: prev.clinicSlug,
    }));
  }, []);

  const currentStep = (() => {
    if (!state.service) return 1;
    if (!state.date || !state.timeSlot) return 3;
    if (!state.patientDetails) return 4;
    if (!state.appointmentId) return 5;
    return 6;
  })();

  return createElement(
    BookingContext.Provider,
    {
      value: {
        state,
        setClinic,
        setService,
        setDentist,
        setDate,
        setTimeSlot,
        setPatientDetails,
        setAppointmentId,
        setPaymentProofUploaded,
        reset,
        currentStep,
      },
    },
    children
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
