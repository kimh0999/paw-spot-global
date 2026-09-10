/**
 * 검수한 고정 한국어 문의 문구 (계획서 §2-B, P0).
 *
 * **모델 호출 없이 동작한다.** 전화 버튼은 이 문구와 무관하게 항상 먼저 쓸 수 있어야 하므로
 * 여기서 로그인·반려견 등록·문구 작성을 요구하지 않는다.
 *
 * 한국어는 병원에 **그대로 보여 주거나 읽어 줄 문장**이고, 영어는 그 문장의 뜻이다.
 * 자동 번역이 아니라 사람이 검수해 고정한 쌍이므로 한쪽만 고치지 않는다.
 * 자유 입력 번역은 P1이며 이 파일에는 넣지 않는다.
 */

export interface VetInquiryPhrase {
  id: string;
  /** 실제로 전달할 한국어 */
  ko: string;
  /** 그 문장의 영어 뜻 */
  en: string;
}

export const VET_INQUIRY_PHRASES: readonly VetInquiryPhrase[] = [
  {
    id: "visitNow",
    ko: "지금 반려견을 데리고 방문해도 될까요?",
    en: "Can I bring my dog in right now?",
  },
  {
    id: "afterHours",
    ko: "오늘 야간 진료가 가능한가요?",
    en: "Are you open for after-hours care today?",
  },
  {
    id: "english",
    ko: "영어로 상담할 수 있는 직원이나 수의사가 있나요?",
    en: "Is there a staff member or vet who can consult in English?",
  },
  {
    id: "reservation",
    ko: "방문 전에 예약이 필요한가요?",
    en: "Do I need an appointment before visiting?",
  },
] as const;

/** 전체를 한 번에 복사할 때 쓰는 본문. 한국어만 담는다 — 병원이 읽을 문장이기 때문이다. */
export function buildInquiryClipboardText(): string {
  return VET_INQUIRY_PHRASES.map((phrase) => phrase.ko).join("\n");
}
