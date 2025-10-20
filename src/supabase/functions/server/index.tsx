import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Helper function to generate unique IDs
const generateId = () => crypto.randomUUID();

// Helper function to verify user authentication
async function authenticateUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return { user: null, error: 'No access token provided' };
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }
  
  return { user, error: null };
}

// User Signup
app.post('/make-server-0ee4fe7d/signup', async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }
    
    const userRole = role === 'admin' ? 'admin' : 'user';
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: userRole },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });
    
    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }
    
    // Store user data in KV store
    const userId = data.user.id;
    await kv.set(`users:${userId}`, {
      id: userId,
      email,
      name,
      role: userRole,
      createdAt: new Date().toISOString(),
    });
    
    // Initialize empty arrays for user's products and orders
    await kv.set(`user_products:${userId}`, []);
    await kv.set(`user_orders:${userId}`, []);
    
    return c.json({ 
      success: true, 
      user: { id: userId, email, name, role: userRole } 
    });
  } catch (error) {
    console.log(`Error in signup endpoint: ${error}`);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Get current user info
app.get('/make-server-0ee4fe7d/user', async (c) => {
  try {
    const { user, error } = await authenticateUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }
    
    const userData = await kv.get(`users:${user.id}`);
    
    if (!userData) {
      return c.json({ error: 'User data not found' }, 404);
    }
    
    return c.json({ user: userData });
  } catch (error) {
    console.log(`Error fetching user info: ${error}`);
    return c.json({ error: 'Internal server error while fetching user' }, 500);
  }
});

// Get all products
app.get('/make-server-0ee4fe7d/products', async (c) => {
  try {
    const products = await kv.getByPrefix('products:');
    return c.json({ products: products || [] });
  } catch (error) {
    console.log(`Error fetching products: ${error}`);
    return c.json({ error: 'Internal server error while fetching products' }, 500);
  }
});

// Create new product (authenticated)
app.post('/make-server-0ee4fe7d/products', async (c) => {
  try {
    const { user, error } = await authenticateUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }
    
    const { title, description, price, image, category } = await c.req.json();
    
    if (!title || !price) {
      return c.json({ error: 'Title and price are required' }, 400);
    }
    
    const userData = await kv.get(`users:${user.id}`);
    const productId = generateId();
    
    const product = {
      id: productId,
      title,
      description: description || '',
      price: parseFloat(price),
      image: image || '',
      category: category || 'Other',
      sellerId: user.id,
      sellerName: userData.name || 'Unknown',
      status: 'available',
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`products:${productId}`, product);
    
    // Add to user's products
    const userProducts = await kv.get(`user_products:${user.id}`) || [];
    userProducts.push(productId);
    await kv.set(`user_products:${user.id}`, userProducts);
    
    return c.json({ success: true, product });
  } catch (error) {
    console.log(`Error creating product: ${error}`);
    return c.json({ error: 'Internal server error while creating product' }, 500);
  }
});

// Update product
app.put('/make-server-0ee4fe7d/products/:id', async (c) => {
  try {
    const { user, error } = await authenticateUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }
    
    const productId = c.req.param('id');
    const product = await kv.get(`products:${productId}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    const userData = await kv.get(`users:${user.id}`);
    
    // Check if user is the seller or admin
    if (product.sellerId !== user.id && userData.role !== 'admin') {
      return c.json({ error: 'Not authorized to update this product' }, 403);
    }
    
    const updates = await c.req.json();
    const updatedProduct = { ...product, ...updates, id: productId };
    
    await kv.set(`products:${productId}`, updatedProduct);
    
    return c.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.log(`Error updating product: ${error}`);
    return c.json({ error: 'Internal server error while updating product' }, 500);
  }
});

// Delete product (admin or owner)
app.delete('/make-server-0ee4fe7d/products/:id', async (c) => {
  try {
    const { user, error } = await authenticateUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }
    
    const productId = c.req.param('id');
    const product = await kv.get(`products:${productId}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    const userData = await kv.get(`users:${user.id}`);
    
    // Check if user is the seller or admin
    if (product.sellerId !== user.id && userData.role !== 'admin') {
      return c.json({ error: 'Not authorized to delete this product' }, 403);
    }
    
    await kv.del(`products:${productId}`);
    
    // Remove from user's products
    const userProducts = await kv.get(`user_products:${product.sellerId}`) || [];
    const updatedProducts = userProducts.filter((id: string) => id !== productId);
    await kv.set(`user_products:${product.sellerId}`, updatedProducts);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting product: ${error}`);
    return c.json({ error: 'Internal server error while deleting product' }, 500);
  }
});

// Create order (purchase product)
app.post('/make-server-0ee4fe7d/orders', async (c) => {
  try {
    const { user, error } = await authenticateUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }
    
    const { productId, quantity } = await c.req.json();
    
    if (!productId) {
      return c.json({ error: 'Product ID is required' }, 400);
    }
    
    const product = await kv.get(`products:${productId}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    if (product.status !== 'available') {
      return c.json({ error: 'Product is not available' }, 400);
    }
    
    const orderId = generateId();
    const userData = await kv.get(`users:${user.id}`);
    const qty = quantity || 1;
    
    const order = {
      id: orderId,
      productId,
      productTitle: product.title,
      productImage: product.image,
      buyerId: user.id,
      buyerName: userData.name,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      price: product.price,
      quantity: qty,
      totalPrice: product.price * qty,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`orders:${orderId}`, order);
    
    // Add to buyer's orders
    const buyerOrders = await kv.get(`user_orders:${user.id}`) || [];
    buyerOrders.push(orderId);
    await kv.set(`user_orders:${user.id}`, buyerOrders);
    
    // Add to seller's orders
    const sellerOrders = await kv.get(`user_orders:${product.sellerId}`) || [];
    sellerOrders.push(orderId);
    await kv.set(`user_orders:${product.sellerId}`, sellerOrders);
    
    return c.json({ success: true, order });
  } catch (error) {
    console.log(`Error creating order: ${error}`);
    return c.json({ error: 'Internal server error while creating order' }, 500);
  }
});

// Get user's orders
app.get('/make-server-0ee4fe7d/orders', async (c) => {
  try {
    const { user, error } = await authenticateUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }
    
    const orderIds = await kv.get(`user_orders:${user.id}`) || [];
    const orders = await kv.mget(orderIds.map((id: string) => `orders:${id}`));
    
    return c.json({ orders: orders || [] });
  } catch (error) {
    console.log(`Error fetching orders: ${error}`);
    return c.json({ error: 'Internal server error while fetching orders' }, 500);
  }
});

// Admin: Get all users
app.get('/make-server-0ee4fe7d/admin/users', async (c) => {
  try {
    const { user, error } = await authenticateUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }
    
    const userData = await kv.get(`users:${user.id}`);
    
    if (userData.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    
    const users = await kv.getByPrefix('users:');
    return c.json({ users: users || [] });
  } catch (error) {
    console.log(`Error fetching users (admin): ${error}`);
    return c.json({ error: 'Internal server error while fetching users' }, 500);
  }
});

// Admin: Get all orders
app.get('/make-server-0ee4fe7d/admin/orders', async (c) => {
  try {
    const { user, error } = await authenticateUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }
    
    const userData = await kv.get(`users:${user.id}`);
    
    if (userData.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    
    const orders = await kv.getByPrefix('orders:');
    return c.json({ orders: orders || [] });
  } catch (error) {
    console.log(`Error fetching orders (admin): ${error}`);
    return c.json({ error: 'Internal server error while fetching orders' }, 500);
  }
});

Deno.serve(app.fetch);
