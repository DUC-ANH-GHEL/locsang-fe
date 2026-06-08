import * as React from 'react';

import { useEffect, useMemo, useState } from 'react';

export type QuickEditValues = {
  price?: string;
  cost_price?: string;
  stock?: string;
  status?: 'active' | 'draft' | 'discontinued';
};

type Props = {
  open: boolean;
  productName: string;
  initial: QuickEditValues;
  onClose: () => void;
  onSave: (next: QuickEditValues) => Promise<void> | void;
  saving?: boolean;
};

const QuickEditModal = ({ open, productName, initial, onClose, onSave, saving }: Props) => {
  const [values, setValues] = useState<QuickEditValues>(initial);

  useEffect(() => {
    if (!open) return;
    setValues(initial);
  }, [open, initial]);

  const canSave = useMemo(() => {
    if (!open) return false;
    const price = values.price !== undefined ? Number(values.price) : undefined;
    const cost = values.cost_price !== undefined ? Number(values.cost_price) : undefined;
    const stock = values.stock !== undefined ? Number(values.stock) : undefined;

    if (price !== undefined && (!Number.isFinite(price) || price <= 0)) return false;
    if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) return false;
    if (stock !== undefined && (!Number.isFinite(stock) || stock < 0)) return false;
    return true;
  }, [open, values]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400">Quick edit</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{productName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Giá bán</label>
            <input
              value={values.price ?? ''}
              onChange={(e) => setValues((p) => ({ ...p, price: e.target.value }))}
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
              placeholder="129000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Giá vốn</label>
            <input
              value={values.cost_price ?? ''}
              onChange={(e) => setValues((p) => ({ ...p, cost_price: e.target.value }))}
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
              placeholder="60000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Tồn kho</label>
            <input
              value={values.stock ?? ''}
              onChange={(e) => setValues((p) => ({ ...p, stock: e.target.value }))}
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Trạng thái</label>
            <select
              value={values.status ?? 'draft'}
              onChange={(e) => setValues((p) => ({ ...p, status: e.target.value as any }))}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
            >
              <option value="active">Đang bán</option>
              <option value="draft">Nháp</option>
              <option value="discontinued">Ngừng bán</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={!canSave || Boolean(saving)}
            onClick={() => onSave(values)}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-5 py-2 font-semibold"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickEditModal;
