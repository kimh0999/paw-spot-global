/**
 * `actions.ts`는 `"use server"` 파일이라 async 함수 외의 값을 export할 수 없다.
 * 폼 상태 타입과 초기값은 여기 둔다 (장소 폼과 같은 규칙).
 */
export type VetClinicFormState =
  | { status: "idle" }
  | { status: "success"; clinicId?: string }
  | { status: "error"; message: string; issues?: string[] };

export const VET_CLINIC_FORM_INITIAL: VetClinicFormState = { status: "idle" };
