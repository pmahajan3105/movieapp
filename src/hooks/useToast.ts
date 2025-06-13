import toast, { ToastOptions } from 'react-hot-toast'

const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'top-right',
}

export function useToast() {
  const showSuccess = (message: string, options?: ToastOptions) => {
    toast.success(message, { ...defaultOptions, ...options })
  }

  const showError = (message: string, options?: ToastOptions) => {
    toast.error(message, { ...defaultOptions, ...options })
  }

  const showInfo = (message: string, options?: ToastOptions) => {
    toast(message, { ...defaultOptions, ...options })
  }

  const showWarning = (message: string, options?: ToastOptions) => {
    toast(message, {
      ...defaultOptions,
      icon: '⚠️',
      ...options,
    })
  }

  const showLoading = (message: string, options?: ToastOptions) => {
    return toast.loading(message, { ...defaultOptions, ...options })
  }

  const dismiss = (toastId?: string) => {
    toast.dismiss(toastId)
  }

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
    dismiss,
  }
}
