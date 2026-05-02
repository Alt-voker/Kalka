(function (window) {
  function getClient() {
    if (window.KalkaApi && typeof window.KalkaApi.getClient === 'function') return window.KalkaApi.getClient();
    if (window.__supabase) return window.__supabase;
    if (window.supabaseClient) return window.supabaseClient;
    if (window.sb) return window.sb;
    return null;
  }

  function uploadFile(path, file, options) {
    var client = getClient();
    options = options || {};
    if (!client || !client.storage || typeof client.storage.from !== 'function') {
      return Promise.reject(new Error('Storage provider not available'));
    }
    return client.storage.from(options.bucket || 'public').upload(path, file, options.uploadOptions || {});
  }

  function downloadFile(path, options) {
    var client = getClient();
    options = options || {};
    if (!client || !client.storage || typeof client.storage.from !== 'function') {
      return Promise.reject(new Error('Storage provider not available'));
    }
    return client.storage.from(options.bucket || 'public').download(path);
  }

  function getPublicUrl(path, options) {
    var client = getClient();
    options = options || {};
    if (!client || !client.storage || typeof client.storage.from !== 'function') {
      return { data: { publicUrl: '' }, error: new Error('Storage provider not available') };
    }
    return client.storage.from(options.bucket || 'public').getPublicUrl(path);
  }

  window.KalkaStorage = window.KalkaStorage || {};
  window.KalkaStorage.uploadFile = uploadFile;
  window.KalkaStorage.downloadFile = downloadFile;
  window.KalkaStorage.getPublicUrl = getPublicUrl;
})(window);
