export const handleApiError = (error) => {
  try {
    if (error?.response) {
      const status = error.response.status;
      const data = error.response.data || {};
      return {
        status,
        message: data?.error || data?.message || data?.detail || 'Sunucu hatası',
        type: getErrorType(status)
      };
    }

    if (error?.request) {
      return {
        status: 0,
        message: 'Ağ bağlantı hatası. İnternet bağlantınızı kontrol edin.',
        type: 'network'
      };
    }

    return {
      status: -1,
      message: error?.message || 'Bilinmeyen hata',
      type: 'unknown'
    };
  } catch (e) {
    return { status: -1, message: 'Hata işlenirken beklenmeyen bir hata oluştu', type: 'unknown' };
  }
};

function getErrorType(status) {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notfound';
  if (status >= 500) return 'server';
  return 'client';
}

export default handleApiError;
