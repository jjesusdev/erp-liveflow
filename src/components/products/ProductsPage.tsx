'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, cn } from '@/lib/date-utils';
import { Plus, Pencil, Trash2, Search, PackageX, Upload, FileSpreadsheet, Download, Check } from 'lucide-react';
import type { Product } from '@/types';

interface FormState {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  stock: string;
  isAvailable: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  price: '',
  category: '',
  imageUrl: '',
  stock: '10',
  isAvailable: true,
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const url = search ? `/api/products?search=${encodeURIComponent(search)}` : '/api/products';
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudieron cargar los productos');
      setProducts(await res.json());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      stock: String(product.stock ?? 10),
      isAvailable: product.isAvailable,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        editingId ? `/api/products/${editingId}` : '/api/products',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            stock: parseInt(form.stock, 10) || 10,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar el producto');

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    setError(null);

    try {
      const lines = csvText.trim().split('\n');
      const parsedProducts = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || (i === 0 && line.toLowerCase().includes('nombre'))) continue; // Saltar cabecera

        const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2) {
          parsedProducts.push({
            name: cols[0],
            price: parseFloat(cols[1]),
            category: cols[2] || 'Prendas',
            stock: parseInt(cols[3], 10) || 10,
            description: cols[4] || '',
          });
        }
      }

      if (parsedProducts.length === 0) {
        throw new Error('No se detectaron filas válidas en el formato Nombre, Precio, Categoría, Stock');
      }

      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: parsedProducts }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error importando catálogo');

      setSuccessToast(`🎉 ¡${data.importedCount} productos importados correctamente!`);
      setShowImportModal(false);
      setCsvText('');
      setTimeout(() => setSuccessToast(null), 4000);
      fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'Error en la importación masiva');
    } finally {
      setImporting(false);
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar');

      fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el producto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto del catalogo?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar');
      fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar el producto');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Catálogo Express de Live Shopping</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prendas y combos listos para cotizar y cobrar al vuelo durante las transmisiones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
          >
            <Upload className="h-4 w-4" />
            Importar Excel/CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nueva Prenda
          </button>
        </div>
      </div>

      {successToast && (
        <div className="mb-4 rounded-md bg-green-100 p-3 text-sm font-medium text-green-900 border border-green-300">
          {successToast}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar prenda o categoría..."
          className="w-full rounded-md border py-2 pl-9 pr-3 text-xs bg-background"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="flex flex-col rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="relative">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-40 w-full rounded-t-lg object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-t-lg bg-muted/40">
                  <PackageX className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <span
                className={cn(
                  'absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold',
                  product.isAvailable
                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                )}
              >
                {product.isAvailable ? 'Disponible' : 'Agotado'}
              </span>

              <span className="absolute right-2 top-2 rounded-full bg-black/70 text-white px-2 py-0.5 text-[10px] font-mono font-semibold">
                Stock: {product.stock ?? 10}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-sm text-foreground">{product.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {product.category || 'General'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(product)}
                    title="Editar"
                    className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    title="Eliminar"
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                  {product.description}
                </p>
              )}

              <div className="mt-auto pt-3 flex items-center justify-between border-t">
                <span className="font-black text-base text-foreground font-mono">
                  {formatCurrency(Number(product.price), product.currency)}
                </span>
                <button
                  onClick={() => toggleAvailability(product)}
                  className={cn(
                    'rounded px-2 py-0.5 text-[11px] font-semibold transition-colors',
                    product.isAvailable
                      ? 'border border-red-200 text-red-700 hover:bg-red-50'
                      : 'border border-green-200 text-green-700 hover:bg-green-50'
                  )}
                >
                  {product.isAvailable ? 'Agotar' : 'Reactivar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && products.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          No hay prendas registradas. Agrega una o importa tu catálogo en CSV/Excel.
        </div>
      )}

      {/* Modal Crear/Editar Prenda */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
            <h2 className="text-base font-bold mb-3">
              {editingId ? 'Editar Prenda' : 'Nueva Prenda para el Live'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Nombre de la Prenda / Combo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Vestido Esmeralda Talla M"
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold">Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Stock / Cupos</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    placeholder="10"
                    className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Categoría</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ej: Vestidos, Conjuntos, Accesorios"
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Descripción o Medidas</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej: Tela brush stretch, abarca CH a G..."
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">URL de Foto (Opcional)</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-xs bg-background"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-md border py-2 text-xs font-semibold hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Prenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Excel/CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold">Importación Rápida de Catálogo</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Pega el texto de tu Excel o CSV con el formato: <code>Nombre, Precio, Categoría, Stock</code> (una prenda por línea).
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Vestido Rojo Gala, 450, Vestidos, 5\nBlusa Satín Blanca, 280, Blusas, 12\nConjunto Deportivo Rosa, 520, Conjuntos, 4`}
              className="w-full rounded-md border bg-background p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 rounded-md border py-2 text-xs font-semibold hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={importing || !csvText.trim()}
                className="flex-1 rounded-md bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {importing ? 'Importando...' : 'Importar al Catálogo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}