export type ApiResponse<TData> = {
  data: TData;
  message?: string;
};

export type AsyncStatus = "idle" | "loading" | "success" | "error";
