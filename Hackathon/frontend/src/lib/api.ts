import type { Role, Session } from './auth';
import type {
  CouponClaimsResponse,
  FoodAnalysis,
  MoodSuggestion,
  Offer,
  OfferAnalytics,
  WalletCategory,
  WalletRecommendationsResponse,
  WalletResponse,
} from './domain';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

type RequestOptions = RequestInit & {
  body?: BodyInit | Record<string, unknown>;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const body = options.body && typeof options.body !== 'string'
    ? JSON.stringify(options.body)
    : options.body;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }

  return data as T;
};

const requestForm = async <T>(path: string, formData: FormData): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }

  return data as T;
};

export const signup = (payload: {
  name: string;
  email: string;
  password: string;
  role: Role;
  category?: string;
  preferences?: string[];
}) => {
  const path = payload.role === 'merchant' ? '/api/merchants/signup' : '/api/users/signup';

  return request<Session>(path, {
    method: 'POST',
    body: payload,
  });
};

export const login = (payload: { email: string; password: string; role: Role }) => {
  const path = payload.role === 'merchant' ? '/api/merchants/login' : '/api/users/login';

  return request<Session>(path, {
    method: 'POST',
    body: payload,
  });
};

export const updateMerchant = (
  merchantId: string,
  payload: {
    name: string;
    email: string;
    category: string;
    location?: { lat?: number; lng?: number; address?: string };
  }
) =>
  request<Session>(`/api/merchants/${merchantId}`, {
    method: 'PUT',
    body: payload,
  });

export const updateUser = (
  userId: string,
  payload: {
    name: string;
    email: string;
    preferences?: string[];
    location?: { lat?: number; lng?: number };
  }
) =>
  request<Session>(`/api/users/${userId}`, {
    method: 'PUT',
    body: payload,
  });

const categoryMap: Record<string, Offer['category']> = {
  coffee: 'coffee',
  food: 'food',
  retail: 'retail',
  gym: 'gym',
  fitness: 'gym',
  grocery: 'flash',
};

const getExpiresInMinutes = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / 60000));
};

const getMerchantId = (merchant: unknown) => {
  if (!merchant) return undefined;
  if (typeof merchant === 'string') return merchant;
  if (typeof merchant === 'object' && '_id' in merchant) {
    return String((merchant as { _id?: unknown })._id || '');
  }
  return undefined;
};

const getMerchantLocation = (merchant: unknown) => {
  if (!merchant || typeof merchant !== 'object' || !('location' in merchant)) return undefined;

  const location = (merchant as { location?: { lat?: unknown; lng?: unknown; address?: unknown } }).location;
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  return { lat, lng, address: typeof location?.address === 'string' ? location.address : undefined };
};

const getMerchantAddress = (merchant: unknown) => {
  if (!merchant || typeof merchant !== 'object' || !('location' in merchant)) return undefined;

  const location = (merchant as { location?: { address?: unknown } }).location;
  return typeof location?.address === 'string' ? location.address : undefined;
};

const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase();

const getOfferOriginalPrice = (offer: any) => {
  const targetItem = normalizeText(offer.targetItem);
  const products = Array.isArray(offer.metadata?.marginInsights?.products)
    ? offer.metadata.marginInsights.products
    : [];
  const matchingProduct = products.find((product: any) => {
    const productName = normalizeText(product.product);
    return productName && targetItem && (productName.includes(targetItem) || targetItem.includes(productName));
  });
  const sellPrice = Number(matchingProduct?.sellPrice || 0);
  const averagePerCustomer = Number(offer.metadata?.financeInsights?.averagePerCustomer || 0);
  const estimatedRevenue = Number(offer.estimatedRevenue || 0);
  const price = Math.max(sellPrice, averagePerCustomer, estimatedRevenue, 0);

  return Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : undefined;
};

const getOfferPrice = (originalPrice?: number, discountPercentage?: number) => {
  if (!originalPrice) return undefined;
  const discount = Math.max(0, Math.min(100, Number(discountPercentage || 0))) / 100;
  return Math.round(originalPrice * (1 - discount) * 100) / 100;
};

const toOffer = (offer: any, index: number): Offer => ({
  id: offer._id || String(index),
  merchantId: getMerchantId(offer.merchant),
  merchantName: offer.merchantName,
  category: categoryMap[offer.category] || 'flash',
  distanceMeters: 90 + index * 110,
  offerText: offer.offerText,
  reasonWhyNow: offer.reasonWhyNow,
  expiresInMinutes: getExpiresInMinutes(offer.expiresAt),
  sector: offer.metadata?.inputLocation || 'Unknown location',
  discountPercentage: offer.discountPercentage,
  originalPrice: getOfferOriginalPrice(offer),
  offerPrice: getOfferPrice(getOfferOriginalPrice(offer), offer.discountPercentage),
  targetItem: offer.targetItem,
  expectedCustomerVolume: offer.metadata?.expectedCustomerVolume,
  expectedBusinessImpact: offer.metadata?.expectedBusinessImpact,
  aiSuggestion: offer.metadata?.aiSuggestion,
  claimCount: offer.claimCount || 0,
  merchantAddress: getMerchantAddress(offer.merchant) || offer.metadata?.inputAddress,
  location: getMerchantLocation(offer.merchant),
});

export const generateOffers = async (payload: {
  merchantId: string;
  goal: string;
  financeFile?: File | null;
  inventoryFile?: File | null;
  marginFile?: File | null;
}) => {
  const formData = new FormData();
  formData.append('merchantId', payload.merchantId);
  formData.append('goal', payload.goal);

  if (payload.financeFile) formData.append('financeFile', payload.financeFile);
  if (payload.inventoryFile) formData.append('inventoryFile', payload.inventoryFile);
  if (payload.marginFile) formData.append('marginFile', payload.marginFile);

  const data = await requestForm<{ context: { source: string; answer: string; signals: string[] }; offers: any[] }>(
    '/api/offers/generate',
    formData
  );

  return {
    context: data.context,
    offers: data.offers.map(toOffer),
  };
};

export const getOffers = async () => {
  const data = await request<any[]>('/api/offers');
  return data.map(toOffer);
};

export const claimOffer = (
  offerId: string,
  payload: {
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
  }
) =>
  request<{
    message: string;
    offerId: string;
    claimCount: number;
    estimatedRevenue: number;
    couponCode: string;
    alreadyClaimed: boolean;
    walletImpact?: {
      amount: number;
      currency: 'USD';
      category: string;
      transactionId?: string;
      message: string;
    } | null;
  }>(
    `/api/offers/${offerId}/claim`,
    {
      method: 'POST',
      body: payload,
    }
  );

export const getOfferAnalytics = (merchantId?: string) => {
  const query = merchantId ? `?merchantId=${encodeURIComponent(merchantId)}` : '';

  return request<OfferAnalytics>(`/api/offers/analytics${query}`);
};

export const deleteOffer = (offerId: string, merchantId: string) =>
  request<{ message: string; offerId: string }>(`/api/offers/${offerId}`, {
    method: 'DELETE',
    body: { merchantId },
  });

export const getCouponClaims = (merchantId: string) =>
  request<CouponClaimsResponse>(`/api/offers/claims?merchantId=${encodeURIComponent(merchantId)}`);

export const getCustomerCouponClaims = (payload: { customerId?: string; customerEmail?: string }) => {
  const params = new URLSearchParams();

  if (payload.customerId) params.set('customerId', payload.customerId);
  if (payload.customerEmail) params.set('customerEmail', payload.customerEmail);

  return request<CouponClaimsResponse>(`/api/offers/claims/customer?${params.toString()}`);
};

export const getCustomerFoodAnalysis = (payload: { customerId?: string; customerEmail?: string }) => {
  const params = new URLSearchParams();

  if (payload.customerId) params.set('customerId', payload.customerId);
  if (payload.customerEmail) params.set('customerEmail', payload.customerEmail);

  return request<FoodAnalysis>(`/api/offers/food-analysis/customer?${params.toString()}`);
};

export const getMoodSuggestion = (payload: {
  mood: string;
  customerId?: string;
  customerEmail?: string;
  offerIds?: string[];
}) =>
  request<MoodSuggestion>('/api/offers/mood-suggestion', {
    method: 'POST',
    body: payload,
  });

export const redeemCouponClaim = (claimId: string, merchantId: string) =>
  request<{
    message: string;
    claimId: string;
    redeemedAt: string;
    walletImpact?: {
      amount: number;
      currency: 'USD';
      category: string;
      transactionId?: string;
      alreadyRecorded?: boolean;
      message: string;
    } | null;
  }>(
    `/api/offers/claims/${claimId}/redeem`,
    {
      method: 'PATCH',
      body: { merchantId },
    }
  );

export const getWallet = (userId: string) => request<WalletResponse>(`/api/wallet/${userId}`);

export const updateWallet = (
  userId: string,
  payload: {
    balance?: number;
    monthlyBudgets?: Partial<Record<WalletCategory, number>>;
  }
) =>
  request<WalletResponse>(`/api/wallet/${userId}`, {
    method: 'PUT',
    body: payload,
  });

export const addWalletTransaction = (
  userId: string,
  payload: {
    amount: number;
    merchant?: string;
    description?: string;
    category?: WalletCategory | '';
    occurredAt?: string;
  }
) =>
  request<WalletResponse>(`/api/wallet/${userId}/transactions`, {
    method: 'POST',
    body: payload,
  });

export const uploadWalletTransactions = (userId: string, file: File) => {
  const formData = new FormData();
  formData.append('transactionFile', file);
  return requestForm<WalletResponse>(`/api/wallet/${userId}/transactions/upload`, formData);
};

export const getWalletRecommendations = (
  userId: string,
  payload: { category?: WalletCategory; lat?: number; lng?: number } = {}
) => {
  const params = new URLSearchParams();

  if (payload.category) params.set('category', payload.category);
  if (payload.lat !== undefined) params.set('lat', String(payload.lat));
  if (payload.lng !== undefined) params.set('lng', String(payload.lng));

  const query = params.toString();
  return request<WalletRecommendationsResponse>(`/api/wallet/${userId}/recommendations${query ? `?${query}` : ''}`);
};
