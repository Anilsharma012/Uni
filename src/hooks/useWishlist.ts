import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const WISHLIST_STORAGE_KEY = 'uni_wishlist_ids';

export function useWishlist() {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load wishlist on mount or when user changes
  useEffect(() => {
    loadWishlist();
  }, [user]);

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        // Load from server
        const { ok, json } = await api('/api/wishlist');
        if (ok) {
          const data = Array.isArray(json?.data) ? json.data : [];
          const ids = new Set(
            data.map((item: any) => String(item.productId || item.product_id || ''))
          );
          setWishlistIds(ids);
          // Sync to localStorage
          try {
            localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(Array.from(ids)));
          } catch (e) {
            console.warn('Failed to save wishlist to localStorage', e);
          }
        }
      } else {
        // Load from localStorage
        try {
          const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
          if (stored) {
            const ids = new Set(JSON.parse(stored));
            setWishlistIds(ids);
          } else {
            setWishlistIds(new Set());
          }
        } catch (e) {
          console.warn('Failed to load wishlist from localStorage', e);
          setWishlistIds(new Set());
        }
      }
    } catch (e) {
      console.error('Failed to load wishlist', e);
      setWishlistIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlistIds.has(String(productId));
  }, [wishlistIds]);

  const addToWishlist = useCallback(async (productId: string) => {
    const id = String(productId);
    
    if (wishlistIds.has(id)) {
      toast.error('Already in wishlist');
      return;
    }

    try {
      if (user) {
        // Add via server
        const { ok, json } = await api('/api/wishlist', {
          method: 'POST',
          body: JSON.stringify({ productId: id }),
        });
        if (!ok) {
          throw new Error(json?.message || json?.error || 'Failed to add');
        }
        setWishlistIds((prev) => new Set([...prev, id]));
        toast.success('Added to wishlist');
      } else {
        // Add to localStorage
        const updated = new Set([...wishlistIds, id]);
        setWishlistIds(updated);
        try {
          localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(Array.from(updated)));
        } catch (e) {
          console.warn('Failed to save to localStorage', e);
        }
        toast.success('Added to wishlist');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add to wishlist');
    }
  }, [user, wishlistIds]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    const id = String(productId);
    
    if (!wishlistIds.has(id)) {
      return;
    }

    try {
      if (user) {
        // Remove from server
        const { ok, json } = await api(`/api/wishlist/${id}`, {
          method: 'DELETE',
        });
        if (!ok) {
          throw new Error(json?.message || json?.error || 'Failed to remove');
        }
        const updated = new Set(wishlistIds);
        updated.delete(id);
        setWishlistIds(updated);
        toast.success('Removed from wishlist');
      } else {
        // Remove from localStorage
        const updated = new Set(wishlistIds);
        updated.delete(id);
        setWishlistIds(updated);
        try {
          localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(Array.from(updated)));
        } catch (e) {
          console.warn('Failed to save to localStorage', e);
        }
        toast.success('Removed from wishlist');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove from wishlist');
    }
  }, [user, wishlistIds]);

  const toggleWishlist = useCallback(async (productId: string) => {
    const id = String(productId);
    if (wishlistIds.has(id)) {
      await removeFromWishlist(id);
    } else {
      await addToWishlist(id);
    }
  }, [wishlistIds, addToWishlist, removeFromWishlist]);

  return {
    wishlistIds,
    loading,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
  };
}
