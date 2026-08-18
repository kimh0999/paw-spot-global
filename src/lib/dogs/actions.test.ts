import { beforeEach, describe, expect, it, vi } from "vitest";

// 실제 모듈은 next-auth를 통해 next/server까지 끌고 오므로 auth와 DB는 대체한다.
const { dog } = vi.hoisted(() => ({
  dog: {
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { dog } }));
vi.mock("@/lib/auth/current-user", () => {
  class UserAuthorizationError extends Error {
    constructor(public readonly reason: string) {
      super(reason);
      this.name = "UserAuthorizationError";
    }
  }
  return { UserAuthorizationError, requireUserAction: vi.fn() };
});

import {
  UserAuthorizationError,
  requireUserAction,
} from "@/lib/auth/current-user";
import { createDog, deleteDog, updateDog } from "@/lib/dogs/actions";
import { initialDogFormState } from "@/lib/dogs/form-state";

const requireUserActionMock = vi.mocked(requireUserAction);

const OWNER = {
  id: "user_1",
  email: "a@b.c",
  name: null,
  image: null,
  role: "USER" as const,
};
const DOG_ID = "cmryq3rcp00016csmdlvvuxfm";

function dogForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = { name: "별이", size: "SMALL", ...overrides };
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserActionMock.mockResolvedValue(OWNER);
  dog.count.mockResolvedValue(0);
  dog.create.mockResolvedValue({ id: DOG_ID });
  dog.updateMany.mockResolvedValue({ count: 1 });
  dog.deleteMany.mockResolvedValue({ count: 1 });
});

describe("비로그인 CRUD", () => {
  beforeEach(() => {
    requireUserActionMock.mockRejectedValue(new UserAuthorizationError("AUTH_REQUIRED"));
  });

  it("등록을 거부한다", async () => {
    const state = await createDog(initialDogFormState, dogForm());
    expect(state).toEqual({ status: "error", code: "AUTH_REQUIRED", fieldErrors: undefined });
    expect(dog.create).not.toHaveBeenCalled();
  });

  it("수정을 거부한다", async () => {
    const state = await updateDog(initialDogFormState, dogForm({ dogId: DOG_ID }));
    expect(state.status === "error" && state.code).toBe("AUTH_REQUIRED");
    expect(dog.updateMany).not.toHaveBeenCalled();
  });

  it("삭제를 거부한다", async () => {
    const state = await deleteDog(DOG_ID);
    expect(state.status === "error" && state.code).toBe("AUTH_REQUIRED");
    expect(dog.deleteMany).not.toHaveBeenCalled();
  });
});

describe("소유자 확인", () => {
  it("수정 조건에 userId를 함께 건다", async () => {
    await updateDog(initialDogFormState, dogForm({ dogId: DOG_ID }));
    expect(dog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DOG_ID, userId: OWNER.id } }),
    );
  });

  it("다른 사용자의 Dog 수정은 존재 여부를 알리지 않고 실패한다", async () => {
    dog.updateMany.mockResolvedValue({ count: 0 });
    const state = await updateDog(initialDogFormState, dogForm({ dogId: DOG_ID }));
    expect(state).toEqual({ status: "error", code: "NOT_FOUND", fieldErrors: undefined });
  });

  it("다른 사용자의 Dog 삭제도 같은 결과로 끝난다", async () => {
    dog.deleteMany.mockResolvedValue({ count: 0 });
    const state = await deleteDog(DOG_ID);
    expect(dog.deleteMany).toHaveBeenCalledWith({
      where: { id: DOG_ID, userId: OWNER.id },
    });
    expect(state).toEqual({ status: "error", code: "NOT_FOUND", fieldErrors: undefined });
  });
});

describe("등록 한도", () => {
  it("10마리를 넘기면 DOG_LIMIT_REACHED로 거부한다", async () => {
    dog.count.mockResolvedValue(10);
    const state = await createDog(initialDogFormState, dogForm());
    expect(state.status === "error" && state.code).toBe("DOG_LIMIT_REACHED");
    expect(dog.create).not.toHaveBeenCalled();
  });

  it("9마리면 등록된다", async () => {
    dog.count.mockResolvedValue(9);
    const state = await createDog(initialDogFormState, dogForm());
    expect(state.status).toBe("success");
    expect(dog.create).toHaveBeenCalledWith({
      data: {
        name: "별이",
        size: "SMALL",
        breedCode: null,
        breedCustom: null,
        userId: OWNER.id,
      },
    });
  });
});

// "use server" 파일이 async 함수 외의 값을 하나라도 export하면 Next가 모듈 전체를 거부한다.
// 타입 검사와 빌드는 이를 잡지 못하고, Server Action 요청만 500으로 끝난다.
describe("Server Action 모듈 제약", () => {
  it("actions.ts는 async 함수만 export한다", async () => {
    const actions = await import("@/lib/dogs/actions");

    for (const [name, value] of Object.entries(actions)) {
      expect(typeof value, `${name} export`).toBe("function");
      expect((value as () => unknown).constructor.name, `${name} export`).toBe(
        "AsyncFunction",
      );
    }
  });
});

describe("입력 검증", () => {
  it("허용되지 않은 breedCode는 저장하지 않는다", async () => {
    const state = await createDog(initialDogFormState, dogForm({ breedCode: "wolf" }));
    expect(state.status === "error" && state.code).toBe("VALIDATION_FAILED");
    expect(state.status === "error" && state.fieldErrors?.breedCode).toBeDefined();
    expect(dog.create).not.toHaveBeenCalled();
  });

  it("other가 아니면 breedCustom을 버리고 저장한다", async () => {
    await createDog(
      initialDogFormState,
      dogForm({ breedCode: "poodle", breedCustom: "지워져야 함" }),
    );
    expect(dog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ breedCode: "poodle", breedCustom: null }),
    });
  });
});
