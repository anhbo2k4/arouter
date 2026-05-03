import { appendV1Path } from "@/shared/utils/publicBaseUrl";

export function normalizeOpenClawBaseUrl(baseUrl) {
  return appendV1Path(baseUrl);
}
