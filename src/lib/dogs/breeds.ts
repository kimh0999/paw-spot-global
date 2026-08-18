import type { SupportedLocale } from "@/lib/constants";

export type DogBreed = {
  code: string;
  ko: string;
  en: string;
};

/** 믹스견 — 견종을 특정하지 않는 선택지. */
export const BREED_CODE_MIX = "mix";
/** 기타 — 직접 입력(`breedCustom`)을 함께 저장하는 유일한 code. */
export const BREED_CODE_OTHER = "other";

/**
 * DB에는 code만 저장하고 화면에서 locale label을 붙인다.
 * 순서는 그대로 선택 목록의 표시 순서가 된다. mix·other는 항상 마지막에 둔다.
 */
export const DOG_BREEDS: readonly DogBreed[] = [
  { code: "maltese", ko: "말티즈", en: "Maltese" },
  { code: "poodle", ko: "푸들", en: "Poodle" },
  { code: "pomeranian", ko: "포메라니안", en: "Pomeranian" },
  { code: "chihuahua", ko: "치와와", en: "Chihuahua" },
  { code: "yorkshire_terrier", ko: "요크셔테리어", en: "Yorkshire Terrier" },
  { code: "shih_tzu", ko: "시츄", en: "Shih Tzu" },
  { code: "bichon_frise", ko: "비숑프리제", en: "Bichon Frise" },
  { code: "dachshund", ko: "닥스훈트", en: "Dachshund" },
  { code: "pekingese", ko: "페키니즈", en: "Pekingese" },
  { code: "papillon", ko: "파피용", en: "Papillon" },
  { code: "spitz", ko: "스피츠", en: "Spitz" },
  { code: "italian_greyhound", ko: "이탈리안그레이하운드", en: "Italian Greyhound" },
  { code: "jack_russell_terrier", ko: "잭러셀테리어", en: "Jack Russell Terrier" },
  { code: "west_highland_white_terrier", ko: "웨스트하이랜드화이트테리어", en: "West Highland White Terrier" },
  { code: "boston_terrier", ko: "보스턴테리어", en: "Boston Terrier" },
  { code: "pug", ko: "퍼그", en: "Pug" },
  { code: "french_bulldog", ko: "프렌치불독", en: "French Bulldog" },
  { code: "bulldog", ko: "불독", en: "Bulldog" },
  { code: "schnauzer", ko: "슈나우저", en: "Schnauzer" },
  { code: "cocker_spaniel", ko: "코커스패니얼", en: "Cocker Spaniel" },
  { code: "beagle", ko: "비글", en: "Beagle" },
  { code: "welsh_corgi", ko: "웰시코기", en: "Welsh Corgi" },
  { code: "shiba_inu", ko: "시바견", en: "Shiba Inu" },
  { code: "jindo", ko: "진돗개", en: "Jindo Dog" },
  { code: "pungsan", ko: "풍산개", en: "Pungsan Dog" },
  { code: "shetland_sheepdog", ko: "셔틀랜드시프도그", en: "Shetland Sheepdog" },
  { code: "border_collie", ko: "보더콜리", en: "Border Collie" },
  { code: "australian_shepherd", ko: "오스트레일리안셰퍼드", en: "Australian Shepherd" },
  { code: "dalmatian", ko: "달마시안", en: "Dalmatian" },
  { code: "golden_retriever", ko: "골든리트리버", en: "Golden Retriever" },
  { code: "labrador_retriever", ko: "래브라도리트리버", en: "Labrador Retriever" },
  { code: "german_shepherd", ko: "저먼셰퍼드", en: "German Shepherd" },
  { code: "siberian_husky", ko: "시베리안허스키", en: "Siberian Husky" },
  { code: "samoyed", ko: "사모예드", en: "Samoyed" },
  { code: "akita", ko: "아키타", en: "Akita" },
  { code: "doberman", ko: "도베르만", en: "Doberman" },
  { code: "rottweiler", ko: "로트와일러", en: "Rottweiler" },
  { code: "great_pyrenees", ko: "그레이트피레니즈", en: "Great Pyrenees" },
  { code: "bernese_mountain_dog", ko: "버니즈마운틴독", en: "Bernese Mountain Dog" },
  { code: "saint_bernard", ko: "세인트버나드", en: "Saint Bernard" },
  { code: BREED_CODE_MIX, ko: "믹스견", en: "Mixed Breed" },
  { code: BREED_CODE_OTHER, ko: "기타", en: "Other" },
] as const;

export const DOG_BREED_CODES: readonly string[] = DOG_BREEDS.map((b) => b.code);

const BREED_BY_CODE = new Map(DOG_BREEDS.map((breed) => [breed.code, breed]));

export function isDogBreedCode(value: unknown): value is string {
  return typeof value === "string" && BREED_BY_CODE.has(value);
}

export function findDogBreed(code: string): DogBreed | null {
  return BREED_BY_CODE.get(code) ?? null;
}

/** 사용자 입력과 label을 같은 규칙으로 눕혀 한글·영문 검색을 모두 받는다. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s_-]/g, "");
}

export function getBreedLabel(code: string, locale: SupportedLocale): string | null {
  const breed = findDogBreed(code);
  if (!breed) return null;
  return locale === "ko" ? breed.ko : breed.en;
}

/**
 * 카드·목록에 보여줄 견종 이름.
 * `other`는 사용자가 쓴 원문을 그대로 쓴다. 직접 입력값은 번역하지 않는다 (DESIGN.md §10).
 */
export function formatDogBreed(
  dog: { breedCode: string | null; breedCustom: string | null },
  locale: SupportedLocale,
): string | null {
  if (!dog.breedCode) return null;
  if (dog.breedCode === BREED_CODE_OTHER) return dog.breedCustom;
  return getBreedLabel(dog.breedCode, locale);
}

/** 한글·영문·code 어느 쪽으로 입력해도 같은 결과를 찾게 한다. */
export function searchDogBreeds(query: string): DogBreed[] {
  const q = normalize(query);
  if (!q) return [...DOG_BREEDS];

  return DOG_BREEDS.filter(
    (breed) =>
      normalize(breed.ko).includes(q) ||
      normalize(breed.en).includes(q) ||
      normalize(breed.code).includes(q),
  );
}

/**
 * 기존 자유 입력 `breed` 문자열을 canonical code로 옮길 때 쓰는 조회.
 * 정확히 일치하는 label만 매핑하고, 나머지는 호출한 쪽에서 `other`로 보존한다.
 */
export function matchBreedCodeByLabel(value: string): string | null {
  const normalized = normalize(value);
  if (!normalized) return null;

  const found = DOG_BREEDS.find(
    (breed) =>
      normalize(breed.ko) === normalized ||
      normalize(breed.en) === normalized ||
      normalize(breed.code) === normalized,
  );
  return found?.code ?? null;
}
