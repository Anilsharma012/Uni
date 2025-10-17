import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

type UPISettings = {
  upiQrImage: string;
  upiId: string;
  beneficiaryName: string;
  instructions: string;
};

export const CheckoutModal: React.FC<Props> = ({ open, setOpen }) => {
  const { items, total, placeOrder, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"COD" | "UPI">("COD");
  const [upiSettings, setUpiSettings] = useState<UPISettings | null>(null);
  const [loadingUpi, setLoadingUpi] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [txnId, setTxnId] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Fetch UPI settings when payment method changes to UPI
  useEffect(() => {
    if (payment === "UPI" && !upiSettings && !loadingUpi) {
      fetchUpiSettings();
    }
  }, [payment]);

  const fetchUpiSettings = async () => {
    try {
      setLoadingUpi(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/settings', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {}

      if (response.ok && data?.data?.payment) {
        const payment = data.data.payment;
        setUpiSettings({
          upiQrImage: payment.upiQrImage || '',
          upiId: payment.upiId || '',
          beneficiaryName: payment.beneficiaryName || '',
          instructions: payment.instructions || '',
        });
      } else {
        toast({ title: 'Failed to load UPI settings', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to fetch UPI settings:', error);
      toast({ title: 'Failed to load UPI settings', variant: 'destructive' });
    } finally {
      setLoadingUpi(false);
    }
  };

  const copyUpiId = async () => {
    if (!upiSettings?.upiId) return;
    try {
      await navigator.clipboard.writeText(upiSettings.upiId);
      setCopiedUpi(true);
      toast({ title: 'UPI ID copied to clipboard' });
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch (error) {
      toast({ title: 'Failed to copy UPI ID', variant: 'destructive' });
    }
  };

  // Consistent field styles to ensure text is visible
  const fieldBase =
    "w-full border border-border rounded px-3 py-2 " +
    "text-foreground placeholder:text-muted-foreground bg-background " +
    "focus:outline-none focus:ring-2 focus:ring-ring " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const handlePlaceOrder = async () => {
    if (!name || !phone || !address) {
      toast({
        title: "Please fill name, phone and address",
        variant: "destructive",
      });
      return;
    }

    if (payment === "UPI") {
      if (!payerName) {
        toast({
          title: "Please enter payer name for UPI payment",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    const payload: any = {
      name,
      phone,
      address,
      paymentMethod: payment,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        qty: i.qty,
        meta: i.meta,
        image: i.image,
      })),
      total,
    };

    if (payment === "UPI") {
      payload.upi = {
        payerName,
        txnId: txnId || '',
      };
    }

    const res = await placeOrder(payload);
    setLoading(false);

    if (res.ok) {
      const newOrderId = String((res.data?._id || res.data?.id) ?? "local_" + Date.now());

      try {
        const raw = localStorage.getItem("uni_orders_v1");
        const arr = raw ? (JSON.parse(raw) as any[]) : [];
        const status = payment === "COD" ? "cod_pending" : "pending_verification";
        const order = {
          _id: newOrderId,
          total,
          payment: payment,
          status,
          createdAt: new Date().toISOString(),
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            price: i.price,
            qty: i.qty,
            image: i.image,
          })),
          ...(payment === "UPI" && { upi: { payerName, txnId: txnId || '' } }),
        };
        localStorage.setItem("uni_orders_v1", JSON.stringify([order, ...arr]));
        localStorage.setItem("uni_last_order_id", newOrderId);
      } catch (e) {
        console.error("Failed to persist local order", e);
      }

      const message = payment === "COD"
        ? "Order placed successfully. Awaiting delivery confirmation."
        : "Payment pending verification. We'll confirm your order shortly.";

      toast({
        title: "Order placed",
        description: `Order #${newOrderId}: ${message}`,
      });
      try {
        window.dispatchEvent(
          new CustomEvent("order:placed", { detail: { id: newOrderId } })
        );
      } catch { }
      clearCart();
      setOpen(false);
      navigate("/dashboard", { replace: true });
    } else {
      toast({
        title: "Order failed",
        description: String(res.error ?? "Unknown error"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>Complete your purchase</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldBase}
              autoComplete="name"
              placeholder="Your full name"
              type="text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldBase}
              autoComplete="tel"
              inputMode="numeric"
              placeholder="9876543210"
              type="tel"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="address"
            >
              Address
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={fieldBase + " min-h-[96px]"}
              rows={3}
              autoComplete="street-address"
              placeholder="House no., Street, City, Pincode"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  className="accent-primary"
                  type="radio"
                  name="payment"
                  checked={payment === "COD"}
                  onChange={() => setPayment("COD")}
                />
                <span className="text-sm">Cash on Delivery</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  className="accent-primary"
                  type="radio"
                  name="payment"
                  checked={payment === "UPI"}
                  onChange={() => setPayment("UPI")}
                />
                <span className="text-sm">UPI</span>
              </label>
            </div>
          </div>

          {payment === "UPI" && (
            <div className="space-y-4 border border-border rounded-lg p-4 bg-muted">
              {loadingUpi ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                  Loading UPI details...
                </div>
              ) : upiSettings && (upiSettings.upiQrImage || upiSettings.upiId) ? (
                <>
                  {upiSettings.upiQrImage && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm font-medium">Scan QR Code to Pay</p>
                      <img
                        src={upiSettings.upiQrImage}
                        alt="UPI QR Code"
                        className="w-40 h-40 border border-border rounded p-1 bg-white"
                      />
                    </div>
                  )}

                  {upiSettings.upiId && (
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-medium">UPI ID: {upiSettings.upiId}</p>
                        <button
                          type="button"
                          onClick={copyUpiId}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-background hover:bg-input rounded border border-border transition-colors"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {upiSettings.beneficiaryName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Beneficiary: {upiSettings.beneficiaryName}</p>
                    </div>
                  )}

                  {upiSettings.instructions && (
                    <div>
                      <p className="text-xs text-muted-foreground">{upiSettings.instructions}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="payerName">
                      Your Name
                    </label>
                    <input
                      id="payerName"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      className={fieldBase}
                      placeholder="Name as shown in payment"
                      type="text"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="txnId">
                      Transaction/UTR ID (Optional)
                    </label>
                    <input
                      id="txnId"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                      className={fieldBase}
                      placeholder="e.g., 123456789"
                      type="text"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter the transaction ID from your UPI app</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                  UPI payment not configured yet
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="w-full flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="font-bold">
                ₹{total.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handlePlaceOrder} disabled={loading}>
                {loading ? "Placing…" : "Place Order"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
