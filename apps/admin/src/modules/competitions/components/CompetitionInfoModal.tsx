import { Modal, Stack } from "@mantine/core";
import { Save, Trophy } from "lucide-react";
import { InlineMessage } from "../../../components/ui/InlineMessage.js";
import type { Competition } from "../competitions-api.js";
import { CompetitionForm, type CompetitionFormValues } from "./CompetitionForm.js";

export function CompetitionInfoModal({
  competition,
  error,
  isSubmitting,
  mode,
  opened,
  onClose,
  onSubmit,
}: {
  competition: Competition | null;
  error: string | null;
  isSubmitting: boolean;
  mode: "create" | "edit";
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CompetitionFormValues) => void;
}) {
  return (
    <Modal
      centered
      opened={opened}
      title={mode === "create" ? "新建比赛" : `编辑比赛 ${competition?.name ?? ""}`}
      onClose={onClose}
    >
      <Stack gap="md">
        <CompetitionForm
          competition={competition}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          submitLabel={mode === "create" ? "创建比赛" : "保存"}
          submitLeftSection={mode === "create" ? <Trophy size={16} /> : <Save size={16} />}
          onSubmit={onSubmit}
        />
        {error ? <InlineMessage type="error">{error}</InlineMessage> : null}
      </Stack>
    </Modal>
  );
}
