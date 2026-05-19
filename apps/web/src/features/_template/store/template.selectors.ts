import type { TemplateState } from "./template.types";

export const selectTemplateStatus = (state: TemplateState) => state.status;
