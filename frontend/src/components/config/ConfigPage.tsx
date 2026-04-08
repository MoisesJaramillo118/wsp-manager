import React, { useState, useEffect } from 'react';
import { connectionService } from '../../services/connection';
import { alertService } from '../../services/alerts';
import type { AlertasConfig } from '../../types';
import { toast } from '../ui/Toast';
import { useUiStore } from '../../stores/uiStore';

const COUNTRIES = [
  { code: '+51', label: 'Peru (+51)' },
  { code: '+1', label: 'USA (+1)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+57', label: 'Colombia (+57)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+56', label: 'Chile (+56)' },
  { code: '+593', label: 'Ecuador (+593)' },
  { code: '+591', label: 'Bolivia (+591)' },
  { code: '+55', label: 'Brasil (+55)' },
  { code: '+34', label: 'Espana (+34)' },
];

type ConnMethod = 'qr' | 'code';

export const ConfigPage: React.FC = () => {
  const connectionStatus = useUiStore((s) => s.connectionStatus);
  const setConnectionStatus = useUiStore((s) => s.setConnectionStatus);

  const [connMethod, setConnMethod] = useState<ConnMethod>('qr');
  const [country, setCountry] = useState('+51');
  const [phone, setPhone] = useState('');
  const [qrData, setQrData] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Alertas
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertMinutes, setAlertMinutes] = useState(15);

  useEffect(() => {
    loadConnectionStatus();
    loadAlertConfig();
  }, []);



  const loadConnectionStatus = async () => {
    try {
      const res = await connectionService.status();
      const data = res.data;
      const state = data?.instance?.state || data?.state || 'close';
      setConnectionStatus(state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected');
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  const loadAlertConfig = async () => {
    try {
      const res = await alertService.getConfig();
      const config: AlertasConfig = res.data;
      setAlertEnabled(config.activo);
      setAlertMinutes(config.minutos_sin_responder);
    } catch {
      // defaults are fine
    }
  };

  const handleConnectQR = async () => {
    setConnecting(true);
    setQrData('');
    setPairingCode('');
    try {
      setConnectionStatus('connecting');
      await connectionService.create();
      const qrRes = await connectionService.qr();
      const qrImg = qrRes.data?.base64 || (qrRes.data?.code ? 'data:image/png;base64,' + qrRes.data.code : '');
      if (qrImg) {
        setQrData(qrImg);
        toast('Escanea el codigo QR con WhatsApp');
      } else {
        // Already connected, no QR needed
        const state = qrRes.data?.instance?.state;
        if (state === 'open') {
          setConnectionStatus('connected');
          toast('WhatsApp ya esta conectado!');
          setConnecting(false);
          return;
        }
      }
      // Poll for connection status
      const interval = setInterval(async () => {
        try {
          const statusRes = await connectionService.status();
          const state = statusRes.data?.instance?.state || statusRes.data?.state || 'close';
          if (state === 'open') {
            setConnectionStatus('connected');
            setQrData('');
            clearInterval(interval);
            toast('WhatsApp conectado!');
          }
        } catch {
          // keep polling
        }
      }, 3000);
      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(interval), 120000);
    } catch {
      toast('Error al generar QR', false);
      setConnectionStatus('disconnected');
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectCode = async () => {
    if (!phone.trim()) {
      toast('Ingresa tu numero de telefono', false);
      return;
    }
    setConnecting(true);
    setPairingCode('');
    setQrData('');
    try {
      setConnectionStatus('connecting');
      const fullPhone = `${country}${phone}`.replace(/\+/g, '');
      const result = await connectionService.createWithCode(fullPhone);
      setPairingCode(result.data?.code || result.data?.pairingCode || '');
      toast('Ingresa el codigo en WhatsApp');
    } catch {
      toast('Error al obtener codigo', false);
      setConnectionStatus('disconnected');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await connectionService.logout();
      setConnectionStatus('disconnected');
      setQrData('');
      setPairingCode('');
      toast('WhatsApp desconectado');
    } catch {
      toast('Error al desconectar', false);
    }
  };

  const saveAlertaConfig = async () => {
    try {
      await alertService.updateConfig({
        activo: alertEnabled,
        minutos_sin_responder: alertMinutes,
      });
      toast('Configuracion de alertas guardada');
    } catch {
      toast('Error al guardar alertas', false);
    }
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div>
      <h2 className="text-xl font-semibold mb-5">Conexion WhatsApp</h2>
      <div className="card max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[260px]">
            {/* Connection status */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`dot ${isConnected ? 'dot-green' : connectionStatus === 'connecting' ? 'dot-yellow' : 'dot-red'}`} />
              <span className="text-xs text-slate-500">
                {isConnected ? 'Conectado' : connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
              </span>
            </div>

            {/* Method tabs */}
            <div className="flex gap-2 mb-4">
              <button
                className={`btn btn-sm text-xs ${connMethod === 'qr' ? 'btn-pr' : 'btn-sec'}`}
                onClick={() => setConnMethod('qr')}
              >
                Codigo QR
              </button>
              <button
                className={`btn btn-sm text-xs ${connMethod === 'code' ? 'btn-pr' : 'btn-sec'}`}
                onClick={() => setConnMethod('code')}
              >
                Codigo Verificacion
              </button>
            </div>

            {/* QR method */}
            {connMethod === 'qr' && (
              <div>
                <button
                  className="btn btn-pr btn-sm text-xs"
                  onClick={handleConnectQR}
                  disabled={connecting || isConnected}
                >
                  {connecting ? 'Generando...' : 'Conectar con QR'}
                </button>
              </div>
            )}

            {/* Code method */}
            {connMethod === 'code' && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Ingresa tu numero de WhatsApp:</p>
                <div className="flex gap-2 mb-2">
                  <select
                    className="w-[120px] shrink-0 text-xs"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="987654321"
                    className="flex-1 text-xs"
                  />
                </div>
                <button
                  className="btn btn-pr btn-sm text-xs"
                  onClick={handleConnectCode}
                  disabled={connecting || isConnected}
                >
                  {connecting ? 'Obteniendo...' : 'Obtener Codigo'}
                </button>
              </div>
            )}

            {/* Disconnect button */}
            {isConnected && (
              <button
                className="btn btn-sec btn-sm text-xs mt-3"
                onClick={handleDisconnect}
              >
                Desconectar
              </button>
            )}
          </div>

          {/* QR/Code display area */}
          <div className="qr-box">
            {qrData ? (
              <img
                src={qrData}
                alt="QR Code"
                style={{ width: 220, height: 220, borderRadius: 8 }}
              />
            ) : pairingCode ? (
              <div className="pairing-code">{pairingCode}</div>
            ) : (
              <p className="text-xs text-slate-400 text-center px-4">
                Selecciona un metodo de conexion
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Alertas Config */}
      <div className="mt-5">
        <h2 className="text-xl font-semibold mb-4">Alertas de conversacion</h2>
        <div className="card max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-500">Recibe alertas cuando un cliente lleva tiempo sin respuesta</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs">{alertEnabled ? 'Activadas' : 'Desactivadas'}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={alertEnabled}
                  onChange={(e) => {
                    setAlertEnabled(e.target.checked);
                    setTimeout(saveAlertaConfig, 0);
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-petrol-400 transition-colors" />
                <div className="absolute left-[2px] top-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">
                Alertar si un cliente lleva mas de X minutos sin respuesta
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  value={alertMinutes}
                  onChange={(e) => setAlertMinutes(Number(e.target.value))}
                  onBlur={saveAlertaConfig}
                  className="text-xs w-24"
                />
                <span className="text-xs text-slate-400">minutos</span>
              </div>
            </div>
            <div className="p-3 bg-petrol-50 rounded-lg">
              <p className="text-xs text-petrol-700">
                Las alertas aparecen en el Dashboard y en la seccion Chat como badges.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
