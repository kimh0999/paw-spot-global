import { serializeJsonLd } from "@/lib/seo/structured-data";

/** 구조화 데이터 한 덩어리. 이스케이프 규칙은 `serializeJsonLd`가 갖는다. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
