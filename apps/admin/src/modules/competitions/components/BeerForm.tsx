import { SaveOutlined } from "@ant-design/icons";
import { Button, Form, Input, Select } from "antd";
import { useEffect } from "react";
import type { CreateBeerInput } from "@bjcp-arena/contracts";
import type { Beer } from "../competitions-api.js";
import { bjcpStyleOptions } from "../competitions-api.js";

export type BeerFormValues = CreateBeerInput;

function readSubcategoryCode(beer?: Beer | null): BeerFormValues["bjcpSubcategoryCode"] {
  return (beer?.bjcpSubcategoryCode ?? "21A") as BeerFormValues["bjcpSubcategoryCode"];
}

export function BeerForm({
  beer,
  isSubmitting,
  submitLabel,
  onSubmit,
}: {
  beer?: Beer | null;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (values: BeerFormValues) => void;
}) {
  const [form] = Form.useForm<BeerFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      entryCode: beer?.entryCode ?? "",
      name: beer?.name ?? "",
      brewery: beer?.brewery ?? "",
      bjcpSubcategoryCode: readSubcategoryCode(beer),
      description: beer?.description ?? "",
    });
  }, [beer, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(values) =>
        onSubmit({ ...values, entryCode: values.entryCode.trim().toUpperCase() })
      }
    >
      <div className="form-grid-3">
        <Form.Item
          label="参赛编号"
          name="entryCode"
          rules={[
            { max: 6, required: true, message: "请填写参赛编号" },
            { pattern: /^[A-Za-z0-9]+$/, message: "参赛编号只能包含字母和数字" },
          ]}
        >
          <Input
            disabled={Boolean(beer)}
            onChange={(event) => form.setFieldValue("entryCode", event.target.value.toUpperCase())}
          />
        </Form.Item>
        <Form.Item
          label="参赛酒名"
          name="name"
          rules={[{ max: 160, required: true, message: "请填写参赛酒名" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="参赛酒厂"
          name="brewery"
          rules={[{ max: 160, required: true, message: "请填写参赛酒厂" }]}
        >
          <Input />
        </Form.Item>
      </div>
      <Form.Item
        label="BJCP 类型"
        name="bjcpSubcategoryCode"
        rules={[{ required: true, message: "请选择 BJCP 类型" }]}
      >
        <Select options={bjcpStyleOptions} showSearch />
      </Form.Item>
      <Form.Item
        label="裁判可见介绍"
        name="description"
        rules={[{ max: 5000, required: true, message: "请填写裁判可见介绍" }]}
      >
        <Input.TextArea autoSize={{ minRows: 4 }} />
      </Form.Item>
      <Form.Item>
        <Button htmlType="submit" icon={<SaveOutlined />} loading={isSubmitting} type="primary">
          {submitLabel}
        </Button>
      </Form.Item>
    </Form>
  );
}
