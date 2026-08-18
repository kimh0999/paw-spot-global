/** 한 사용자가 등록할 수 있는 반려견 수. Server Action에서도 같은 값으로 막는다. */
export const MAX_DOGS_PER_USER = 10;

/**
 * 장소 목록에서 조건이 맞지 않는 장소를 감추는 "맞춤 필터"를 켤지 여부.
 *
 * 공개 장소의 크기 정보 커버리지가 릴리스 기준(전체 70% / 주요 카테고리 60%)에
 * 미달인 동안에는 꺼 둔다. 꺼져 있으면 목록은 그대로 두고 카드에 판정 배지만 붙인다.
 * 데이터를 채운 뒤 이 값만 true로 바꾸면 된다.
 */
export const DOG_MATCH_FILTER_ENABLED = false;
