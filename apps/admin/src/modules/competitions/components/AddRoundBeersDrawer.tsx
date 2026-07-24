import { Button, Drawer, Space, Tooltip, Transfer, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { availableRoundBeers, matchesRoundBeerSearch } from "../beer-list.js";
import { type Beer, type RoundBeer } from "../competitions-api.js";
import classes from "./AddRoundBeersDrawer.module.css";

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

  const availableBeers = useMemo(() => availableRoundBeers(beers, roundBeers), [beers, roundBeers]);

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
      size="min(920px, calc(100vw - 24px))"
      styles={{ body: { overflow: "hidden" } }}
      title={`添加酒款到 ${roundName}`}
      onClose={onClose}
    >
      <div className={classes.content!}>
        <Typography.Text type="secondary">
          左侧仅展示尚未加入当前轮次的酒款，移动到右侧后提交本次导入。
        </Typography.Text>
        <Transfer<Beer>
          actions={["加入本次", "移回待选"]}
          className={classes.transfer!}
          classNames={{ section: classes.transferSection! }}
          dataSource={availableBeers}
          filterOption={(input, beer) => matchesRoundBeerSearch(beer, input)}
          locale={{
            itemUnit: "款",
            itemsUnit: "款",
            notFoundContent: "没有符合条件的酒款",
            searchPlaceholder: "搜索序号、编号、BJCP、酒名或酒厂",
          }}
          render={(beer) => (
            <Tooltip
              title={
                <div>
                  <div>酒款：{beer.name}</div>
                  <div>酒厂：{beer.brewery}</div>
                </div>
              }
            >
              <span className={classes.transferItem!}>
                #{beer.entryNumber} {beer.entryCode} · {beer.bjcpSubcategoryCode}
              </span>
            </Tooltip>
          )}
          rowKey={(beer) => beer.id}
          showSearch
          styles={{
            section: {
              flex: "1 1 0",
              height: "100%",
              width: 0,
            },
          }}
          targetKeys={selectedBeerIds}
          titles={["待导入酒款", "本次导入酒款"]}
          onChange={(targetKeys) => setSelectedBeerIds(targetKeys.map(Number))}
        />
      </div>
    </Drawer>
  );
}
