"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";

interface DogFormDialogProps {
  open: boolean;
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
  /** 닫은 뒤 focus를 돌려줄 요소. 없으면 브라우저 기본 동작에 맡긴다. */
  returnFocusTo?: HTMLElement | null;
  children: React.ReactNode;
}

/**
 * 등록·수정 폼 껍데기.
 * 모바일에서는 화면 아래에서 올라오는 Sheet, sm 이상에서는 가운데 Dialog로 보인다.
 * 같은 Radix Dialog를 쓰므로 focus trap과 Escape 닫기가 두 형태에서 동일하다.
 */
export default function DogFormDialog({
  open,
  title,
  description,
  closeLabel,
  onClose,
  returnFocusTo,
  children,
}: DogFormDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-dialog bg-overlay" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            if (!returnFocusTo) return;
            event.preventDefault();
            returnFocusTo.focus();
          }}
          className="fixed inset-x-0 bottom-0 z-dialog flex max-h-[92dvh] flex-col rounded-t-2xl border border-border bg-surface px-4 pb-4 pt-5 shadow-lg outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:px-6 sm:pb-6"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold text-content">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-content-secondary">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label={closeLabel}
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-content-muted outline-none transition-colors hover:bg-surface-subtle hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={18} strokeWidth={1.5} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
