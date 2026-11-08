import type { Gender } from "../model/Deal";

export const dealsKeys = {
  all: ["deals"] as const,
  gender: (gender: Gender) => [...dealsKeys.all, gender] as const,
};
