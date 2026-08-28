"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A small delete/confirm button bound to a server action.
 * Shows a browser confirm, then runs the action with { id }.
 */
export function ConfirmSubmit({
  id,
  action,
  confirmText = "Are you sure? This cannot be undone.",
  toastText = "Deleted",
  children,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  confirmText?: string;
  toastText?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
          await action(fd);
          router.refresh();
          toast.success(toastText);
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        children ?? <Trash2 className="size-4" />
      )}
    </Button>
  );
}
