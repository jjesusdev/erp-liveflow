'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Lead } from '@/types';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', source: '', internalNotes: '' });
  const [saving, setSaving] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const url = search ? `/api/leads?search=${encodeURIComponent(search)}` : '/api/leads';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar');
      const data: Lead[] = await res.json();
      setLeads(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch {
      toast.error('No se pudieron cargar las clientas');
    } finally {
      setLoading(false);
    }
  }, [search, selectedId]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 180);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedId) || leads[0] || null;
  }, [leads, selectedId]);

  const openCreate = () => {
    setEditingLead(null);
    setForm({ phone: '', name: '', source: 'whatsapp', internalNotes: '' });
    setShowModal(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      phone: lead.phone || '',
      name: lead.name || '',
      source: lead.source || '',
      internalNotes: lead.internalNotes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = editingLead ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Error al guardar');
      toast.success(editingLead ? 'Clienta actualizada' : 'Clienta creada');
      setShowModal(false);
      fetchLeads();
    } catch {
      toast.error('No se pudo guardar la clienta');
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (tierFilter === 'all') return true;
      return l.tier === tierFilter;
    });
  }, [leads, tierFilter]);

  const stats = useMemo(() => {
    const totalRevenue = leads.reduce((sum, l) => sum + (l.totalSpent || 0), 0);
    const totalOrders = leads.reduce((sum, l) => sum + (l.totalPaidCount || 0), 0);
    const vipCount = leads.filter((l) => l.tier === 'VIP').length;
    return {
      totalRevenue,
      totalOrders,
      vipCount,
      count: leads.length,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [leads]);

  const exportCsv = () => {
    if (filteredLeads.length === 0) return;
    const header = 'Nombre,Telefono,Nivel,Compras,Total_Gastado,Origen,Direccion,Notas';
    const body = filteredLeads
      .map((l) => [
        l.name || 'Sin nombre',
        l.phone,
        l.tier || 'NEW',
        l.totalPaidCount || 0,
        (l.totalSpent || 0).toFixed(2),
        l.source || 'WhatsApp',
        `${l.addressStreet || ''} ${l.addressNumber || ''} ${l.addressColonia || ''} ${l.addressCity || ''}`.trim(),
        l.internalNotes || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientas-${tierFilter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Directorio exportado', { description: `${filteredLeads.length} clientas descargadas.` });
  };

  return {
    leads,
    search,
    setSearch,
    tierFilter,
    setTierFilter,
    selectedId,
    setSelectedId,
    loading,
    showModal,
    setShowModal,
    editingLead,
    form,
    setForm,
    saving,
    selectedLead,
    openCreate,
    openEdit,
    handleSave,
    filteredLeads,
    stats,
    exportCsv,
    fetchLeads,
  };
}
