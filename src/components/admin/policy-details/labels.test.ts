import { describe, expect, it } from "vitest";

import en from "../../../../messages/en.json";
import ko from "../../../../messages/ko.json";
import {
  BEHAVIOR_OUTCOMES,
  BEHAVIOR_TRIGGERS,
  FEE_PERIODS,
  FEE_POLICIES,
  GROUP_MODES,
  HANDLING_RULES,
  HANDLING_SCOPES,
  HANDLING_STATUS,
  HYGIENE_RULES,
  PREPARATION_ITEMS,
  PREPARATION_SCOPES,
  PREPARATION_STATUS,
  SIZE_SCOPES,
  SPACE_ACCESS,
  SPACE_AREAS,
  UNCERTAINTY_TARGETS,
  VACCINATION_COMPLETION_POLICIES,
} from "@/lib/places/policy-details";
import { POLICY_DETAILS_ERROR_MESSAGE_KEY } from "@/lib/places/policy-details-form";

import {
  BEHAVIOR_OUTCOME_LABELS,
  BEHAVIOR_TRIGGER_LABELS,
  FEE_PERIOD_LABELS,
  FEE_POLICY_LABELS,
  GROUP_MODE_LABELS,
  HANDLING_RULE_LABELS,
  HANDLING_SCOPE_LABELS,
  HANDLING_STATUS_LABELS,
  HYGIENE_RULE_LABELS,
  PREPARATION_ITEM_LABELS,
  PREPARATION_SCOPE_LABELS,
  PREPARATION_STATUS_LABELS,
  SIZE_SCOPE_LABELS,
  SPACE_ACCESS_LABELS,
  SPACE_AREA_LABELS,
  UNCERTAINTY_TARGET_LABELS,
  VACCINATION_COMPLETION_LABELS,
} from "./labels";

/**
 * 관리자 화면은 라벨이 없으면 enum 코드를 그대로 보여준다(`LABELS[x] ?? x`).
 * 화면이 깨지지는 않지만 운영자가 "NOT_ALLOWED"를 읽게 되므로 여기서 계약을 고정한다.
 */
const LABEL_SETS: Array<[string, readonly string[], Record<string, string>]> = [
  ["GROUP_MODES", GROUP_MODES, GROUP_MODE_LABELS],
  ["PREPARATION_SCOPES", PREPARATION_SCOPES, PREPARATION_SCOPE_LABELS],
  ["PREPARATION_ITEMS", PREPARATION_ITEMS, PREPARATION_ITEM_LABELS],
  ["PREPARATION_STATUS", PREPARATION_STATUS, PREPARATION_STATUS_LABELS],
  ["HANDLING_RULES", HANDLING_RULES, HANDLING_RULE_LABELS],
  ["HANDLING_SCOPES", HANDLING_SCOPES, HANDLING_SCOPE_LABELS],
  ["HANDLING_STATUS", HANDLING_STATUS, HANDLING_STATUS_LABELS],
  ["SPACE_AREAS", SPACE_AREAS, SPACE_AREA_LABELS],
  ["SPACE_ACCESS", SPACE_ACCESS, SPACE_ACCESS_LABELS],
  ["SIZE_SCOPES", SIZE_SCOPES, SIZE_SCOPE_LABELS],
  ["BEHAVIOR_TRIGGERS", BEHAVIOR_TRIGGERS, BEHAVIOR_TRIGGER_LABELS],
  ["BEHAVIOR_OUTCOMES", BEHAVIOR_OUTCOMES, BEHAVIOR_OUTCOME_LABELS],
  ["FEE_POLICIES", FEE_POLICIES, FEE_POLICY_LABELS],
  ["FEE_PERIODS", FEE_PERIODS, FEE_PERIOD_LABELS],
  ["HYGIENE_RULES", HYGIENE_RULES, HYGIENE_RULE_LABELS],
  ["UNCERTAINTY_TARGETS", UNCERTAINTY_TARGETS, UNCERTAINTY_TARGET_LABELS],
  [
    "VACCINATION_COMPLETION_POLICIES",
    VACCINATION_COMPLETION_POLICIES,
    VACCINATION_COMPLETION_LABELS,
  ],
];

describe("관리자 라벨", () => {
  it.each(LABEL_SETS)("%s의 모든 코드에 라벨이 있다", (_name, codes, labels) => {
    for (const code of codes) {
      expect(labels[code]?.trim(), code).toBeTruthy();
    }
  });

  it("쓰이지 않는 라벨을 남겨 두지 않는다", () => {
    for (const [name, codes, labels] of LABEL_SETS) {
      expect(Object.keys(labels).sort(), name).toEqual([...codes].sort());
    }
  });
});

/**
 * 저장 실패는 이유별로 다른 안내를 보여준다. 키가 비면 화면에 키 문자열이 그대로 나온다.
 * 관리자 폼 자체는 한국어지만 오류 문구는 next-intl을 거치므로 두 언어가 모두 필요하다.
 */
describe("저장 실패 안내 문구", () => {
  const bundles = {
    ko: ko.admin.places.form.validation as Record<string, string>,
    en: en.admin.places.form.validation as Record<string, string>,
  };

  it.each(Object.entries(bundles))("%s에 모든 실패 사유의 문구가 있다", (_locale, bundle) => {
    for (const key of Object.values(POLICY_DETAILS_ERROR_MESSAGE_KEY)) {
      expect(bundle[key]?.trim(), key).toBeTruthy();
    }
  });
});
