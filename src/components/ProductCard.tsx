import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

export const ProductCard = ({ id, name, price, image, category }: ProductCardProps) => {
  const { user } = useAuth();
  const { addToCart } = (() => { try { return useCart(); } catch { return { addToCart: () => {} } as any; } })();
  const navigate = useNavigate();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    const item = { id, title: name, price, image };
    if (!user) {
      try {
        localStorage.setItem('uni_add_intent', JSON.stringify({ item, qty: 1 }));
      } catch {}
      navigate('/auth');
      return;
    }
    addToCart(item, 1);
    toast.success('Added to cart');
  };

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const src = (() => {
    const s = String(image || '');
    if (!s) return '/placeholder.svg';
    if (s.startsWith('http')) return s;
    // Only prefix backend for uploaded assets; avoid mixed-content by not prefixing localhost on https pages
    if (s.startsWith('/uploads') || s.startsWith('uploads')) {
      const isLocalBase = (() => { try { return API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1'); } catch { return false; } })();
      const isHttpsPage = (() => { try { return location.protocol === 'https:'; } catch { return false; } })();
      if (API_BASE && !(isLocalBase && isHttpsPage)) {
        const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
        return s.startsWith('/') ? `${base}${s}` : `${base}/${s}`;
      }
    }
    return s;
  })();

  return (
    <Card className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300">
      <Link to={`/product/${id}`}>
        <div className="aspect-square overflow-hidden bg-secondary">
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {category}
        </p>
        <Link to={`/product/${id}`}>
          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">₹{price.toLocaleString('en-IN')}</p>
          <Button onClick={handleAdd} size="icon" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
