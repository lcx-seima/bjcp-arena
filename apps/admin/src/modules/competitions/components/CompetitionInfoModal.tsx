import { SaveOutlined, TrophyOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import type { Competition } from "../competitions-api.js";
import { CompetitionForm, type CompetitionFormValues } from "./CompetitionForm.js";

export function CompetitionInfoModal({
  competition,
  isSubmitting,
  mode,
  opened,
  onClose,
  onSubmit,
}: {
  competition: Competition | null;
  isSubmitting: boolean;
  mode: "create" | "edit";
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CompetitionFormValues) => void;
}) {
  return (
    <Modal
      centered
      footer={null}
      open={opened}
      title={mode === "create" ? "新建比赛" : `编辑比赛 ${competition?.name ?? ""}`}
      onCancel={onClose}
    >
      <div className="stack-md">
        <CompetitionForm
          competition={competition}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          submitLabel={mode === "create" ? "创建比赛" : "保存"}
          submitLeftSection={mode === "create" ? <TrophyOutlined /> : <SaveOutlined />}
          onSubmit={onSubmit}
        />
      </div>
    </Modal>
  );
}
