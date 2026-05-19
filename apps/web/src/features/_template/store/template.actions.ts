import type { TemplateState } from "./template.types";

export function setTemplateLoading(state: TemplateState): TemplateState {
  return {
    ...state,
    status: "loading",
  };
}
