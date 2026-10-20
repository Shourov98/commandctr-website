"use client";

import { Check, CloudUpload, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type MediaItem = {
  id: string;
  name: string;
  tone: string;
  src?: string;
};

type Variant = {
  id: string;
  name: string;
  model: string;
  color: "BLUE" | "GREEN" | "RED";
  sku: string;
  price: string;
  stock: string;
  baseMediaId?: string;
};

const initialMedia: MediaItem[] = [
  { id: "front", name: "Front.jpg", tone: "from-[#d9e6ca] to-[#cdddb7]" },
  { id: "side", name: "Side.jpg", tone: "from-[#f0d7b5] to-[#ead0ad]" },
  { id: "case", name: "Case.jpg", tone: "from-[#edd4ce] to-[#e8cbc3]" },
];

const initialVariants: Variant[] = [
  {
    id: "1",
    name: "Midnight Black",
    model: "Model X1 - 2023 Edition",
    color: "BLUE",
    sku: "WH-X1-BLK",
    price: "£249.00",
    stock: "124",
    baseMediaId: "front",
  },
  {
    id: "2",
    name: "Silver Mist",
    model: "Model X1 - 2023 Edition",
    color: "GREEN",
    sku: "WH-X1-SLV",
    price: "£249.00",
    stock: "85",
    baseMediaId: "side",
  },
  {
    id: "3",
    name: "Silver Mist",
    model: "Model X1 - 2023 Edition",
    color: "GREEN",
    sku: "WH-X1-SLV",
    price: "£249.00",
    stock: "85",
    baseMediaId: "side",
  },
  {
    id: "4",
    name: "Rose Gold",
    model: "Model X1 - 2023 Edition",
    color: "RED",
    sku: "WH-X1-RGL",
    price: "£249.00",
    stock: "0",
  },
];

const colorDotClass: Record<Variant["color"], string> = {
  BLUE: "bg-[#1d8fff]",
  GREEN: "bg-[#22c55e]",
  RED: "bg-[#ec4899]",
};

export default function MediaTabClient() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMedia);
  const [mainMediaId, setMainMediaId] = useState<string>("front");
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ price: string; stock: string } | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isImageDropdownOpen, setIsImageDropdownOpen] = useState(false);
  const [variantDraft, setVariantDraft] = useState({
    name: "",
    model: "Model X1 - 2023 Edition",
    baseMediaId: "",
    color: "GREEN" as Variant["color"],
    sku: "",
    price: "£249.00",
    stock: "0",
  });
  const [channels, setChannels] = useState({
    amazon: true,
    ebay: false,
    tiktok: false,
    etsy: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMediaInputRef = useRef<HTMLInputElement | null>(null);

  const rightPanelMedia = useMemo(() => mediaItems.slice(0, 3), [mediaItems]);

  const uploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const next = Array.from(files).map((file, index) => {
      const id = `${Date.now()}-${index}`;

      return {
        id,
        name: file.name,
        tone: "from-[#dce4f2] to-[#c6d4ec]",
        src: URL.createObjectURL(file),
      };
    });

    setMediaItems((prev) => {
      const merged = [...prev, ...next];
      return merged.slice(0, 8);
    });

    if (!mainMediaId && next[0]) {
      setMainMediaId(next[0].id);
    }
  };

  const openVariantModal = () => {
    setVariantDraft({
      name: "",
      model: "Model X1 - 2023 Edition",
      baseMediaId: mainMediaId || "",
      color: "GREEN",
      sku: "",
      price: "£249.00",
      stock: "0",
    });
    setIsVariantModalOpen(true);
    setIsImageDropdownOpen(false);
  };

  const removeVariant = (id: string) => {
    if (editingVariantId === id) {
      setEditingVariantId(null);
    }
    setVariants((prev) => prev.filter((variant) => variant.id !== id));
  };

  const saveNewVariant = () => {
    if (!variantDraft.name.trim() || !variantDraft.sku.trim()) {
      return;
    }

    setVariants((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: variantDraft.name.trim(),
        model: variantDraft.model.trim() || "Model X1 - 2023 Edition",
        baseMediaId: variantDraft.baseMediaId || undefined,
        color: variantDraft.color,
        sku: variantDraft.sku.trim(),
        price: variantDraft.price.trim() || "£0.00",
        stock: variantDraft.stock.trim() || "0",
      },
    ]);
    setIsVariantModalOpen(false);
  };

  const startEditVariant = (variant: Variant) => {
    setEditingVariantId(variant.id);
    setEditDraft({ price: variant.price, stock: variant.stock });
  };

  const cancelEditVariant = () => {
    setEditingVariantId(null);
    setEditDraft(null);
  };

  const saveEditVariant = (id: string) => {
    if (!editDraft) {
      return;
    }

    setVariants((prev) =>
      prev.map((variant) =>
        variant.id === id ? { ...variant, price: editDraft.price || "£0.00", stock: editDraft.stock || "0" } : variant,
      ),
    );
    setEditingVariantId(null);
    setEditDraft(null);
  };

  const renderBaseImage = (variant: Variant) => {
    if (!variant.baseMediaId) {
      return <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7deec] bg-[#f4f7fc] text-[#acbad1]">⊘</div>;
    }

    const media = mediaItems.find((item) => item.id === variant.baseMediaId);
    if (!media) {
      return <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7deec] bg-[#f4f7fc] text-[#acbad1]">⊘</div>;
    }

    return (
      <div
        className={`h-10 w-10 rounded-lg border border-[#d7deec] bg-gradient-to-br ${media.tone}`}
        style={media.src ? { backgroundImage: `url(${media.src})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      />
    );
  };

  const selectedDraftImage = mediaItems.find((item) => item.id === variantDraft.baseMediaId);

  const maxVisibleRows = 4;
  const visibleVariants = variants.slice(0, maxVisibleRows);
  const showingCount = visibleVariants.length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.85fr)_minmax(250px,1fr)]">
        <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
          <h2 className="text-2xl font-semibold text-[#1f2c44]">Media Manager</h2>

          <button
            className="mt-4 flex h-[118px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#95e8e4] bg-[#e5f5f5] text-center"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#d9f1f0]">
              <CloudUpload className="h-5 w-5 text-[#35d3ce]" />
            </span>
            <p className="text-lg font-semibold text-[#4f607d]">Click to upload or drag and drop</p>
            <p className="text-sm text-[#8ea0bd]">SVG, PNG, JPG or GIF (max. 5MB)</p>
          </button>

          <input
            className="hidden"
            multiple
            onChange={(event) => uploadFiles(event.target.files)}
            ref={fileInputRef}
            type="file"
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {mediaItems.slice(0, 3).map((item) => {
              const isMain = mainMediaId === item.id;

              return (
                <button
                  className="relative overflow-hidden rounded-xl border border-[#dde4ef] text-left"
                  key={item.id}
                  onClick={() => setMainMediaId(item.id)}
                  type="button"
                >
                  <div
                    className={`h-[230px] bg-gradient-to-br ${item.tone}`}
                    style={item.src ? { backgroundImage: `url(${item.src})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  />
                  {isMain ? (
                    <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2f6ff4] text-[10px] text-white">
                      ✓
                    </span>
                  ) : null}
                  <span className="absolute bottom-2 left-2 rounded bg-[#2d3b58]/55 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-2xl font-semibold text-[#20314d]">Media</h3>
            <div className="space-y-1">
              {[
                ["amazon", "Amazon White Background"],
                ["ebay", "eBay Coming Soon"],
                ["tiktok", "Tiktok Optimized"],
                ["etsy", "Etsy Coming Soon"],
              ].map(([key, label]) => {
                const typedKey = key as keyof typeof channels;
                const isComingSoon = typedKey === "ebay" || typedKey === "etsy";
                // Restore live eBay/Etsy media toggles when those channels go live:
                // const enabled = channels[typedKey];
                const enabled = isComingSoon ? false : channels[typedKey];

                return (
                  <button
                    className={`flex w-full items-center justify-end gap-2 text-[10px] font-semibold ${isComingSoon ? "cursor-not-allowed text-[#93a3bd]" : "text-[#5f7395]"}`}
                    key={key}
                    onClick={() => {
                      if (isComingSoon) {
                        return;
                      }
                      setChannels((prev) => ({ ...prev, [typedKey]: !prev[typedKey] }));
                    }}
                    type="button"
                    title={isComingSoon ? `${label.replace(" Coming Soon", "")} is coming soon` : undefined}
                  >
                    <span>{label}</span>
                    <span className={`relative h-4 w-8 rounded-full ${enabled ? "bg-[#47cfca]" : "bg-[#bcc5d3]"}`}>
                      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white ${enabled ? "left-4" : "left-0.5"}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {rightPanelMedia.map((item) => (
              <button className="relative overflow-hidden rounded-lg border border-[#d9e1ee]" key={item.id} onClick={() => setMainMediaId(item.id)} type="button">
                <div
                  className={`h-[126px] bg-gradient-to-br ${item.tone}`}
                  style={item.src ? { backgroundImage: `url(${item.src})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                />
                {mainMediaId === item.id ? (
                  <span className="absolute left-1.5 top-1.5 rounded bg-[#2b2f3a]/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Main
                  </span>
                ) : null}
              </button>
            ))}

            <button
              className="flex h-[126px] items-center justify-center rounded-lg border border-dashed border-[#c9d6ea] bg-[#f7f9fd] text-sm font-semibold text-[#7690b4]"
              onClick={() => addMediaInputRef.current?.click()}
              type="button"
            >
              <span className="flex flex-col items-center gap-1">
                <ImagePlus className="h-5 w-5" />
                Add Media
              </span>
            </button>
            <input
              className="hidden"
              multiple
              onChange={(event) => uploadFiles(event.target.files)}
              ref={addMediaInputRef}
              type="file"
            />
          </div>

          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#d9e1ee] text-sm font-semibold text-[#6f83a6]"
            onClick={openVariantModal}
            type="button"
          >
            <Plus className="h-4 w-4" /> Add Variant
          </button>
        </article>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#1c2c4b] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
        <div className="bg-[#1a2748] px-5 py-3 text-sm font-semibold text-white">Variants &amp; Inventory</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-[#1a2748] text-left text-xs font-semibold text-[#d6e0f5]">
              <tr>
                <th className="px-4 py-3"> </th>
                <th className="px-4 py-3">Variant Details</th>
                <th className="px-4 py-3">Base Image</th>
                <th className="px-4 py-3">COLOR</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-[#44526d]">
              {visibleVariants.map((row) => {
                const isEditing = editingVariantId === row.id;
                return (
                <tr className="border-t border-[#e5ebf5]" key={row.id}>
                  <td className="px-4 py-4">
                    <span className="inline-block h-3.5 w-3.5 rounded-full border border-[#8f9eb9]" />
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#2c3a57]">{row.name}</p>
                    <p className="text-xs text-[#90a0bc]">{row.model}</p>
                  </td>
                  <td className="px-4 py-4">
                    {renderBaseImage(row)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#8fa2c3]">
                      <span className={`h-2 w-2 rounded-full ${colorDotClass[row.color]}`} />
                      {row.color}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-[#8195b6]">{row.sku}</td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input
                        className="h-8 w-[82px] rounded-lg border border-[#cfd8e7] bg-white px-2 text-sm font-semibold text-[#3f4d65] outline-none"
                        onChange={(event) => setEditDraft((prev) => ({ price: event.target.value, stock: prev?.stock ?? row.stock }))}
                        type="text"
                        value={editDraft?.price ?? row.price}
                      />
                    ) : (
                      <span className="font-semibold text-[#4d5e7d]">{row.price}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <input
                        className="h-8 w-16 rounded-lg border border-[#cfd8e7] bg-white px-2 text-sm font-semibold text-[#3f4d65] outline-none"
                        onChange={(event) => setEditDraft((prev) => ({ price: prev?.price ?? row.price, stock: event.target.value }))}
                        type="number"
                        value={editDraft?.stock ?? row.stock}
                      />
                    ) : (
                      <span className="rounded-full bg-[#d9f3e2] px-2 py-1 text-xs font-semibold text-[#3fa06c]">{row.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-3">
                      {isEditing ? (
                        <>
                          <button className="text-[#1f8f6a]" onClick={() => saveEditVariant(row.id)} type="button">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button className="text-[#7a8fb3]" onClick={cancelEditVariant} type="button">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button className="text-[#223763]" onClick={() => startEditVariant(row)} type="button">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button className="text-[#f03f8f]" onClick={() => removeVariant(row.id)} type="button">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#e5ebf5] px-5 py-3 text-sm text-[#6f809f]">
          <p>Showing {showingCount} variants</p>
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-[#b9c7de] px-4 py-1.5 font-semibold text-[#2c3a57]" type="button">
              Previous
            </button>
            <button className="rounded-xl border border-[#b9c7de] px-4 py-1.5 font-semibold text-[#2c3a57]" type="button">
              Next
            </button>
          </div>
        </div>
      </article>

      {isVariantModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091429]/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_30px_80px_-35px_rgba(17,31,56,0.8)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1f2c44]">Add Variant</h3>
              <button className="rounded-md p-1 text-[#7a8cab]" onClick={() => setIsVariantModalOpen(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#3a4964]">Variant Details</label>
                <input
                  className="h-10 w-full rounded-lg border border-[#d5dcea] bg-[#f7f9fd] px-3 text-sm text-[#33425f] outline-none"
                  onChange={(event) => setVariantDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g. Rose Gold"
                  type="text"
                  value={variantDraft.name}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#3a4964]">Base Image</label>
                <div className="relative">
                  <button
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-[#d5dcea] bg-[#f7f9fd] px-3 text-sm text-[#33425f] outline-none"
                    onClick={() => setIsImageDropdownOpen((prev) => !prev)}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      {selectedDraftImage ? (
                        <>
                          <span
                            className={`h-6 w-6 rounded-md bg-gradient-to-br ${selectedDraftImage.tone}`}
                            style={
                              selectedDraftImage.src
                                ? {
                                    backgroundImage: `url(${selectedDraftImage.src})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }
                                : undefined
                            }
                          />
                          {selectedDraftImage.name}
                        </>
                      ) : (
                        "No image"
                      )}
                    </span>
                    <span className="text-xs text-[#7388ad]">{isImageDropdownOpen ? "▲" : "▼"}</span>
                  </button>

                  {isImageDropdownOpen ? (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#d5dcea] bg-white p-2 shadow-[0_16px_40px_-20px_rgba(17,31,56,0.5)]">
                      <button
                        className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#405170] hover:bg-[#f3f7ff]"
                        onClick={() => {
                          setVariantDraft((prev) => ({ ...prev, baseMediaId: "" }));
                          setIsImageDropdownOpen(false);
                        }}
                        type="button"
                      >
                        <span className="h-6 w-6 rounded-md border border-[#d9e1ee] bg-white" />
                        No image
                      </button>
                      {mediaItems.map((item) => (
                        <button
                          className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#405170] hover:bg-[#f3f7ff]"
                          key={item.id}
                          onClick={() => {
                            setVariantDraft((prev) => ({ ...prev, baseMediaId: item.id }));
                            setIsImageDropdownOpen(false);
                          }}
                          type="button"
                        >
                          <span
                            className={`h-6 w-6 rounded-md bg-gradient-to-br ${item.tone}`}
                            style={item.src ? { backgroundImage: `url(${item.src})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                          />
                          {item.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#3a4964]">Color</label>
                <select
                  className="h-10 w-full rounded-lg border border-[#d5dcea] bg-[#f7f9fd] px-3 text-sm text-[#33425f] outline-none"
                  onChange={(event) => setVariantDraft((prev) => ({ ...prev, color: event.target.value as Variant["color"] }))}
                  value={variantDraft.color}
                >
                  <option value="BLUE">BLUE</option>
                  <option value="GREEN">GREEN</option>
                  <option value="RED">RED</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#3a4964]">SKU</label>
                <input
                  className="h-10 w-full rounded-lg border border-[#d5dcea] bg-[#f7f9fd] px-3 text-sm text-[#33425f] outline-none"
                  onChange={(event) => setVariantDraft((prev) => ({ ...prev, sku: event.target.value }))}
                  placeholder="WH-X1-NEW"
                  type="text"
                  value={variantDraft.sku}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#3a4964]">Price</label>
                <input
                  className="h-10 w-full rounded-lg border border-[#d5dcea] bg-[#f7f9fd] px-3 text-sm text-[#33425f] outline-none"
                  onChange={(event) => setVariantDraft((prev) => ({ ...prev, price: event.target.value }))}
                  type="text"
                  value={variantDraft.price}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#3a4964]">Stock</label>
                <input
                  className="h-10 w-full rounded-lg border border-[#d5dcea] bg-[#f7f9fd] px-3 text-sm text-[#33425f] outline-none"
                  onChange={(event) => setVariantDraft((prev) => ({ ...prev, stock: event.target.value }))}
                  type="number"
                  value={variantDraft.stock}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-[#c8d3e6] px-4 py-2 text-sm font-semibold text-[#4b5f83]"
                onClick={() => setIsVariantModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#1c2b4c] px-4 py-2 text-sm font-semibold text-white"
                onClick={saveNewVariant}
                type="button"
              >
                Save Variant
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
