import { Navbar } from "@/components/Navbar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const resolveImage = (src?: string) => {
  const s = String(src || '');
  if (!s) return '/placeholder.svg';
  if (s.startsWith('http')) return s;
  const isLocalBase = (() => { try { return API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1'); } catch { return false; } })();
  const isHttpsPage = (() => { try { return location.protocol === 'https:'; } catch { return false; } })();
  if (s.startsWith('/uploads') || s.startsWith('uploads')) {
    if (API_BASE && !(isLocalBase && isHttpsPage)) {
      const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
      return s.startsWith('/') ? `${base}${s}` : `${base}/${s}`;
    }
  }
  return s;
};

type P = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  price?: number;
  category?: string;
  description?: string;
  stock?: number;
  image_url?: string;
  images?: string[];
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<P | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { ok, json } = await api(`/api/products/${id}`);
        if (!ok) throw new Error(json?.message || json?.error || 'Failed to load product');
        setProduct(json?.data as P);
      } catch (e: any) {
        toast({ title: e?.message || 'Failed to load product', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const img = useMemo(() => resolveImage(product?.image_url || (product?.images?.[0] || '')), [product]);
  const title = product?.title || product?.name || '';

  const handleAddToCart = () => {
    if (!product) return;
    const item = { id: String(product._id || product.id || id), title, price: Number(product.price || 0), image: img };
    if (!user) {
      try { localStorage.setItem('uni_add_intent', JSON.stringify({ item, qty: quantity })); } catch {}
      navigate('/auth');
      return;
    }
    addToCart(item, quantity);
    toast({ title: 'Added to cart!', description: `${title} has been added to your cart.` });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading…</div>;
  if (!product) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Link to="/shop"><Button>Back to Shop</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Link to="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shop
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
            <img src={img} alt={title} className="w-full h-full object-cover" />
          </div>

          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">{product.category}</p>
            <h1 className="text-4xl font-black tracking-tighter mb-4">{title}</h1>
            <p className="text-3xl font-bold mb-6">₹{Number(product.price || 0).toLocaleString('en-IN')}</p>
            <p className="text-muted-foreground mb-8">{product.description}</p>

            <div className="mb-8">
              <label className="block text-sm font-semibold mb-3">Quantity</label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                <span className="font-semibold min-w-[40px] text-center">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>+</Button>
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
