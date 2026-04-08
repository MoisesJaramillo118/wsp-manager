// ── Status labels and colors ──
export const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  abierto: 'Abierto',
  pendiente: 'Pendiente',
  cerrado: 'Cerrado',
  spam: 'Spam',
};

export const STATUS_COLORS: Record<string, string> = {
  nuevo: 'badge-mint',
  abierto: 'badge-green',
  pendiente: 'badge-amber',
  cerrado: 'badge-gray',
  spam: 'badge-red',
};

// ── Outcome labels and colors ──
export const OUTCOME_LABELS: Record<string, string> = {
  venta_cerrada: 'Venta cerrada',
  no_interesado: 'No interesado',
  seguimiento: 'Seguimiento',
  sin_respuesta: 'Sin respuesta',
  spam: 'Spam',
  otro: 'Otro',
};

export const OUTCOME_COLORS: Record<string, string> = {
  venta_cerrada: 'badge-green',
  no_interesado: 'badge-red',
  seguimiento: 'badge-amber',
  sin_respuesta: 'badge-gray',
  spam: 'badge-red',
  otro: 'badge-gray',
};

// ── Template categories ──
export const CATEGORY_LABELS: Record<string, string> = {
  saludo: 'Saludo',
  seguimiento: 'Seguimiento',
  cierre: 'Cierre',
  informacion: 'Informacion',
  promocion: 'Promocion',
  otro: 'Otro',
};

// ── Catalog categories ──
export const CATALOG_CATEGORIES: Record<string, string> = {
  catalogo: 'Catalogo',
  lista_precios: 'Lista de Precios',
  ficha_tecnica: 'Ficha Tecnica',
  manual: 'Manual',
  promocion: 'Promocion',
  otro: 'Otro',
};

// ── Navigation sections ──
export interface NavSection {
  id: string;
  label: string;
  icon: string;
  group?: string;
}

export const NAV_SECTIONS: NavSection[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'principal' },
  { id: 'chats', label: 'Chats', icon: '💬', group: 'principal' },
  { id: 'contacts', label: 'Contactos', icon: '👥', group: 'principal' },
  { id: 'templates', label: 'Plantillas', icon: '📝', group: 'contenido' },
  { id: 'catalogs', label: 'Catalogos', icon: '📁', group: 'contenido' },
  { id: 'quick-replies', label: 'Respuestas Rapidas', icon: '⚡', group: 'contenido' },
  { id: 'messaging', label: 'Envios Masivos', icon: '📤', group: 'marketing' },
  { id: 'sales', label: 'Ventas', icon: '💰', group: 'marketing' },
  { id: 'reminders', label: 'Recordatorios', icon: '🔔', group: 'herramientas' },
  { id: 'ai-settings', label: 'Config IA', icon: '🤖', group: 'config' },
  { id: 'alerts', label: 'Alertas', icon: '⚠️', group: 'config' },
  { id: 'connection', label: 'Conexion WhatsApp', icon: '📱', group: 'config' },
  { id: 'users', label: 'Usuarios', icon: '🔐', group: 'config' },
];
