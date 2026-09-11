"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import BreedCombobox from "@/components/dogs/BreedCombobox";
import { DOG_SIZES, type DogSize } from "@/lib/constants";
import { BREED_CODE_OTHER } from "@/lib/dogs/breeds";
import { createDog, updateDog } from "@/lib/dogs/actions";
import { initialDogFormState, type DogFormState } from "@/lib/dogs/form-state";
import type { DogSummary } from "@/lib/dogs/queries";
import { cn } from "@/lib/utils";

interface DogFormProps {
  mode: "create" | "edit";
  dog?: DogSummary | null;
  /** 성공·실패 모두 부모가 받아서 Dialog 닫기와 Toast를 결정한다. */
  onResult: (state: DogFormState) => void;
  onCancel: () => void;
}

const fieldLabelClass = "mb-1.5 block text-sm font-semibold text-content";
const inputClass =
  "h-11 w-full rounded-lg border bg-surface px-3 text-sm text-content outline-none focus:border-primary focus:ring-2 focus:ring-ring";

function SubmitBar({
  submitLabel,
  savingLabel,
  cancelLabel,
  onCancel,
}: {
  submitLabel: string;
  savingLabel: string;
  cancelLabel: string;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="sticky bottom-0 -mx-4 mt-6 flex gap-2 border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="h-11 flex-1 rounded-lg border border-border-control bg-surface text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={pending}
        className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {pending ? savingLabel : submitLabel}
      </button>
    </div>
  );
}

export default function DogForm({ mode, dog, onResult, onCancel }: DogFormProps) {
  const t = useTranslations("dogs.form");
  const [state, formAction] = useActionState(
    mode === "create" ? createDog : updateDog,
    initialDogFormState,
  );
  const [breedCode, setBreedCode] = useState<string | null>(dog?.breedCode ?? null);

  const fieldId = useId();
  const nameId = `${fieldId}-name`;
  const nameErrorId = `${fieldId}-name-error`;
  const sizeLabelId = `${fieldId}-size`;
  const breedLabelId = `${fieldId}-breed`;
  const breedErrorId = `${fieldId}-breed-error`;
  const customId = `${fieldId}-breed-custom`;
  const customErrorId = `${fieldId}-breed-custom-error`;

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const formError =
    state.status === "error" && state.code !== "VALIDATION_FAILED"
      ? t(`errors.${state.code}`)
      : null;

  useEffect(() => {
    if (state.status !== "idle") onResult(state);
    // onResult는 매 렌더 새로 만들어질 수 있으므로 상태 변화만 따라간다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const sizeLabels: Record<DogSize, string> = {
    SMALL: t("sizeOptions.small"),
    MEDIUM: t("sizeOptions.medium"),
    LARGE: t("sizeOptions.large"),
  };

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      {mode === "edit" && dog && <input type="hidden" name="dogId" value={dog.id} />}

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        <div>
          <label htmlFor={nameId} className={fieldLabelClass}>
            {t("name")}
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            required
            maxLength={30}
            defaultValue={dog?.name ?? ""}
            placeholder={t("namePlaceholder")}
            aria-invalid={fieldErrors?.name ? true : undefined}
            aria-describedby={fieldErrors?.name ? nameErrorId : undefined}
            className={cn(
              inputClass,
              fieldErrors?.name ? "border-danger" : "border-border-control",
            )}
          />
          {fieldErrors?.name && (
            <p id={nameErrorId} className="mt-1 text-xs text-danger">
              {t("errors.name")}
            </p>
          )}
        </div>

        <fieldset>
          <legend id={sizeLabelId} className={fieldLabelClass}>
            {t("size")}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {DOG_SIZES.map((size) => (
              <label
                key={size}
                className="relative flex min-h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-border-control bg-surface px-2 text-center text-sm font-medium text-content transition-colors hover:bg-surface-subtle has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary [&:has(:focus-visible)]:ring-2 [&:has(:focus-visible)]:ring-ring"
              >
                <input
                  type="radio"
                  name="size"
                  value={size}
                  defaultChecked={(dog?.size ?? "SMALL") === size}
                  className="sr-only"
                />
                {sizeLabels[size]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <span id={breedLabelId} className={fieldLabelClass}>
            {t("breed")}
          </span>
          <BreedCombobox
            value={breedCode}
            onChange={setBreedCode}
            labelledBy={breedLabelId}
            describedBy={fieldErrors?.breedCode ? breedErrorId : undefined}
            invalid={Boolean(fieldErrors?.breedCode)}
          />
          {fieldErrors?.breedCode && (
            <p id={breedErrorId} className="mt-1 text-xs text-danger">
              {t("errors.breedCode")}
            </p>
          )}
        </div>

        {breedCode === BREED_CODE_OTHER && (
          <div>
            <label htmlFor={customId} className={fieldLabelClass}>
              {t("breedCustom")}
            </label>
            <input
              id={customId}
              name="breedCustom"
              type="text"
              maxLength={50}
              defaultValue={dog?.breedCustom ?? ""}
              placeholder={t("breedCustomPlaceholder")}
              aria-invalid={fieldErrors?.breedCustom ? true : undefined}
              aria-describedby={fieldErrors?.breedCustom ? customErrorId : undefined}
              className={cn(
                inputClass,
                fieldErrors?.breedCustom ? "border-danger" : "border-border-control",
              )}
            />
            <p className="mt-1 text-xs text-content-muted">{t("breedCustomHint")}</p>
            {fieldErrors?.breedCustom && (
              <p id={customErrorId} className="mt-1 text-xs text-danger">
                {t("errors.breedCustom")}
              </p>
            )}
          </div>
        )}

        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-border bg-danger-soft p-3 text-sm text-danger"
          >
            {formError}
          </p>
        )}
      </div>

      <SubmitBar
        submitLabel={mode === "create" ? t("submitCreate") : t("submitUpdate")}
        savingLabel={t("saving")}
        cancelLabel={t("cancel")}
        onCancel={onCancel}
      />
    </form>
  );
}
