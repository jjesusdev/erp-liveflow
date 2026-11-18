"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getErrorMessage, useProductCsvImport } from "@/hooks/useProductCsvImport";
import type { Product } from "@/types";

export interface FormState {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  stock: string;
  isAvailable: boolean;
}

export const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  stock: "10",
  isAvailable: true,
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `fetchProducts` debe usar el search vigente incluso cuando se llama desde
  // guardar/borrar/importar, no el valor ya debounced que disparó la petición.
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const fetchProducts = useCallback(async () => {
    try {
      const currentSearch = searchRef.current;
      const url = currentSearch
        ? `/api/products?search=${encodeURIComponent(currentSearch)}`
        : "/api/products";
      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudieron cargar los productos");
      const data = (await res.json()) as Product[];
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Error al cargar los productos"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Se arranca con `null` para que la primera carga también espere 250 ms,
  // igual que el setTimeout original; luego el valor ya es el search vigente.
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);
  useEffect(() => {
    setPendingSearch(search);
  }, [search]);

  const debouncedSearch = useDebouncedValue(pendingSearch, 250);
  useEffect(() => {
    if (debouncedSearch === null) return;
    void fetchProducts();
  }, [debouncedSearch, fetchProducts]);

  const {
    csvText,
    setCsvText,
    importing,
    successToast,
    showImportModal,
    setShowImportModal,
    handleImportCsv,
  } = useProductCsvImport({ onError: setError, onImported: fetchProducts });

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
      description: product.description || "",
      price: String(product.price),
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      stock: String(product.stock ?? 10),
      isAvailable: product.isAvailable,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          stock: parseInt(form.stock, 10) || 10,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar el producto");

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchProducts();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar el producto"));
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data?.error || "No se pudo actualizar");

      fetchProducts();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo actualizar el producto"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto del catalogo?")) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar");
      fetchProducts();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar el producto"));
    }
  };

  return {
    products,
    search,
    setSearch,
    showModal,
    setShowModal,
    showImportModal,
    setShowImportModal,
    csvText,
    setCsvText,
    importing,
    editingId,
    form,
    setForm,
    loading,
    saving,
    error,
    successToast,
    fetchProducts,
    openCreate,
    openEdit,
    handleSubmit,
    handleImportCsv,
    toggleAvailability,
    handleDelete,
  };
}
