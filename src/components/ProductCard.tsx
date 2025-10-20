import { ShoppingCart, User } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  sellerId: string;
  sellerName: string;
  status: string;
}

interface ProductCardProps {
  product: Product;
  onPurchase: (productId: string) => void;
  isOwnProduct: boolean;
}

export function ProductCard({ product, onPurchase, isOwnProduct }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="relative h-48 bg-gray-100">
        {product.image ? (
          <ImageWithFallback
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="h-16 w-16 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className="inline-block px-2 py-1 text-xs bg-blue-600 text-white rounded">
            {product.category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg text-gray-900 mb-2 line-clamp-1">{product.title}</h3>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[2.5rem]">
          {product.description || 'No description available'}
        </p>

        <div className="flex items-center text-sm text-gray-500 mb-3">
          <User className="h-4 w-4 mr-1" />
          <span className="line-clamp-1">{product.sellerName}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl text-gray-900">${product.price.toFixed(2)}</span>
          </div>
          
          {!isOwnProduct ? (
            <button
              onClick={() => onPurchase(product.id)}
              className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Buy</span>
            </button>
          ) : (
            <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md text-sm">
              Your Product
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
