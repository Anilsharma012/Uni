import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ProductRow = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  price?: number;
  category?: string;
  image_url?: string;
  images?: string[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const resolveImage = (src?: string) => {
  const s = String(src || '');
  if (!s) return '/placeholder.svg';
  if (s.startsWith('http')) return s;
  const isLocalBase = (() => { try { return API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1'); } catch { return false; } })();
  const isHttpsPage = (() => { try { return location.protocol === 'https:'; } catch { return false; } })();
  // Only prefix backend for uploaded assets; avoid mixed-content by not prefixing localhost on https pages
  if (s.startsWith('/uploads') || s.startsWith('uploads')) {
    if (API_BASE && !(isLocalBase && isHttpsPage)) {
      const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
      return s.startsWith('/') ? `${base}${s}` : `${base}/${s}`;
    }
  }
  return s;
};

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { ok, json } = await api('/api/products');
        if (!ok) throw new Error(json?.message || json?.error || 'Failed to load');
        const list = Array.isArray(json?.data) ? (json.data as ProductRow[]) : [];
        setProducts(list);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    products.forEach((p) => { if (p.category) cats.add(p.category); });
    return Array.from(cats);
  }, [products]);

  const filteredProducts =
    selectedCategory === "All" ? products : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
            Shop <span className="text-primary">All</span>
          </h1>
          <p className="text-muted-foreground">Browse our complete collection</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">Loading products...</div>
          ) : (
            filteredProducts.map((p) => {
              const id = String(p._id || p.id || '');
              const title = p.title || p.name || '';
              const rawImg = p.image_url || (Array.isArray(p.images) ? p.images[0] : '') || '/placeholder.svg';
              const img = resolveImage(rawImg);
              return (
                <ProductCard
                  key={id}
                  id={id}
                  name={title}
                  price={Number(p.price || 0)}
                  image={img}
                  category={p.category || ''}
                />
              );
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
