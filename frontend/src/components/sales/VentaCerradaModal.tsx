import React, { useState, useRef } from 'react';
import api from '../../config/api';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { useConfirmClose } from '../../hooks/useConfirmClose';
import type { VentaItem } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  remotePhone: string;
  remoteName: string;
  onSaved?: () => void;
}

const emptyItem = (): VentaItem => ({
  descripcion: '',
  cantidad: 1,
  precio_unitario: 0,
  subtotal: 0,
});

export const VentaCerradaModal: React.FC<Props> = ({ isOpen, onClose, remotePhone, remoteName: _remoteName, onSaved }) => {
  const [items, setItems] = useState<VentaItem[]>([emptyItem()]);
  const [metodo, setMetodo] = useState('yape');
  const [notas, setNotas] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dirty, setDirty] = useState(false);
  const { markDirty: hookMarkDirty, markClean: hookMarkClean, confirmClose } = useConfirmClose('venta-cerrada-modal');

  const markDirty = () => { setDirty(true); hookMarkDirty(); };
  const markClean = () => { setDirty(false); hookMarkClean(); };
  const handleClose = () => { if (confirmClose()) onClose(); };

  const total = items.reduce(
    (sum, i) => sum + (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0),
    0,
  );

  const updateItem = (index: number, patch: Partial<VentaItem>) => {
    setItems((prev) => {
      const next = prev.map((it, i) => {
        if (i !== index) return it;
        const merged = { ...it, ...patch };
        const cantidad = Number(merged.cantidad) || 0;
        const precio = Number(merged.precio_unitario) || 0;
        merged.subtotal = Number((cantidad * precio).toFixed(2));
        return merged;
      });
      return next;
    });
    markDirty();
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
    markDirty();
  };

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    markDirty();
  };

  const resetForm = () => {
    setItems([emptyItem()]);
    setMetodo('yape');
    setNotas('');
    setComprobante(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    const validItems = items.filter(
      (i) => i.descripcion.trim() !== '' && Number(i.cantidad) > 0 && Number(i.precio_unitario) >= 0,
    );

    if (validItems.length === 0) {
      toast('Agrega al menos un producto valido', false);
      return;
    }

    if (total <= 0) {
      toast('El monto total debe ser mayor a 0', false);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('remote_phone', remotePhone);
      formData.append('advisor_id', '0');
      formData.append('items', JSON.stringify(validItems));
      formData.append('monto', total.toString());
      formData.append('metodo_pago', metodo);
      formData.append('notas', notas);
      if (comprobante) {
        formData.append('comprobante', comprobante);
      }

      await api.post('/ventas-cerradas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast('Venta registrada');
      resetForm();
      markClean();
      onSaved?.();
      onClose();
    } catch {
      toast('Error al registrar venta', false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose} dirty={dirty} title="Registrar venta cerrada" maxWidth="560px">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Productos vendidos</label>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr className="text-slate-600">
                  <th className="text-left p-2 font-medium">Descripcion</th>
                  <th className="text-left p-2 font-medium w-14">Cant.</th>
                  <th className="text-left p-2 font-medium w-24">P. Unit (S/)</th>
                  <th className="text-left p-2 font-medium w-24">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-1">
                      <input
                        type="text"
                        value={it.descripcion}
                        onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
                        className="text-xs w-full"
                        placeholder="Ej: Blusa rosa M"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={it.cantidad}
                        onChange={(e) => updateItem(idx, { cantidad: Number(e.target.value) })}
                        className="text-xs w-full"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.precio_unitario}
                        onChange={(e) => updateItem(idx, { precio_unitario: Number(e.target.value) })}
                        className="text-xs w-full"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        readOnly
                        value={`S/ ${it.subtotal.toFixed(2)}`}
                        className="text-xs w-full bg-slate-100"
                        tabIndex={-1}
                      />
                    </td>
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="text-red-500 hover:text-red-700 disabled:text-slate-300 text-sm leading-none px-1"
                        aria-label="Eliminar item"
                        title="Eliminar"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 border-t bg-slate-50">
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Agregar producto
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Monto total (S/)</label>
            <input
              value={total.toFixed(2)}
              readOnly
              type="text"
              className="text-xs bg-slate-100 font-semibold"
              tabIndex={-1}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Metodo de pago</label>
            <select
              value={metodo}
              onChange={(e) => { setMetodo(e.target.value); markDirty(); }}
              className="text-xs"
            >
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="pos">POS</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Comprobante de pago (foto Yape/Plin)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="text-xs w-full border rounded-lg p-2 bg-slate-50"
            onChange={(e) => {
              setComprobante(e.target.files?.[0] || null);
              markDirty();
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">Notas</label>
          <input
            value={notas}
            onChange={(e) => { setNotas(e.target.value); markDirty(); }}
            className="text-xs"
            placeholder="Notas adicionales..."
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          className="btn btn-pr flex-1 text-xs"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Registrando...' : 'Registrar venta'}
        </button>
        <button className="btn btn-sec flex-1 text-xs" onClick={handleClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
};
