import { useMemo, useState } from 'react';
import { FaPhoneAlt, FaEnvelope, FaUserAlt, FaCommentDots } from 'react-icons/fa';
import { useSEO } from '../../hooks/useSEO';
import { contactService } from '../../services/contactService';

const validate = (form) => {
	const errors = {};
	if (!form.name.trim()) errors.name = 'Vui lòng nhập tên';
	if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
	else if (!/^0\d{9,10}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ';
	if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Email không hợp lệ';
	if (!form.message.trim()) errors.message = 'Vui lòng nhập nội dung';
	return errors;
};

const Contact = () => {
	const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState('');
	const [submitError, setSubmitError] = useState('');

	const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);

	useSEO({
		title: 'Lien He Lộc Sang',
		description: 'Lien he Lộc Sang de duoc tu van san pham, don hang va giao nhan. Ho tro nhanh, tu van tan tam.',
		canonicalPath: '/contact',
	});

	const handleChange = (e) => {
		setForm({ ...form, [e.target.name]: e.target.value });
		if (errors[e.target.name]) {
			setErrors((prev) => {
				const next = { ...prev };
				delete next[e.target.name];
				return next;
			});
		}
		if (submitMessage) setSubmitMessage('');
		if (submitError) setSubmitError('');
	};

	const handleBlur = (e) => {
		const field = e.target.name;
		const fieldErrors = validate({ ...form, [field]: e.target.value });
		setErrors((prev) => {
			const next = { ...prev };
			if (fieldErrors[field]) next[field] = fieldErrors[field];
			else delete next[field];
			return next;
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const errs = validate(form);
		setErrors(errs);
		if (Object.keys(errs).length > 0) return;
		setSubmitting(true);
		setSubmitError('');
		setSubmitMessage('');

		try {
			await contactService.submitContact({
				name: form.name.trim(),
				phone: form.phone.trim(),
				message: form.message.trim(),
				email: form.email.trim() || undefined,
			});
			setSubmitMessage('Lộc Sang đã nhận được tin nhắn! Tụi mình sẽ phản hồi sớm.');
			setForm({ name: '', phone: '', email: '', message: '' });
			setErrors({});
		} catch (error) {
			const message =
				error?.response?.data?.message ||
				error?.response?.data?.detail ||
				error?.message ||
				'Không thể gửi liên hệ lúc này. Vui lòng thử lại.';
			setSubmitError(String(message));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 pt-6 pb-12">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-10">
					<h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Liên hệ Lộc Sang</h1>
					<p className="mt-3 text-gray-600 max-w-2xl mx-auto">
						Cần tư vấn size, chất liệu, hoặc phối outfit? Nhắn tụi mình — trả lời nhanh, tư vấn chuẩn.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div className="bg-white rounded-2xl shadow p-6 sm:p-8">
						<h2 className="text-xl font-bold text-gray-900">Gửi tin nhắn</h2>
						<p className="mt-2 text-gray-600 text-sm">
							Tip: nếu bạn biết giống/ cân nặng/ vòng ngực của bé thì gửi kèm để Lộc Sang chọn size nhanh hơn.
						</p>

						<form onSubmit={handleSubmit} className="mt-6 space-y-5">
							{submitError && (
								<div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
									{submitError}
								</div>
							)}
							{submitMessage && (
								<div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
									{submitMessage}
								</div>
							)}

							<div>
								<label className="block text-sm font-semibold mb-1" htmlFor="name">Tên của bạn</label>
								<div className="relative">
									<FaUserAlt className="absolute left-3 top-3 text-gray-400" />
									<input
										id="name"
										name="name"
										value={form.name}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full rounded-xl border px-4 py-2 pl-10 focus:ring-2 focus:ring-rose-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
										placeholder="Ví dụ: Dúc Anh"
									/>
								</div>
								{errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
							</div>

							<div>
								<label className="block text-sm font-semibold mb-1" htmlFor="phone">Số điện thoại</label>
								<div className="relative">
									<FaPhoneAlt className="absolute left-3 top-3 text-gray-400" />
									<input
										id="phone"
										name="phone"
										type="tel"
										inputMode="numeric"
										value={form.phone}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full rounded-xl border px-4 py-2 pl-10 focus:ring-2 focus:ring-rose-500 ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
										placeholder="0xxxxxxxxx"
									/>
								</div>
								{errors.phone && <div className="text-red-500 text-sm mt-1">{errors.phone}</div>}
							</div>

							<div>
								<label className="block text-sm font-semibold mb-1" htmlFor="email">Email (không bắt buộc)</label>
								<div className="relative">
									<FaEnvelope className="absolute left-3 top-3 text-gray-400" />
									<input
										id="email"
										name="email"
										type="email"
										value={form.email}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full rounded-xl border px-4 py-2 pl-10 focus:ring-2 focus:ring-rose-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
										placeholder="you@example.com"
									/>
								</div>
								{errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
							</div>

							<div>
								<label className="block text-sm font-semibold mb-1" htmlFor="message">Nội dung</label>
								<div className="relative">
									<FaCommentDots className="absolute left-3 top-3 text-gray-400" />
									<textarea
										id="message"
										name="message"
										rows={5}
										value={form.message}
										onChange={handleChange}
										onBlur={handleBlur}
										className={`w-full rounded-xl border px-4 py-2 pl-10 focus:ring-2 focus:ring-rose-500 ${errors.message ? 'border-red-400' : 'border-gray-300'}`}
										placeholder="Mình cần tư vấn size cho bé poodle 3.2kg, vòng ngực ~38cm..."
									/>
								</div>
								{errors.message && <div className="text-red-500 text-sm mt-1">{errors.message}</div>}
							</div>

							<button
								disabled={submitting || hasErrors}
								className="w-full rounded-xl bg-rose-600 py-3 font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60"
								type="submit"
							>
								{submitting ? 'Đang gửi...' : 'Gửi cho Lộc Sang'}
							</button>
						</form>
					</div>

					<div className="space-y-6">
						<div className="bg-white rounded-2xl shadow p-6 sm:p-8">
							<h2 className="text-xl font-bold text-gray-900">Thông tin liên hệ</h2>
							<div className="mt-5 space-y-4">
								<a href="tel:0966201140" className="flex items-center gap-3 hover:text-white">
									<span className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
										<FaPhoneAlt className="text-rose-600" />
									</span>
									<div>
										<div className="text-sm text-gray-500">Hotline</div>
										<div className="font-semibold text-gray-900">0966 201 140</div>
									</div>
								</a>

								<a href="mailto:contact@locsang.shop" className="flex items-center gap-3">
									<span className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
										<FaEnvelope className="text-rose-600" />
									</span>
									<div>
										<div className="text-sm text-gray-500">Email</div>
										<div className="font-semibold text-gray-900">contact@locsang.shop</div>
									</div>
								</a>
							</div>
						</div>

						<div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white shadow">
							<div className="text-sm text-white/80">Gợi ý nhanh</div>
							<div className="mt-2 text-2xl font-extrabold">Bạn gửi ảnh bé + cân nặng</div>
							<div className="mt-2 text-white/80">Lộc Sang sẽ tư vấn size/fit và outfit hợp vibe ngay.</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Contact;
