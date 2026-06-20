import { useEffect, useState } from 'react'
import { ShoppingCart, Package, Plus, Minus, Trash2, Search } from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useNavigate } from 'react-router-dom'
import type { Product } from '@/types'

type CartState = Record<number, { product: Product; quantity: number }>

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  cardio: 'Cardio',
  strength: 'Strength',
  machines: 'Machines',
  recovery: 'Recovery',
  accessories: 'Accessories',
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartState>({})
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [shippingAddress, setShippingAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get<Product[]>('/user/products').then(setProducts).catch(e => setError((e as Error).message))
  }, [])

  const filtered = products.filter(p => {
    if (category !== 'all' && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const cartItems = Object.values(cart)
  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  function addToCart(product: Product) {
    setCart(prev => ({
      ...prev,
      [product.id]: { product, quantity: (prev[product.id]?.quantity ?? 0) + 1 },
    }))
  }

  function removeFromCart(productId: number) {
    setCart(prev => { const { [productId]: _, ...rest } = prev; return rest })
  }

  function adjustQty(productId: number, delta: number) {
    setCart(prev => {
      const item = prev[productId]
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) { const { [productId]: _, ...rest } = prev; return rest }
      return { ...prev, [productId]: { ...item, quantity: newQty } }
    })
  }

  async function placeOrder() {
    if (!shippingAddress.trim()) { setError('Shipping address is required'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/user/orders', {
        items: cartItems.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        shipping_address: shippingAddress,
      })
      setSuccess('Order placed successfully!')
      setCart({})
      setCheckoutOpen(false)
      setTimeout(() => navigate('/customer/orders'), 1200)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Fitness Shop</h1>
        <Button onClick={() => { setError(''); setCheckoutOpen(true) }} disabled={cartCount === 0} className="relative gap-2">
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cartCount > 0 && <Badge variant="destructive" className="ml-1 px-1.5">{cartCount}</Badge>}
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert variant="info"><AlertDescription>{success}</AlertDescription></Alert>}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Package className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="mb-2">No products found.</p>
          <Button variant="link" onClick={() => navigate('/customer/request-product')}>
            Request a product instead
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(product => {
            const inCart = cart[product.id]
            const outOfStock = product.stock_quantity === 0
            return (
              <Card key={product.id} className="flex flex-col">
                <div className="flex h-40 items-center justify-center overflow-hidden rounded-t-lg bg-muted">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    : <Package className="h-16 w-16 text-muted-foreground/30" />}
                </div>
                <CardContent className="flex-1 pt-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">{product.name}</p>
                    <Badge variant="outline" className="shrink-0 capitalize text-xs">{product.category}</Badge>
                  </div>
                  {product.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
                  )}
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-2 pt-0">
                  <div>
                    <p className="text-lg font-bold">${Number(product.price).toFixed(2)}</p>
                    {outOfStock
                      ? <p className="text-xs text-destructive font-medium">Out of stock</p>
                      : <p className="text-xs text-muted-foreground">{product.stock_quantity} left</p>}
                  </div>
                  {outOfStock ? (
                    <Button size="sm" variant="outline" onClick={() => navigate('/customer/request-product')}>
                      Request
                    </Button>
                  ) : inCart ? (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => adjustQty(product.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{inCart.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => adjustQty(product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(product)}>Add to Cart</Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Your Cart</DialogTitle></DialogHeader>
          <div className="max-h-60 space-y-3 overflow-y-auto">
            {cartItems.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">${Number(product.price).toFixed(2)} × {quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${(Number(product.price) * quantity).toFixed(2)}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(product.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          <div className="space-y-1.5">
            <Label>Shipping Address</Label>
            <Input
              placeholder="Enter your shipping address"
              value={shippingAddress}
              onChange={e => setShippingAddress(e.target.value)}
            />
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Continue Shopping</Button>
            <Button onClick={placeOrder} disabled={loading || cartItems.length === 0}>
              {loading ? 'Placing…' : 'Place Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
