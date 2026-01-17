"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import ProductEditorModal, { type ProductDTO } from "@/components/admin/products/ProductEditorModal";
import StockMoveModal from "@/components/admin/products/StockMoveModal";
import SaleItemsModal from "@/components/admin/sales/SaleItemsModal";
import { centsToBRL } from "@/lib/money";

type Product = ProductDTO;

function marginText(costCents?: number | null, priceCents?: number | null) {
  if (typeof costCents !== "number" || typeof priceCents !== "number") return null;
  if (priceCents <= 0) return null;
  const profit = priceCents - costCents;
  const pct = (profit / priceCents) * 100;
  const sign = profit >= 0 ? "" : "-";
  return `${sign}${centsToBRL(Math.abs(profit))} (${Math.abs(pct).toFixed(0)}%)`;
}

export default function ProdutosPage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveProduct, setMoveProduct] = useState<Product | null>(null);

  const [saleOpen, setSaleOpen] = useState(false);

  const inputBase =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (activeOnly) qs.set("active", "1");
      const data = (await fetchAdminJSON(`/api/admin/products?${qs.toString()}`)) as Product[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error ao carregar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [q, activeOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => (p.name || "").toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s));
  }, [items, q]);

  async function removeProduct(p: Product) {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    try {
      await fetchAdminJSON(`/api/admin/products/${p.id}`, { method: "DELETE" });
      toast.add({ variant: "success", title: "Excluído" });
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      toast.add({ variant: "error", title: "Error", description: msg });
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-sm text-[#C9CDD3]">Controle de estoque e bomboniere</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className={btnGhost} onClick={() => router.push("/painel/produtos/metricas")}>
            Métricas
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => setSaleOpen(true)}
          >
            Registrar consumo
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setEditing(null);
              setProductModalOpen(true);
            }}
          >
            Novo produto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2">
          <label className="sr-only" htmlFor="q">Buscar</label>
          <input
            id="q"
            className={inputBase}
            placeholder="Buscar por nome ou SKU"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-[#2A2E36] bg-[#111318] p-2">
          <span className="text-sm text-[#C9CDD3]">Somente ativos</span>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            <span className="sr-only">Somente ativos</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
              <Skeleton className="h-5 w-1/2" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 p-4">
          <div className="font-semibold">Error</div>
          <div className="text-sm opacity-90">{error}</div>
          <button type="button" className={btnGhost + " mt-3"} onClick={load}>
            Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-6 text-[#C9CDD3]">
          No produto encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const m = marginText(p.costCents ?? null, p.priceCents ?? null);
            return (
              <div key={p.id} className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold leading-tight">{p.name}</div>
                    <div className="text-xs text-[#9AA0A6] mt-1">
                      {p.sku ? `SKU: ${p.sku}` : "SKU: —"} • {p.unit ? `Un: ${p.unit}` : "Un: —"}
                    </div>
                  </div>
                  <div className="text-xs rounded-md border border-[#2A2E36] px-2 py-1 text-[#C9CDD3]">
                    {p.active ? "Active" : "Inactive"}
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-[#C9CDD3]">
                  <div>
                    Inventory: <span className="text-white font-semibold">{p.stockQty}</span>
                  </div>
                  <div>
                    Custo: <span className="text-white">{centsToBRL(p.costCents ?? null)}</span>
                  </div>
                  <div>
                    Preço: <span className="text-white">{centsToBRL(p.priceCents ?? null)}</span>
                  </div>
                  {m && (
                    <div>
                      Margem: <span className="text-white">{m}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => {
                      setMoveProduct(p);
                      setMoveOpen(true);
                    }}
                  >
                    Movimentar
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => {
                      setEditing(p);
                      setProductModalOpen(true);
                    }}
                  >
                    Editar
                  </button>
                  <button type="button" className={btnGhost} onClick={() => removeProduct(p)}>
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductEditorModal
        open={productModalOpen}
        product={editing}
        onCloseAction={() => setProductModalOpen(false)}
        onSavedAction={load}
      />

      <StockMoveModal
        open={moveOpen}
        productId={moveProduct?.id ?? null}
        productName={moveProduct?.name ?? null}
        onCloseAction={() => {
          setMoveOpen(false);
          setMoveProduct(null);
        }}
        onSavedAction={load}
      />

      <SaleItemsModal
        open={saleOpen}
        title="Registrar consumo / bomboniere"
        showClientPicker
        onCloseAction={() => setSaleOpen(false)}
        onSavedAction={() => load()}
      />
    </div>
  );
}
