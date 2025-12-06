import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TeamMember, Payment } from '../../types';

interface FinancialDashboardProps {
  members: TeamMember[];
  projectId: string;
}

interface FinancialSummary {
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  memberAllocations: { [key: string]: number };
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ members, projectId }) => {
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    memberAllocations: {},
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, members]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const paymentsRef = collection(db, 'payments');
      const q = query(paymentsRef, where('projectId', '==', projectId));
      const snapshot = await getDocs(q);

      const loadedPayments: Payment[] = [];
      snapshot.forEach(doc => {
        loadedPayments.push({ id: doc.id, ...doc.data() } as Payment);
      });

      setPayments(loadedPayments);

      // Calculate summary
      let totalRevenue = 0;
      let totalPaid = 0;
      let totalPending = 0;
      const allocations: { [key: string]: number } = {};

      // Calculate total revenue from member allocations
      members.forEach(member => {
        const allocation = member.revenueShare || 0;
        totalRevenue += allocation;
        allocations[member.id] = allocation;
      });

      // Calculate paid amounts
      loadedPayments.forEach(payment => {
        if (payment.status === 'completed') {
          totalPaid += payment.amount;
        } else {
          totalPending += payment.amount;
        }
      });

      setSummary({
        totalRevenue,
        totalPaid,
        totalPending,
        memberAllocations: allocations,
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const getPaymentProgress = () => {
    if (summary.totalRevenue === 0) return 0;
    return (summary.totalPaid / summary.totalRevenue) * 100;
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-1">รายได้ทั้งหมด</div>
          <div className="text-3xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
          <div className="text-xs opacity-75 mt-2">จากการแบ่งรายได้ของทีม</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-1">จ่ายแล้ว</div>
          <div className="text-3xl font-bold">{formatCurrency(summary.totalPaid)}</div>
          <div className="text-xs opacity-75 mt-2">
            {summary.totalRevenue > 0 ? `${getPaymentProgress().toFixed(1)}%` : '0%'}{' '}
            ของรายได้ทั้งหมด
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-1">ค้างจ่าย</div>
          <div className="text-3xl font-bold">
            {formatCurrency(summary.totalRevenue - summary.totalPaid)}
          </div>
          <div className="text-xs opacity-75 mt-2">รอการจ่ายเงิน</div>
        </div>
      </div>

      {/* Payment Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">ความคืบหน้าการจ่ายเงิน</span>
          <span className="text-sm font-bold text-blue-600">
            {getPaymentProgress().toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${getPaymentProgress()}%` }}
          ></div>
        </div>
      </div>

      {/* Member Revenue Allocation */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">การแบ่งรายได้ตามสมาชิก</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {members.map(member => {
              const allocation = summary.memberAllocations[member.id] || 0;
              const memberPayments = payments.filter(
                p => p.memberId === member.id && p.status === 'completed'
              );
              const paidAmount = memberPayments.reduce((sum, p) => sum + p.amount, 0);
              const percentage =
                summary.totalRevenue > 0 ? (allocation / summary.totalRevenue) * 100 : 0;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatCurrency(allocation)}</div>
                    <div className="text-sm text-gray-500">
                      {percentage.toFixed(1)}% • จ่ายแล้ว {formatCurrency(paidAmount)}
                    </div>
                  </div>
                </div>
              );
            })}
            {members.length === 0 && (
              <div className="text-center py-8 text-gray-500">ยังไม่มีสมาชิกในทีม</div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Allocation Warning */}
      {members.length > 0 && summary.totalRevenue === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-yellow-600 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">ยังไม่มีการกำหนดรายได้</h4>
              <p className="text-sm text-yellow-700">
                กรุณากำหนดส่วนแบ่งรายได้ให้กับสมาชิกในทีมเพื่อเริ่มติดตามรายได้
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">การจ่ายเงินล่าสุด</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {payments.slice(0, 5).map(payment => {
                const member = members.find(m => m.id === payment.memberId);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          payment.status === 'completed'
                            ? 'bg-green-500'
                            : payment.status === 'pending'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      ></div>
                      <div>
                        <div className="font-medium text-gray-900">{member?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(payment.date).toLocaleDateString('th-TH')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{payment.method}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Visual Chart */}
      {members.length > 0 && summary.totalRevenue > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">แผนภูมิการแบ่งรายได้</h3>
          <div className="space-y-3">
            {members.map((member, index) => {
              const allocation = summary.memberAllocations[member.id] || 0;
              const percentage =
                summary.totalRevenue > 0 ? (allocation / summary.totalRevenue) * 100 : 0;
              const colors = [
                'from-blue-400 to-blue-600',
                'from-green-400 to-green-600',
                'from-purple-400 to-purple-600',
                'from-pink-400 to-pink-600',
                'from-yellow-400 to-yellow-600',
                'from-indigo-400 to-indigo-600',
              ];
              const color = colors[index % colors.length];

              return (
                <div key={member.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{member.name}</span>
                    <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
