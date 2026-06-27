import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, scaleIn, stagger, VP } from "./animations";
import usePublic from "@/hooks/usePublic";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&h=300&fit=crop&q=80";

export default function ProductsSection() {
  const { GetProducts } = usePublic();
  const { data } = GetProducts({ queryParams: { page_size: 5, page: 1 } });
  const products = data?.items ?? [];

  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="mb-14 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          <div>
            <span className="mb-2 inline-block rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Shop
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-gray-900">
              Fitness gear & nutrition
            </h2>
            <p className="mt-2 max-w-md text-base text-gray-500">
              Curated products to support your journey — equipment, supplements,
              and recovery tools.
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 border-gray-200"
            asChild
          >
            <Link to="/products">
              View All Products <ShoppingBag className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {products.length > 0 ? (
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={VP}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5"
          >
            {products.map((p) => (
              <motion.div
                key={p.id}
                variants={scaleIn}
                className="hover-lift group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <Link to={`/products/${p.id}`} className="flex flex-col h-full">
                  {/* Fixed 4:3 image container */}
                  <div className="relative w-full overflow-hidden bg-gray-50" style={{ paddingBottom: "75%" }}>
                    <img
                      src={p.image_url || PLACEHOLDER_IMG}
                      alt={p.name}
                      className="absolute inset-0 h-full w-full object-cover img-zoom"
                      loading="lazy"
                    />
                  </div>
                  {/* Content — fixed height so all cards align */}
                  <div className="flex flex-col flex-1 p-4">
                    <span className="mb-1 inline-block self-start rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 capitalize">
                      {p.category_name ?? p.category}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-gray-900 line-clamp-2 flex-1">
                      {p.name}
                    </h3>
                    <p className="mt-2 text-base font-extrabold text-emerald-600">
                      Rs. {Number(p.price).toLocaleString()}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
            <Package className="h-12 w-12 opacity-30" />
            <p className="text-sm">No products available yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}
