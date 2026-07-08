import { Tag, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlobalDiscountForm from "./GlobalDiscountForm";
import ProductDiscountsSection from "./ProductDiscountsSection";

export default function DiscountManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Discount Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure product-level discounts and a global sitewide discount.
        </p>
      </div>

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Global Discount
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Product Discounts
          </TabsTrigger>
        </TabsList>

        <Separator className="mt-3 mb-6" />

        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-blue-600" />
                Sitewide Global Discount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GlobalDiscountForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-red-600" />
                Per-Product Discounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductDiscountsSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
