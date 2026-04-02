import {
  UtensilsCrossed,
  Pill,
  ShoppingBag,
  Bus,
  AlertTriangle,
  Zap,
  Home,
  Wifi,
  GraduationCap,
  Dumbbell,
  Plane,
  Music,
  Heart,
  Gift,
  Coffee,
  Fuel,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  comida: UtensilsCrossed,
  alimentación: UtensilsCrossed,
  alimento: UtensilsCrossed,
  restaurante: Coffee,
  café: Coffee,
  farmacia: Pill,
  salud: Heart,
  'compras personales': ShoppingBag,
  compras: ShoppingBag,
  ropa: ShoppingBag,
  transporte: Bus,
  uber: Bus,
  taxi: Bus,
  gasolina: Fuel,
  bencina: Fuel,
  imprevistos: AlertTriangle,
  emergencia: AlertTriangle,
  servicios: Zap,
  luz: Zap,
  agua: Zap,
  gas: Zap,
  arriendo: Home,
  hogar: Home,
  casa: Home,
  internet: Wifi,
  teléfono: Wifi,
  educación: GraduationCap,
  estudio: GraduationCap,
  gimnasio: Dumbbell,
  deporte: Dumbbell,
  viaje: Plane,
  vacaciones: Plane,
  entretenimiento: Music,
  ocio: Music,
  regalo: Gift,
  suscripción: Zap,
};

export function getCategoryIcon(categoryName: string): LucideIcon {
  const key = categoryName.toLowerCase().trim();

  // Exact match
  if (CATEGORY_ICON_MAP[key]) {
    return CATEGORY_ICON_MAP[key];
  }

  // Partial match
  for (const [mapKey, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return icon;
    }
  }

  return ShoppingBag; // fallback
}
