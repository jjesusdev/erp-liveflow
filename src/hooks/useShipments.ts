'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Shipment } from '@/types';

export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ trackingNumber: '', carrier: '', notes: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkPrintView, setShowBulkPrintView] = useState(false);

  const fetchShipments = useCallback(async () => {
    try {
      const url = filter === 'all' ? '/api/shipments' : `/api/shipments?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudieron cargar los envios');
      setShipments(await res.json());
    } catch {
      toast.error('Error al cargar los envios');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchShipments();
  }, [fetchShipments]);

  const updateShipment = async (id: string, data: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'No se pudo actualizar el envio');

      if (data.status === 'IN_TRANSIT') {
        toast.success('Paquete despachado', { description: 'Notificacion enviada a la clienta por WhatsApp.' });
      } else {
        toast.success('Estado actualizado');
      }

      setEditingId(null);
      fetchShipments();
    } catch {
      toast.error('No se pudo actualizar el envio');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (shipment: Shipment) => {
    setEditingId(shipment.id);
    setDraft({
      trackingNumber: shipment.trackingNumber || '',
      carrier: shipment.carrier || '',
      notes: shipment.notes || '',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const filteredShipments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments.filter((s) => {
      return (
        !q ||
        (s.lead?.name && s.lead.name.toLowerCase().includes(q)) ||
        (s.lead?.phone && s.lead.phone.includes(q)) ||
        (s.carrier && s.carrier.toLowerCase().includes(q)) ||
        (s.trackingNumber && s.trackingNumber.toLowerCase().includes(q)) ||
        (s.lead?.addressCity && s.lead.addressCity.toLowerCase().includes(q)) ||
        (s.lead?.addressColonia && s.lead.addressColonia.toLowerCase().includes(q))
      );
    });
  }, [shipments, query]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredShipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredShipments.map((s) => s.id));
    }
  };

  const stats = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter((s) => s.status === 'PENDING').length;
    const inTransit = shipments.filter((s) => s.status === 'IN_TRANSIT').length;
    const delivered = shipments.filter((s) => s.status === 'DELIVERED').length;
    return { total, pending, inTransit, delivered };
  }, [shipments]);

  const exportManifestCSV = () => {
    const list = selectedIds.length > 0
      ? shipments.filter((s) => selectedIds.includes(s.id))
      : filteredShipments;

    if (list.length === 0) return;

    const headers = ['ID Envio', 'Cliente', 'Telefono', 'Calle', 'Numero', 'Colonia', 'Ciudad', 'CP', 'Paqueteria', 'Guia', 'Notas', 'Estado'];
    const rows = list.map((s) => [
      s.id.slice(0, 8).toUpperCase(),
      `"${s.lead?.name || 'Cliente'}"`,
      `"${s.lead?.phone || ''}"`,
      `"${s.lead?.addressStreet || ''}"`,
      `"${s.lead?.addressNumber || ''}"`,
      `"${s.lead?.addressColonia || ''}"`,
      `"${s.lead?.addressCity || ''}"`,
      `"${s.lead?.addressZipCode || ''}"`,
      `"${s.carrier || ''}"`,
      `"${s.trackingNumber || ''}"`,
      `"${s.notes?.replace(/"/g, '""') || ''}"`,
      s.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `manifiesto_envios_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Manifiesto exportado', { description: `${list.length} paquetes descargados.` });
  };

  const printBulkLabels = () => {
    setShowBulkPrintView(true);
    setTimeout(() => window.print(), 300);
  };

  return {
    shipments,
    filter,
    setFilter,
    query,
    setQuery,
    loading,
    busyId,
    editingId,
    setEditingId,
    draft,
    setDraft,
    selectedIds,
    showBulkPrintView,
    setShowBulkPrintView,
    updateShipment,
    startEdit,
    toggleSelect,
    toggleSelectAll,
    filteredShipments,
    stats,
    exportManifestCSV,
    printBulkLabels,
    fetchShipments,
  };
}
