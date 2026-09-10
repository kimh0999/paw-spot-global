"use server";

import { revalidatePath } from "next/cache";

import { AdminAuthorizationError, requireAdminAction } from "@/lib/auth/require-admin";
import { createVetClinic, updateVetClinic, VetPublishError } from "@/lib/vets/save-clinic";
import { vetClinicInputSchema } from "@/lib/vets/validation";
import type { VetClinicFormState } from "./form-state";

/**
 * 병원 등록·수정 서버 액션.
 *
 * 권한 확인은 **레이아웃이 아니라 여기서도** 한다. 레이아웃 가드는 화면 진입을 막을 뿐
 * 액션 호출을 막지 않는다 — 액션은 자기 권한을 스스로 확인해야 한다.
 */

function parsePayload(formData: FormData) {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function runSave(
  formData: FormData,
  save: (input: ReturnType<typeof vetClinicInputSchema.parse>, admin: Awaited<ReturnType<typeof requireAdminAction>>) => Promise<string | void>,
): Promise<VetClinicFormState> {
  let admin;
  try {
    admin = await requireAdminAction();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return { status: "error", message: error.message === "AUTH_REQUIRED" ? "authRequired" : "forbidden" };
    }
    throw error;
  }

  const payload = parsePayload(formData);
  const parsed = vetClinicInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "error",
      message: "invalidInput",
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    };
  }

  try {
    const id = await save(parsed.data, admin);
    revalidatePath("/[locale]/admin/vets", "page");
    revalidatePath("/[locale]/vets", "page");
    return { status: "success", clinicId: typeof id === "string" ? id : undefined };
  } catch (error) {
    if (error instanceof VetPublishError) {
      // 공개 기준(D-20)에 걸린 것은 입력 오류와 다르다. 무엇이 모자란지 그대로 돌려준다.
      return { status: "error", message: "publishBlocked", issues: error.blockers };
    }
    console.error("[admin/vets] 저장 실패", error);
    return { status: "error", message: "saveFailed" };
  }
}

export async function createVetClinicAction(
  _prev: VetClinicFormState,
  formData: FormData,
): Promise<VetClinicFormState> {
  return runSave(formData, (input, admin) => createVetClinic(input, admin));
}

export async function updateVetClinicAction(
  _prev: VetClinicFormState,
  formData: FormData,
): Promise<VetClinicFormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", message: "invalidInput" };
  }
  return runSave(formData, async (input, admin) => {
    await updateVetClinic(id, input, admin);
    return id;
  });
}
