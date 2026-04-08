import React, { useState, useRef } from 'react';
import { salesService } from '../../services/sales';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { useConfirmClose } from '../../hooks/useConfirmClose';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  remotePhone: string;
  remoteName: string;
  onSaved?: () => void;
}

export const VentaCerradaModal: React.FC<Props> = ({ isOpen, onClose, remotePhone, remoteName: _remoteName, onSaved }) => {
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('yape');
  const [productos, setProductos] = useState('');
  const [notas, setNotas] = useState('');
  const [_comprobante, setComprobante] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dirty, setDirty] = useState(false);
  const { markDirty: hookMarkDirty, markClean: hookMarkClean, confirmClose } = useConfirmClose('venta-cerrada-modal');

  const markDirty = () => { setDirty(true); hookMarkDirty(); };
  const markClean = () => { setDirty(false); hookMarkClean(); };
  const handleClose = () => { if (confirmClose()) onClose(); };

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) {
      toast('Ingresa un monto valido', false);
      return;
    }

    setSaving(true);
    try {
      await salesService.create({
        remote_phone: remotePhone,
        advisor_id: 0, // Will be set by backend from auth token
        monto: Number(monto),
        metodo_pago: metodo,
        productos_descripcion: productos,
        notas,
      });
      toast('Venta registrada');
      // Reset form
      setMonto('');
      setMetodo('yape');
      setProductos('');
      setNotas('');
      setComprobante(null);
      if (fileRef.current) fileRef.current.value = '';
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
    <Modal open={isOpen} onClose={handleClose} dirty={dirty} title="Registrar venta cerrada" maxWidth="460px">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Monto (S/)</label>
            <input
              value={monto}
              onChange={(e) => { setMonto(e.target.value); markDirty(); }}
              type="number"
              step="0.01"
              className="text-xs"
              placeholder="0.00"
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
          <label className="block text-xs font-medium mb-1 text-slate-500">Productos vendidos</label>
          <textarea
            value={productos}
            onChange={(e) => { setProductos(e.target.value); markDirty(); }}
            rows={2}
            className="text-xs"
            placeholder="Ej: 2 blusas rosa talla M, 1 vestido negro L"
          />
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
