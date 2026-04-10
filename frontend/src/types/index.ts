// ── Advisor ──
export interface Advisor {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  color: string;
  especialidad: string;
  local_tienda: string;
  max_chats: number;
  activo: boolean;
  chats_asignados?: number;
  en_turno?: boolean;
  ultimo_check_in?: string | null;
  ultimo_check_out?: string | null;
}

// ── Conversation ──
export type ConversationStatus =
  | 'nuevo'
  | 'abierto'
  | 'pendiente'
  | 'cerrado'
  | 'spam'
  | 'sin_responder'
  | 'ia_atendido'
  | 'necesita_asesor'
  | 'asignado'
  | 'resuelto';

export interface Conversation {
  remote_phone: string;
  remote_name: string;
  last_message_at: string;
  last_message: string;
  last_direction: 'incoming' | 'outgoing';
  total_messages: number;
  incoming_count: number;
  status: ConversationStatus;
  needs_human: boolean;
  advisor_id: number | null;
  advisor_nombre: string | null;
  advisor_color: string | null;
  origen?: string;
  outcome?: string;
}

// ── Chat Message ──
export interface ChatMessage {
  id: number;
  remote_phone: string;
  remote_name: string;
  message: string;
  direction: 'incoming' | 'outgoing';
  is_ai_response: boolean;
  sent_via: string;
  delivery_status?: string;
  created_at: string;
  entry_type: string;
}

// ── Contact ──
export interface Contact {
  id: number;
  nombre: string;
  telefono: string;
  grupo_id: number | null;
  grupo_nombre?: string;
  grupo_color?: string;
  notas: string;
  activo: boolean;
}

// ── Contact Group ──
export interface ContactGroup {
  id: number;
  nombre: string;
  color: string;
  total_contacts: number;
  created_at: string;
}

// ── Template ──
export interface Template {
  id: number;
  nombre: string;
  categoria: string;
  contenido: string;
  activo: boolean;
}

// ── Catalog ──
export interface Catalog {
  id: number;
  nombre: string;
  categoria: string;
  descripcion: string;
  keywords: string;
  filename: string;
  filepath: string;
  filesize: number;
  activo: boolean;
  downloads: number;
}

// ── Tag ──
export interface Tag {
  id: number;
  nombre: string;
  color: string;
}

// ── Venta Item ──
export interface VentaItem {
  id?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

// ── Venta Cerrada ──
export interface VentaCerrada {
  id: number;
  remote_phone: string;
  remote_name: string;
  advisor_id: number;
  advisor_nombre: string;
  monto: number;
  metodo_pago: string;
  productos_descripcion: string;
  comprobante_url: string;
  notas: string;
  origen: string;
  created_at: string;
  items?: VentaItem[];
}

// ── Reminder ──
export interface Reminder {
  id: number;
  remote_phone: string;
  advisor_id: number;
  note: string;
  remind_at: string;
  status: string;
  created_at: string;
  remote_name?: string;
}

// ── AI Settings ──
export interface AISettings {
  id: number;
  enabled: boolean;
  provider: string;
  model: string;
  system_prompt: string;
  max_tokens: number;
  has_api_key: boolean;
  api_key_masked: string;
}

// ── Alertas Config ──
export interface AlertasConfig {
  id: number;
  minutos_sin_responder: number;
  activo: boolean;
  notificar_admin: boolean;
}

// ── Dashboard Stats ──
export interface DashboardStats {
  total_conversations: number;
  active_conversations: number;
  pending_conversations: number;
  closed_conversations: number;
  spam_conversations: number;
  needs_human_count: number;
  total_messages: number;
  incoming_messages: number;
  outgoing_messages: number;
  ai_messages: number;
  total_contacts: number;
  active_contacts: number;
  total_templates: number;
  total_catalogs: number;
  total_advisors: number;
  active_advisors: number;
  total_ventas: number;
  monto_total_ventas: number;
  ventas_hoy: number;
  monto_hoy: number;
  messages_today: number;
  new_conversations_today: number;
}

// ── Dashboard Alert ──
export interface DashboardAlert {
  remote_phone: string;
  remote_name: string;
  last_message: string;
  minutes_waiting: number;
  status: ConversationStatus;
  advisor_id: number | null;
  advisor_nombre: string | null;
}

// ── Weekly Chart Day ──
export interface WeeklyChartDay {
  fecha: string;
  enviados: number;
  ventas: number;
  chats_entrantes: number;
}

// ── Paginated Response ──
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
