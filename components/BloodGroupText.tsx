import { cn } from "@/lib/cn";

export function BloodGroupText({
  group,
  className,
}: {
  group: string;
  className?: string;
}) {
  const sign = group.slice(-1);
  const letters = group.slice(0, -1);
  const isSign = sign === "+" || sign === "-";

  return (
    <span className={cn("whitespace-nowrap", className)}>
      {isSign ? letters : group}
      {isSign ? (
        <span className="align-super text-[0.62em] leading-none">{sign === "-" ? "−" : "+"}</span>
      ) : null}
    </span>
  );
}
