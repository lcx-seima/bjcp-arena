import { Button, Descriptions, Divider, Drawer, Select, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  createEmptyBeerImportMapping,
  isBeerImportMappingComplete,
  type BeerImportMapping,
  type ParsedBeerImportFile,
} from "../beer-import.js";

type SingleMappingKey = Exclude<keyof BeerImportMapping, "descriptionColumns">;

const singleFields: Array<{ key: SingleMappingKey; label: string; hint?: string }> = [
  { key: "entryCodeColumn", label: "参赛ID", hint: "格式：2 个字母 + 4 个数字" },
  { key: "nameColumn", label: "参赛酒名" },
  { key: "breweryColumn", label: "参赛酒厂" },
  { key: "bjcpSubcategoryCodeColumn", label: "BJCP类型", hint: "填写合法子分类编号" },
  { key: "categoryRemarkColumn", label: "分类备注" },
];

export function ImportBeersDrawer({
  file,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  file: ParsedBeerImportFile | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (mapping: BeerImportMapping) => void | Promise<void>;
}) {
  const [mapping, setMapping] = useState<BeerImportMapping>(createEmptyBeerImportMapping);

  useEffect(() => {
    setMapping(createEmptyBeerImportMapping());
  }, [file]);

  const options = useMemo(
    () =>
      (file?.columns ?? []).map((column) => ({
        label: column.label,
        value: column.index,
      })),
    [file]
  );

  function selectedByOtherField(field: keyof BeerImportMapping) {
    const selected = new Set<number>();
    for (const item of singleFields) {
      if (item.key !== field) {
        const value = mapping[item.key];
        if (value !== null) selected.add(value);
      }
    }
    if (field !== "descriptionColumns") {
      for (const value of mapping.descriptionColumns) selected.add(value);
    }
    return selected;
  }

  function optionsFor(field: keyof BeerImportMapping) {
    const unavailable = selectedByOtherField(field);
    return options.filter((option) => !unavailable.has(option.value));
  }

  return (
    <Drawer
      destroyOnHidden
      footer={
        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
          <Button disabled={isSubmitting} onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={!isBeerImportMappingComplete(mapping)}
            loading={isSubmitting}
            type="primary"
            onClick={() => void onSubmit(mapping)}
          >
            开始导入
          </Button>
        </Space>
      }
      open={Boolean(file)}
      size={640}
      title="Excel 酒款导入"
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
    >
      {file ? (
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Descriptions
            bordered
            column={1}
            items={[
              { key: "file", label: "文件名", children: file.fileName },
              { key: "sheet", label: "工作表", children: file.sheetName },
              { key: "rows", label: "数据条数", children: `${file.rows.length} 条` },
              { key: "columns", label: "有效列数", children: `${file.columns.length} 列` },
            ]}
            size="small"
          />

          <div>
            <Typography.Title level={5} style={{ marginBottom: 4 }}>
              字段映射
            </Typography.Title>
            <Typography.Text type="secondary">
              所有字段都必须选择来源列，同一 Excel 列不能重复使用。
            </Typography.Text>
          </div>

          {singleFields.map((field) => (
            <div key={field.key}>
              <Typography.Text strong>{field.label}</Typography.Text>
              {field.hint ? (
                <Typography.Text type="secondary">（{field.hint}）</Typography.Text>
              ) : null}
              <Select
                allowClear
                optionFilterProp="label"
                options={optionsFor(field.key)}
                placeholder={`选择${field.label}来源列`}
                showSearch
                style={{ marginTop: 6, width: "100%" }}
                value={mapping[field.key]}
                onChange={(value: number | undefined) =>
                  setMapping((current) => ({ ...current, [field.key]: value ?? null }))
                }
              />
            </div>
          ))}

          <Divider style={{ margin: "4px 0" }} />

          <div>
            <Typography.Text strong>裁判可见介绍</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              可选择多列，选择顺序即 Markdown 段落顺序；空单元格显示为“-”。
            </Typography.Text>
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={optionsFor("descriptionColumns")}
              placeholder="按顺序选择一个或多个介绍来源列"
              showSearch
              style={{ marginTop: 6, width: "100%" }}
              value={mapping.descriptionColumns}
              onChange={(descriptionColumns) =>
                setMapping((current) => ({ ...current, descriptionColumns }))
              }
            />
          </div>
        </Space>
      ) : null}
    </Drawer>
  );
}
