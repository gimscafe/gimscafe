"use client";

import * as React from "react";
import { useActionState } from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SmartImage } from "@/components/smart-image";
import { saveProduct, type ProductFormState } from "@/app/admin/actions";
import {
  ACCEPT_ATTR,
  MAX_FILES_PER_REQUEST,
  MAX_GALLERY_IMAGES,
} from "@/lib/uploads-shared";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Product } from "@/db/schema";

type CategoryOption = { id: string; name: string };

function Err({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-destructive mt-1 text-xs">{errors[0]}</p>;
}

/** POSTs to /api/uploads and returns the stored paths. */
async function uploadFiles(files: File[]): Promise<string[]> {
  const fd = new FormData();
  for (const f of files.slice(0, MAX_FILES_PER_REQUEST)) fd.append("files", f);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const data = (await res.json()) as { urls?: string[]; error?: string };
  if (!res.ok || !data.urls?.length) throw new Error(data.error ?? "Upload failed");
  return data.urls;
}

/** A dashed drop zone that also opens the file picker when clicked. */
function DropZone({
  multiple,
  busy,
  onFiles,
  children,
  className,
}: {
  multiple?: boolean;
  busy?: boolean;
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "rounded-lg border border-dashed transition-colors",
        over ? "border-primary bg-primary/5" : "border-input",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-1.5 px-3 py-4 text-center disabled:opacity-60"
      >
        {children}
      </button>
    </div>
  );
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
  const [gallery, setGallery] = React.useState<string[]>(product?.gallery ?? []);
  const [uploading, setUploading] = React.useState(false);
  const [priceLkr, setPriceLkr] = React.useState(
    product ? String(product.priceCents / 100) : "",
  );
  const [costLkr, setCostLkr] = React.useState(
    product ? String(product.costCents / 100) : "",
  );
  const err = state.fieldErrors ?? {};

  async function handle(files: File[], target: "main" | "gallery") {
    setUploading(true);
    try {
      const urls = await uploadFiles(files);
      if (target === "main") {
        setImageUrl(urls[0]);
        // A multi-select on the main slot spills the rest into the gallery.
        if (urls.length > 1) {
          setGallery((g) => [...g, ...urls.slice(1)].slice(0, MAX_GALLERY_IMAGES));
        }
      } else {
        setGallery((g) => [...g, ...urls].slice(0, MAX_GALLERY_IMAGES));
      }
      toast.success(
        urls.length === 1 ? "Image uploaded" : `${urls.length} images uploaded`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const price = Number(priceLkr);
  const cost = Number(costLkr);
  const margin =
    Number.isFinite(price) && Number.isFinite(cost) && price > 0 && cost > 0
      ? { profit: price - cost, percent: ((price - cost) / price) * 100 }
      : null;

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

        {/* ------------------------------------------------ price & cost */}
        <fieldset className="bg-card rounded-xl border p-4">
          <legend className="px-1 text-sm font-medium">Pricing</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="priceLkr">Selling price (LKR)</Label>
              <Input
                id="priceLkr"
                name="priceLkr"
                type="number"
                min={1}
                step="1"
                value={priceLkr}
                onChange={(e) => setPriceLkr(e.target.value)}
                required
                className="mt-1.5"
              />
              <Err errors={err.priceLkr} />
            </div>
            <div>
              <Label htmlFor="costLkr">Cost to make (LKR)</Label>
              <Input
                id="costLkr"
                name="costLkr"
                type="number"
                min={0}
                step="1"
                value={costLkr}
                onChange={(e) => setCostLkr(e.target.value)}
                placeholder="0"
                className="mt-1.5"
              />
              <Err errors={err.costLkr} />
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {margin ? (
              <>
                Profit{" "}
                <span
                  className={cn(
                    "font-medium",
                    margin.profit >= 0 ? "text-emerald-600" : "text-destructive",
                  )}
                >
                  {formatMoney(Math.round(margin.profit * 100))}
                </span>{" "}
                per cake · {margin.percent.toFixed(1)}% margin
              </>
            ) : (
              "Ingredients, labour and packaging. Drives the profit and ROI figures on the KPI dashboard."
            )}
          </p>
        </fieldset>

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

        {/* ---------------------------------------------------- gallery */}
        <div>
          <Label>Gallery images</Label>
          <p className="text-muted-foreground mt-1 text-xs">
            Up to {MAX_GALLERY_IMAGES} extra photos shown on the cake page.
          </p>

          {gallery.length > 0 && (
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {gallery.map((url, i) => (
                <li key={`${url}-${i}`} className="relative">
                  <div className="bg-muted relative aspect-square overflow-hidden rounded-lg border">
                    <SmartImage
                      src={url}
                      alt={`Gallery image ${i + 1}`}
                      sizes="120px"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove gallery image ${i + 1}`}
                    onClick={() => setGallery((g) => g.filter((_, j) => j !== i))}
                    className="bg-background/90 absolute top-1 right-1 rounded-full border p-1 shadow-sm"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {gallery.map((url, i) => (
            <input key={`gallery-${i}`} type="hidden" name="gallery" value={url} />
          ))}

          {gallery.length < MAX_GALLERY_IMAGES && (
            <DropZone
              multiple
              busy={uploading}
              onFiles={(files) => handle(files, "gallery")}
              className="mt-2"
            >
              {uploading ? (
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              ) : (
                <ImagePlus className="text-muted-foreground size-5" />
              )}
              <span className="text-sm font-medium">Add gallery images</span>
              <span className="text-muted-foreground text-xs">
                Drop JPG or PNG files here, or click to browse
              </span>
            </DropZone>
          )}
          <Err errors={err.gallery} />
        </div>
      </div>

      {/* ------------------------------------------------------- sidebar */}
      <aside className="space-y-5">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm font-medium">Main image</p>
          <div className="bg-muted relative mt-2 aspect-[4/3] overflow-hidden rounded-lg border">
            <SmartImage src={imageUrl || null} alt="Preview" sizes="320px" />
            {imageUrl && (
              <button
                type="button"
                aria-label="Remove main image"
                onClick={() => setImageUrl("")}
                className="bg-background/90 absolute top-2 right-2 rounded-full border p-1 shadow-sm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <input type="hidden" name="imageUrl" value={imageUrl} />

          <DropZone
            busy={uploading}
            onFiles={(files) => handle(files, "main")}
            className="mt-2"
          >
            {uploading ? (
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            ) : (
              <Upload className="text-muted-foreground size-5" />
            )}
            <span className="text-sm font-medium">
              {imageUrl ? "Replace image" : "Upload image"}
            </span>
            <span className="text-muted-foreground text-xs">
              JPG or PNG, up to 5 MB
            </span>
          </DropZone>

          <details className="mt-2">
            <summary className="text-muted-foreground cursor-pointer text-xs">
              or paste an image URL
            </summary>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1.5 text-xs"
            />
          </details>
          <Err errors={err.imageUrl} />
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
