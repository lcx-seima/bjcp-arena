import { Button, Form, Input, Popup, Space, Toast } from "antd-mobile";
import { useEffect, useRef, useState } from "react";
import { type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type Mode = "summary" | "nickname";

export function UserCenterPopup({
  initialMode = "summary",
  opened,
  requiresNicknameChange = false,
  user,
  onClose,
  onLogout,
  onUnauthorized,
  onUserUpdated,
}: {
  initialMode?: Mode;
  opened: boolean;
  requiresNicknameChange?: boolean;
  user: UserPublic;
  onClose: () => void;
  onLogout: () => void;
  onUnauthorized: () => void;
  onUserUpdated: (user: UserPublic) => void;
}) {
  const [form] = Form.useForm<{ nickname: string }>();
  const [mode, setMode] = useState<Mode>(
    requiresNicknameChange ? "nickname" : initialMode
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const visibleMode = requiresNicknameChange ? "nickname" : mode;

  useEffect(() => {
    if (!opened) {
      return;
    }

    setMode(requiresNicknameChange ? "nickname" : initialMode);
    setError(null);
    form.setFieldsValue({ nickname: requiresNicknameChange ? "" : user.nickname });
  }, [form, initialMode, opened, requiresNicknameChange, user.nickname]);

  async function handleSubmit(values: { nickname: string }) {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await client.updateCurrentUser({ nickname: values.nickname });
      Toast.show({ content: "昵称已更新", icon: "success" });
      onUserUpdated(result.user);
      onClose();
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        onUnauthorized();
        return;
      }

      const message = readError(unknownError);
      setError(message);
      Toast.show({ content: message, icon: "fail" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Popup
      bodyStyle={{ borderRadius: "8px 8px 0 0", padding: 16 }}
      visible={opened}
      onMaskClick={() => {
        if (!requiresNicknameChange) {
          onClose();
        }
      }}
    >
      {visibleMode === "summary" ? (
        <div className="stack-md">
          <PageHeader eyebrow="Profile" title="个人中心" />
          <table className="info-table">
            <tbody>
              <tr>
                <th>用户名</th>
                <td style={{ overflowWrap: "anywhere" }}>{user.username}</td>
              </tr>
              <tr>
                <th>昵称</th>
                <td style={{ overflowWrap: "anywhere" }}>{user.nickname}</td>
              </tr>
            </tbody>
          </table>
          <Space block direction="vertical">
            <Button block color="primary" onClick={() => setMode("nickname")}>
              修改昵称
            </Button>
            <Button block color="danger" fill="outline" onClick={onLogout}>
              退出登录
            </Button>
          </Space>
        </div>
      ) : (
        <div className="stack-md">
          <PageHeader
            eyebrow="Nickname"
            title={requiresNicknameChange ? "请输入您的称呼或昵称" : "修改昵称"}
            description={
              requiresNicknameChange
                ? "保存后才能继续使用裁判端。"
                : "昵称会展示在裁判端主页和评分记录中。"
            }
          />
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="称呼/昵称"
              name="nickname"
              rules={[
                { required: true, message: "请输入您的称呼或昵称" },
                { max: 64, message: "称呼/昵称最多 64 个字符" },
                {
                  validator: (_, value: string | undefined) =>
                    value?.trim() === user.username
                      ? Promise.reject(new Error("称呼/昵称不能与用户名相同"))
                      : Promise.resolve(),
                },
              ]}
            >
              <Input autoFocus clearable placeholder="请输入您的称呼或昵称" />
            </Form.Item>
            <button ref={submitRef} className="sr-only" type="submit">
              保存昵称
            </button>
          </Form>
          {error ? <InlineError>{error}</InlineError> : null}
          <Space block direction="vertical">
            <Button
              block
              color="primary"
              loading={isSubmitting}
              onClick={() => submitRef.current?.click()}
            >
              保存昵称
            </Button>
            {requiresNicknameChange ? null : (
              <Button block disabled={isSubmitting} onClick={() => setMode("summary")}>
                返回个人中心
              </Button>
            )}
          </Space>
        </div>
      )}
    </Popup>
  );
}
