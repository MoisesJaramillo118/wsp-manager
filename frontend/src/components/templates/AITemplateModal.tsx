import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { aiService, type TemplateSuggestion } from '../../services/ai';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUseSuggestion: (suggestion: TemplateSuggestion) => void;
}

export const AITemplateModal: React.FC<Props> = ({ isOpen, onClose, onUseSuggestion }) => {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const [step, setStep] = useState<'input' | 'results'>('input');

  const handleGenerate = async () => {
    if (!idea.trim()) {
      toast('Describe tu idea de plantilla', false);
      return;
    }
    setLoading(true);
    try {
      const res = await aiService.templateSuggest(idea.trim());
      const sug = res.data.suggestions || [];
      if (sug.length === 0) {
        toast('No se pudo generar sugerencias. Verifica que la IA este configurada.', false);
        return;
      }
      setSuggestions(sug);
      setStep('results');
    } catch (e: any) {
      toast(e.response?.data?.error || 'Error al generar sugerencias', false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIdea('');
    setSuggestions([]);
    setStep('input');
    onClose();
  };

  const handleUse = (s: TemplateSuggestion) => {
    onUseSuggestion(s);
    handleClose();
  };

  const handleRegenerate = () => {
    setStep('input');
    setSuggestions([]);
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title="Asistente IA - Crear Plantilla" maxWidth="600px">
      {step === 'input' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">
              Describe tu idea de plantilla
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={4}
              className="text-xs"
              placeholder="Ej: promocion de descuento del 30% para temporada de verano, o recordatorio de cita medica..."
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              La IA generara 3-5 sugerencias de plantillas optimizadas para aprobacion en Meta WhatsApp Business.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleGenerate} disabled={loading} className="flex-1">
              {loading ? 'Generando...' : 'Generar sugerencias'}
            </Button>
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {step === 'results' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            La IA genero {suggestions.length} sugerencias. Elige una para usarla:
          </p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <div key={i} className="card" style={{ padding: 12 }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold">{s.nombre}</div>
                    <span className="badge badge-petrol text-[10px] mt-1">{s.categoria}</span>
                  </div>
                  <Button variant="primary" onClick={() => handleUse(s)} className="text-xs">
                    Usar esta
                  </Button>
                </div>
                <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded mb-2 whitespace-pre-wrap">
                  {s.contenido}
                </div>
                {s.explicacion && (
                  <p className="text-[11px] text-slate-500 italic">
                    <strong>Por que cumple Meta:</strong> {s.explicacion}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRegenerate} className="flex-1">
              Regenerar
            </Button>
            <Button variant="secondary" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
