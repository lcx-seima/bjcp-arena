import { SaveOutlined } from "@ant-design/icons";
import { Button, Form, Input, Space } from "antd";
import { type ReactNode, useEffect } from "react";
import type { Competition } from "../competitions-api.js";

export interface CompetitionFormValues {
  name: string;
}

export function CompetitionForm({
  competition,
  isSubmitting,
  onCancel,
  submitLabel,
  submitLeftSection,
  onSubmit,
}: {
  competition?: Competition | null;
  isSubmitting: boolean;
  onCancel?: () => void;
  submitLabel: string;
  submitLeftSection?: ReactNode;
  onSubmit: (values: CompetitionFormValues) => void;
}) {
  const [form] = Form.useForm<CompetitionFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      name: competition?.name ?? "",
    });
  }, [competition?.name, form]);

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item
        label="比赛名称"
        name="name"
        rules={[{ max: 120, required: true, message: "请填写比赛名称" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item>
        <Space>
          {onCancel ? <Button onClick={onCancel}>取消</Button> : null}
          <Button
            htmlType="submit"
            icon={submitLeftSection ?? <SaveOutlined />}
            loading={isSubmitting}
            type="primary"
          >
            {submitLabel}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
