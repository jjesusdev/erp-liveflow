export type ConversationStatus = 'nuevos' | 'atencion' | 'esperando' | 'pagados' | 'despachados'
export type CustomerTier = 'vip' | 'recurrente' | 'nueva'

export const STATUSES: { id: ConversationStatus; label: string; short: string }[] = [
  { id: 'nuevos', label: 'Nuevos', short: 'Nuevos' },
  { id: 'atencion', label: 'En Atención', short: 'Atención' },
  { id: 'esperando', label: 'Esperando Pago', short: 'Esperando' },
  { id: 'pagados', label: 'Pagados', short: 'Pagados' },
  { id: 'despachados', label: 'Despachados', short: 'Desp.' },
]

export type Conversation = {
  id: string
  name: string
  phone: string
  tier: CustomerTier
  status: ConversationStatus
  lockedBy?: string
  minutesAgo: number
  preview: string
  unread: number
  totalSpent: number
  paidOrders: number
  apartado?: { amount: number; expiresInSec: number }
}

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    name: 'Daniela Ríos',
    phone: '+52 55 4120 8833',
    tier: 'vip',
    status: 'esperando',
    lockedBy: 'Mariana',
    minutesAgo: 2,
    preview: 'Ya te mandé el comprobante 🙌',
    unread: 2,
    totalSpent: 12840,
    paidOrders: 23,
    apartado: { amount: 450, expiresInSec: 22 * 60 },
  },
  {
    id: 'c2',
    name: 'Fernanda López',
    phone: '+52 33 1987 6620',
    tier: 'recurrente',
    status: 'nuevos',
    minutesAgo: 0,
    preview: 'Quiero el vestido verde talla M',
    unread: 1,
    totalSpent: 3210,
    paidOrders: 5,
  },
  {
    id: 'c3',
    name: 'Ana Sofía Treviño',
    phone: '+52 81 2245 1109',
    tier: 'nueva',
    status: 'nuevos',
    minutesAgo: 1,
    preview: '¿Hacen envíos a Monterrey?',
    unread: 3,
    totalSpent: 0,
    paidOrders: 0,
  },
  {
    id: 'c4',
    name: 'Karla Méndez',
    phone: '+52 55 6610 2741',
    tier: 'vip',
    status: 'atencion',
    lockedBy: 'Lucía',
    minutesAgo: 4,
    preview: 'Apártame la blusa crema porfa',
    unread: 0,
    totalSpent: 9480,
    paidOrders: 17,
  },
  {
    id: 'c5',
    name: 'Regina Castro',
    phone: '+52 222 410 9981',
    tier: 'recurrente',
    status: 'esperando',
    minutesAgo: 7,
    preview: 'Al rato te transfiero',
    unread: 0,
    totalSpent: 1890,
    paidOrders: 3,
    apartado: { amount: 780, expiresInSec: 9 * 60 },
  },
  {
    id: 'c6',
    name: 'Mónica Salas',
    phone: '+52 55 3300 1472',
    tier: 'nueva',
    status: 'pagados',
    minutesAgo: 11,
    preview: 'Gracias! ✨',
    unread: 0,
    totalSpent: 620,
    paidOrders: 1,
  },
  {
    id: 'c7',
    name: 'Paola Gutiérrez',
    phone: '+52 664 118 2093',
    tier: 'vip',
    status: 'despachados',
    minutesAgo: 38,
    preview: 'Guía: 7841 2290 1134',
    unread: 0,
    totalSpent: 15320,
    paidOrders: 31,
  },
  {
    id: 'c8',
    name: 'Valeria Ortiz',
    phone: '+52 477 902 3318',
    tier: 'recurrente',
    status: 'atencion',
    lockedBy: 'Mariana',
    minutesAgo: 3,
    preview: '¿Tienes los jeans en 28?',
    unread: 1,
    totalSpent: 2740,
    paidOrders: 4,
  },
]

export type Message =
  | { id: string; kind: 'text'; from: 'in' | 'out'; text: string; time: string }
  | { id: string; kind: 'voice'; from: 'in' | 'out'; durationSec: number; time: string }
  | { id: string; kind: 'image'; from: 'in' | 'out'; src: string; caption?: string; time: string }
  | {
      id: string
      kind: 'receipt'
      from: 'in'
      src: string
      amount: number
      time: string
      approved?: boolean
    }

export const THREAD: Message[] = [
  { id: 'm1', kind: 'text', from: 'in', text: 'Holaa! Quiero el vestido satinado verde, el #14 del live 💚', time: '21:02' },
  {
    id: 'm2',
    kind: 'text',
    from: 'out',
    text: 'Hola Dani! Te lo aparto 30 min. Talla M disponible. Total $450 MXN con envío incluido.',
    time: '21:02',
  },
  { id: 'm3', kind: 'voice', from: 'in', durationSec: 14, time: '21:04' },
  {
    id: 'm4',
    kind: 'text',
    from: 'out',
    text: 'Claro, también te puedo agregar la blusa crema a tu bolsa y se va en el mismo envío.',
    time: '21:05',
  },
  { id: 'm5', kind: 'receipt', from: 'in', src: '/images/comprobante.png', amount: 450, time: '21:07' },
  { id: 'm6', kind: 'text', from: 'in', text: 'Ya te mandé el comprobante 🙌', time: '21:07' },
]

export const SHORTCUTS = [
  { id: '/datos', label: '/datos', text: 'Te comparto los datos para transferencia: BBVA · CLABE 012 180 0152 3344 9910 · A nombre de LiveFlow Boutique.' },
  { id: '/apartar', label: '/apartar', text: '¡Listo! Tu prenda queda apartada por 30 minutos. Envíame tu comprobante para confirmarla 💛' },
  { id: '/envios', label: '/envios', text: 'Enviamos a todo México por Estafeta (2–4 días hábiles). Envío $99 MXN o gratis en compras +$1,200.' },
  { id: '/tallas', label: '/tallas', text: 'Guía de tallas: CH (24–26), M (28–30), G (32–34). Si tienes dudas te paso medidas exactas.' },
]

export type Product = { sku: string; name: string; size: string; price: number; img: string; stock: number }

export const CATALOG: Product[] = [
  { sku: 'VST-014', name: 'Vestido satinado esmeralda', size: 'M', price: 450, img: '/images/prenda-vestido.png', stock: 3 },
  { sku: 'BLS-022', name: 'Blusa lino crema', size: 'CH', price: 330, img: '/images/prenda-blusa.png', stock: 6 },
  { sku: 'JNS-031', name: 'Jeans wide leg', size: '28', price: 520, img: '/images/prenda-jeans.png', stock: 2 },
]

export type Transaction = {
  folio: string
  customer: string
  items: string
  method: 'transferencia' | 'mercadopago'
  amount: number
  status: 'pagado' | 'apartado' | 'vencido'
  time: string
  operator: string
}

export const TRANSACTIONS: Transaction[] = [
  { folio: 'LF-8K2Q9XRA', customer: 'Daniela Ríos', items: 'Vestido satinado esmeralda', method: 'transferencia', amount: 450, status: 'pagado', time: '21:07', operator: 'Mariana' },
  { folio: 'LF-3MZP7TQC', customer: 'Karla Méndez', items: 'Blusa lino crema ×2', method: 'transferencia', amount: 660, status: 'pagado', time: '21:05', operator: 'Lucía' },
  { folio: 'LF-9BHW4NKE', customer: 'Regina Castro', items: 'Jeans wide leg + Blusa', method: 'mercadopago', amount: 780, status: 'apartado', time: '21:04', operator: 'Mariana' },
  { folio: 'LF-5TRX2LVA', customer: 'Mónica Salas', items: 'Top tejido arena', method: 'transferencia', amount: 620, status: 'pagado', time: '21:01', operator: 'Lucía' },
  { folio: 'LF-7QEY6JDM', customer: 'Paola Gutiérrez', items: 'Bolsa Live (5 prendas)', method: 'transferencia', amount: 2150, status: 'pagado', time: '20:58', operator: 'Mariana' },
  { folio: 'LF-2NCU8GPH', customer: 'Sofía Herrera', items: 'Falda plisada negra', method: 'mercadopago', amount: 390, status: 'vencido', time: '20:52', operator: 'Lucía' },
  { folio: 'LF-6WAK3SBF', customer: 'Valeria Ortiz', items: 'Jeans wide leg', method: 'transferencia', amount: 520, status: 'apartado', time: '20:49', operator: 'Mariana' },
  { folio: 'LF-4JLD9MZT', customer: 'Itzel Navarro', items: 'Vestido midi floral', method: 'transferencia', amount: 580, status: 'pagado', time: '20:44', operator: 'Lucía' },
  { folio: 'LF-1PFV5RYQ', customer: 'Camila Pérez', items: 'Blazer oversize', method: 'mercadopago', amount: 890, status: 'pagado', time: '20:41', operator: 'Mariana' },
  { folio: 'LF-8XGT2HCN', customer: 'Andrea Flores', items: 'Set deportivo', method: 'transferencia', amount: 710, status: 'vencido', time: '20:37', operator: 'Lucía' },
]

export const HUD_NAMES = ['Ximena R.', 'Lorena P.', 'Jimena T.', 'Brenda S.', 'Alejandra M.', 'Mariela V.', 'Natalia G.', 'Renata C.', 'Carolina D.', 'Abril H.']
export const HUD_ITEMS: { name: string; price: number }[] = [
  { name: 'Vestido satinado esmeralda', price: 450 },
  { name: 'Blusa lino crema', price: 330 },
  { name: 'Jeans wide leg', price: 520 },
  { name: 'Top tejido arena', price: 290 },
  { name: 'Falda plisada negra', price: 390 },
  { name: 'Bolsa Live (3 prendas)', price: 1180 },
]
