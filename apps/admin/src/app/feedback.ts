import { App as AntdApp } from "antd";
import { useCallback } from "react";
import { handleRequestError, readError } from "../utils/errors.js";

export function useRequestFeedback(onUnauthorized?: () => void) {
  const { message } = AntdApp.useApp();

  const showSuccess = useCallback(
    (content: string) => {
      void message.success(content);
    },
    [message]
  );

  const showError = useCallback(
    (content: string) => {
      void message.error(content);
    },
    [message]
  );

  const showRequestError = useCallback(
    (error: unknown) => {
      showError(onUnauthorized ? handleRequestError(error, onUnauthorized) : readError(error));
    },
    [onUnauthorized, showError]
  );

  return { showError, showRequestError, showSuccess };
}
