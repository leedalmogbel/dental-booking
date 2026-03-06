"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DentistCardProps {
  id: string;
  name: string;
  specialization?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  selected?: boolean;
  onClick: () => void;
}

export function DentistCard({
  name,
  specialization,
  bio,
  photoUrl,
  selected,
  onClick,
}: DentistCardProps) {
  const initials = name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{name}</h3>
            {specialization && (
              <Badge variant="outline" className="mt-1">
                {specialization}
              </Badge>
            )}
            {bio && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {bio}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
