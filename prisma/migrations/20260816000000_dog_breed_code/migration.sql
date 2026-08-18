-- Dog 견종을 자유 입력 문자열에서 canonical code로 옮긴다.
-- 이 마이그레이션은 추가와 백필만 한다. 기존 "breed" 컬럼은 남겨 두고
-- 읽기·쓰기 전환을 확인한 뒤 별도 마이그레이션에서 제거한다.

-- AlterTable
ALTER TABLE "Dog" ADD COLUMN     "breedCode" TEXT,
ADD COLUMN     "breedCustom" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Dog" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Backfill: 등록된 견종명(한글·영문·code)과 정확히 일치하는 값만 canonical code로 옮긴다.
UPDATE "Dog" AS d
SET "breedCode" = m.code
FROM (
  VALUES
    ('말티즈', 'maltese'),
    ('maltese', 'maltese'),
    ('푸들', 'poodle'),
    ('poodle', 'poodle'),
    ('포메라니안', 'pomeranian'),
    ('pomeranian', 'pomeranian'),
    ('치와와', 'chihuahua'),
    ('chihuahua', 'chihuahua'),
    ('요크셔테리어', 'yorkshire_terrier'),
    ('yorkshireterrier', 'yorkshire_terrier'),
    ('시츄', 'shih_tzu'),
    ('shihtzu', 'shih_tzu'),
    ('비숑프리제', 'bichon_frise'),
    ('bichonfrise', 'bichon_frise'),
    ('닥스훈트', 'dachshund'),
    ('dachshund', 'dachshund'),
    ('페키니즈', 'pekingese'),
    ('pekingese', 'pekingese'),
    ('파피용', 'papillon'),
    ('papillon', 'papillon'),
    ('스피츠', 'spitz'),
    ('spitz', 'spitz'),
    ('이탈리안그레이하운드', 'italian_greyhound'),
    ('italiangreyhound', 'italian_greyhound'),
    ('잭러셀테리어', 'jack_russell_terrier'),
    ('jackrussellterrier', 'jack_russell_terrier'),
    ('웨스트하이랜드화이트테리어', 'west_highland_white_terrier'),
    ('westhighlandwhiteterrier', 'west_highland_white_terrier'),
    ('보스턴테리어', 'boston_terrier'),
    ('bostonterrier', 'boston_terrier'),
    ('퍼그', 'pug'),
    ('pug', 'pug'),
    ('프렌치불독', 'french_bulldog'),
    ('frenchbulldog', 'french_bulldog'),
    ('불독', 'bulldog'),
    ('bulldog', 'bulldog'),
    ('슈나우저', 'schnauzer'),
    ('schnauzer', 'schnauzer'),
    ('코커스패니얼', 'cocker_spaniel'),
    ('cockerspaniel', 'cocker_spaniel'),
    ('비글', 'beagle'),
    ('beagle', 'beagle'),
    ('웰시코기', 'welsh_corgi'),
    ('welshcorgi', 'welsh_corgi'),
    ('시바견', 'shiba_inu'),
    ('shibainu', 'shiba_inu'),
    ('진돗개', 'jindo'),
    ('jindodog', 'jindo'),
    ('jindo', 'jindo'),
    ('풍산개', 'pungsan'),
    ('pungsandog', 'pungsan'),
    ('pungsan', 'pungsan'),
    ('셔틀랜드시프도그', 'shetland_sheepdog'),
    ('shetlandsheepdog', 'shetland_sheepdog'),
    ('보더콜리', 'border_collie'),
    ('bordercollie', 'border_collie'),
    ('오스트레일리안셰퍼드', 'australian_shepherd'),
    ('australianshepherd', 'australian_shepherd'),
    ('달마시안', 'dalmatian'),
    ('dalmatian', 'dalmatian'),
    ('골든리트리버', 'golden_retriever'),
    ('goldenretriever', 'golden_retriever'),
    ('래브라도리트리버', 'labrador_retriever'),
    ('labradorretriever', 'labrador_retriever'),
    ('저먼셰퍼드', 'german_shepherd'),
    ('germanshepherd', 'german_shepherd'),
    ('시베리안허스키', 'siberian_husky'),
    ('siberianhusky', 'siberian_husky'),
    ('사모예드', 'samoyed'),
    ('samoyed', 'samoyed'),
    ('아키타', 'akita'),
    ('akita', 'akita'),
    ('도베르만', 'doberman'),
    ('doberman', 'doberman'),
    ('로트와일러', 'rottweiler'),
    ('rottweiler', 'rottweiler'),
    ('그레이트피레니즈', 'great_pyrenees'),
    ('greatpyrenees', 'great_pyrenees'),
    ('버니즈마운틴독', 'bernese_mountain_dog'),
    ('bernesemountaindog', 'bernese_mountain_dog'),
    ('세인트버나드', 'saint_bernard'),
    ('saintbernard', 'saint_bernard'),
    ('믹스견', 'mix'),
    ('mixedbreed', 'mix'),
    ('mix', 'mix')
) AS m(label, code)
WHERE d."breed" IS NOT NULL
  AND lower(regexp_replace(d."breed", '[[:space:]_-]', '', 'g')) = m.label;

-- 매핑되지 않은 값은 버리지 않고 `other` + 원본 문자열로 보존한다.
UPDATE "Dog"
SET "breedCode" = 'other',
    "breedCustom" = left(btrim("breed"), 50)
WHERE "breedCode" IS NULL
  AND "breed" IS NOT NULL
  AND btrim("breed") <> '';
