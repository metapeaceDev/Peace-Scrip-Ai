/**
 * Notification Bell Component
 * แสดงการแจ้งเตือนสำหรับ user รวมถึง admin invitations
 */

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { logger } from '../utils/logger';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: any;
  expiresAt?: any;
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    logger.info('🔔 Setting up notifications listener', { userId: user.uid });

    // Listen to notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const notifs: Notification[] = [];
      let unread = 0;

      snapshot.forEach(doc => {
        const data = doc.data();

        // DEBUG: Log แต่ละ notification
        logger.debug('📨 Notification document', {
          id: doc.id,
          type: data.type,
          title: data.title,
          hasData: !!data.data,
          hasConfirmUrl: !!data.data?.confirmUrl,
          confirmUrl: data.data?.confirmUrl,
          fullData: data.data,
        });

        // EXTRA DEBUG: Log confirmUrl เต็มๆ
        if (data.type === 'admin-invitation' && data.data?.confirmUrl) {
          logger.info('✅ Found admin invitation with URL', { url: data.data.confirmUrl });
        }

        notifs.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          read: data.read || false,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
        });

        if (!data.read) {
          unread++;
        }
      });

      setNotifications(notifs);
      setUnreadCount(unread);
      logger.info('🔔 Loaded notifications', { count: notifs.length, unread });
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      logger.error('Error marking notification as read', { error });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    logger.info('🔔 Notification clicked', {
      id: notification.id,
      type: notification.type,
      data: notification.data,
      confirmUrl: notification.data?.confirmUrl,
    });

    markAsRead(notification.id);

    // Handle admin invitation
    if (notification.type === 'admin-invitation') {
      if (notification.data?.confirmUrl) {
        logger.info('✅ Redirecting to admin confirmation', { url: notification.data.confirmUrl });
        window.location.href = notification.data.confirmUrl;
      } else {
        logger.error('❌ No confirmUrl found in notification data');
        alert('ไม่พบ confirmation link กรุณาติดต่อ Admin');
      }
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

          {/* Notifications Panel */}
          <div className="absolute right-0 z-20 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">การแจ้งเตือน</h3>
              {unreadCount > 0 && <p className="text-sm text-gray-400">{unreadCount} รายการใหม่</p>}
            </div>

            {/* Notifications List */}
            <div>
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-400">ไม่มีการแจ้งเตือน</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-700 transition-colors ${
                      !notification.read ? 'bg-blue-900/20' : ''
                    }`}
                  >
                    {/* Notification Icon */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          notification.type === 'admin-invitation' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}
                      >
                        {notification.type === 'admin-invitation' ? '👑' : '🔔'}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <p
                          className={`text-sm font-semibold ${
                            !notification.read ? 'text-white' : 'text-gray-300'
                          }`}
                        >
                          {notification.title}
                        </p>

                        {/* Message */}
                        <p className="text-sm text-gray-400 mt-1">{notification.message}</p>

                        {/* Action Button for Admin Invitation */}
                        {notification.type === 'admin-invitation' && (
                          <>
                            {notification.data?.confirmUrl ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors font-semibold"
                              >
                                ยืนยันการเป็น Admin →
                              </button>
                            ) : (
                              <div className="mt-2 px-4 py-2 bg-gray-600 text-gray-300 text-sm rounded-lg">
                                ⚠️ คำเชิญหมดอายุแล้ว - กรุณาขอคำเชิญใหม่
                              </div>
                            )}
                          </>
                        )}

                        {/* Timestamp */}
                        {notification.createdAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.createdAt.toDate()).toLocaleString('th-TH')}
                          </p>
                        )}
                      </div>

                      {/* Unread Indicator */}
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-700 text-center">
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;

