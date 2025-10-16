import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

import { WishlistItem } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

import { api } from '@/lib/api';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchWishlist = async () => {
    if (!user) return;
    try {
      // Backend should return wishlist with populated product
      const query = `/api/wishlist?userId=${encodeURIComponent(String((user as any).id || (user as any)._id || ''))}`;
      const { ok, json } = await api(query);
      if (!ok) throw new Error(json?.message || json?.error || 'Failed to load wishlist');
      const data = json;
      // api() returns { ok, json } wrapper for relative fetch; if backend returns array directly, handle it
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : (data?.wishlist || []);
      setWishlistItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load wishlist');
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (id: string) => {
    try {
      const { ok, json } = await api(`/api/wishlist/${id}`, { method: 'DELETE' });
      if (!ok) throw new Error(json?.message || json?.error || 'Failed to remove item');
      toast.success('Removed from wishlist');
      fetchWishlist();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove item');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
            My <span className="text-primary">Wishlist</span>
          </h1>
          <p className="text-muted-foreground">Your saved items</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading wishlist...</div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
            <Button onClick={() => navigate('/products')}>Browse Products</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item: any) => (
              <Card key={item.id || item._id} className="overflow-hidden bg-card border-border">
                {item.products && (
                  <>
                    <div className="aspect-square overflow-hidden bg-secondary">
                      <img
                        src={item.products.image_url}
                        alt={item.products.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {item.products.category}
                      </p>
                      <h3 className="font-semibold mb-2">{item.products.name}</h3>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold">
                          ₹{Number(item.products.price || 0).toLocaleString('en-IN')}
                        </p>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => removeFromWishlist(String(item.id || item._id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;
