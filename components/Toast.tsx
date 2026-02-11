import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 5000); // Auto-remove after 5 seconds

        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const getToastStyles = () => {
        switch (toast.type) {
            case 'success':
                return {
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    text: 'text-green-800',
                    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
                };
            case 'error':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    text: 'text-red-800',
                    icon: <XCircle className="w-5 h-5 text-red-600" />,
                };
            case 'warning':
                return {
                    bg: 'bg-amber-50',
                    border: 'border-amber-200',
                    text: 'text-amber-800',
                    icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
                };
            case 'info':
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    text: 'text-blue-800',
                    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
                };
        }
    };

    const styles = getToastStyles();

    return (
        <div
            className={`pointer-events-auto ${styles.bg} ${styles.border} border rounded-xl shadow-lg p-4 pr-12 min-w-[300px] max-w-md animate-slide-in-right relative`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
                <p className={`${styles.text} text-sm font-medium flex-1`}>{toast.message}</p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
