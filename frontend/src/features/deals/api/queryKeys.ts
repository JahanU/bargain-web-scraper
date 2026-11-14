import { type DealsRequest, dealsQuery } from "../model/request";

export const dealsKeys = {
  all: ["deals"] as const,
  /** The gender (a new one starts from a skeleton), then the whole request as its query string. */
  list: (request: DealsRequest) => [...dealsKeys.all, request.gender, dealsQuery(request)] as const,
};
