import {
  Briefcase,
  Headphones,
  MessageCircle,
  Rocket,
  Scale,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface AgenteIconOption {
  id: string;
  icon: LucideIcon;
  label: string;
}

export interface AgenteCorOption {
  id: string;
  classe: string;
  label: string;
}

export const AGENTE_ICON_OPTIONS: AgenteIconOption[] = [
  { id: "shield", icon: Shield, label: "Escudo" },
  { id: "briefcase", icon: Briefcase, label: "Maleta" },
  { id: "settings", icon: Settings, label: "Engrenagem" },
  { id: "cart", icon: ShoppingCart, label: "Carrinho" },
  { id: "rocket", icon: Rocket, label: "Foguete" },
  { id: "scale", icon: Scale, label: "Balança" },
  { id: "headphones", icon: Headphones, label: "Suporte" },
  { id: "message", icon: MessageCircle, label: "Chat" },
  { id: "sparkles", icon: Sparkles, label: "IA" },
];

export const AGENTE_COR_OPTIONS: AgenteCorOption[] = [
  { id: "pink", classe: "bg-pink-500", label: "Rosa" },
  { id: "orange", classe: "bg-orange-500", label: "Laranja" },
  { id: "purple", classe: "bg-purple-500", label: "Roxo" },
  { id: "blue", classe: "bg-blue-500", label: "Azul" },
  { id: "emerald", classe: "bg-emerald-500", label: "Verde" },
  { id: "amber", classe: "bg-amber-500", label: "Âmbar" },
  { id: "cyan", classe: "bg-cyan-500", label: "Ciano" },
  { id: "rose", classe: "bg-rose-500", label: "Rosé" },
];
