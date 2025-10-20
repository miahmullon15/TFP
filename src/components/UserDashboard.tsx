import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { AddProductForm } from './AddProductForm';
import { Package, ShoppingBag, Plus, Trash2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  createdAt: string;
}

interface Order {
  id: string;
  productTitle: string;
  productImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}

interface UserDashboardProps {
  accessToken: string;
  user: any;
}

export function UserDashboard({ accessToken, user }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    await Promise.all([fetchUserProducts(), fetchUserOrders()]);
    setIsLoading(false);
  };

  const fetchUserProducts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0ee4fe7d/products`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const userProducts = (data.products || []).filter(
          (p: Product) => p.sellerId === user.id
        );
        setProducts(userProducts);
      }
    } catch (error) {
      console.error('Error fetching user products:', error);
    }
  };

  const fetchUserOrders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0ee4fe7d/orders`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching user orders:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0ee4fe7d/products/${productId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setProducts(products.filter((p) => p.id !== productId));
        alert('Product deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('An error occurred while deleting the product');
    }
  };

  const handleProductAdded = () => {
    setShowAddProduct(false);
    fetchUserProducts();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900">My Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage your products and view your orders</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>My Products ({products.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5" />
              <span>Orders ({orders.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          <div className="mb-6">
            <button
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Product</span>
            </button>
          </div>

          {showAddProduct && (
            <div className="mb-8">
              <AddProductForm
                accessToken={accessToken}
                onSuccess={handleProductAdded}
                onCancel={() => setShowAddProduct(false)}
              />
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No products yet</p>
              <p className="text-gray-400 mt-2">Start by adding your first product</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="relative h-48 bg-gray-100">
                    {product.image ? (
                      <ImageWithFallback
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="inline-block px-2 py-1 text-xs bg-blue-600 text-white rounded">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg text-gray-900 mb-2">{product.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl text-gray-900">${product.price.toFixed(2)}</span>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No orders yet</p>
              <p className="text-gray-400 mt-2">Your purchase and sale history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                      {order.productImage ? (
                        <ImageWithFallback
                          src={order.productImage}
                          alt={order.productTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg text-gray-900 mb-1">{order.productTitle}</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          {order.buyerId === user.id ? (
                            <>Purchased from: {order.sellerName}</>
                          ) : (
                            <>Sold to: {order.buyerName}</>
                          )}
                        </p>
                        <p>Quantity: {order.quantity}</p>
                        <p>Total: ${order.totalPrice.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="inline-block px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
