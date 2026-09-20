# 후보 장소 등록 파일 만드는 법

등록기(`scripts/import-places.mjs`)는 **등록용 배열 1개 + 검토 메타데이터 1개**를 짝으로 받는다.
메타가 없거나 사람 검토 기록이 없으면 DB에 붙지 않는다 (결정 D-23).

메타 파일 이름은 **배열과 같은 이름 + `.meta.json`** 이다. 두 파일은 늘 함께 옮긴다.

## 1. TourAPI에서 수집한 경우

**실제 호출은 예산 안에서만 나간다.** 횟수는 `data/tour-api/call-budget.json`에 남고
명령을 나눠도 0부터 시작하지 않는다(D-25). 상한에 닿으면 그 다음 요청은 보내지 않는다.

```bash
# (0) 분류 코드표 캐시 — 한 번만. **이 명령은 장소를 수집하지 않는다**
node scripts/collect-tour-area.cjs --refresh-codes --region 30
#   상한을 이 명령에서만 바꾸려면 --budget N, 새 예산을 시작하려면 --reset-budget

# (1) 지역 목록으로 원본 스냅샷 수집 — API를 호출한다
node scripts/collect-tour-area.cjs --region 30 --list-only --summary          # 분류 분포만
node scripts/collect-tour-area.cjs --region 30 --content-type 12 --list-only  # 건수만 확인
node scripts/collect-tour-area.cjs --region 30 --content-type 12              # 실제 수집
node scripts/collect-tour-area.cjs --region 30 --content-type 39 --lcls2 FD05 # 카페만
node scripts/collect-tour-area.cjs --content-id 3443019                       # 콘텐츠 지정
#   상세는 건당 3회 호출한다. --list-only 로 건수를 먼저 보고 --limit 으로 끊어 받는다.

# (2) 변환 — API를 호출하지 않는다. 배열 1개 + 메타 1개 + 검토 시트 1개가 나온다
node scripts/prepare-tour-import.cjs --dir data/tour-api
node scripts/prepare-tour-import.cjs --file <원본1> --file <원본2>   # 일부만 골라서
#   같은 콘텐츠 ID의 스냅샷이 둘 이상이면 멈추고 알린다.
#   가장 늦게 수집한 것을 고르려면 --latest 를 붙인다.
#   분류가 정해지지 않은 관광타입·분류코드는 "분류 검토 대상"으로 세어 빼고 보고한다.

# (3) 형식 확인 — DB·API에 접속하지 않는다
npm run import:places -- --file data/tour-api/import-<...>.json --validate-only

# (4) 사람 검토 — 실제로 확인한 뒤에만 기록한다
node scripts/review-tour-import.cjs --file data/tour-api/import-<...>.json            # 확인만
node scripts/review-tour-import.cjs --file data/tour-api/import-<...>.json   --reviewer you@example.com --confirm                                                # 기록

# (5) DB — 여기서부터 실제 DB에 접속한다
npm run import:places -- --file data/tour-api/import-<...>.json            # dry-run (INSERT 후 ROLLBACK)
npm run import:places -- --file data/tour-api/import-<...>.json --commit   # 실제 등록 (DRAFT)
```

## 2. 직접 만든 배열을 쓰는 경우

`import-places.example.json`과 같은 형식으로 배열을 만든 뒤, 같은 검토 계약을 따른다.

```bash
node scripts/review-tour-import.cjs --file ./my-places.json   --manual --reviewer you@example.com --confirm
```

`--manual`은 메타가 없을 때만 쓴다. 만들어지는 메타에는 `source.kind: "MANUAL"`이 박히고
수집 출처는 비어 있다 — TourAPI에서 온 것처럼 적지 않는다.

## 3. 변환이 만드는 세 파일

| 파일 | 읽는 쪽 | 내용 |
|---|---|---|
| `import-<...>.json` | 등록기 | 후보 배열. 이름·주소·좌표·전화·홈페이지·이미지 |
| `import-<...>.meta.json` | 등록기 | 출처·해시·분류 근거·조건 제안·검토 기록 |
| `import-<...>.review.md` | **사람** | 원문 ↔ 제안 값 대조표. 관리자 화면 옆에 놓고 본다 |

검토 시트가 담는 제안: 분류 근거 · 반려견 동반 조건 · 운영시간 · **주차** · **장소 소개 원문**.

**시트만 다시 만들 수 있다.** 변환 규칙이 바뀌었거나 시트 문구가 잘못됐을 때 쓴다.
등록용 배열과 메타는 건드리지 않아 **기록된 사람 검토와 해시가 그대로 남는다.**

```bash
node scripts/prepare-tour-import.cjs --rebuild-sheet data/tour-api/import-<...>.json
```

검토 시트는 항목마다 네 칸이다 — **원문 필드/문장 → 제안 값 → 근거 → 미확인 사항**.
제안 값은 **저장값이 아니다.** 관리자 화면에서 사람이 넣어야 공개 조건 필터가 읽는다.

## 4. 검사 항목

DB에 붙기 전에 아래를 모두 본다. 하나라도 어긋나면 거부한다.

| 검사 | 막는 것 |
|---|---|
| 메타 파일 존재 | 메타를 빼서 검토를 건너뛰는 것 |
| 배열 파일 해시 = `output.sha256` | 변환 이후 배열이 바뀐 것 |
| `output.importFile` = 지정한 경로 | 다른 파일의 메타를 붙이는 것 |
| `itemCount` / `tourApiIds` / `items` 대응 | 건수·항목이 어긋난 채 일부만 들어가는 것 |
| `review.status = REVIEWED` + 검토자 + 시각 | 사람이 보지 않은 데이터가 들어가는 것 |
| `review.target` 해시 = 지금 파일·메타 | 검토 이후 데이터를 바꾸고 옛 기록으로 통과하는 것 |

**해시는 내용이 그대로인지 확인하는 수단이지 검토자 신원을 인증하는 전자서명이 아니다.**
파일을 쓸 수 있는 사람은 검토 기록도 고칠 수 있다.

## 5. 중복 보호

DB에 붙는 단계(dry-run·`--commit`)에서 두 가지를 본다.

- **같은 `tourApiId`** — `ON CONFLICT DO NOTHING`으로 건너뛴다. 재실행이 기존 값을 덮지 않는다.
- **`tourApiId`가 없는 수동 등록 장소** — 이름이 같거나(공백·대소문자 무시) 100m 안에 있으면
  **알리기만 한다.** 자동으로 합치거나 지우지 않는다.

## 6. 격리 DB로 흐름을 확인할 때

`IMPORT_DATABASE_URL`을 주면 `.env.local`의 `DATABASE_URL` 대신 그 값을 쓴다.
**격리 DB 확인 전용 우회로다.** 앱이 쓰는 변수와 이름을 다르게 둔 이유가 이것이다.

```bash
node scripts/test-db.mjs up
IMPORT_DATABASE_URL="postgresql://postgres@127.0.0.1:55432/pawspot_test"   npm run import:places -- --file <경로> --commit
```

## 7. 이 절차가 하지 않는 것

- **장소의 반려견 정책을 확인하지 않는다.** `PlaceCondition`·`Verification`을 만들지 않는다.
  운영 정보와 동반 조건은 원본 스냅샷에 보존되고 검토 시트에 **제안**으로만 나온다.
  저장은 사람이 관리자 화면에서 한다. **수집일은 확인일이 아니다.**
- **조건과 확인 기록은 만들지 않는다.** 소개·운영 안내·주차·(표현 가능한 경우의)운영시간은
  등록기가 함께 넣지만(D-27), `PlaceCondition`·`Verification`은 여전히 만들지 않는다.
- **공개하지 않는다.** 등록은 `visibility = DRAFT`까지다. 공개 전환은 관리자 화면에서
  조건과 확인 기록을 채운 뒤 따로 한다.
- **이미지를 공개하지 않는다.** 이미지 출처는 검토 전 상태로 저장되고, 관리자가
  화면에서 확인해 검토를 기록해야 공개 화면에 나간다 (결정 D-22).
- **이미 있는 `tourApiId`는 건드리지 않는다.** UPDATE 없이 건너뛴다.
