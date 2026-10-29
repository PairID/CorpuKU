import { toast } from "sonner";

export interface ConfirmToastOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: "danger" | "warning" | "info";
}

/**
 * Utility helper untuk menampilkan toast notifications yang konsisten dan anti-slop.
 * Terintegrasi dengan Sonner dan tema CorpuKU.
 */
export const showToast = {
  success: (title: string, description?: string) => {
    return toast.success(title, {
      description,
      duration: 4000,
    });
  },

  error: (title: string, description?: string) => {
    return toast.error(title, {
      description,
      duration: 5000,
    });
  },

  warning: (title: string, description?: string) => {
    return toast.warning(title, {
      description,
      duration: 5000,
    });
  },

  info: (title: string, description?: string) => {
    return toast.info(title, {
      description,
      duration: 4000,
    });
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },

  /**
   * Menampilkan toast interaktif dengan tombol konfirmasi [Batal] dan [Lanjutkan/Hapus].
   */
  confirm: ({
    title,
    description,
    confirmText = "Lanjutkan",
    cancelText = "Batal",
    onConfirm,
    onCancel,
    variant = "danger",
  }: ConfirmToastOptions) => {
    return toast(title, {
      description,
      duration: 10000,
      action: {
        label: confirmText,
        onClick: async () => {
          try {
            await onConfirm();
          } catch (err) {
            console.error("Confirm toast error:", err);
            toast.error("Gagal memproses aksi.");
          }
        },
      },
      cancel: {
        label: cancelText,
        onClick: () => {
          if (onCancel) onCancel();
        },
      },
    });
  },

  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },
};

export default showToast;
