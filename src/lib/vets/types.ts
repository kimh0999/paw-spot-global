import type { OperatingHours } from "@/lib/places/operating-hours";
import type { VetDistrict, VetServiceStatus } from "./constants";
import type { VetItemState, VetVerificationRecord } from "./verification";

/**
 * 사용자 화면이 받는 병원 한 곳.
 *
 * **`adminNote`는 없다.** 관리자 내부 메모는 공개 조회에서 제외한다 — 타입에 두면
 * 언젠가 화면이 읽는다.
 */
export interface VetClinicListItem {
  id: string;
  nameKr: string;
  nameEn: string | null;
  district: VetDistrict;
  address: string;
  phone: string;
  website: string | null;
  /** 좌표가 없는 병원이 있다. 없으면 거리를 만들지 않는다. */
  location: { lat: number; lng: number } | null;
  /** 사용자가 위치 사용을 고른 경우에만 채워진다. 좌표가 없으면 null이다. */
  distanceMeters: number | null;

  /** 안내된 진료시간. null은 "휴무"가 아니라 "아직 입력되지 않음"이다. */
  hours: OperatingHours | null;
  hoursNote: string | null;

  englishSupport: VetServiceStatus;
  englishSupportCondition: string | null;
  afterHours: VetServiceStatus;
  afterHoursCondition: string | null;

  /** 데이터 수집일 — 확인일과 다르다. */
  collectedAt: string | null;
  /** 정보 수정일 — 확인일과 다르다. */
  updatedAt: string;

  /** 항목별 확인 근거. 값이 바뀐 항목은 근거가 떨어져 나간 상태로 온다(D-17). */
  verification: {
    basic: VetItemState;
    hours: VetItemState;
    englishSupport: VetItemState;
    afterHours: VetItemState;
  };
}

export interface VetClinicDetail extends VetClinicListItem {
  /** 상세는 항목별 이력을 모두 보여준다. */
  records: VetVerificationRecord[];
}
