"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { DOG_SIZES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DogFormState } from "@/lib/dogs/actions";

export type DogProfileInitialValues = {
  name?: string;
  size?: string;
  breed?: string | null;
};

interface DogProfileFormProps {
  action: (prevState: DogFormState, formData: FormData) => Promise<DogFormState>;
  initialValues?: DogProfileInitialValues;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

function SubmitButton({ label, savingLabel }: { label: string; savingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
    >
      {pending ? savingLabel : label}
    </button>
  );
}

export default function DogProfileForm({
  action,
  initialValues,
}: DogProfileFormProps) {
  const t = useTranslations("myDog.form");
  const [state, formAction] = useFormState(action, {});

  const sizeLabels: Record<string, string> = {
    SMALL: t("sizeOptions.small"),
    MEDIUM: t("sizeOptions.medium"),
    LARGE: t("sizeOptions.large"),
  };

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="dog-name" className="mb-1.5 block text-sm font-semibold text-gray-900">
          {t("name")}
        </label>
        <input
          id="dog-name"
          name="name"
          type="text"
          required
          defaultValue={initialValues?.name ?? ""}
          placeholder={t("namePlaceholder")}
          className={cn(inputClass, state.fieldErrors?.name && "border-red-400")}
        />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-600">{t("invalid")}</p>
        )}
      </div>

      <div>
        <label htmlFor="dog-size" className="mb-1.5 block text-sm font-semibold text-gray-900">
          {t("size")}
        </label>
        <select
          id="dog-size"
          name="size"
          defaultValue={initialValues?.size ?? "SMALL"}
          className={inputClass}
        >
          {DOG_SIZES.map((size) => (
            <option key={size} value={size}>
              {sizeLabels[size]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="dog-breed" className="mb-1.5 block text-sm font-semibold text-gray-900">
          {t("breed")}
        </label>
        <input
          id="dog-breed"
          name="breed"
          type="text"
          defaultValue={initialValues?.breed ?? ""}
          placeholder={t("breedPlaceholder")}
          className={cn(inputClass, state.fieldErrors?.breed && "border-red-400")}
        />
        {state.fieldErrors?.breed && (
          <p className="mt-1 text-xs text-red-600">{t("invalid")}</p>
        )}
      </div>

      {state.success && (
        <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {t("success")}
        </p>
      )}
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton label={t("save")} savingLabel={t("saving")} />
    </form>
  );
}
