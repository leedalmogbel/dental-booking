"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PaymentProofUploadProps {
  qrCodeUrl?: string | null;
  amount: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export function PaymentProofUpload({
  qrCodeUrl,
  amount,
  onFileSelect,
  selectedFile,
}: PaymentProofUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const removeFile = useCallback(() => {
    handleFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [handleFile]);

  return (
    <div className="space-y-6">
      {/* QR Code Section */}
      {qrCodeUrl ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <h3 className="text-lg font-semibold">Scan to Pay</h3>
            <div className="overflow-hidden rounded-lg border bg-white p-2">
              <img
                src={qrCodeUrl}
                alt="Payment QR Code"
                className="h-48 w-48 object-contain"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Amount to pay:{" "}
              <span className="text-lg font-bold text-foreground">
                P{parseFloat(amount).toLocaleString()}
              </span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This clinic does not have online payment set up.
            </p>
            <p className="mt-1 font-medium">
              You can pay at the clinic. Amount:{" "}
              <span className="text-lg font-bold">
                P{parseFloat(amount).toLocaleString()}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">
          Upload Payment Screenshot {!qrCodeUrl && "(Optional)"}
        </h3>

        {!selectedFile ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop your screenshot here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG up to 5MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) handleFile(file);
              }}
            />
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg border">
            <div className="flex items-center gap-3 p-3">
              {preview ? (
                <img
                  src={preview}
                  alt="Payment proof preview"
                  className="h-16 w-16 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
