import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display mt-2 text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground mt-3 text-balance">{description}</p>
      )}
    </div>
  );
}
