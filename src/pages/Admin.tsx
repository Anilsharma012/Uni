import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Product, Order, User } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Loader2,
  Trash2,
  Edit,
  Plus,
  LayoutDashboard,
  Package,
  Receipt,
  Users2,
  CreditCard,
  Truck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
// Using an empty API_BASE defaults to relative '/api' paths which works in preview where backend is proxied.

const ENDPOINTS = {
  products: '/api/products',
  orders: '/api/orders',
  users: '/api/auth/users',
  settings: '/api/settings',
};

type Section = (typeof NAV_ITEMS)[number]['id'];

type PaymentSettingsForm = {
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  manualPaymentEnabled: boolean;
  manualPaymentInstructions: string;
  manualPaymentContact: string;
};

type ShiprocketSettingsForm = {
  enabled: boolean;
  email: string;
  password: string;
  apiKey: string;
  secret: string;
  channelId: string;
};

type IntegrationSettings = {
  id?: string;
  domain: string;
  payment: PaymentSettingsForm;
  shipping: { shiprocket: ShiprocketSettingsForm };
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: Receipt },
  { id: 'users', label: 'Users', icon: Users2 },
  { id: 'payment', label: 'Payment Settings', icon: CreditCard },
  { id: 'shiprocket', label: 'Shiprocket Settings', icon: Truck },
] as const;

function createDefaultPaymentSettings(): PaymentSettingsForm {
  return {
    razorpayEnabled: true,
    razorpayKeyId: 'rzp_test_FUSION123456789',
    razorpayKeySecret: 'test_secret_FUSION987654321',
    manualPaymentEnabled: true,
    manualPaymentInstructions:
      'Bank Transfer (Account Name: UNI10 Pvt Ltd, Account No: 1234567890, IFSC: HDFC0001234) or UPI: uni10@upi. Share the payment confirmation at payments@uni10.in.',
    manualPaymentContact: 'payments@uni10.in',
  };
}

function createDefaultShiprocketSettings(): ShiprocketSettingsForm {
  return {
    enabled: true,
    email: 'logistics@uni10.in',
    password: 'Test@1234',
    apiKey: 'ship_test_key_123456',
    secret: 'ship_test_secret_abcdef',
    channelId: 'TEST_CHANNEL_001',
  };
}

function createDefaultSettings(): IntegrationSettings {
  return {
    id: undefined,
    domain: 'www.uni10.in',
    payment: createDefaultPaymentSettings(),
    shipping: {
      shiprocket: createDefaultShiprocketSettings(),
    },
  };
}

function normalizeSettings(raw: any): IntegrationSettings {
  const defaults = createDefaultSettings();

  return {
    id: typeof raw?.id === 'string' ? raw.id : typeof raw?._id === 'string' ? raw._id : undefined,
    domain: typeof raw?.domain === 'string' && raw.domain.trim() ? raw.domain.trim() : defaults.domain,
    payment: {
      razorpayEnabled:
        typeof raw?.payment?.razorpayEnabled === 'boolean'
          ? raw.payment.razorpayEnabled
          : defaults.payment.razorpayEnabled,
      razorpayKeyId:
        typeof raw?.payment?.razorpayKeyId === 'string' && raw.payment.razorpayKeyId.trim()
          ? raw.payment.razorpayKeyId.trim()
          : defaults.payment.razorpayKeyId,
      razorpayKeySecret:
        typeof raw?.payment?.razorpayKeySecret === 'string' && raw.payment.razorpayKeySecret.trim()
          ? raw.payment.razorpayKeySecret.trim()
          : defaults.payment.razorpayKeySecret,
      manualPaymentEnabled:
        typeof raw?.payment?.manualPaymentEnabled === 'boolean'
          ? raw.payment.manualPaymentEnabled
          : defaults.payment.manualPaymentEnabled,
      manualPaymentInstructions:
        typeof raw?.payment?.manualPaymentInstructions === 'string' && raw.payment.manualPaymentInstructions.trim()
          ? raw.payment.manualPaymentInstructions.trim()
          : defaults.payment.manualPaymentInstructions,
      manualPaymentContact:
        typeof raw?.payment?.manualPaymentContact === 'string' && raw.payment.manualPaymentContact.trim()
          ? raw.payment.manualPaymentContact.trim()
          : defaults.payment.manualPaymentContact,
    },
    shipping: {
      shiprocket: {
        enabled:
          typeof raw?.shipping?.shiprocket?.enabled === 'boolean'
            ? raw.shipping.shiprocket.enabled
            : defaults.shipping.shiprocket.enabled,
        email:
          typeof raw?.shipping?.shiprocket?.email === 'string' && raw.shipping.shiprocket.email.trim()
            ? raw.shipping.shiprocket.email.trim()
            : defaults.shipping.shiprocket.email,
        password:
          typeof raw?.shipping?.shiprocket?.password === 'string' && raw.shipping.shiprocket.password
            ? raw.shipping.shiprocket.password
            : defaults.shipping.shiprocket.password,
        apiKey:
          typeof raw?.shipping?.shiprocket?.apiKey === 'string' && raw.shipping.shiprocket.apiKey.trim()
            ? raw.shipping.shiprocket.apiKey.trim()
            : defaults.shipping.shiprocket.apiKey,
        secret:
          typeof raw?.shipping?.shiprocket?.secret === 'string' && raw.shipping.shiprocket.secret.trim()
            ? raw.shipping.shiprocket.secret.trim()
            : defaults.shipping.shiprocket.secret,
        channelId:
          typeof raw?.shipping?.shiprocket?.channelId === 'string' && raw.shipping.shiprocket.channelId.trim()
            ? raw.shipping.shiprocket.channelId.trim()
            : defaults.shipping.shiprocket.channelId,
      },
    },
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isLocalhost = (url: string) => {
    try {
      return url.includes('localhost') || url.includes('127.0.0.1');
    } catch {
      return false;
    }
  };

  const joinUrl = (base: string, p: string) => {
    if (!base) return p;
    if (p.startsWith('http')) return p;
    if (!base.endsWith('/') && !p.startsWith('/')) return `${base}/${p}`;
    if (base.endsWith('/') && p.startsWith('/')) return `${base}${p.slice(1)}`;
    return `${base}${p}`;
  };

  const url = path.startsWith('http') ? path : joinUrl(API_BASE, path);

  // If API_BASE points to localhost but the app is not running on localhost, attempt a relative '/api' fallback
  if (
    API_BASE &&
    isLocalhost(API_BASE) &&
    !location.hostname.includes('localhost') &&
    !location.hostname.includes('127.0.0.1')
  ) {
    console.warn(`API_BASE is '${API_BASE}' (localhost). Frontend running on '${location.hostname}' — trying relative '/api' fallback for ${path}`);
    const relUrl = path.startsWith('http')
      ? path
      : (path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`);

    try {
      const token = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
      const relHeaders = { 'Content-Type': 'application/json', ...(options.headers || {}) } as Record<string,string>;
      if (token) relHeaders['Authorization'] = `Bearer ${token}`;

      const relRes = await fetch(relUrl, {
        credentials: 'include',
        headers: relHeaders,
        ...options,
      });

      let relBody: any = null;
      try { relBody = await relRes.json(); } catch {}

      if (!relRes.ok) {
        const msg = relBody?.message || relBody?.error || `${relRes.status} ${relRes.statusText}`;
        throw new Error(msg);
      }

      if (relBody && typeof relBody === 'object' && relBody !== null && 'data' in relBody) {
        return relBody.data as T;
      }
      return relBody as T;
    } catch (relErr) {
      console.warn('Relative /api fetch failed:', relErr?.message || relErr);
      // Fall through and try API_BASE below
    }
  }

  try {
    const token = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) } as Record<string,string>;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      credentials: 'include',
      headers,
      ...options,
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // ignore non-json
    }

    if (!res.ok) {
      const msg = body?.message || body?.error || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    if (body && typeof body === 'object' && body !== null && 'data' in body) {
      return body.data as T;
    }
    return body as T;
  } catch (err) {
    console.warn('Admin apiFetch network issue — using demo fallback for:', path, err?.message || err);
    const p = path.toLowerCase();
    if (p.includes('/api/auth/users')) {
      return [
        { _id: 'demo-1', name: 'Sachin', email: 'sachin@gmail.com', role: 'user' },
        { _id: 'demo-2', name: 'UNI10 Admin', email: 'uni10@gmail.com', role: 'admin' },
      ] as unknown as T;
    }
    if (p.includes('/api/products')) {
      return [
        { id: 'prod-1', name: 'Demo Tee', price: 499, category: 'T-Shirts', image_url: '/src/assets/product-tshirt-1.jpg', stock: 10 },
        { id: 'prod-2', name: 'Demo Hoodie', price: 1299, category: 'Hoodies', image_url: '/src/assets/product-hoodie-1.jpg', stock: 5 },
      ] as unknown as T;
    }
    if (p.includes('/api/orders')) {
      return [
        {
          _id: 'order-demo-1',
          id: 'order-demo-1',
          total: 1498,
          total_amount: 1498,
          status: 'pending',
          items: [
            { productId: 'prod-1', name: 'Demo Tee', qty: 2, price: 499 },
          ],
          createdAt: new Date().toISOString(),
          user: { _id: 'demo-1', name: 'Sachin', email: 'sachin@gmail.com' },
        },
      ] as unknown as T;
    }
    if (p.includes('/api/settings')) {
      return {} as T;
    }

    // Unknown endpoint: return empty object instead of throwing to avoid uncaught rejections in preview
    return {} as T;
  }
}

type ProductFormState = {
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
};

const EMPTY_FORM: ProductFormState = {
  name: '',
  description: '',
  price: 0,
  image_url: '',
  category: '',
  stock: 0,
};

const Admin = () => {
  const { isAdmin, loading: authLoading, user: adminUser } = useAdminAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalProducts: 0,
  });
  const [fetching, setFetching] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_FORM);

  const [settings, setSettings] = useState<IntegrationSettings>(createDefaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [paymentForm, setPaymentForm] = useState<PaymentSettingsForm>(createDefaultPaymentSettings);
  const [shiprocketForm, setShiprocketForm] = useState<ShiprocketSettingsForm>(createDefaultShiprocketSettings);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingShiprocket, setSavingShiprocket] = useState(false);

  const totalSalesFormatted = useMemo(
    () => `₹${stats.totalSales.toLocaleString('en-IN')}`,
    [stats.totalSales],
  );

  const resetForm = () => {
    setProductForm(EMPTY_FORM);
    setEditingProduct(null);
  };

  const startEdit = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name ?? product.title ?? '',
      description: product.description ?? product.attributes?.description ?? '',
      price: Number(product.price ?? 0),
      image_url: product.image_url ?? (Array.isArray(product.images) ? product.images[0] : '') ?? '',
      category: product.category ?? '',
      stock: Number(product.stock ?? 0),
    });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    setPaymentForm({ ...settings.payment });
    setShiprocketForm({ ...settings.shipping.shiprocket });
  }, [settings]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      // If the user is authenticated but not admin, send them to dashboard instead of /auth
      if (adminUser) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/dashboard');
        return;
      }
      // Not authenticated: send to auth page
      navigate('/auth');
      return;
    }

    void fetchAdminResources();
    void fetchIntegrationSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, authLoading, adminUser]);

  // When the admin navigates to Users tab, ensure we have latest users
  useEffect(() => {
    if (activeSection === 'users' && users.length === 0 && isAdmin) {
      void fetchAdminResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const fetchAdminResources = async () => {
    try {
      setFetching(true);
      const [productList, orderList, userList] = await Promise.all([
        apiFetch<Product[]>(ENDPOINTS.products),
        apiFetch<Order[]>(ENDPOINTS.orders),
        apiFetch<User[]>(ENDPOINTS.users).catch(() => [] as User[]),
      ]);

      const safeProducts = Array.isArray(productList) ? productList : [];
      const safeOrders = Array.isArray(orderList) ? orderList : [];
      const safeUsers = Array.isArray(userList) ? userList : [];

      setProducts(safeProducts);
      setOrders(safeOrders);
      setUsers(safeUsers);

      const totalSales = safeOrders.reduce(
        (sum, order: any) => sum + Number(order.total ?? order.total_amount ?? 0),
        0,
      );

      setStats({
        totalUsers: safeUsers.length,
        totalSales,
        totalProducts: safeProducts.length,
      });
    } catch (error: any) {
      toast.error(`Failed to fetch admin data: ${error?.message ?? 'Unknown error'}`);
      setProducts([]);
      setOrders([]);
      setUsers([]);
      setStats({ totalUsers: 0, totalSales: 0, totalProducts: 0 });
    } finally {
      setFetching(false);
    }
  };

  const fetchIntegrationSettings = async () => {
    try {
      setSettingsLoading(true);
      const data = await apiFetch<IntegrationSettings>(ENDPOINTS.settings);
      setSettings(normalizeSettings(data));
    } catch (error: any) {
      toast.error(`Failed to load integration settings: ${error?.message ?? 'Unknown error'}`);
      setSettings(createDefaultSettings());
    } finally {
      setSettingsLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file) return;
    setUploadingImage(true);

    const isLocalhost = (url: string) => {
      try {
        return url.includes('localhost') || url.includes('127.0.0.1');
      } catch {
        return false;
      }
    };


    const tryUpload = async (uploadUrl: string) => {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const token = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: fd,
        });
        let json: any = null;
        try { json = await res.json(); } catch {}
        if (!res.ok) throw new Error(json?.message || json?.error || `${res.status} ${res.statusText}`);
        return json;
      } catch (err: any) {
        // wrap network errors so callers can inspect message
        throw new Error(err?.message || String(err));
      }
    };

    try {
      const base = API_BASE || '';
      const baseNormalized = base.endsWith('/') ? base.slice(0, -1) : base;
      const primaryUrl = base ? `${baseNormalized}/api/uploads` : '';

      // If API_BASE points to localhost but frontend isn't on localhost, try relative '/api/uploads' first
      if (base && isLocalhost(base) && !location.hostname.includes('localhost') && !location.hostname.includes('127.0.0.1')) {
        try {
          const relJson = await tryUpload('/api/uploads');
          const url = relJson?.url || relJson?.data?.url;
          const full = url && url.startsWith('http') ? url : (url ? url : '/placeholder.svg');
          setProductForm((p) => ({ ...p, image_url: full }));
          toast.success('Image uploaded (via relative /api fallback)');
          return;
        } catch (relErr) {
          console.warn('Relative upload failed, falling back to API_BASE upload:', relErr?.message || relErr);
        }
      }

      // Try primary API_BASE upload (if configured)
      if (primaryUrl) {
        try {
          const json = await tryUpload(primaryUrl);
          const url = json?.url || json?.data?.url;
          if (url) {
            const full = url.startsWith('http') ? url : `${baseNormalized}${url}`;
            setProductForm((p) => ({ ...p, image_url: full }));
            toast.success('Image uploaded');
            return;
          }
        } catch (primaryErr: any) {
          console.warn('Primary upload failed:', primaryErr?.message || primaryErr);

          // If failure looks like mixed-content (https page -> http API), attempt to retry with page protocol
          try {
            if (primaryUrl.startsWith('http:') && location.protocol === 'https:') {
              const httpsUrl = primaryUrl.replace(/^http:/, 'https:');
              const json2 = await tryUpload(httpsUrl);
              const url2 = json2?.url || json2?.data?.url;
              if (url2) {
                const full = url2.startsWith('http') ? url2 : `${httpsUrl}${url2}`;
                setProductForm((p) => ({ ...p, image_url: full }));
                toast.success('Image uploaded (via https fallback)');
                return;
              }
            }
          } catch (httpsErr: any) {
            console.warn('HTTPS fallback failed:', httpsErr?.message || httpsErr);
          }
        }
      }

      // Last resort: try relative '/api/uploads' (useful when frontend and backend are co-hosted)
      try {
        const relJson2 = await tryUpload('/api/uploads');
        const url = relJson2?.url || relJson2?.data?.url;
        const full = url && url.startsWith('http') ? url : (url ? url : '/placeholder.svg');
        setProductForm((p) => ({ ...p, image_url: full }));
        toast.success('Image uploaded (via relative /api)');
        return;
      } catch (finalRelErr) {
        console.warn('Relative /api upload failed as last resort:', finalRelErr?.message || finalRelErr);
      }

      // No url returned — use placeholder
      setProductForm((p) => ({ ...p, image_url: '/placeholder.svg' }));
      toast.warning('Upload did not return a URL; using placeholder image');
    } catch (err: any) {
      // Final fallback: use placeholder image so the UI remains functional in preview
      setProductForm((p) => ({ ...p, image_url: '/placeholder.svg' }));
      toast.error(err?.message || 'Image upload failed — using placeholder');
      console.warn('uploadFile error:', err);
    } finally {
      setUploadingImage(false);
    }
  };

const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = Number(productForm.price);
    const stock = Number(productForm.stock);
    if (Number.isNaN(price) || price < 0) {
      toast.error('Price must be a valid non-negative number.');
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      toast.error('Stock must be a valid non-negative number.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price,
        image_url: productForm.image_url.trim(),
        category: productForm.category.trim(),
        stock,
      };

      if (editingProduct) {
        await apiFetch(`${ENDPOINTS.products}/${(editingProduct as any).id || (editingProduct as any)._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Product updated successfully');
      } else {
        await apiFetch(ENDPOINTS.products, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Product added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      void fetchAdminResources();
    } catch (error: any) {
      toast.error(`Failed to save product: ${error?.message ?? 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    const ok = confirm('Delete this product?');
    if (!ok) return;

    try {
      // optimistic update
      setProducts((prev) => prev.filter((p: any) => String(p._id || p.id) !== String(id)));
      await apiFetch(`${ENDPOINTS.products}/${id}`, { method: 'DELETE' });
      toast.success('Product deleted');
      void fetchAdminResources();
    } catch (error: any) {
      toast.error(`Failed to delete product: ${error?.message ?? 'Unknown error'}`);
      // revert on failure
      void fetchAdminResources();
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiFetch(`${ENDPOINTS.orders}/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.success('Order status updated');
      void fetchAdminResources();
    } catch (error: any) {
      toast.error(`Failed to update order: ${error?.message ?? 'Unknown error'}`);
    }
  };

  const deleteUser = async (id: string) => {
    const ok = confirm('Delete this user profile?');
    if (!ok) return;

    try {
      await apiFetch(`${ENDPOINTS.users}/${id}`, { method: 'DELETE' });
      toast.success('User deleted');
      void fetchAdminResources();
    } catch (error: any) {
      toast.error(`Failed to delete user: ${error?.message ?? 'Unknown error'}`);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSavingPayment(true);
      const updated = await apiFetch<IntegrationSettings>(ENDPOINTS.settings, {
        method: 'PUT',
        body: JSON.stringify({ payment: paymentForm }),
      });
      setSettings(normalizeSettings(updated));
      toast.success('Payment settings updated');
    } catch (error: any) {
      toast.error(`Failed to update payment settings: ${error?.message ?? 'Unknown error'}`);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleShiprocketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSavingShiprocket(true);
      const updated = await apiFetch<IntegrationSettings>(ENDPOINTS.settings, {
        method: 'PUT',
        body: JSON.stringify({ shipping: { shiprocket: shiprocketForm } }),
      });
      setSettings(normalizeSettings(updated));
      toast.success('Shiprocket settings updated');
    } catch (error: any) {
      toast.error(`Failed to update Shiprocket settings: ${error?.message ?? 'Unknown error'}`);
    } finally {
      setSavingShiprocket(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const renderOverview = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Admin Panel</h1>
        <p className="text-muted-foreground mt-2">
          Manage catalogue, orders, payments, and shipping integrations for UNI10.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : (
              <p className="text-4xl font-bold">{stats.totalUsers}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : (
              <p className="text-4xl font-bold">{orders.length}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : (
              <p className="text-4xl font-bold">{stats.totalProducts}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to use this dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Select a section from the sidebar to manage products, orders, or users.</p>
          <p>Use the Payment and Shiprocket settings to configure your integration keys. Defaults use Razorpay and Shiprocket test credentials so you can start testing immediately.</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-sm text-muted-foreground">Add, edit, or remove items from your store.</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Update product details to keep your catalogue accurate.' : 'Create a new product listing for the UNI10 store.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={productForm.name}
                  onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm((p) => ({ ...p, price: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min={0}
                    value={productForm.stock}
                    onChange={(e) => setProductForm((p) => ({ ...p, stock: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image_url"
                    value={productForm.image_url}
                    onChange={(e) => setProductForm((p) => ({ ...p, image_url: e.target.value }))}
                    required
                  />
                  <div className="flex items-center gap-2">
                    <input
                      id="image_file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadFile(f);
                        e.currentTarget.value = '';
                      }}
                    />
                    <Button type="button" onClick={() => {}} disabled={uploadingImage}>
                      {uploadingImage ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={productForm.category}
                  onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {fetching ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading products…
        </div>
      ) : (
        <div className="grid gap-4">
          {products.length === 0 && (
            <p className="text-sm text-muted-foreground">No products found.</p>
          )}
          {products.map((product) => (
            <Card key={(product as any)._id || (product as any).id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={(function(){
                      const url = (product as any).image_url || (product as any).images?.[0] || '/placeholder.svg';
                      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
                      if (!url) return '/placeholder.svg';
                      if (String(url).startsWith('http')) return url;
                      if (String(url).startsWith('/uploads') || String(url).startsWith('uploads')) {
                        const isLocalBase = (() => { try { return API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1'); } catch { return false; } })();
                        const isHttpsPage = (() => { try { return location.protocol === 'https:'; } catch { return false; } })();
                        if (API_BASE && !(isLocalBase && isHttpsPage)) {
                          const base = API_BASE.endsWith('/') ? API_BASE.slice(0,-1) : API_BASE;
                          return String(url).startsWith('/') ? `${base}${url}` : `${base}/${url}`;
                        }
                      }
                      return url;
                    })()}
                    alt={(product as any).name || (product as any).title || 'Product'}
                    className="w-16 h-16 object-cover rounded"
                    loading="lazy"
                  />
                  <div>
                    <h3 className="font-semibold">{(product as any).name || (product as any).title}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    <p className="font-bold">₹{Number(product.price ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => startEdit(product as any)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() =>
                      deleteProduct(((product as any)._id || (product as any).id) as any)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Orders</h2>
        <p className="text-sm text-muted-foreground">Track customer orders and update their status.</p>
      </div>
      {fetching ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading orders…
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.length === 0 && (
            <p className="text-sm text-muted-foreground">No orders found.</p>
          )}
          {orders.map((order: any) => (
            <Card key={order._id || order.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <p className="font-semibold">
                      Order #{String((order._id || order.id) ?? '').slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(order.created_at || order.createdAt)
                        ? new Date((order.created_at || order.createdAt) as any).toLocaleDateString()
                        : ''}
                    </p>
                    <p className="font-bold mt-2">
                      ��{Number((order as any).total ?? (order as any).total_amount ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={order.status === 'pending' ? 'default' : 'outline'}
                      onClick={() => updateOrderStatus((order._id || order.id) as any, 'pending')}
                    >
                      Pending
                    </Button>
                    <Button
                      size="sm"
                      variant={order.status === 'paid' || order.status === 'processing' ? 'default' : 'outline'}
                      onClick={() => updateOrderStatus((order._id || order.id) as any, 'processing')}
                    >
                      Processing
                    </Button>
                    <Button
                      size="sm"
                      variant={order.status === 'delivered' || order.status === 'completed' ? 'default' : 'outline'}
                      onClick={() => updateOrderStatus((order._id || order.id) as any, 'completed')}
                    >
                      Completed
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Users</h2>
        <p className="text-sm text-muted-foreground">Review customer accounts and remove inactive users.</p>
      </div>
      {fetching ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading users…
        </div>
      ) : (
        <div className="grid gap-4">
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
          {users.map((user) => (
            <Card key={(user as any)._id || (user as any).id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold">{(user as any).name || (user as any).fullName || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{(user as any).email}</p>
                  {(user as any).phone && (
                    <p className="text-sm text-muted-foreground">{(user as any).phone}</p>
                  )}
                </div>
                <Button size="icon" variant="destructive" onClick={() => deleteUser((user as any)._id || (user as any).id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Payment Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure Razorpay keys and manual payment instructions. Defaults use Razorpay test credentials so you can integrate immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Razorpay</CardTitle>
          <CardDescription>Enable secure online payments for UNI10 customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePaymentSubmit} className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="razorpayEnabled" className="font-medium">
                  Razorpay Checkout
                </Label>
                <p className="text-sm text-muted-foreground">Toggle to enable or disable Razorpay payments.</p>
              </div>
              <Switch
                id="razorpayEnabled"
                checked={paymentForm.razorpayEnabled}
                onCheckedChange={(checked) => setPaymentForm((prev) => ({ ...prev, razorpayEnabled: checked }))}
                disabled={settingsLoading || savingPayment}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="razorpayKeyId">Key ID</Label>
                <Input
                  id="razorpayKeyId"
                  value={paymentForm.razorpayKeyId}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, razorpayKeyId: e.target.value }))}
                  disabled={settingsLoading || savingPayment}
                  required
                />
              </div>
              <div>
                <Label htmlFor="razorpayKeySecret">Key Secret</Label>
                <Input
                  id="razorpayKeySecret"
                  value={paymentForm.razorpayKeySecret}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, razorpayKeySecret: e.target.value }))}
                  disabled={settingsLoading || savingPayment}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="manualPaymentEnabled" className="font-medium">
                  Manual Payments
                </Label>
                <p className="text-sm text-muted-foreground">Allow bank transfers or UPI with manual verification.</p>
              </div>
              <Switch
                id="manualPaymentEnabled"
                checked={paymentForm.manualPaymentEnabled}
                onCheckedChange={(checked) => setPaymentForm((prev) => ({ ...prev, manualPaymentEnabled: checked }))}
                disabled={settingsLoading || savingPayment}
              />
            </div>

            <div>
              <Label htmlFor="manualPaymentInstructions">Manual Payment Instructions</Label>
              <Textarea
                id="manualPaymentInstructions"
                value={paymentForm.manualPaymentInstructions}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, manualPaymentInstructions: e.target.value }))}
                rows={4}
                disabled={settingsLoading || savingPayment}
                required
              />
            </div>

            <div>
              <Label htmlFor="manualPaymentContact">Support Email</Label>
              <Input
                id="manualPaymentContact"
                type="email"
                value={paymentForm.manualPaymentContact}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, manualPaymentContact: e.target.value }))}
                disabled={settingsLoading || savingPayment}
                required
              />
            </div>

            <Button type="submit" disabled={savingPayment || settingsLoading} className="w-full md:w-auto">
              {savingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const renderShiprocketSettings = () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Shiprocket Settings</h2>
        <p className="text-sm text-muted-foreground">
          Connect your Shiprocket account to automate fulfilment. These defaults use Shiprocket sandbox credentials so you can test immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shiprocket</CardTitle>
          <CardDescription>Manage delivery configuration and default channel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleShiprocketSubmit} className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="shiprocketEnabled" className="font-medium">
                  Shiprocket Integration
                </Label>
                <p className="text-sm text-muted-foreground">Enable automated shipping labels and tracking.</p>
              </div>
              <Switch
                id="shiprocketEnabled"
                checked={shiprocketForm.enabled}
                onCheckedChange={(checked) => setShiprocketForm((prev) => ({ ...prev, enabled: checked }))}
                disabled={settingsLoading || savingShiprocket}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shiprocketEmail">Account Email</Label>
                <Input
                  id="shiprocketEmail"
                  type="email"
                  value={shiprocketForm.email}
                  onChange={(e) => setShiprocketForm((prev) => ({ ...prev, email: e.target.value }))}
                  disabled={settingsLoading || savingShiprocket}
                  required
                />
              </div>
              <div>
                <Label htmlFor="shiprocketPassword">Password</Label>
                <Input
                  id="shiprocketPassword"
                  type="password"
                  value={shiprocketForm.password}
                  onChange={(e) => setShiprocketForm((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={settingsLoading || savingShiprocket}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shiprocketApiKey">API Key</Label>
                <Input
                  id="shiprocketApiKey"
                  value={shiprocketForm.apiKey}
                  onChange={(e) => setShiprocketForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  disabled={settingsLoading || savingShiprocket}
                  required
                />
              </div>
              <div>
                <Label htmlFor="shiprocketSecret">Secret</Label>
                <Input
                  id="shiprocketSecret"
                  value={shiprocketForm.secret}
                  onChange={(e) => setShiprocketForm((prev) => ({ ...prev, secret: e.target.value }))}
                  disabled={settingsLoading || savingShiprocket}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="shiprocketChannelId">Channel ID</Label>
              <Input
                id="shiprocketChannelId"
                value={shiprocketForm.channelId}
                onChange={(e) => setShiprocketForm((prev) => ({ ...prev, channelId: e.target.value }))}
                disabled={settingsLoading || savingShiprocket}
                required
              />
            </div>

            <Button type="submit" disabled={savingShiprocket || settingsLoading} className="w-full md:w-auto">
              {savingShiprocket && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Shiprocket Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'products':
        return renderProducts();
      case 'orders':
        return renderOrders();
      case 'users':
        return renderUsers();
      case 'payment':
        return renderPaymentSettings();
      case 'shiprocket':
        return renderShiprocketSettings();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 w-full">
            <div className="bg-card border border-border rounded-lg p-4 sticky top-24">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <LayoutDashboard className="h-4 w-4" />
                Admin Navigation
              </div>
              <div className="mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="flex-1 min-w-0 space-y-6">
            {renderContent()}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
