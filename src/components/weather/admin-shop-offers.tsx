import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Plus, Trash2, Tag, Percent } from "lucide-react";
import { format } from "date-fns";

const SHOP_ITEMS = [
  { id: "streak_freeze", name: "Streak Freeze", defaultPrice: 25 },
  { id: "rainz_plus_3day", name: "Rainz+ Trial", defaultPrice: 100 },
  { id: "double_points", name: "Double Points", defaultPrice: 50 },
  { id: "prediction_boost", name: "Prediction Shield", defaultPrice: 60 },
  { id: "profile_badge_weather_master", name: "Weather Master Badge", defaultPrice: 150 },
  { id: "gift_box", name: "Mystery Box", defaultPrice: 40 },
];

interface ShopOffer {
  id: string;
  item_id: string;
  original_price: number;
  offer_price: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function AdminShopOffers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // New offer form
  const [selectedItem, setSelectedItem] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("shop_offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error loading offers:", error);
      toast.error("Failed to load shop offers");
    } finally {
      setLoading(false);
    }
  };

  const createOffer = async () => {
    if (!selectedItem || !offerPrice) {
      toast.error("Please select an item and enter an offer price");
      return;
    }

    const item = SHOP_ITEMS.find((i) => i.id === selectedItem);
    if (!item) return;

    const price = parseInt(offerPrice);
    if (isNaN(price) || price < 0 || price >= item.defaultPrice) {
      toast.error("Offer price must be less than the original price (0 = free)");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("shop_offers").insert({
        item_id: selectedItem,
        original_price: item.defaultPrice,
        offer_price: price,
        ends_at: endsAt || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Offer created successfully!");
      setSelectedItem("");
      setOfferPrice("");
      setEndsAt("");
      loadOffers();
    } catch (error: any) {
      console.error("Error creating offer:", error);
      toast.error(error.message || "Failed to create offer");
    } finally {
      setCreating(false);
    }
  };

  const toggleOfferActive = async (offerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("shop_offers")
        .update({ is_active: isActive })
        .eq("id", offerId);

      if (error) throw error;
      toast.success(isActive ? "Offer activated" : "Offer deactivated");
      loadOffers();
    } catch (error) {
      toast.error("Failed to update offer");
    }
  };

  const deleteOffer = async (offerId: string) => {
    try {
      const { error } = await supabase.from("shop_offers").delete().eq("id", offerId);
      if (error) throw error;
      toast.success("Offer deleted");
      loadOffers();
    } catch (error) {
      toast.error("Failed to delete offer");
    }
  };

  const getItemName = (itemId: string) => {
    return SHOP_ITEMS.find((i) => i.id === itemId)?.name || itemId;
  };

  const getDiscount = (original: number, offer: number) => {
    return Math.round(((original - offer) / original) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Offer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Create Shop Offer
          </CardTitle>
          <CardDescription>
            Put items on sale with discounted prices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Item</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {SHOP_ITEMS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.defaultPrice} SP)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Offer Price (SP)</Label>
              <Input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Ends At (optional)</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={createOffer} disabled={creating} className="w-full gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Offer
              </Button>
            </div>
          </div>
          
          {selectedItem && offerPrice && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
              <Percent className="w-4 h-4 inline mr-2 text-green-500" />
              {getDiscount(SHOP_ITEMS.find((i) => i.id === selectedItem)?.defaultPrice || 0, parseInt(offerPrice) || 0)}% off!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Offers */}
      <Card>
        <CardHeader>
          <CardTitle>Active Offers</CardTitle>
          <CardDescription>Manage existing shop offers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Offer</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No offers found
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">{getItemName(offer.item_id)}</TableCell>
                    <TableCell>{offer.original_price} SP</TableCell>
                    <TableCell className="text-green-500 font-bold">{offer.offer_price} SP</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                        -{getDiscount(offer.original_price, offer.offer_price)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {offer.ends_at ? format(new Date(offer.ends_at), "MMM dd, HH:mm") : "Never"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={offer.is_active}
                        onCheckedChange={(checked) => toggleOfferActive(offer.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteOffer(offer.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
