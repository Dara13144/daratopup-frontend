// The PRODUCTION backend URL is used as fallback.
// This prevents the "port 5000" error even if NEXT_PUBLIC_API_URL is missing at build time.
const PRODUCTION_API = 'https://daratopup-backend-wapz.onrender.com';

// Retrieve the raw backend URL from env, default fallback to production Render URL
const rawApiUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  PRODUCTION_API
);

// Clean up input: remove trailing slash, and remove any trailing '/api'
export const serverUrl = rawApiUrl.replace(/\/$/, '').replace(/\/api$/, '');

// Centralized API endpoint base
export const API_BASE = `${serverUrl}/api`;

// Dev diagnostic only — does not affect production behavior
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.info(`[DaraTopup] resolved serverUrl: "${serverUrl}" and API_BASE: "${API_BASE}"`);
}

export interface GameProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  isActive: boolean;
  packages: GamePackage[];
}

export interface GamePackage {
  id: string;
  productId: string;
  name: string;
  amount: number;
  price: number;
  isActive: boolean;
  category: string;
  badge?: string | null;
}

export interface OrderResponse {
  id: string;
  paymentTxnId: string;
  price: number;
  status: string; // PENDING, PROCESSING, COMPLETED, FAILED
  paymentStatus: string; // UNPAID, PAID, EXPIRED
  playerNickname: string;
}

export interface ABAPaymentPayload {
  req_time: string;
  merchant_id: string;
  tran_id: string;
  amount: string;
  items: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: string;
  payment_option?: string;
  shipping?: string;
  hash: string;
  callback_url: string;
  return_url: string;
}

export interface ABAPaymentDetails {
  checkoutUrl: string;
  payload: ABAPaymentPayload;
}

export interface BakongPaymentDetails {
  qrCode: string;
  md5: string;
  txnId: string;
}

export interface OrderCreateResponse {
  message: string;
  order: OrderResponse;
  paymentDetails: ABAPaymentDetails | BakongPaymentDetails;
}

export interface OrderStatusDetails {
  id: string;
  paymentTxnId: string;
  gameName: string;
  gameSlug: string;
  packageName: string;
  playerId: string;
  playerNickname: string;
  price: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  stockDeliveredCode: string | null;
  paymentQrCode?: string;
  paymentMd5?: string;
  createdAt: string;
  merchantName?: string;
  abaPayload?: Record<string, string> | null;
  abaApiUrl?: string | null;
}

// Helper to fetch authorization header
function getAuthHeaders(token?: string): Record<string, string> {
  const t = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

export async function fetchProducts(): Promise<GameProduct[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function fetchProduct(slug: string): Promise<GameProduct> {
  const res = await fetch(`${API_BASE}/products/${slug}`);
  if (!res.ok) throw new Error('Failed to fetch product details');
  return res.json();
}

export async function lookupNickname(
  gameSlug: string,
  playerId: string,
  playerZoneId?: string
): Promise<string> {
  const query = new URLSearchParams({ playerId });
  if (playerZoneId) query.append('playerZoneId', playerZoneId);
  
  const res = await fetch(`${API_BASE}/products/lookup/${gameSlug}?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Player lookup failed');
  }
  const data = await res.json();
  return data.nickname;
}

export async function createOrder(
  packageId: string,
  playerId: string,
  playerZoneId: string | null,
  paymentMethod: 'ABA' | 'BAKONG' | 'CANADIA',
  email?: string
): Promise<OrderCreateResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Inject auth token if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ packageId, playerId, playerZoneId, paymentMethod, email }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to place order');
  }
  return res.json();
}

export async function getOrderStatus(txnId: string): Promise<OrderStatusDetails> {
  const res = await fetch(`${API_BASE}/orders/status/${txnId}`);
  if (!res.ok) throw new Error('Failed to fetch order status');
  return res.json();
}

export async function verifyPayment(txnId: string): Promise<{
  verified: boolean;
  status?: string;
  paymentStatus?: string;
  deliverySuccess?: boolean;
  deliveredCode?: string | null;
  message?: string;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/orders/verify/${txnId}`, { method: 'POST' });
  return res.json();
}

export async function fetchOrderHistory(emailOrId: string): Promise<OrderStatusDetails[]> {
  const res = await fetch(`${API_BASE}/orders/history/${emailOrId}`);
  if (!res.ok) throw new Error('Failed to fetch order history');
  return res.json();
}

// Authentication
export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Invalid credentials');
  }
  return res.json();
}

export async function register(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function loginWithGoogle(
  email?: string, 
  googleId?: string, 
  name?: string, 
  asAdmin: boolean = false,
  credential?: string
) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, googleId, name, asAdmin, credential }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Google authentication failed');
  }
  return res.json();
}

export async function getProfile() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

// Simulated payments (Sandbox Trigger)
export async function simulatePaymentCallback(txnId: string, status: 'PAID' | 'FAILED' = 'PAID') {
  const res = await fetch(`${API_BASE}/orders/simulate-callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txnId, paymentStatus: status }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Simulation failed');
  }
  return res.json();
}

// Admin Panel Requests
export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return res.json();
}

export async function fetchAdminOrders(status?: string, search?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);

  const res = await fetch(`${API_BASE}/admin/orders?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function updateAdminOrderStatus(id: string, status: string, code?: string) {
  const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status, stockDeliveredCode: code }),
  });
  if (!res.ok) throw new Error('Failed to update order status');
  return res.json();
}

export async function fetchAdminStock() {
  const res = await fetch(`${API_BASE}/admin/stock`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch stock list');
  return res.json();
}

export async function addAdminStock(packageId: string, codes: string) {
  const res = await fetch(`${API_BASE}/admin/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ packageId, codes }),
  });
  if (!res.ok) throw new Error('Failed to add stock codes');
  return res.json();
}

export async function addAdminProduct(name: string, category: string, image?: string) {
  const res = await fetch(`${API_BASE}/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name, category, image }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create product');
  }
  return res.json();
}

export async function addAdminPackage(
  productId: string, 
  name: string, 
  amount: number, 
  price: number,
  category: string = 'NORMAL',
  badge?: string,
  image?: string
) {
  const res = await fetch(`${API_BASE}/admin/products/${productId}/packages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name, amount, price, category, badge, image }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create package');
  }
  return res.json();
}

export async function deleteAdminProduct(id: string) {
  const res = await fetch(`${API_BASE}/admin/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
}

export async function deleteAdminPackage(id: string) {
  const res = await fetch(`${API_BASE}/admin/packages/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete package');
  return res.json();
}

export async function lookupPlayerNickname(gameSlug: string, playerId: string, playerZoneId?: string) {
  const zoneParam = playerZoneId ? `&playerZoneId=${encodeURIComponent(playerZoneId)}` : '';
  const res = await fetch(`${API_BASE}/products/lookup/${gameSlug}?playerId=${encodeURIComponent(playerId)}${zoneParam}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to lookup player ID');
  }
  return res.json() as Promise<{ nickname: string }>;
}
