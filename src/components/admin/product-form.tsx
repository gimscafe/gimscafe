"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SmartImage } from "@/components/smart-image";
import { saveProduct, type ProductFormState } from "@/app/admin/actions";
import { toast } from "sonner";
import type { Product } from "@/db/schema";

type CategoryOption = { id: string; name: string };

function Err({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-destructive mt-1 text-xs">{errors[0]}</p>;
}

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: CategoryOption[];
}) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    saveProduct,
    {},
  );
  const [imageUrl, setImageUrl] = React.useState(product?.imageUrl ?? "");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const err = state.fieldErrors ?? {};

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="space-y-5">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={product?.name}
            required
            className="mt-1.5"
          />
          <Err errors={err.name} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="slug">URL slug (optional)</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={product?.slug}
              placeholder="auto from name"
              className="mt-1.5"
            />
            <Err errors={err.slug} />
          </div>
          <div>
            <Label htmlFor="priceLkr">Price (LKR)</Label>
            <Input
              id="priceLkr"
              name="priceLkr"
              type="number"
              min={1}
              step="1"
              defaultValue={product ? product.priceCents / 100 : ""}
              required
              className="mt-1.5"
            />
            <Err errors={err.priceLkr} />
          </div>
        </div>

        <div>
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            className="border-input bg-background focus-visible:ring-ring mt-1.5 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="shortDescription">Short description</Label>
          <Input
            id="shortDescription"
            name="shortDescription"
            defaultValue={product?.shortDescription ?? ""}
            maxLength={280}
            placeholder="One line shown on cards"
            className="mt-1.5"
          />
          <Err errors={err.shortDescription} />
        </div>

        <div>
          <Label htmlFor="description">Full description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={product?.description ?? ""}
            rows={5}
            className="mt-1.5"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="servesText">Serves / size</Label>
            <Input
              id="servesText"
              name="servesText"
              defaultValue={product?.servesText ?? ""}
              placeholder="Serves 10–12 · 7 inch"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="leadTimeDays">Lead time (days)</Label>
            <Input
              id="leadTimeDays"
              name="leadTimeDays"
              type="number"
              min={0}
              max={60}
              defaultValue={product?.leadTimeDays ?? 2}
              required
              className="mt-1.5"
            />
            <Err errors={err.leadTimeDays} />
          </div>
        </div>

        <div>
          <Label htmlFor="flavourNotes">Flavour notes</Label>
          <Input
            id="flavourNotes"
            name="flavourNotes"
            defaultValue={product?.flavourNotes ?? ""}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="gallery">Extra gallery image URLs (one per line)</Label>
          <Textarea
            id="gallery"
            name="gallery"
            defaultValue={(product?.gallery ?? []).join("\n")}
            rows={3}
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-5">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm font-medium">Main image</p>
          <div className="bg-muted relative mt-2 aspect-[4/3] overflow-hidden rounded-lg border">
            <SmartImage src={imageUrl || null} alt="Preview" sizes="320px" />
          </div>
          <input type="hidden" name="imageUrl" value={imageUrl} />
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="mt-2 text-xs"
          />
          <Err errors={err.imageUrl} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload image
          </Button>
        </div>

        <div className="bg-card space-y-3 rounded-xl border p-4">
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              name="isAvailable"
              defaultChecked={product ? product.isAvailable : true}
            />
            Available to order
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              name="isFeatured"
              defaultChecked={product?.isFeatured ?? false}
            />
            Feature on homepage
          </label>
          <div>
            <Label htmlFor="sortOrder" className="text-xs">
              Sort order
            </Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={product?.sortOrder ?? 0}
              className="mt-1 h-9"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={pending || uploading}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {product ? "Save changes" : "Create cake"}
        </Button>
      </aside>
    </form>
  );
}
