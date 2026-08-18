/**
 * 반려견 폼의 Server Action 결과 타입.
 *
 * `actions.ts`는 `"use server"` 파일이라 async 함수 외의 값을 export할 수 없다.
 * 초기 상태 객체를 그쪽에 두면 Server Action 요청 자체가 500으로 끝나므로 여기에 둔다.
 */
export type DogActionErrorCode =
  | "AUTH_REQUIRED"
  | "DOG_LIMIT_REACHED"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "INTERNAL_ERROR";

export type DogFormState =
  | { status: "idle" }
  | { status: "success"; action: "created" | "updated" | "deleted"; dogName?: string }
  | {
      status: "error";
      code: DogActionErrorCode;
      /** 필드명 → 메시지 키. 화면에서 locale 문구로 옮긴다. */
      fieldErrors?: Record<string, string>;
    };

export const initialDogFormState: DogFormState = { status: "idle" };
