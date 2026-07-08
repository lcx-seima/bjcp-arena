import { Button, Drawer, Select, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { type Beer, type RoundBeer } from "../competitions-api.js";

export function AddRoundBeersDrawer({
  beers,
  isSubmitting,
  opened,
  roundBeers,
  roundName,
  onClose,
  onSubmit,
}: {
  beers: Beer[];
  isSubmitting: boolean;
  opened: boolean;
  roundBeers: RoundBeer[];
  roundName: string;
  onClose: () => void;
  onSubmit: (beerIds: number[]) => void | Promise<void>;
}) {
  const [selectedBeerIds, setSelectedBeerIds] = useState<number[]>([]);

  useEffect(() => {
    if (!opened) {
      setSelectedBeerIds([]);
    }
  }, [opened]);

  const existingBeerIds = useMemo(
    () => new Set(roundBeers.map((beer) => beer.beerId)),
    [roundBeers]
  );

  const availableBeers = useMemo(
    () => beers.filter((beer) => !existingBeerIds.has(beer.id)),
    [beers, existingBeerIds]
  );

  return (
    <Drawer
      destroyOnHidden
      footer={
        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
          <Button disabled={isSubmitting} onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={selectedBeerIds.length === 0}
            loading={isSubmitting}
            type="primary"
            onClick={() => void onSubmit(selectedBeerIds)}
          >
            添加酒款
          </Button>
        </Space>
      }
      open={opened}
      title={`添加酒款到 ${roundName}`}
      width={560}
      onClose={onClose}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          可一次选择多个尚未加入当前轮次的酒款。
        </Typography.Text>
        <Select
          allowClear
          mode="multiple"
          notFoundContent="没有可添加的酒款"
          optionFilterProp="label"
          options={availableBeers.map((beer) => ({
            label: `#${beer.entryNumber} ${beer.entryCode} ${beer.bjcpSubcategoryCode} ${beer.name}`,
            value: beer.id,
          }))}
          placeholder="选择酒款"
          showSearch
          style={{ width: "100%" }}
          value={selectedBeerIds}
          onChange={setSelectedBeerIds}
        />
      </Space>
    </Drawer>
  );
}
