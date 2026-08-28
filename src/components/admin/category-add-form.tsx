"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveCategory, type CategoryFormState } from "@/app/admin/actions";

export function CategoryAddForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(
    saveCategory,
    {},
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const prev = React.useRef(state);

  React.useEffect(() => {
    if (prev.current !== state && !state.error) {
      formRef.current?.reset();
      router.refresh();
    }
    prev.current = state;
  }, [state, router]);

  return (
    <form
      ref={formRef}
      action={action}
      className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_120px_auto] sm:items-end"
    >
      <div>
        <Label htmlFor="cat-name">New category</Label>
        <Input id="cat-name" name="name" required placeholder="e.g. Seasonal" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="cat-sort">Sort</Label>
        <Input
          id="cat-sort"
          name="sortOrder"
          type="number"
          defaultValue={0}
          className="mt-1.5"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add
      </Button>
      {state.error && (
        <Alert variant="destructive" className="sm:col-span-3">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
