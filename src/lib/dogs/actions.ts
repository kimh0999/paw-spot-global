"use server";

import { revalidatePath } from "next/cache";

import {
  UserAuthorizationError,
  requireUserAction,
} from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { MAX_DOGS_PER_USER } from "@/lib/dogs/constants";
import { SUPPORTED_LOCALES } from "@/lib/constants";
import { dogInputSchema } from "@/lib/validation/dog";
// 상태 타입과 초기값은 별도 모듈에 둔다. "use server" 파일은 async 함수만 export할 수 있다.
import type { DogActionErrorCode, DogFormState } from "@/lib/dogs/form-state";

function error(
  code: DogActionErrorCode,
  fieldErrors?: Record<string, string>,
): DogFormState {
  return { status: "error", code, fieldErrors };
}

function revalidateDogViews() {
  for (const locale of SUPPORTED_LOCALES) {
    revalidatePath(`/${locale}/profile/dogs`);
    revalidatePath(`/${locale}/places`);
  }
}

function parseDogForm(formData: FormData) {
  return dogInputSchema.safeParse({
    name: formData.get("name"),
    size: formData.get("size"),
    breedCode: formData.get("breedCode"),
    breedCustom: formData.get("breedCustom"),
  });
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message || "invalid";
    }
  }
  return fieldErrors;
}

export async function createDog(
  _prevState: DogFormState,
  formData: FormData,
): Promise<DogFormState> {
  let user;
  try {
    user = await requireUserAction();
  } catch (caught) {
    if (caught instanceof UserAuthorizationError) return error("AUTH_REQUIRED");
    throw caught;
  }

  const parsed = parseDogForm(formData);
  if (!parsed.success) {
    return error("VALIDATION_FAILED", toFieldErrors(parsed.error.issues));
  }

  // 등록 한도는 클라이언트 비활성화에만 맡기지 않는다.
  const count = await prisma.dog.count({ where: { userId: user.id } });
  if (count >= MAX_DOGS_PER_USER) {
    return error("DOG_LIMIT_REACHED");
  }

  await prisma.dog.create({ data: { ...parsed.data, userId: user.id } });
  revalidateDogViews();

  return { status: "success", action: "created", dogName: parsed.data.name };
}

export async function updateDog(
  _prevState: DogFormState,
  formData: FormData,
): Promise<DogFormState> {
  let user;
  try {
    user = await requireUserAction();
  } catch (caught) {
    if (caught instanceof UserAuthorizationError) return error("AUTH_REQUIRED");
    throw caught;
  }

  const dogId = formData.get("dogId");
  if (typeof dogId !== "string" || dogId.trim() === "") {
    return error("NOT_FOUND");
  }

  const parsed = parseDogForm(formData);
  if (!parsed.success) {
    return error("VALIDATION_FAILED", toFieldErrors(parsed.error.issues));
  }

  // 소유자 조건을 where에 함께 건다. 남의 반려견과 없는 id는 같은 결과로 끝난다.
  const { count } = await prisma.dog.updateMany({
    where: { id: dogId, userId: user.id },
    data: parsed.data,
  });
  if (count === 0) return error("NOT_FOUND");

  revalidateDogViews();

  return { status: "success", action: "updated", dogName: parsed.data.name };
}

export async function deleteDog(dogId: string): Promise<DogFormState> {
  let user;
  try {
    user = await requireUserAction();
  } catch (caught) {
    if (caught instanceof UserAuthorizationError) return error("AUTH_REQUIRED");
    throw caught;
  }

  if (typeof dogId !== "string" || dogId.trim() === "") {
    return error("NOT_FOUND");
  }

  const { count } = await prisma.dog.deleteMany({
    where: { id: dogId, userId: user.id },
  });
  if (count === 0) return error("NOT_FOUND");

  revalidateDogViews();

  return { status: "success", action: "deleted" };
}
