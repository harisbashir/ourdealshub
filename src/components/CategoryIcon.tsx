import {
  Baby,
  Bike,
  BookOpen,
  Car,
  Cpu,
  Flame,
  Gamepad2,
  Heart,
  Home,
  PawPrint,
  Shirt,
  Tag,
  type LucideIcon,
} from "lucide-react";

/** Icon names an admin can pick for a category (CategoryForm). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  flame: Flame,
  cpu: Cpu,
  home: Home,
  shirt: Shirt,
  heart: Heart,
  gamepad: Gamepad2,
  bike: Bike,
  book: BookOpen,
  paw: PawPrint,
  baby: Baby,
  car: Car,
  tag: Tag,
};

export function CategoryIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[name] || Tag;
  return <Icon className={className} aria-hidden />;
}
