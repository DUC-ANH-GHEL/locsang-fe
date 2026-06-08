import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getStorefrontCart, replaceStorefrontCart } from '../services/customerAccountService';
import { useStorefrontAuth } from './StorefrontAuthContext';

export interface CartProduct {
  item_key: string;
  product_id?: number;
  product_variant_id?: number | null;
  sku?: string;
  variant_label?: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  cart: CartProduct[];
  addToCart: (product: Omit<CartProduct, 'item_key' | 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (itemKey: string) => void;
  clearCart: () => void;
  updateCartItemQuantity: (itemKey: string, quantity: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = 'locsang_storefront_cart_v1';
const CART_MERGED_ACCOUNT_KEY = 'locsang_storefront_cart_merged_account_v1';
const CART_VARIANT_LABELS_KEY = 'locsang_storefront_cart_variant_labels_v1';
const CART_SYNC_DEBOUNCE_MS = 450;

const loadVariantLabelMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(CART_VARIANT_LABELS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const normalized: Record<string, string> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (!key) return;
      const label = String(value || '').trim();
      if (label) normalized[key] = label;
    });
    return normalized;
  } catch {
    return {};
  }
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

const toNumberPrice = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const buildItemKey = (product: {
  product_id?: number;
  product_variant_id?: number | null;
  title?: string;
  sku?: string;
}) => {
  if (Number.isFinite(product?.product_id)) {
    const variantPart = Number.isFinite(product?.product_variant_id)
      ? String(product.product_variant_id)
      : '0';
    return `p:${product.product_id}:v:${variantPart}`;
  }
  if (product?.sku) return `sku:${product.sku}`;
  return `custom:${String(product?.title || '').trim().toLowerCase()}`;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useStorefrontAuth();
  const accountId = user?.id ?? null;
  const [variantLabelMap, setVariantLabelMap] = useState<Record<string, string>>(() => loadVariantLabelMap());
  const [cart, setCart] = useState<CartProduct[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          item_key: String(item.item_key || ''),
          product_id: Number.isFinite(Number(item.product_id)) ? Number(item.product_id) : undefined,
          product_variant_id:
            Number.isFinite(Number(item.product_variant_id)) && Number(item.product_variant_id) > 0
              ? Number(item.product_variant_id)
              : null,
          sku: item.sku ? String(item.sku) : undefined,
          variant_label: item.variant_label ? String(item.variant_label) : undefined,
          title: String(item.title || ''),
          image: String(item.image || ''),
          price: toNumberPrice(item.price),
          quantity: Math.max(1, Number(item.quantity || 1)),
        }))
        .filter((item) => item.item_key && item.title);
    } catch {
      return [];
    }
  });

  const [syncReady, setSyncReady] = useState(false);
  const previousAccountIdRef = useRef<number | null>(null);
  const lastSyncedPayloadRef = useRef('');
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizeCartItems = (items: unknown): CartProduct[] => {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => item && typeof item === 'object')
      .map((item: any) => ({
        item_key: String(item.item_key || ''),
        product_id: Number.isFinite(Number(item.product_id)) ? Number(item.product_id) : undefined,
        product_variant_id:
          Number.isFinite(Number(item.product_variant_id)) && Number(item.product_variant_id) > 0
            ? Number(item.product_variant_id)
            : null,
        sku: item.sku ? String(item.sku) : undefined,
        variant_label: item.variant_label ? String(item.variant_label) : undefined,
        title: String(item.title || ''),
        image: String(item.image || ''),
        price: toNumberPrice(item.price),
        quantity: Math.max(1, Number(item.quantity || 1)),
      }))
      .filter((item) => item.item_key && item.title);
  };

  const withVariantLabelFallback = (items: CartProduct[]): CartProduct[] =>
    items.map((item) => {
      const ownLabel = String(item.variant_label || '').trim();
      const fallback = String(variantLabelMap[item.item_key] || '').trim();
      return {
        ...item,
        variant_label: ownLabel || fallback || '',
      };
    });

  const mergeCartItems = (baseItems: CartProduct[], extraItems: CartProduct[]): CartProduct[] => {
    const merged = new Map<string, CartProduct>();
    for (const item of baseItems) {
      merged.set(item.item_key, { ...item, quantity: Math.max(1, Number(item.quantity || 1)) });
    }
    for (const item of extraItems) {
      const existing = merged.get(item.item_key);
      if (existing) {
        existing.quantity = Math.max(1, Number(existing.quantity || 1)) + Math.max(1, Number(item.quantity || 1));
      } else {
        merged.set(item.item_key, { ...item, quantity: Math.max(1, Number(item.quantity || 1)) });
      }
    }
    return Array.from(merged.values());
  };

  const serializeCart = (items: CartProduct[]) => JSON.stringify(items);

  const sanitizeForSync = (items: CartProduct[]): CartProduct[] =>
    items
      .map((item) => ({
        item_key: String(item.item_key || '').trim(),
        product_id: Number.isFinite(Number(item.product_id)) ? Number(item.product_id) : undefined,
        product_variant_id:
          Number.isFinite(Number(item.product_variant_id)) && Number(item.product_variant_id) > 0
            ? Number(item.product_variant_id)
            : null,
        sku: item.sku ? String(item.sku).trim() : undefined,
        variant_label: item.variant_label || undefined,
        title: String(item.title || '').trim() || 'Product',
        image: String(item.image || '').trim(),
        price: toNumberPrice(item.price),
        quantity: Math.max(1, Number(item.quantity || 1)),
      }))
      .filter((item) => item.item_key);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage write errors
    }
  }, [cart]);

  useEffect(() => {
    setVariantLabelMap((prev) => {
      const next = { ...prev };
      let changed = false;
      cart.forEach((item) => {
        const key = String(item.item_key || '').trim();
        const label = String(item.variant_label || '').trim();
        if (!key || !label) return;
        if (next[key] !== label) {
          next[key] = label;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_VARIANT_LABELS_KEY, JSON.stringify(variantLabelMap));
    } catch {
      // ignore storage write errors
    }
  }, [variantLabelMap]);

  useEffect(() => {
    if (loading) return;

    const previousAccountId = previousAccountIdRef.current;
    previousAccountIdRef.current = accountId;

    if (!isAuthenticated || !accountId) {
      if (previousAccountId) {
        setCart([]);
        try {
          localStorage.removeItem(CART_STORAGE_KEY);
          localStorage.removeItem(CART_MERGED_ACCOUNT_KEY);
        } catch {
          // ignore localStorage errors
        }
      }
      setSyncReady(true);
      lastSyncedPayloadRef.current = '';
      return;
    }

    let cancelled = false;
    setSyncReady(false);

    const hydrateCart = async () => {
      try {
        const [serverItems, rawLocal] = await Promise.all([
          getStorefrontCart(),
          Promise.resolve(localStorage.getItem(CART_STORAGE_KEY)),
        ]);
        if (cancelled) return;

        const localItems = normalizeCartItems(rawLocal ? JSON.parse(rawLocal) : []);
        const mergedAccount = localStorage.getItem(CART_MERGED_ACCOUNT_KEY) || '';
        const shouldMergeLocal = localItems.length > 0 && mergedAccount !== String(accountId);

        const nextCartRaw = shouldMergeLocal ? mergeCartItems(serverItems, localItems) : normalizeCartItems(serverItems);
        const nextCart = withVariantLabelFallback(nextCartRaw);
        const nextSerialized = serializeCart(nextCart);

        setCart(nextCart);
        lastSyncedPayloadRef.current = nextSerialized;

        if (shouldMergeLocal) {
          await replaceStorefrontCart(sanitizeForSync(nextCart));
          if (cancelled) return;
          lastSyncedPayloadRef.current = serializeCart(nextCart);
        }

        localStorage.setItem(CART_MERGED_ACCOUNT_KEY, String(accountId));
      } catch {
        // Keep local cart when server sync fails.
      } finally {
        if (!cancelled) setSyncReady(true);
      }
    };

    hydrateCart();

    return () => {
      cancelled = true;
    };
  }, [accountId, isAuthenticated, loading]);

  useEffect(() => {
    if (!syncReady || !isAuthenticated || !accountId) return;

    const payload = serializeCart(cart);
    if (payload === lastSyncedPayloadRef.current) return;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    syncTimerRef.current = setTimeout(async () => {
      try {
        await replaceStorefrontCart(sanitizeForSync(cart));
        lastSyncedPayloadRef.current = payload;
      } catch {
        // ignore sync errors and keep local state
      }
    }, CART_SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [accountId, cart, isAuthenticated, syncReady]);

  const addToCart = (product: Omit<CartProduct, 'item_key' | 'quantity'> & { quantity?: number }) => {
    const quantity = Number.isFinite(product?.quantity) ? Math.max(1, Number(product.quantity)) : 1;
    const itemKey = buildItemKey(product);
    const normalized: CartProduct = {
      item_key: itemKey,
      product_id: Number.isFinite(product?.product_id) ? Number(product.product_id) : undefined,
      product_variant_id: Number.isFinite(product?.product_variant_id)
        ? Number(product.product_variant_id)
        : null,
      sku: product?.sku,
      variant_label: product?.variant_label || '',
      title: product.title,
      image: product.image,
      price: toNumberPrice(product.price),
      quantity,
    };

    setCart((prev) => {
      const idx = prev.findIndex((p) => p.item_key === itemKey);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].quantity += quantity;
        return updated;
      }
      return [...prev, normalized];
    });
  };

  const removeFromCart = (itemKey: string) => {
    setCart((prev) => prev.filter((p) => p.item_key !== itemKey));
  };

  const updateCartItemQuantity = (itemKey: string, quantity: number) => {
  if (quantity <= 0) {
    setCart((prev) => prev.filter((p) => p.item_key !== itemKey));
    return;
  }
  setCart((prev) =>
    prev.map((p) => p.item_key === itemKey ? { ...p, quantity } : p)
  );
};

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateCartItemQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
