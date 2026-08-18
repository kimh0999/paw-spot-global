"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import DogCard from "@/components/dogs/DogCard";
import DogForm from "@/components/dogs/DogForm";
import DogFormDialog from "@/components/dogs/DogFormDialog";
import { usePathname, useRouter } from "@/i18n/navigation";
import { deleteDog } from "@/lib/dogs/actions";
import { MAX_DOGS_PER_USER } from "@/lib/dogs/constants";
import type { DogFormState } from "@/lib/dogs/form-state";
import type { DogSummary } from "@/lib/dogs/queries";
import { objectParticle } from "@/lib/i18n/korean-particle";

interface DogsManagerProps {
  dogs: DogSummary[];
}

export default function DogsManager({ dogs }: DogsManagerProps) {
  const t = useTranslations("dogs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pendingDelete, setPendingDelete] = useState<DogSummary | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const formParam = searchParams.get("form");
  const editDogId = searchParams.get("editDogId");
  const editingDog =
    formParam === "edit" ? (dogs.find((dog) => dog.id === editDogId) ?? null) : null;
  const isAtLimit = dogs.length >= MAX_DOGS_PER_USER;
  // 사라진 반려견의 편집 링크는 폼을 열지 않고 조용히 목록만 보여준다.
  // 한도에 찼을 때는 주소로 직접 들어와도 등록 폼을 열지 않는다. 저장은 어차피 서버가 막는다.
  const isFormOpen = (formParam === "new" && !isAtLimit) || editingDog !== null;

  const closeForm = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  function openCreate() {
    triggerRef.current = addButtonRef.current;
    router.push(`${pathname}?form=new`);
  }

  function openEdit(dog: DogSummary, trigger: HTMLElement | null) {
    triggerRef.current = trigger;
    router.push(`${pathname}?form=edit&editDogId=${dog.id}`);
  }

  function handleFormResult(state: DogFormState) {
    if (state.status === "success") {
      const name = state.dogName ?? "";
      toast.success(
        state.action === "created"
          ? t("toast.created", { name, particle: objectParticle(name) })
          : t("toast.updated", { name }),
      );
      closeForm();
      router.refresh();
      return;
    }

    if (state.status === "error" && state.code !== "VALIDATION_FAILED") {
      toast.error(t(`form.errors.${state.code}`));
    }
  }

  function confirmDelete() {
    const target = pendingDelete;
    if (!target || isDeleting) return;

    startDelete(async () => {
      const result = await deleteDog(target.id);
      if (result.status === "success") {
        toast.success(
          t("toast.deleted", {
            name: target.name,
            particle: objectParticle(target.name),
          }),
        );
        // 카드가 사라지면 메뉴 버튼도 함께 사라진다. 포커스가 body로 빠지지 않도록
        // 목록에 항상 남아 있는 추가 버튼으로 옮긴다.
        triggerRef.current = addButtonRef.current;
        setPendingDelete(null);
        router.refresh();
        return;
      }
      if (result.status === "error") {
        toast.error(t(`form.errors.${result.code}`));
        setPendingDelete(null);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-content-secondary">
          {t("count", { count: dogs.length, max: MAX_DOGS_PER_USER })}
        </p>
        <button
          ref={addButtonRef}
          type="button"
          onClick={openCreate}
          disabled={isAtLimit}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          {t("addDog")}
        </button>
      </div>

      {isAtLimit && (
        <p className="mt-2 rounded-lg border border-border bg-warning-soft p-3 text-sm text-warning">
          {t("limitReached", { max: MAX_DOGS_PER_USER })}
        </p>
      )}

      {dogs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm font-semibold text-content">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-content-secondary">{t("empty.description")}</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-4 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            {t("addDog")}
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {dogs.map((dog) => (
            <DogCard
              key={dog.id}
              dog={dog}
              onEdit={openEdit}
              onDelete={(target, trigger) => {
                triggerRef.current = trigger;
                setPendingDelete(target);
              }}
            />
          ))}
        </ul>
      )}

      <DogFormDialog
        open={isFormOpen}
        title={editingDog ? t("form.editTitle") : t("form.createTitle")}
        description={editingDog ? t("form.editDescription") : t("form.createDescription")}
        closeLabel={t("form.close")}
        onClose={closeForm}
        returnFocusTo={triggerRef.current}
      >
        <DogForm
          // 편집 대상이 바뀌면 폼 상태를 새로 만든다.
          key={editingDog ? editingDog.id : "new"}
          mode={editingDog ? "edit" : "create"}
          dog={editingDog}
          onResult={handleFormResult}
          onCancel={closeForm}
        />
      </DogFormDialog>

      <Dialog.Root
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next && !isDeleting) setPendingDelete(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-dialog bg-overlay" />
          <Dialog.Content
            onCloseAutoFocus={(event) => {
              if (!triggerRef.current) return;
              event.preventDefault();
              triggerRef.current.focus();
            }}
            className="fixed left-1/2 top-1/2 z-dialog w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 shadow-lg outline-none"
          >
            <Dialog.Title className="text-base font-bold text-content">
              {t("delete.title")}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-content-secondary">
              {t("delete.description", { name: pendingDelete?.name ?? "" })}
            </Dialog.Description>

            <div className="mt-5 flex gap-2">
              <Dialog.Close
                disabled={isDeleting}
                className="h-11 flex-1 rounded-lg border border-border-strong bg-surface text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                {t("form.cancel")}
              </Dialog.Close>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="h-11 flex-1 rounded-lg bg-danger text-sm font-semibold text-primary-foreground outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                {isDeleting ? t("delete.deleting") : t("delete.confirm")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
