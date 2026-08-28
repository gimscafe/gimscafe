"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PayHereRedirect({
  action,
  fields,
}: {
  action: string;
  fields: Record<string, string>;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => formRef.current?.submit(), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Loader2 className="text-primary size-8 animate-spin" />
      <p className="text-muted-foreground text-sm">
        Redirecting you to PayHere&apos;s secure payment page…
      </p>

      <form ref={formRef} method="post" action={action}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button type="submit" variant="outline" size="sm">
          Continue to payment
        </Button>
      </form>
    </div>
  );
}
