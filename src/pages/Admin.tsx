import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Product, Order, User } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
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
  Tags,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
// Using an empty API_BASE defaults to relative '/api' paths which works in preview where backend is proxied.

const ENDPOINTS = {
  products: '/api/products',
  orders: '/api/orders',
  users: '/api/auth/users',
  settings: '/api/settings',
  categories: '/api/categories',
};

type Section = (typeof NAV_ITEMS)[number]['id'];

type PaymentSettingsForm = {
  upiQrImage: string;
  upiId: string;
  beneficiaryName: string;
  instructions: string;
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
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'orders', label: 'Orders', icon: Receipt },
  { id: 'users', label: 'Users', icon: Users2 },
  { id: 'payment', label: 'Payment Settings', icon: CreditCard },
  { id: 'shiprocket', label: 'Shiprocket Settings', icon: Truck },
] as const;

function createDefaultPaymentSettings(): PaymentSettingsForm {
  return {
    upiQrImage: '',
    upiId: '',
    beneficiaryName: '',
 
    instructions: 'Scan the QR code and send payment. Share the transaction ID in the next step.',

    instructions: 'Scan QR and pay. Enter UTR/Txn ID on next step.',

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
      upiQrImage:
        typeof raw?.payment?.upiQrImage === 'string'
          ? raw.payment.upiQrImage
          : defaults.payment.upiQrImage,
      upiId:
        typeof raw?.payment?.upiId === 'string' && raw.payment.upiId.trim()
          ? raw.payment.upiId.trim()
          : defaults.payment.upiId,
      beneficiaryName:
        typeof raw?.payment?.beneficiaryName === 'string' && raw.payment.beneficiaryName.trim()
          ? raw.payment.beneficiaryName.trim()
          : defaults.payment.beneficiaryName,
      instructions:
        typeof raw?.payment?.instructions === 'string' && raw.payment.instructions.trim()
          ? raw.payment.instructions.trim()
          : defaults.payment.instructions,
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

  const rawUrl = path.startsWith('http') ? path : joinUrl(API_BASE, path);

  // Helper to perform fetch with sensible defaults and credential handling
  const doFetch = async (targetUrl: string) => {
    const token = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) } as Record<string,string>;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Determine same-origin to decide whether to include credentials
    let credentials: RequestCredentials = 'omit';
    try {
      const targetOrigin = new URL(targetUrl, location.href).origin;
      const currentOrigin = location.origin;
      credentials = targetOrigin === currentOrigin ? 'include' : 'omit';
    } catch {
      credentials = 'omit';
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials,
      // allow CORS by default for cross-origin requests
      mode: credentials === 'include' ? (options.mode || 'same-origin') : (options.mode || 'cors'),
    };

    const res = await fetch(targetUrl, fetchOptions);
    let body: any = null;
    try { body = await res.json(); } catch {}
    if (!res.ok) {
      const msg = body?.message || body?.error || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    if (body && typeof body === 'object' && body !== null && 'data' in body) return body.data as T;
    return body as T;
  };

  // If API_BASE points to localhost but the frontend is hosted elsewhere (preview), try a relative fallback first
  if (API_BASE && isLocalhost(API_BASE) && typeof location !== 'undefined' && !location.hostname.includes('localhost') && !location.hostname.includes('127.0.0.1')) {
    console.warn(`API_BASE is '${API_BASE}' (localhost). Frontend running on '${location.hostname}' — trying relative '/api' fallback for ${path}`);
    const relUrl = path.startsWith('http') ? path : (path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`);
    try {
      return await doFetch(relUrl);
    } catch (relErr) {
      console.warn('Relative /api fetch failed:', relErr?.message || relErr);
      // continue to try rawUrl below
    }
  }

  // Try the configured url. If mixed-content error is possible (https page -> http api), attempt https fallback
  try {
    return await doFetch(rawUrl);
  } catch (err) {
    // If URL is http and page is https, try swapping to https
    try {
      if (typeof rawUrl === 'string' && rawUrl.startsWith('http:') && typeof location !== 'undefined' && location.protocol === 'https:') {
        const httpsUrl = rawUrl.replace(/^http:/, 'https:');
        console.warn('Attempting https fallback for API url:', httpsUrl);
        return await doFetch(httpsUrl);
      }
    } catch (httpsErr) {
      console.warn('HTTPS fallback failed:', httpsErr?.message || httpsErr);
    }

    console.warn('Admin apiFetch network issue — using demo fallback for:', path, (err as any)?.message || err);
    console.warn('This typically means the backend API is unreachable. Current location:', location.origin, 'API_BASE:', API_BASE);

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
      // Return default settings for demo/fallback mode
      const demoSettings = createDefaultSettings();
      // If this is a PUT request to save, just acknowledge it succeeded
      if ((options?.method || 'GET').toUpperCase() === 'PUT') {
        // Return the settings that were sent, merged with defaults
        try {
          const reqBody = options?.body ? JSON.parse(String(options.body)) : {};
          return { ...demoSettings, ...reqBody } as unknown as T;
        } catch {
          return demoSettings as unknown as T;
        }
      }
      return demoSettings as unknown as T;
    }

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
  sizes: string[];
};

const EMPTY_FORM: ProductFormState = {
  name: '',
  description: '',
  price: 0,
  image_url: '',
  category: '',
  stock: 0,
  sizes: [],
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
  const [categories, setCategories] = useState<any[]>([]);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  const [settings, setSettings] = useState<IntegrationSettings>(createDefaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [paymentForm, setPaymentForm] = useState<PaymentSettingsForm>(createDefaultPaymentSettings);
  const [shiprocketForm, setShiprocketForm] = useState<ShiprocketSettingsForm>(createDefaultShiprocketSettings);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingShiprocket, setSavingShiprocket] = useState(false);
  const [uploadingQrCode, setUploadingQrCode] = useState(false);

  // Overview chart state
  const [overviewRange, setOverviewRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<{
    totals: { revenue: number; orders: number; users: number };
    lastMonth: { revenue: number; orders: number };
    prevMonth: { revenue: number; orders: number };
    series: { date: string; revenue: number; orders: number }[];
  } | null>(null);

  // Order detail drawer state
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);

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
      sizes: Array.isArray((product as any).sizes)
        ? (product as any).sizes
        : (Array.isArray((product as any).attributes?.sizes) ? (product as any).attributes.sizes : []),
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
    void fetchCategories();
    // Preload overview stats
    void fetchOverviewStats('30d');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, authLoading, adminUser]);

  // When the admin navigates to Users tab, ensure we have latest users
  useEffect(() => {
    if (activeSection === 'users' && users.length === 0 && isAdmin) {
      void fetchAdminResources();
    }
    if (activeSection === 'overview') {
      void fetchOverviewStats(overviewRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, overviewRange]);

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

  const fetchCategories = async () => {
    try {
      const data = await apiFetch<any[]>(ENDPOINTS.categories);
      const arr = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
      setCategories(arr);
    } catch (e: any) {
      console.warn('Failed to load categories', e?.message || e);
      setCategories([]);
    }
  };

  const fetchOverviewStats = async (range: '7d' | '30d' | '90d') => {
    try {
      setOverviewLoading(true);
      setOverviewError(null);
      const data = await apiFetch<{ totals: any; lastMonth: any; prevMonth: any; series: any[] }>(`/api/admin/stats/overview?range=${range}`);
      setOverviewData({
        totals: {
          revenue: Number((data as any)?.totals?.revenue || 0),
          orders: Number((data as any)?.totals?.orders || 0),
          users: Number((data as any)?.totals?.users || 0),
        },
        lastMonth: {
          revenue: Number((data as any)?.lastMonth?.revenue || 0),
          orders: Number((data as any)?.lastMonth?.orders || 0),
        },
        prevMonth: {
          revenue: Number((data as any)?.prevMonth?.revenue || 0),
          orders: Number((data as any)?.prevMonth?.orders || 0),
        },
        series: Array.isArray((data as any)?.series) ? (data as any).series : [],
      });
    } catch (e: any) {
      setOverviewError(e?.message || 'Failed to load stats');
      setOverviewData(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  const openOrderDetail = async (id: string) => {
    setSelectedOrderId(id);
    setOrderDrawerOpen(true);
    setOrderDetail(null);
    setOrderDetailError(null);
    setOrderDetailLoading(true);
    try {
      const data = await apiFetch<any>(`/api/admin/orders/${id}`);
      setOrderDetail(data);
    } catch (e: any) {
      setOrderDetailError(e?.message || 'Failed to load order');
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      setCatSaving(true);
      await apiFetch(ENDPOINTS.categories, { method: 'POST', body: JSON.stringify({ name: catName.trim(), description: catDesc.trim() }) });
      toast.success('Category added');
      setCatName('');
      setCatDesc('');
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add category');
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const ok = confirm('Delete this category?');
    if (!ok) return;
    try {
      await apiFetch(`${ENDPOINTS.categories}/${id}`, { method: 'DELETE' });
      toast.success('Category deleted');
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete category');
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

  const uploadQrCode = async (file: File) => {
    if (!file) return;
    setUploadingQrCode(true);

    const isLocalhost = (url: string) => {
      try {
        return url.includes('localhost') || url.includes('127.0.0.1');
      } catch {
        return false;
      }
    };

    const normalizeForUi = (u: string) => {
      const s = String(u || '');
      if (!s) return '';
      if (s.startsWith('http')) {
        try { const parsed = new URL(s); if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return `/api${parsed.pathname}`; } catch {}
        return s;
      }
      if (s.startsWith('/api/uploads')) return s;
      if (s.startsWith('/uploads')) return `/api${s}`;
      if (s.startsWith('uploads')) return `/api/${s}`;
      return s;
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
        throw new Error(err?.message || String(err));
      }
    };

    try {
      const base = API_BASE || '';
      const baseNormalized = base.endsWith('/') ? base.slice(0, -1) : base;
      const primaryUrl = base ? `${baseNormalized}/api/uploads` : '';

      if (base && isLocalhost(base) && !location.hostname.includes('localhost') && !location.hostname.includes('127.0.0.1')) {
        try {
          const relJson = await tryUpload('/api/uploads');
          const url = relJson?.url || relJson?.data?.url;
          const full = normalizeForUi(url);
          setPaymentForm((p) => ({ ...p, upiQrImage: full }));
          toast.success('QR Code uploaded');
          return;
        } catch (relErr) {
          console.warn('Relative upload failed, falling back to API_BASE upload:', relErr?.message || relErr);
        }
      }

      if (primaryUrl) {
        try {
          const json = await tryUpload(primaryUrl);
          const url = json?.url || json?.data?.url;
          if (url) {
            const full = normalizeForUi(url);
            setPaymentForm((p) => ({ ...p, upiQrImage: full }));
            toast.success('QR Code uploaded');
            return;
          }
        } catch (primaryErr: any) {
          console.warn('Primary upload failed:', primaryErr?.message || primaryErr);

          try {
            if (primaryUrl.startsWith('http:') && location.protocol === 'https:') {
              const httpsUrl = primaryUrl.replace(/^http:/, 'https:');
              const json2 = await tryUpload(httpsUrl);
              const url2 = json2?.url || json2?.data?.url;
              if (url2) {
                const full = normalizeForUi(url2);
                setPaymentForm((p) => ({ ...p, upiQrImage: full }));
                toast.success('QR Code uploaded (via https fallback)');
                return;
              }
            }
          } catch (httpsErr: any) {
            console.warn('HTTPS fallback failed:', httpsErr?.message || httpsErr);
          }
        }
      }

      try {
        const relJson2 = await tryUpload('/api/uploads');
        const url = relJson2?.url || relJson2?.data?.url;
        const full = normalizeForUi(url);
        setPaymentForm((p) => ({ ...p, upiQrImage: full }));
        toast.success('QR Code uploaded (via relative /api)');
        return;
      } catch (finalRelErr) {
        console.warn('Relative /api upload failed as last resort:', finalRelErr?.message || finalRelErr);
      }

      toast.error('QR Code upload failed');
    } catch (err: any) {
      toast.error(err?.message || 'QR Code upload failed');
      console.warn('uploadQrCode error:', err);
    } finally {
      setUploadingQrCode(false);
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
        sizes: Array.isArray(productForm.sizes) ? productForm.sizes : [],
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
      const errorMsg = error?.message ?? 'Unknown error';
      console.error('Payment settings save error:', error);
      toast.error(`Failed to update payment settings: ${errorMsg}`);
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
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Overview</h1>
        <p className="text-muted-foreground mt-2">Sales and users at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-3xl font-bold">₹{Number(overviewData?.totals?.revenue || 0).toLocaleString('en-IN')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold">{Number(overviewData?.totals?.orders || 0)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold">{Number(overviewData?.totals?.users || 0)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last Month vs Previous</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between"><span>Revenue</span><span className="font-semibold">₹{Number(overviewData?.lastMonth?.revenue || 0).toLocaleString('en-IN')} vs ₹{Number(overviewData?.prevMonth?.revenue || 0).toLocaleString('en-IN')}</span></div>
                <div className="flex items-center justify-between"><span>Orders</span><span className="font-semibold">{Number(overviewData?.lastMonth?.orders || 0)} vs {Number(overviewData?.prevMonth?.orders || 0)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle>Daily Revenue & Orders</CardTitle>
            {overviewError && <p className="text-xs text-destructive mt-1">{overviewError}</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['7d','30d','90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setOverviewRange(r)}
                  className={cn('px-3 py-1 text-xs', overviewRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['line','bar'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={cn('px-3 py-1 text-xs capitalize', chartType === t ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <ChartContainer
              config={{ revenue: { label: 'Revenue', color: 'hsl(var(--primary))' }, orders: { label: 'Orders', color: 'hsl(var(--muted-foreground))' } }}
              className="w-full aspect-[16/7]"
            >
              {({ width, height }) => (
                chartType === 'line' ? (
                  <LineChart width={width} height={height} data={overviewData?.series || []} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickMargin={8} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="var(--color-revenue)" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke="var(--color-orders)" dot={false} />
                  </LineChart>
                ) : (
                  <BarChart width={width} height={height} data={overviewData?.series || []} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickMargin={8} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar yAxisId="left" dataKey="revenue" fill="var(--color-revenue)" radius={[4,4,0,0]} />
                    <Bar yAxisId="right" dataKey="orders" fill="var(--color-orders)" radius={[4,4,0,0]} />
                  </BarChart>
                )
              )}
            </ChartContainer>
          )}
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
                <Select
                  value={productForm.category}
                  onValueChange={(val) => setProductForm((p) => ({ ...p, category: val }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={(c as any)._id || (c as any).id || (c as any).name} value={(c as any).name}>
                        {(c as any).name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground mt-1">
                  Can't find it?{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => { setActiveSection('categories'); setIsDialogOpen(false); }}
                  >
                    Add a new category
                  </button>
                </div>
              </div>

              <div>
                <Label>Sizes</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {['S','M','L','XL','XXL'].map((sz) => (
                    <label key={sz} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={productForm.sizes.includes(sz)}
                        onCheckedChange={(checked) => {
                          const isOn = Boolean(checked);
                          setProductForm((p) => ({
                            ...p,
                            sizes: isOn ? Array.from(new Set([...(p.sizes || []), sz])) : (p.sizes || []).filter((s) => s !== sz),
                          }));
                        }}
                      />
                      <span>{sz}</span>
                    </label>
                  ))}
                </div>
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
                        } else {
                          return String(url).startsWith('/') ? `/api${url}` : `/api/${url}`;
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

  const renderCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-sm text-muted-foreground">Add or remove product categories. These show in the product form.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addCategory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="catName">Name</Label>
              <Input id="catName" value={catName} onChange={(e)=>setCatName(e.target.value)} required />
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="catDesc">Description</Label>
              <Input id="catDesc" value={catDesc} onChange={(e)=>setCatDesc(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={catSaving}>
                {catSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Category
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )}
        {categories.map((c: any) => (
          <Card key={(c as any)._id || (c as any).id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-semibold">{(c as any).name}</h3>
                {(c as any).description && <p className="text-sm text-muted-foreground">{(c as any).description}</p>}
              </div>
              <Button size="icon" variant="destructive" onClick={() => deleteCategory(((c as any)._id || (c as any).id) as any)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
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
              <CardContent className="p-4 cursor-pointer" onClick={() => openOrderDetail(String(order._id || order.id))}>
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
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
          Configure UPI payment details for your customers. Provide your UPI QR code, UPI ID, and payment instructions.
        </p>
      </div>

      <Card>
        <CardHeader>

          <CardTitle>UPI Payment</CardTitle>
          <CardDescription>Set up UPI and Cash on Delivery payment options for customers.</CardDescription>

          <CardTitle>UPI Payment Settings</CardTitle>
          <CardDescription>Configure UPI QR code and details for customers to scan and pay.</CardDescription>

        </CardHeader>
        <CardContent>
          <form onSubmit={handlePaymentSubmit} className="space-y-5">
            <div>
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
 
                placeholder="e.g., name@upi"

                placeholder="e.g., yourname@upi"

                value={paymentForm.upiId}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, upiId: e.target.value }))}
                disabled={settingsLoading || savingPayment}
              />
              <p className="text-sm text-muted-foreground mt-1">Your UPI address (e.g., merchant@upi or 9876543210@paytm)</p>
            </div>

            <div>
              <Label htmlFor="beneficiaryName">Beneficiary Name</Label>
              <Input
                id="beneficiaryName"
 
                placeholder="e.g., UNI10 Store"

                placeholder="e.g., Your Business Name"

                value={paymentForm.beneficiaryName}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, beneficiaryName: e.target.value }))}
                disabled={settingsLoading || savingPayment}
              />
              <p className="text-sm text-muted-foreground mt-1">Name that appears to customers during payment</p>
            </div>

            <div>
              <Label htmlFor="instructions">Payment Instructions</Label>
              <Textarea
                id="instructions"
 
                placeholder="e.g., Scan the QR code and send payment. Share the transaction ID in the next step."

                placeholder="e.g., Scan QR and pay. Enter UTR/Txn ID on next step."

                value={paymentForm.instructions}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, instructions: e.target.value }))}
                rows={3}
                disabled={settingsLoading || savingPayment}
              />
              <p className="text-sm text-muted-foreground mt-1">Instructions shown to customers at checkout</p>
            </div>

            <div className="border-t border-border pt-5">
              <Label className="font-medium mb-3 block">UPI QR Code</Label>
              <p className="text-sm text-muted-foreground mb-4">Upload your UPI QR code image to display during checkout.</p>

              <div className="space-y-3">
                {paymentForm.upiQrImage && (
                  <div className="border border-border rounded p-3 bg-muted">
                    <p className="text-xs text-muted-foreground mb-2">Current QR Code:</p>
                    <img src={paymentForm.upiQrImage} alt="UPI QR Code" className="w-32 h-32 object-contain" />
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    id="qr_file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadQrCode(f);
                      e.currentTarget.value = '';
                    }}
                    disabled={uploadingQrCode || settingsLoading || savingPayment}
                    className="flex-1"
                  />
                  <Button type="button" disabled={uploadingQrCode || settingsLoading || savingPayment} variant="outline">
                    {uploadingQrCode ? 'Uploading...' : 'Upload QR'}
                  </Button>
                </div>
              </div>
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
      case 'categories':
        return renderCategories();
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

      {/* Order Detail Drawer */}
      <Drawer open={orderDrawerOpen} onOpenChange={(o) => { setOrderDrawerOpen(o); if (!o) { setOrderDetail(null); setOrderDetailError(null); } }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Order #{selectedOrderId ? selectedOrderId.slice(0, 8) : ''}</DrawerTitle>
            {orderDetail?.createdAt && (
              <DrawerDescription>
                {new Date(orderDetail.createdAt).toLocaleString()}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            {orderDetailLoading && (
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {orderDetailError && (
              <p className="text-xs text-destructive">{orderDetailError}</p>
            )}
            {orderDetail && !orderDetailLoading && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{orderDetail.status}</Badge>
                  <Badge variant="secondary" className="capitalize">{orderDetail.paymentMethod}</Badge>
                  <div className="ml-auto font-semibold">₹{Number(orderDetail.totals?.total || 0).toLocaleString('en-IN')}</div>
                </div>

                <div className="border rounded-md p-3">
                  <h4 className="font-semibold mb-2">Shipping</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {orderDetail.shipping?.name || '-'}</div>
                    <div><span className="text-muted-foreground">Phone:</span> {orderDetail.shipping?.phone || '-'}</div>
                    <div className="md:col-span-2"><span className="text-muted-foreground">Address 1:</span> {orderDetail.shipping?.address1 || '-'}</div>
                    {orderDetail.shipping?.address2 && (
                      <div className="md:col-span-2"><span className="text-muted-foreground">Address 2:</span> {orderDetail.shipping?.address2}</div>
                    )}
                    <div><span className="text-muted-foreground">City:</span> {orderDetail.shipping?.city || '-'}</div>
                    <div><span className="text-muted-foreground">State:</span> {orderDetail.shipping?.state || '-'}</div>
                    <div><span className="text-muted-foreground">Pincode:</span> {orderDetail.shipping?.pincode || '-'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Items</h4>
                  <div className="space-y-2">
                    {(orderDetail.items || []).map((it: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 border rounded-md p-2">
                        <img
                          src={(it.image && String(it.image).length > 3) ? it.image : '/placeholder.svg'}
                          alt={it.title || 'Product'}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{it.title}</div>
                          <div className="text-xs text-muted-foreground">{it.variant?.size ? `Size: ${it.variant.size}` : ''}</div>
                        </div>
                        <div className="text-sm tabular-nums">{it.qty} × ₹{Number(it.price || 0).toLocaleString('en-IN')}</div>
                        <div className="w-20 text-right font-semibold">₹{(Number(it.qty || 0) * Number(it.price || 0)).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Footer />
    </div>
  );
};

export default Admin;
