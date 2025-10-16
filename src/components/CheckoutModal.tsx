import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

export const CheckoutModal: React.FC<Props> = ({ open, setOpen }) => {
  const { items, total, placeOrder, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"COD" | "UPI" | "Card">("COD");

  const handlePlaceOrder = async () => {
    if (!name || !phone || !address) {
      toast({ title: "Please fill name, phone and address", variant: "destructive" });
      return;
    }

    setLoading(true);
    const payload = {
      customer: { name, phone, address },
      payment_method: payment,
      items: items.map((i) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty, meta: i.meta, image: i.image })),
      total,
      created_at: new Date().toISOString(),
    };

    const res = await placeOrder(payload);
    setLoading(false);

    if (res.ok) {
      const newOrderId = String(res.data?.id ?? "local_" + Date.now());

      try {
        const raw = localStorage.getItem("uni_orders_v1");
        const arr = raw ? (JSON.parse(raw) as any[]) : [];
        const status = payment === "COD" ? "pending" : "paid";
        const order = {
          _id: newOrderId,
          total,
          payment: payment,
          status,
          createdAt: new Date().toISOString(),
          items: items.map((i) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty, image: i.image })),
        };
        localStorage.setItem("uni_orders_v1", JSON.stringify([order, ...arr]));
        localStorage.setItem("uni_last_order_id", newOrderId);
      } catch (e) {
        console.error("Failed to persist local order", e);
      }

      toast({ title: "Order placed", description: `Order #${newOrderId} placed successfully` });
      clearCart();
      setOpen(false);
      navigate("/dashboard", { replace: true });
    } else {
      toast({ title: "Order failed", description: String(res.error ?? "Unknown error"), variant: "destructive" });
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
            <label className="block text-sm font-medium mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-border rounded px-3 py-2" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="payment" checked={payment === "COD"} onChange={() => setPayment("COD")} />
                <span className="text-sm">Cash on Delivery</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="payment" checked={payment === "UPI"} onChange={() => setPayment("UPI")} />
                <span className="text-sm">UPI</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="payment" checked={payment === "Card"} onChange={() => setPayment("Card")} />
                <span className="text-sm">Card</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="w-full flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="font-bold">₹{total.toLocaleString("en-IN")}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
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
