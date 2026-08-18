const API_BASE = import.meta.env.VITE_API_URL || '';

export const authFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('gm_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    body: options.body !== undefined ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);

    // If unauthorized, clear token and return failure
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        status: 401,
        message: data.message || 'Authentication session expired. Please log in again.'
      };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        message: data.message || `Request failed with status ${res.status}`
      };
    }

    return data;
  } catch (err) {
    console.error(`[API Network Error] ${endpoint}:`, err);
    return {
      success: false,
      message: err.message || 'Network connection failed. Please check your internet connection.'
    };
  }
};

export default {
  authFetch
};
