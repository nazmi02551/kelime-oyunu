import React, { createContext, useContext, useState, useCallback } from 'react';
import GameNotification from '../components/GameNotification';
import ConfirmDialog from '../components/ConfirmDialog';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    setNotification({ message, type, duration });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showSuccess = useCallback((message, duration = 3000) => {
    showNotification(message, 'success', duration);
  }, [showNotification]);

  const showError = useCallback((message, duration = 3000) => {
    showNotification(message, 'error', duration);
  }, [showNotification]);

  const showWarning = useCallback((message, duration = 3000) => {
    showNotification(message, 'warning', duration);
  }, [showNotification]);

  const showInfo = useCallback((message, duration = 3000) => {
    showNotification(message, 'info', duration);
  }, [showNotification]);

  // Confirm dialog fonksiyonu
  const showConfirm = useCallback((title, message, onConfirm, options = {}) => {
    setConfirmDialog({
      title,
      message,
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
      onCancel: () => {
        setConfirmDialog(null);
        options.onCancel?.();
      },
      confirmText: options.confirmText || 'Onayla',
      cancelText: options.cancelText || 'İptal',
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    hideNotification,
    hideConfirm
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification && (
        <GameNotification
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onHide={hideNotification}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          visible={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
        />
      )}
    </NotificationContext.Provider>
  );
};
