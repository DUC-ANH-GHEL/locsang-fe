import { useEffect, useMemo, useState } from 'react';

import { adminContactService } from '../../services/adminContactService';

const readFilterOptions = [
  { value: '', label: 'Tất cả' },
  { value: 'false', label: 'Chưa đọc' },
  { value: 'true', label: 'Đã đọc' },
];

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
};

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });

  const query = useMemo(() => {
    const params = { page, limit: 20 };
    if (search.trim()) params.search = search.trim();
    if (readFilter === 'true') params.is_read = true;
    if (readFilter === 'false') params.is_read = false;
    return params;
  }, [page, readFilter, search]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminContactService.getContacts(query);
      setContacts(Array.isArray(res?.data) ? res.data : []);
      setPagination(res?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Không tải được danh sách liên hệ');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (contactId) => {
    try {
      const res = await adminContactService.getContactById(Number(contactId));
      const detail = res?.data || null;
      setSelectedContact(detail);

      if (detail && !detail.is_read) {
        await updateReadStatus(detail.id, true, true);
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Không tải được chi tiết liên hệ');
    }
  };

  const updateReadStatus = async (contactId, nextRead, silent = false) => {
    try {
      setUpdatingId(Number(contactId));
      const res = await adminContactService.updateReadStatus(Number(contactId), Boolean(nextRead));
      const updated = res?.data;
      if (!updated) return;

      setContacts((prev) => prev.map((item) => (Number(item.id) === Number(updated.id) ? { ...item, ...updated } : item)));
      setSelectedContact((prev) => (prev && Number(prev.id) === Number(updated.id) ? updated : prev));
    } catch (err) {
      if (!silent) {
        alert(err?.response?.data?.detail || 'Không cập nhật được trạng thái liên hệ');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (contactId) => {
    if (!window.confirm('Xóa liên hệ này?')) return;

    try {
      setDeletingId(Number(contactId));
      await adminContactService.deleteContact(Number(contactId));

      setContacts((prev) => prev.filter((item) => Number(item.id) !== Number(contactId)));
      setSelectedContact((prev) => (prev && Number(prev.id) === Number(contactId) ? null : prev));

      if (contacts.length <= 1 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        await loadContacts();
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Không xóa được liên hệ');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Liên hệ từ khách hàng</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Xem tin nhắn khách gửi từ trang Contact, đánh dấu đã đọc và xử lý theo ngày.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên, email, SĐT, nội dung"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
          />

          <select
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
          >
            {readFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadContacts}
            className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700"
          >
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left">Khách hàng</th>
                  <th className="px-4 py-3 text-left">Liên hệ</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Ngày gửi</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>Đang tải danh sách liên hệ...</td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>Chưa có liên hệ nào.</td>
                  </tr>
                ) : (
                  contacts.map((item) => {
                    const isActive = selectedContact && Number(selectedContact.id) === Number(item.id);
                    const unread = !item.is_read;
                    return (
                      <tr key={item.id} className={`border-t border-gray-100 dark:border-gray-800 ${isActive ? 'bg-rose-50/40 dark:bg-rose-500/10' : ''}`}>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{item.name || '-'}</div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{item.subject || 'Không có tiêu đề'}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-gray-700 dark:text-gray-200">{item.phone || '-'}</div>
                          <div className="text-xs text-gray-500">{item.email || '-'}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${unread ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {unread ? 'Chưa đọc' : 'Đã đọc'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-200">{formatDate(item.created_at)}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openDetail(item.id)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                            >
                              Xem
                            </button>

                            <button
                              type="button"
                              disabled={updatingId === Number(item.id)}
                              onClick={() => updateReadStatus(item.id, unread)}
                              className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                            >
                              {updatingId === Number(item.id) ? '...' : unread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                            </button>

                            <button
                              type="button"
                              disabled={deletingId === Number(item.id)}
                              onClick={() => handleDelete(item.id)}
                              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              {deletingId === Number(item.id) ? '...' : 'Xóa'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-4 py-3 text-sm">
            <div className="text-gray-600 dark:text-gray-300">Tổng: {pagination.total || 0} liên hệ</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-gray-700 dark:text-gray-200">Trang {pagination.page} / {Math.max(1, pagination.total_pages || 1)}</span>
              <button
                type="button"
                disabled={pagination.total_pages <= page}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          {!selectedContact ? (
            <div className="text-sm text-gray-500">Chọn một liên hệ để xem chi tiết nội dung.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedContact.name || 'Không rõ tên'}</h2>
                  <p className="text-sm text-gray-500">{selectedContact.subject || 'Không có tiêu đề'}</p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${selectedContact.is_read ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {selectedContact.is_read ? 'Đã đọc' : 'Chưa đọc'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <div><span className="font-semibold">Email:</span> {selectedContact.email || '-'}</div>
                <div><span className="font-semibold">SĐT:</span> {selectedContact.phone || '-'}</div>
                <div><span className="font-semibold">Ngày gửi:</span> {formatDate(selectedContact.created_at)}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Nội dung</div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
                  {selectedContact.message || '(Trống)'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={updatingId === Number(selectedContact.id)}
                  onClick={() => updateReadStatus(selectedContact.id, !selectedContact.is_read)}
                  className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  {selectedContact.is_read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                </button>

                <button
                  type="button"
                  disabled={deletingId === Number(selectedContact.id)}
                  onClick={() => handleDelete(selectedContact.id)}
                  className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  {deletingId === Number(selectedContact.id) ? 'Đang xóa...' : 'Xóa liên hệ'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contacts;
