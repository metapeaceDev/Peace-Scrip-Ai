import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TeamMember, Payment } from '../types';

interface PaymentTrackerProps {
  members: TeamMember[];
  projectId: string;
}

type PaymentMethod = 'bank_transfer' | 'promptpay' | 'cash' | 'check' | 'other';
type PaymentStatus = 'completed' | 'pending' | 'failed';

interface PaymentForm {
  memberId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

export const PaymentTracker: React.FC<PaymentTrackerProps> = ({ members, projectId }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<PaymentForm>({
    memberId: '',
    amount: 0,
    method: 'bank_transfer',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentsRef = collection(db, 'payments');
      const q = query(paymentsRef, where('projectId', '==', projectId), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);

      const loadedPayments: Payment[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loadedPayments.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() || new Date(),
        } as Payment);
      });

      setPayments(loadedPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.memberId || formData.amount <= 0) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setSaving(true);
      const paymentsRef = collection(db, 'payments');
      await addDoc(paymentsRef, {
        ...formData,
        projectId,
        status: 'completed' as PaymentStatus,
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      // Reset form
      setFormData({
        memberId: '',
        amount: 0,
        method: 'bank_transfer',
        reference: '',
        notes: '',
      });
      setShowForm(false);

      // Reload payments
      await loadPayments();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกการจ่ายเงิน');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const getMethodLabel = (method: PaymentMethod) => {
    const labels = {
      bank_transfer: 'โอนผ่านธนาคาร',
      promptpay: 'พร้อมเพย์',
      cash: 'เงินสด',
      check: 'เช็ค',
      other: 'อื่นๆ',
    };
    return labels[method] || method;
  };

  const getStatusColor = (status: PaymentStatus) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: PaymentStatus) => {
    const labels = {
      completed: 'สำเร็จ',
      pending: 'รอดำเนินการ',
      failed: 'ล้มเหลว',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">บันทึกการจ่ายเงิน</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'ยกเลิก' : '+ บันทึกการจ่ายเงิน'}
        </button>
      </div>

      {/* Payment Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">บันทึกการจ่ายเงินใหม่</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Member Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">สมาชิก *</label>
                <select
                  value={formData.memberId}
                  onChange={e => setFormData({ ...formData, memberId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">เลือกสมาชิก</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {member.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  จำนวนเงิน (บาท) *
                </label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={e =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วิธีการจ่ายเงิน *
                </label>
                <select
                  value={formData.method}
                  onChange={e =>
                    setFormData({ ...formData, method: e.target.value as PaymentMethod })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="bank_transfer">โอนผ่านธนาคาร</option>
                  <option value="promptpay">พร้อมเพย์</option>
                  <option value="cash">เงินสด</option>
                  <option value="check">เช็ค</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเลขอ้างอิง
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={e => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="เลขที่ธุรกรรม / เลขที่เช็ค"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="รายละเอียดเพิ่มเติม..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการจ่ายเงิน'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">ประวัติการจ่ายเงิน</h3>
        </div>
        <div className="p-6">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>ยังไม่มีการบันทึกการจ่ายเงิน</p>
              <p className="text-sm mt-1">คลิก &quot;บันทึกการจ่ายเงิน&quot; เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment, index) => {
                const member = members.find(m => m.id === payment.memberId);
                return (
                  <div key={payment.id} className="relative">
                    {/* Timeline Line */}
                    {index < payments.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                    )}

                    {/* Payment Card */}
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold relative z-10">
                        ฿
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-gray-900">
                                {member?.name || 'Unknown'}
                              </h4>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getStatusColor(payment.status)}`}
                              >
                                {getStatusLabel(payment.status)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{member?.role}</div>
                            <div className="text-2xl font-bold text-gray-900 mb-2">
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                  />
                                </svg>
                                <span>{getMethodLabel(payment.method)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>
                                  {new Date(payment.date).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                            {payment.reference && (
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">อ้างอิง:</span> {payment.reference}
                              </div>
                            )}
                            {payment.notes && (
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">หมายเหตุ:</span> {payment.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
