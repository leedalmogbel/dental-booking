"use client";

import { Clock, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: string;
  color: string;
  selected?: boolean;
  onClick: () => void;
}

export function ServiceCard({
  name,
  description,
  durationMinutes,
  price,
  color,
  selected,
  onClick,
}: ServiceCardProps) {
  return (
    <Card
      className={cn(
        "relative cursor-pointer overflow-hidden transition-all hover:shadow-md",
        selected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: color }}
      />
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight">{name}</h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {durationMinutes} min
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <DollarSign className="h-3 w-3" />
                {parseFloat(price).toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
