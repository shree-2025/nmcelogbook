import { useRef, useEffect } from "react";
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean; // New prop to control close button visibility
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  title,
  showCloseButton = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className="fixed inset-0 h-full w-full bg-black/60"
        onClick={onClose}
      ></div>
      <div
        ref={modalRef}
        className={`relative w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {title && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
