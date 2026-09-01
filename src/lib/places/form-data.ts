export type ParsedPlaceFormData = {
  nameKr: string;
  nameEn: string | null;
  category: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  phone: string | null;
  website: string | null;
  instagram: string | null;
  thumbnailUrl: string | null;
  tourApiId: string | null;
  visibility: string;
  condition: {
    indoor: string;
    carrierStrollerPolicy: string;
    maxDogSize: string;
    leash: string;
    muzzle: string;
    vaccinationCertificatePolicy: string;
    breedRestrictions: string | null;
    requiredItems: string[];
    cautions: string | null;
    clearPolicyDetails: boolean;
  };
  verification: {
    method: string;
    verifiedAt: string;
    note?: string;
  };
};

function nullIfEmpty(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;

  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimmedString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function numberOrNaN(v: FormDataEntryValue | null): number {
  return typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
}

export function parsePlaceFormData(formData: FormData): ParsedPlaceFormData {
  return {
    nameKr: trimmedString(formData.get("nameKr")),
    nameEn: nullIfEmpty(formData.get("nameEn")),
    category: String(formData.get("category") ?? ""),
    address: trimmedString(formData.get("address")),
    location: {
      lat: numberOrNaN(formData.get("lat")),
      lng: numberOrNaN(formData.get("lng")),
    },
    phone: nullIfEmpty(formData.get("phone")),
    website: nullIfEmpty(formData.get("website")),
    instagram: nullIfEmpty(formData.get("instagram")),
    thumbnailUrl: nullIfEmpty(formData.get("thumbnailUrl")),
    tourApiId: nullIfEmpty(formData.get("tourApiId")),
    visibility: String(formData.get("visibility") ?? "DRAFT"),
    condition: {
      indoor: String(formData.get("condition.indoor") ?? ""),
      carrierStrollerPolicy: String(
        formData.get("condition.carrierStrollerPolicy") ?? "",
      ),
      maxDogSize: String(formData.get("condition.maxDogSize") ?? ""),
      leash: String(formData.get("condition.leash") ?? ""),
      muzzle: String(formData.get("condition.muzzle") ?? ""),
      vaccinationCertificatePolicy: String(formData.get("condition.vaccinationCertificatePolicy") ?? "UNKNOWN"),
      breedRestrictions: nullIfEmpty(formData.get("condition.breedRestrictions")),
      requiredItems: formData.getAll("condition.requiredItems").map(String),
      cautions: nullIfEmpty(formData.get("condition.cautions")),
      // 구조화 상세 조건 초기화 신호. 폼이 policyDetails 본문을 보내지 않으므로
      // "변경 없음"(신호 없음)과 "지우기"(신호 있음)를 이 값으로 구분한다.
      clearPolicyDetails: formData.get("condition.clearPolicyDetails") === "true",
    },
    verification: {
      method: String(formData.get("verification.method") ?? ""),
      verifiedAt: String(formData.get("verification.verifiedAt") ?? ""),
      note: nullIfEmpty(formData.get("verification.note")) ?? undefined,
    },
  };
}
