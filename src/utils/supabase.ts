// Simulated Supabase Client for local / preview environments
// It implements the official @supabase/supabase-js API structure for Storage
// and uses browser IndexedDB to persist physical files with real mime-types.

const DB_NAME = 'supabase_mock_storage';
const STORE_NAME = 'bucket_files';

interface IndexedDBFile {
  key: string; // "bucket/path"
  name: string;
  type: string; // mime type
  size: number;
  data: Blob;
  uploadedAt: string;
}

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const supabase = {
  storage: {
    from: (bucket: string) => {
      return {
        /**
         * Upload a file to IndexedDB mock storage
         */
        upload: async (
          path: string,
          file: File | Blob,
          options?: { cacheControl?: string; upsert?: boolean }
        ): Promise<{ data: { path: string } | null; error: Error | null }> => {
          try {
            const dbInstance = await initDB();
            const key = `${bucket}/${path.replace(/^\//, '')}`;

            // Handle metadata extraction
            let fileName = 'uploaded_file';
            let fileType = file.type || 'application/octet-stream';
            let fileSize = file.size;

            if (file instanceof File) {
              fileName = file.name;
            }

            const record: IndexedDBFile = {
              key,
              name: fileName,
              type: fileType,
              size: fileSize,
              data: file,
              uploadedAt: new Date().toISOString()
            };

            return new Promise((resolve) => {
              const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
              const store = transaction.objectStore(STORE_NAME);
              const request = store.put(record);

              request.onsuccess = () => {
                resolve({ data: { path }, error: null });
              };

              request.onerror = () => {
                resolve({ data: null, error: new Error('Failed to save file to IndexedDB storage') });
              };
            });
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        /**
         * Download a file from IndexedDB mock storage as a Blob
         */
        download: async (path: string): Promise<{ data: Blob | null; error: Error | null }> => {
          try {
            const dbInstance = await initDB();
            const key = `${bucket}/${path.replace(/^\//, '')}`;

            return new Promise((resolve) => {
              const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
              const store = transaction.objectStore(STORE_NAME);
              const request = store.get(key);

              request.onsuccess = () => {
                const record = request.result as IndexedDBFile | undefined;
                if (record && record.data) {
                  // Ensure we return a proper Blob with the saved mime type
                  const mimeCorrectedBlob = new Blob([record.data], { type: record.type });
                  resolve({ data: mimeCorrectedBlob, error: null });
                } else {
                  resolve({ data: null, error: new Error(`File not found in bucket '${bucket}' at path '${path}'`) });
                }
              };

              request.onerror = () => {
                resolve({ data: null, error: new Error('Error querying database for file') });
              };
            });
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        /**
         * Get a temporary local public URL for the file
         */
        getPublicUrl: (path: string): { data: { publicUrl: string } } => {
          // In real Supabase, this returns a public URL. Here, we can create a temporary object URL,
          // but since getPublicUrl is synchronous, we generate a mock path or look up.
          // To be robust, we'll return a special marker URL that our download handler or <img> elements can resolve,
          // or we can pre-create object URLs.
          // Let's provide a data-url/object-url mapper, or a simple standard virtual URL:
          const key = `${bucket}/${path.replace(/^\//, '')}`;
          // We can return a custom scheme that our components can decode
          return {
            data: {
              publicUrl: `mock-supabase-storage://${key}`
            }
          };
        },

        /**
         * Create a signed URL for a private bucket
         */
        createSignedUrl: async (
          path: string,
          expiresInSeconds: number
        ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> => {
          try {
            const dbInstance = await initDB();
            const key = `${bucket}/${path.replace(/^\//, '')}`;

            return new Promise((resolve) => {
              const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
              const store = transaction.objectStore(STORE_NAME);
              const request = store.get(key);

              request.onsuccess = () => {
                const record = request.result as IndexedDBFile | undefined;
                if (record && record.data) {
                  // Create a real browser object URL that remains valid during the current tab session
                  const blobUrl = URL.createObjectURL(record.data);
                  resolve({ data: { signedUrl: blobUrl }, error: null });
                } else {
                  resolve({ data: null, error: new Error('File not found') });
                }
              };

              request.onerror = () => {
                resolve({ data: null, error: new Error('Database error') });
              };
            });
          } catch (err: any) {
            return { data: null, error: err };
          }
        },

        /**
         * Delete a file from Storage
         */
        remove: async (paths: string[]): Promise<{ data: { path: string }[] | null; error: Error | null }> => {
          try {
            const dbInstance = await initDB();
            const deletePromises = paths.map((path) => {
              const key = `${bucket}/${path.replace(/^\//, '')}`;
              return new Promise<void>((resolve, reject) => {
                const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
              });
            });

            await Promise.all(deletePromises);
            return { data: paths.map(p => ({ path: p })), error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        }
      };
    }
  },
  auth: {
    signOut: async (): Promise<{ error: Error | null }> => {
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
    getSession: async (): Promise<{ data: { session: any } | null; error: Error | null }> => {
      const isLoggedIn = localStorage.getItem('ta_is_logged_in') === 'true';
      if (isLoggedIn) {
        return { data: { session: { user: { id: localStorage.getItem('ta_current_user_id') || 'u-admin' } } }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    getUser: async (): Promise<{ data: { user: any } | null; error: Error | null }> => {
      const isLoggedIn = localStorage.getItem('ta_is_logged_in') === 'true';
      if (isLoggedIn) {
        return { data: { user: { id: localStorage.getItem('ta_current_user_id') || 'u-admin' } }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  }
};

/**
 * Helper utility to trigger browser file download from a Blob or ArrayBuffer
 */
export const triggerFileDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * General helper to download simulated supabase paths
 */
export const downloadStorageFile = async (bucket: string, path: string, filename: string): Promise<boolean> => {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    console.error('Download error:', error);
    return false;
  }
  triggerFileDownload(data, filename);
  return true;
};
