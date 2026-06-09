import { useEffect, useMemo, useState } from 'react';
import { adminOrderService } from '../../services/adminOrderService';

const statusFilterOptions = [
	{ value: '', label: 'Tất cả trạng thái' },
	{ value: 'pending', label: 'Mới' },
	{ value: 'processing', label: 'Đã xác nhận / Đang xử lý' },
	{ value: 'shipped', label: 'Đang giao hàng' },
	{ value: 'delivered', label: 'Thành công / Đã giao' },
	{ value: 'cancelled', label: 'Đã hủy' },
];

const statusActionCatalog = {
	processing: { key: 'processing', label: 'Đang xử lý', localStatus: 'processing' },
	shipped: { key: 'shipped', label: 'Đang giao hàng', localStatus: 'shipped' },
	delivered: { key: 'delivered', label: 'Đã giao', localStatus: 'delivered' },
	cancelled: { key: 'cancelled', label: 'Huỷ đơn', localStatus: 'cancelled' },
};

const statusTransitionByLocal = {
	pending: ['processing', 'shipped', 'cancelled'],
	processing: ['shipped', 'delivered', 'cancelled'],
	shipped: ['delivered', 'cancelled'],
	delivered: ['shipped', 'cancelled'],
	cancelled: [],
};

const statusLabel = {
	pending: 'Mới',
	processing: 'Đã xác nhận / Đang xử lý',
	shipped: 'Đang giao hàng',
	delivered: 'Thành công / Đã giao',
	cancelled: 'Đã hủy / Hoàn',
};

const statusBadge = {
	pending: 'bg-amber-100 text-amber-800',
	processing: 'bg-blue-100 text-blue-800',
	shipped: 'bg-indigo-100 text-indigo-800',
	delivered: 'bg-emerald-100 text-emerald-800',
	cancelled: 'bg-rose-100 text-rose-800',
};

const paymentBadge = {
	pending: 'bg-amber-100 text-amber-800',
	paid: 'bg-emerald-100 text-emerald-800',
	failed: 'bg-rose-100 text-rose-800',
	refunded: 'bg-slate-200 text-slate-800',
};

const formatVnd = (value) =>
	new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
		maximumFractionDigits: 0,
	}).format(Number(value || 0));

const formatDate = (value) => {
	if (!value) return '-';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '-';
	return new Intl.DateTimeFormat('vi-VN', {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(d);
};

const getTransitionActions = (localStatus) => {
	const keys = statusTransitionByLocal[localStatus] || [];
	return keys.map((k) => statusActionCatalog[k]).filter(Boolean);
};

const Orders = () => {
	const [orders, setOrders] = useState([]);
	const [selectedOrderIds, setSelectedOrderIds] = useState([]);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [quickUpdatingId, setQuickUpdatingId] = useState(null);
	const [error, setError] = useState('');
	const [bulkStatus, setBulkStatus] = useState('processing');

	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('');
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });

	const query = useMemo(
		() => ({ page, limit: 20, search: search || undefined, status: status || undefined }),
		[page, search, status],
	);

	const loadOrders = async () => {
		try {
			setLoading(true);
			setError('');
			const res = await adminOrderService.getOrders(query);
			setOrders(Array.isArray(res?.data) ? res.data : []);
			setPagination(res?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 });
		} catch (err) {
			setError(err?.response?.data?.detail || err?.message || 'Không tải được danh sách đơn hàng');
			setOrders([]);
		} finally {
			setLoading(false);
		}
	};

	const toggleSelectOrder = (orderId, checked) => {
		setSelectedOrderIds((prev) => {
			const set = new Set(prev);
			if (checked) set.add(Number(orderId));
			else set.delete(Number(orderId));
			return Array.from(set);
		});
	};

	const toggleSelectAllOnPage = (checked) => {
		if (!checked) {
			setSelectedOrderIds([]);
			return;
		}
		setSelectedOrderIds((orders || []).map((o) => Number(o.id)));
	};

	const runBulkAction = async (action, statusValue) => {
		if (!selectedOrderIds.length) return;

		try {
			setUpdating(true);
			const selectedAction = statusActionCatalog[statusValue];
			const payload = action === 'status'
				? { ids: selectedOrderIds, action: 'status', status: selectedAction?.localStatus || 'processing' }
				: { ids: selectedOrderIds, action: 'soft_delete' };

			await adminOrderService.bulkOrders(payload);
			setSelectedOrderIds([]);
			await loadOrders();
		} catch (err) {
			alert(err?.response?.data?.detail || 'Không thực hiện được thao tác nhanh');
		} finally {
			setUpdating(false);
		}
	};

	const handleSoftDeleteSingle = async (orderId) => {
		if (!window.confirm('Xóa mềm đơn hàng này?')) return;
		try {
			setUpdating(true);
			await adminOrderService.softDeleteOrder(Number(orderId));
			setSelectedOrderIds((prev) => prev.filter((id) => Number(id) !== Number(orderId)));
			await loadOrders();
		} catch (err) {
			alert(err?.response?.data?.detail || 'Không xóa được đơn hàng');
		} finally {
			setUpdating(false);
		}
	};

	useEffect(() => {
		loadOrders();
	}, [query]);

	const openDetail = async (orderId) => {
		try {
			const res = await adminOrderService.getOrderById(Number(orderId));
			setSelectedOrder(res?.data || null);
		} catch (err) {
			alert(err?.response?.data?.detail || 'Không tải được chi tiết đơn');
		}
	};

	const handleUpdateOrder = async (payload) => {
		if (!selectedOrder) return;
		try {
			setUpdating(true);
			const res = await adminOrderService.updateOrder(Number(selectedOrder.id), payload);
			const updated = res?.data;
			if (updated) {
				setSelectedOrder(updated);
				setOrders((prev) => prev.map((o) => (Number(o.id) === Number(updated.id) ? { ...o, ...updated } : o)));
			}
		} catch (err) {
			alert(err?.response?.data?.detail || 'Không cập nhật được đơn hàng');
		} finally {
			setUpdating(false);
		}
	};

	const handleQuickStatusChange = async (orderId, actionKey) => {
		const numericOrderId = Number(orderId);
		if (!Number.isFinite(numericOrderId)) return;
		if (!actionKey || actionKey === '__current') return;

		const selectedAction = statusActionCatalog[actionKey];
		if (!selectedAction) return;

		const localStatus = selectedAction.localStatus;
		setQuickUpdatingId(numericOrderId);

		setOrders((prev) =>
			prev.map((o) => (Number(o.id) === numericOrderId ? { ...o, status: localStatus } : o)),
		);

		try {
			const res = await adminOrderService.updateOrder(numericOrderId, { status: selectedAction.localStatus });
			const updated = res?.data;
			if (updated) {
				setOrders((prev) => prev.map((o) => (Number(o.id) === numericOrderId ? { ...o, ...updated } : o)));
				if (selectedOrder && Number(selectedOrder.id) === numericOrderId) {
					setSelectedOrder(updated);
				}
			}
		} catch (err) {
			alert(err?.response?.data?.detail || 'Không cập nhật được trạng thái đơn hàng');
			await loadOrders();
		} finally {
			setQuickUpdatingId(null);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý đơn hàng</h1>
				<p className="text-sm text-gray-600 dark:text-gray-300">Theo dõi trạng thái, thanh toán và xử lý đơn theo thời gian thực.</p>
			</div>

			<div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 md:p-5">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<input
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						placeholder="Tìm mã đơn / người nhận / SĐT"
						className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
					/>

					<select
						value={status}
						onChange={(e) => {
							setStatus(e.target.value);
							setPage(1);
						}}
						className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
					>
						{statusFilterOptions.map((opt) => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>

					<button
						type="button"
						onClick={loadOrders}
						className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700"
					>
						Làm mới
					</button>
				</div>
			</div>

			{error && (
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
			)}

			<div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
							<tr>
								<th className="px-4 py-3 text-left">
									<input
										type="checkbox"
										checked={orders.length > 0 && orders.every((o) => selectedOrderIds.includes(Number(o.id)))}
										onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
									/>
								</th>
								<th className="px-4 py-3 text-left">Mã đơn</th>
								<th className="px-4 py-3 text-left">Khách hàng</th>
								<th className="px-4 py-3 text-left">Sản phẩm</th>
								<th className="px-4 py-3 text-left">Tổng tiền</th>
								<th className="px-4 py-3 text-left">Trạng thái</th>
								<th className="px-4 py-3 text-left">Thanh toán</th>
								<th className="px-4 py-3 text-left">Thời gian</th>
								<th className="px-4 py-3 text-right">Thao tác</th>
							</tr>
						</thead>
						<tbody>
							{loading && (
								<tr>
									<td colSpan={9} className="px-4 py-6 text-center text-gray-500">Đang tải đơn hàng...</td>
								</tr>
							)}

							{!loading && orders.length === 0 && (
								<tr>
									<td colSpan={9} className="px-4 py-8 text-center text-gray-500">Chưa có đơn hàng nào.</td>
								</tr>
							)}

							{!loading && orders.map((order) => (
								<tr key={order.id} className="border-t border-gray-100 dark:border-gray-800">
									<td className="px-4 py-3">
										<input
											type="checkbox"
											checked={selectedOrderIds.includes(Number(order.id))}
											onChange={(e) => toggleSelectOrder(order.id, e.target.checked)}
										/>
									</td>
									<td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
										{order.tracking_code || `#${order.id}`}
									</td>
									<td className="px-4 py-3">
										<div className="font-medium text-gray-900 dark:text-gray-100">{order.receiver_name || '-'}</div>
										<div className="text-xs text-gray-500">{order.receiver_phone || '-'}</div>
									</td>
									<td className="px-4 py-3">
										<div className="text-gray-800 dark:text-gray-200 line-clamp-1">{order.first_product_name || '-'}</div>
										<div className="text-xs text-gray-500">{order.item_count || 0} sản phẩm</div>
									</td>
									<td className="px-4 py-3 font-semibold text-rose-600">{formatVnd(order.total_amount)}</td>
									<td className="px-4 py-3">
										<div className="space-y-1">
											<span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge[order.status] || 'bg-gray-100 text-gray-700'}`}>
												{statusLabel[order.status] || order.status}
											</span>
											<select
												value="__current"
												onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
												disabled={updating || Number(quickUpdatingId) === Number(order.id)}
												className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1 text-xs"
											>
												<option value="__current">{`Hiện tại: ${statusLabel[order.status] || order.status}`}</option>
												{getTransitionActions(order.status).map((opt) => (
													<option key={opt.key} value={opt.key}>{opt.label}</option>
												))}
											</select>
										</div>
									</td>
									<td className="px-4 py-3">
										<span className={`rounded-full px-2 py-1 text-xs font-semibold ${paymentBadge[order.payment_status] || 'bg-gray-100 text-gray-700'}`}>
											{order.payment_status}
										</span>
									</td>
									<td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(order.created_at)}</td>
									<td className="px-4 py-3 text-right">
										<div className="flex items-center justify-end gap-2">
											<button
												type="button"
												onClick={() => openDetail(order.id)}
												className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
											>
												Chi tiết
											</button>
											<button
												type="button"
												onClick={() => handleSoftDeleteSingle(order.id)}
												className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
											>
												Xóa mềm
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
					<div className="text-gray-600 dark:text-gray-300">Tổng: {pagination.total || 0} đơn</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 disabled:opacity-40"
						>
							Trước
						</button>
						<span className="text-gray-700 dark:text-gray-200">Trang {pagination.page || page} / {pagination.total_pages || 1}</span>
						<button
							type="button"
							disabled={page >= (pagination.total_pages || 1)}
							onClick={() => setPage((p) => p + 1)}
							className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 disabled:opacity-40"
						>
							Sau
						</button>
					</div>
				</div>
			</div>

			{selectedOrderIds.length > 0 && (
				<div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.9rem)] left-0 right-0 z-40 px-4 lg:bottom-4">
					<div className="mx-auto max-w-7xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
						<div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
							Đã chọn {selectedOrderIds.length} đơn hàng
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<select
								value={bulkStatus}
								onChange={(e) => setBulkStatus(e.target.value)}
								className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
							>
								{Object.values(statusActionCatalog).map((opt) => (
									<option key={opt.key} value={opt.key}>{opt.label}</option>
								))}
							</select>
							<button
								type="button"
								disabled={updating}
								onClick={() => runBulkAction('status', bulkStatus)}
								className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold disabled:opacity-60"
							>
								Đổi trạng thái
							</button>
							<button
								type="button"
								disabled={updating}
								onClick={() => {
									if (!window.confirm(`Xóa mềm ${selectedOrderIds.length} đơn đã chọn?`)) return;
									runBulkAction('soft_delete');
								}}
								className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
							>
								Xóa mềm đã chọn
							</button>
						</div>
					</div>
				</div>
			)}

			{selectedOrder && (
				<div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
					<div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 max-h-[90vh] overflow-auto">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết đơn {selectedOrder.tracking_code || `#${selectedOrder.id}`}</h2>
								<p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{selectedOrder.receiver_name} - {selectedOrder.receiver_phone}</p>
								<p className="text-sm text-gray-500 mt-1">{selectedOrder.receiver_address || '-'}</p>
							</div>
							<button
								type="button"
								onClick={() => setSelectedOrder(null)}
								className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm"
							>
								Đóng
							</button>
						</div>

						<div className="grid grid-cols-1 gap-4 mt-5">
							<div>
								<label className="block text-sm font-medium mb-1">Trạng thái đơn</label>
								<select
									value="__current"
									onChange={(e) => {
										const actionKey = e.target.value;
										if (!actionKey || actionKey === '__current') return;
										const selectedAction = statusActionCatalog[actionKey];
										if (!selectedAction) return;
										setSelectedOrder((prev) => ({ ...prev, status: selectedAction.localStatus }));
										handleUpdateOrder({ status: selectedAction.localStatus });
									}}
									disabled={updating}
									className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
								>
									<option value="__current">{`Hiện tại: ${statusLabel[selectedOrder.status] || selectedOrder.status}`}</option>
									{getTransitionActions(selectedOrder.status).map((opt) => (
										<option key={opt.key} value={opt.key}>{opt.label}</option>
									))}
								</select>
							</div>
						</div>

						<div className="mt-5 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
							<table className="min-w-full text-sm">
								<thead className="bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
									<tr>
										<th className="px-3 py-2 text-left">Sản phẩm</th>
										<th className="px-3 py-2 text-left">SKU</th>
										<th className="px-3 py-2 text-left">SL</th>
										<th className="px-3 py-2 text-left">Đơn giá</th>
										<th className="px-3 py-2 text-left">Thành tiền</th>
									</tr>
								</thead>
								<tbody>
									{(selectedOrder.items || []).map((item) => (
										<tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
											<td className="px-3 py-2">{item.product_name || `SP #${item.product_id}`}</td>
											<td className="px-3 py-2">{item.variant_sku || '-'}</td>
											<td className="px-3 py-2">{item.quantity}</td>
											<td className="px-3 py-2">{formatVnd(item.unit_price)}</td>
											<td className="px-3 py-2 font-semibold">{formatVnd(item.subtotal)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="mt-4 flex items-center justify-between">
							<div className="text-sm text-gray-600 dark:text-gray-300">Tạo lúc: {formatDate(selectedOrder.created_at)}</div>
							<div className="text-lg font-bold text-rose-600">Tổng: {formatVnd(selectedOrder.total_amount)}</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Orders;
