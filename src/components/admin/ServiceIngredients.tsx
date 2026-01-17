"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type IngredientRow = {
  productId: string;
  productName: string;
  unit: string | null;
  quantityPerService: number;
};

type Product = {
  id: string;
  name: string;
  unit: string | null;
  stockQty: number;
};

type Props = {
  serviceId: string;
};

function errMsg(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function ServiceIngredients({ serviceId }: Props) {
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [options, setOptions] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState<string>("");

  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const btn =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";

  const load = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const data = await fetchAdminJSON<IngredientRow[]>(`/api/admin/services/${serviceId}/ingredients`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      alert(errMsg(err, "Error ao carregar insumos"));
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = search.trim();
      if (!q) {
        setOptions([]);
        return;
      }

      setSearching(true);
      try {
        const res = await fetch(`/api/admin/products?q=${encodeURIComponent(q)}&take=10`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const json: unknown = await res.json().catch(() => null);

        const list = Array.isArray(json) ? (json as Product[]) : [];
        setOptions(list);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [search]);

  async function addOrUpdate() {
    const qnum = Number(qty);

    if (!selectedProductId) {
      alert("Selecione um produto.");
      return;
    }
    if (!Number.isFinite(qnum) || qnum <= 0) {
      alert("Informe uma quantidade > 0.");
      return;
    }

    try {
      await fetchAdminJSON<{ ok: true }>(`/api/admin/services/${serviceId}/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, quantityPerService: qnum }),
      });

      setSelectedProductId("");
      setSearch("");
      setQty("");
      load();
    } catch (err: unknown) {
      alert(errMsg(err, "Error ao salvar insumo"));
    }
  }

  async function remove(productId: string) {
    if (!confirm("Remover este insumo do serviço?")) return;

    try {
      await fetchAdminJSON<{ ok: true }>(`/api/admin/services/${serviceId}/ingredients/${productId}`, {
        method: "DELETE",
      });
      load();
    } catch (err: unknown) {
      alert(errMsg(err, "Error ao remover"));
    }
  }

  const selectedProduct = useMemo(
    () => options.find((o) => o.id === selectedProductId) || null,
    [options, selectedProductId]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm text-[#C9CDD3] mb-1">Buscar produto</label>
            <input
              className={input}
              placeholder="Digite o nome do produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && <div className="text-xs text-[#9AA0A6] mt-1">Buscando...</div>}
            {options.length > 0 && (
              <div className="mt-2 rounded-lg border border-[#2A2E36] bg-[#111318] max-h-56 overflow-auto">
                {options.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setSearch(p.name);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#1A1C1F] text-sm"
                  >
                    <div className="text-white">{p.name}</div>
                    <div className="text-xs text-[#C9CDD3]">
                      {p.unit ? `Unidade: ${p.unit}` : "Sem unidade"} • Inventory: {p.stockQty}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-[#C9CDD3] mb-1">Quantidade por serviço</label>
            <input
              className={input}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="decimal"
              placeholder={selectedProduct?.unit ? `Ex.: 2 (${selectedProduct.unit})` : "Ex.: 1"}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={addOrUpdate} className={btn}>
            Adicionar/Refresh
          </button>
          <button
            onClick={() => {
              setSearch("");
              setSelectedProductId("");
              setQty("");
            }}
            className={btnGhost}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115]">
        <div className="px-4 py-3 border-b border-[#24272D] text-sm text-[#C9CDD3]">Insumos vinculados ao serviço</div>
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-[#24272D] bg-[#111318] p-3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-24" rounded="lg" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-[#9AA0A6]">No insumo vinculado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {rows.map((r) => (
                <div key={r.productId} className="rounded-lg border border-[#24272D] bg-[#111318] p-3">
                  <div className="text-white font-medium">{r.productName}</div>
                  <div className="text-xs text-[#C9CDD3]">
                    {r.quantityPerService} {r.unit || ""} por serviço
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => remove(r.productId)}
                      className="px-3 py-1 rounded-md border border-rose-800/50 text-rose-300 hover:bg-rose-900/20 transition text-sm"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}