import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
} as const;

export function UserAvatar({
  avatarUrl,
  name,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizeClasses;
}) {
  return (
    <Avatar
      className={cn(sizeClasses[size], "shadow-soft ring-2 ring-border/60")}
    >
      <AvatarImage alt={name} src={avatarUrl ?? undefined} />
      <AvatarFallback className="bg-primary/15 font-semibold text-primary">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
