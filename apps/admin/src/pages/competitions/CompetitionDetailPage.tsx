import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  App as AntdApp,
  Button,
  Card,
  Drawer,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import type { EntityStatus, ImportBeerRow } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { useRequestFeedback } from "../../app/feedback.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import {
  entityStatusLabels,
  entityStatusOptions,
  type Beer,
  type Competition,
  type CompetitionRound,
  type RoundBeer,
} from "../../modules/competitions/competitions-api.js";
import { BeerForm, type BeerFormValues } from "../../modules/competitions/components/BeerForm.js";
import classes from "./CompetitionsPage.module.css";

function readCompetitionId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseExcelRows(file: File): Promise<ImportBeerRow[]> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    if (!firstSheet) return [];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(firstSheet, {
      header: 1,
      raw: false,
      blankrows: false,
    });
    return rows.slice(1).map((row, index) => ({
      rowNumber: index + 2,
      entryCode: String(row[0] ?? "")
        .trim()
        .toUpperCase(),
      bjcpSubcategoryCode: String(row[1] ?? "").trim() as ImportBeerRow["bjcpSubcategoryCode"],
      description: String(row[2] ?? "").trim(),
      name: String(row[3] ?? "").trim(),
      brewery: String(row[4] ?? "").trim(),
      categoryRemark: String(row[5] ?? "").trim(),
    }));
  });
}

export function CompetitionDetailPage({ onLogout }: { onLogout: () => void }) {
  const { modal } = AntdApp.useApp();
  const { showError, showRequestError, showSuccess } = useRequestFeedback(onLogout);
  const { competitionId: competitionIdParam } = useParams();
  const competitionId = readCompetitionId(competitionIdParam);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [beers, setBeers] = useState<Beer[]>([]);
  const [rounds, setRounds] = useState<CompetitionRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [roundBeers, setRoundBeers] = useState<RoundBeer[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [beerDrawer, setBeerDrawer] = useState<
    { mode: "create"; beer: null } | { mode: "edit"; beer: Beer } | null
  >(null);
  const [newRoundName, setNewRoundName] = useState("");
  const [roundBeerToAdd, setRoundBeerToAdd] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? null;

  const refreshDetail = useCallback(async () => {
    if (!competitionId) {
      showError("比赛 ID 无效");
      setStatus("ready");
      return;
    }
    const [competitionResult, beerResult, roundResult] = await Promise.all([
      client.getCompetition(competitionId),
      client.listBeers(competitionId),
      client.listRounds(competitionId),
    ]);
    setCompetition(competitionResult.competition);
    setBeers(beerResult.beers);
    setRounds(roundResult.rounds);
    const nextRoundId = selectedRoundId ?? roundResult.rounds[0]?.id ?? null;
    setSelectedRoundId(nextRoundId);
    if (nextRoundId) {
      setRoundBeers((await client.listRoundBeers(competitionId, nextRoundId)).beers);
    } else {
      setRoundBeers([]);
    }
    setStatus("ready");
  }, [competitionId, selectedRoundId, showError]);

  useEffect(() => {
    void refreshDetail().catch((unknownError) => {
      setStatus("ready");
      showRequestError(unknownError);
    });
  }, [refreshDetail, showRequestError]);

  async function runAction(action: () => Promise<void>) {
    setIsBusy(true);
    try {
      await action();
    } catch (unknownError) {
      showRequestError(unknownError);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCompetitionStatus(nextStatus: string) {
    if (!competitionId || !competition) return;
    const confirm = competition.status === "ended" && nextStatus === "ongoing";
    if (confirm) {
      const confirmed = await modal.confirm({
        content: "裁判将可以继续修改允许状态下的评分。",
        title: "确认重新打开比赛？",
      });
      if (!confirmed) return;
    }
    await runAction(async () => {
      const result = await client.updateCompetitionStatus(competitionId, {
        status: nextStatus as EntityStatus,
        ...(confirm ? { confirm: true } : {}),
      });
      setCompetition(result.competition);
      showSuccess(`比赛状态已更新为 ${entityStatusLabels[result.competition.status]}`);
    });
  }

  async function handleCreateBeer(values: BeerFormValues) {
    if (!competitionId) return;
    await runAction(async () => {
      const result = await client.createBeer(competitionId, values);
      setBeerDrawer(null);
      await refreshDetail();
      showSuccess(`已保存 #${result.beer.entryNumber} ${result.beer.entryCode}`);
    });
  }

  async function handleSaveBeer(values: BeerFormValues) {
    if (!competitionId || beerDrawer?.mode !== "edit") return;
    await runAction(async () => {
      await client.updateBeer(competitionId, beerDrawer.beer.id, {
        name: values.name,
        brewery: values.brewery,
        bjcpSubcategoryCode: values.bjcpSubcategoryCode,
        categoryRemark: values.categoryRemark,
        description: values.description,
      });
      setBeerDrawer(null);
      await refreshDetail();
      showSuccess("酒款已保存");
    });
  }

  async function handleImport(file: File | null) {
    if (!competitionId || !file) return;
    await runAction(async () => {
      const rows = await parseExcelRows(file);
      const result = await client.importBeers(competitionId, { beers: rows });
      await refreshDetail();
      showSuccess(`导入完成：新增 ${result.created}，更新 ${result.updated}`);
    });
  }

  async function handleCreateRound() {
    if (!competitionId || !newRoundName.trim()) return;
    await runAction(async () => {
      const result = await client.createRound(competitionId, { name: newRoundName.trim() });
      setNewRoundName("");
      await refreshDetail();
      setSelectedRoundId(result.round.id);
      showSuccess("轮次已创建");
    });
  }

  async function handleRoundStatus(nextStatus: string) {
    if (!competitionId || !selectedRound) return;
    const confirm = selectedRound.status === "ended" && nextStatus === "ongoing";
    if (confirm) {
      const confirmed = await modal.confirm({
        content: "裁判将可以继续修改本轮评分。",
        title: "确认重新打开轮次？",
      });
      if (!confirmed) return;
    }
    await runAction(async () => {
      await client.updateRoundStatus(competitionId, selectedRound.id, {
        status: nextStatus as EntityStatus,
        ...(confirm ? { confirm: true } : {}),
      });
      await refreshDetail();
      showSuccess("轮次状态已更新");
    });
  }

  async function handleAddRoundBeer() {
    if (!competitionId || !selectedRound || !roundBeerToAdd) return;
    await runAction(async () => {
      await client.addRoundBeer(competitionId, selectedRound.id, {
        beerId: Number(roundBeerToAdd),
      });
      setRoundBeerToAdd(null);
      setRoundBeers((await client.listRoundBeers(competitionId, selectedRound.id)).beers);
      showSuccess("酒款已加入轮次");
    });
  }

  async function handleRemoveRoundBeer(beer: RoundBeer) {
    if (!competitionId || !selectedRound) return;
    if (beer.scoreCount > 0) {
      const confirmed = await modal.confirm({
        content: `该酒款已有 ${beer.scoreCount} 条评价，确认移除并软删除这些评价？`,
        title: "确认移除酒款？",
      });
      if (!confirmed) return;
    }
    await runAction(async () => {
      await client.removeRoundBeer(competitionId, selectedRound.id, beer.beerId, {
        confirm: beer.scoreCount > 0,
      });
      setRoundBeers((await client.listRoundBeers(competitionId, selectedRound.id)).beers);
      showSuccess("已从轮次移除酒款");
    });
  }

  return (
    <div className="stack-lg">
      <Flex align="center" gap={16} justify="space-between" wrap>
        <Space>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/competitions">返回</Link>
          </Button>
          <PageHeader eyebrow="Competition" title={competition?.name ?? "比赛详情"} />
        </Space>
        <Space wrap>
          {competition ? (
            <Select
              options={entityStatusOptions}
              style={{ width: 140 }}
              value={competition.status}
              onChange={handleCompetitionStatus}
            />
          ) : null}
          <Button
            icon={<ReloadOutlined />}
            loading={status === "loading"}
            onClick={() => {
              setStatus("loading");
              void refreshDetail().catch((unknownError) => {
                setStatus("ready");
                showRequestError(unknownError);
              });
            }}
          >
            刷新
          </Button>
        </Space>
      </Flex>

      <Tabs
        defaultActiveKey="rounds"
        items={[
          {
            key: "rounds",
            label: "轮次",
            children: (
              <div className={classes.roundLayout!}>
                <Card>
                  <div className="stack-md">
                    <Typography.Text strong>轮次</Typography.Text>
                    <Space.Compact style={{ width: "100%" }}>
                      <Input
                        placeholder="轮次名"
                        value={newRoundName}
                        onChange={(event) => setNewRoundName(event.currentTarget.value)}
                      />
                      <Button icon={<PlusOutlined />} type="primary" onClick={handleCreateRound}>
                        新增
                      </Button>
                    </Space.Compact>
                    <div className="stack-xs">
                      {rounds.map((round) => (
                        <Button
                          block
                          key={round.id}
                          type={round.id === selectedRoundId ? "primary" : "default"}
                          onClick={() => {
                            setSelectedRoundId(round.id);
                            if (competitionId) {
                              void client
                                .listRoundBeers(competitionId, round.id)
                                .then((result) => setRoundBeers(result.beers))
                                .catch(showRequestError);
                            }
                          }}
                        >
                          {round.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card>
                  {selectedRound ? (
                    <div className="stack-md">
                      <Flex align="center" gap={16} justify="space-between" wrap>
                        <Space>
                          <Typography.Text strong>{selectedRound.name}</Typography.Text>
                          <Tag>{entityStatusLabels[selectedRound.status]}</Tag>
                        </Space>
                        <Select
                          options={entityStatusOptions}
                          style={{ width: 140 }}
                          value={selectedRound.status}
                          onChange={handleRoundStatus}
                        />
                      </Flex>
                      <Space.Compact block>
                        <Select
                          options={beers.map((beer) => ({
                            label: `#${beer.entryNumber} ${beer.entryCode} ${beer.bjcpSubcategoryCode}`,
                            value: String(beer.id),
                          }))}
                          placeholder="选择酒款"
                          showSearch
                          style={{ minWidth: 280, width: "100%" }}
                          value={roundBeerToAdd}
                          onChange={setRoundBeerToAdd}
                        />
                        <Button type="primary" onClick={handleAddRoundBeer}>
                          添加到轮次
                        </Button>
                      </Space.Compact>
                      <Table<RoundBeer>
                        columns={[
                          {
                            dataIndex: "entryNumber",
                            render: (value: number) => `#${value}`,
                            title: "序号",
                          },
                          { dataIndex: "entryCode", title: "参赛编号" },
                          { dataIndex: "bjcpSubcategoryCode", title: "BJCP" },
                          { dataIndex: "scoreCount", title: "评价数" },
                          {
                            render: (_, beer) => (
                              <Button
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                onClick={() => void handleRemoveRoundBeer(beer)}
                              >
                                移除
                              </Button>
                            ),
                            title: "操作",
                            width: 120,
                          },
                        ]}
                        dataSource={roundBeers}
                        pagination={false}
                        rowKey="beerId"
                      />
                    </div>
                  ) : (
                    <Typography.Text type="secondary">暂无轮次。</Typography.Text>
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: "beers",
            label: "酒款",
            children: (
              <div className="stack-lg">
                <Card>
                  <Flex align="center" gap={16} justify="space-between" wrap>
                    <div>
                      <Typography.Text strong>酒款列表</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">{beers.length} 款酒</Typography.Text>
                    </div>
                    <Space>
                      <input
                        accept=".xlsx,.xls"
                        hidden
                        ref={fileInputRef}
                        type="file"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0] ?? null;
                          event.currentTarget.value = "";
                          void handleImport(file);
                        }}
                      />
                      <Button
                        icon={<FileExcelOutlined />}
                        loading={isBusy}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Excel 导入
                      </Button>
                      <Button
                        icon={<PlusOutlined />}
                        type="primary"
                        onClick={() => setBeerDrawer({ mode: "create", beer: null })}
                      >
                        新增酒款
                      </Button>
                    </Space>
                  </Flex>
                </Card>

                <Card>
                  <Table<Beer>
                    columns={[
                      {
                        dataIndex: "entryNumber",
                        render: (value: number) => `#${value}`,
                        title: "序号",
                        width: 90,
                      },
                      { dataIndex: "entryCode", title: "参赛编号", width: 120 },
                      { dataIndex: "bjcpSubcategoryCode", title: "BJCP", width: 100 },
                      { dataIndex: "name", title: "参赛酒名", width: 180 },
                      { dataIndex: "brewery", title: "参赛酒厂", width: 180 },
                      { dataIndex: "description", ellipsis: true, title: "介绍", width: 260 },
                      {
                        fixed: "right",
                        render: (_, beer) => (
                          <Button
                            size="small"
                            onClick={() => setBeerDrawer({ mode: "edit", beer })}
                          >
                            编辑
                          </Button>
                        ),
                        title: "操作",
                        width: 100,
                      },
                    ]}
                    dataSource={beers}
                    loading={status === "loading"}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 1040 }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Drawer
        destroyOnClose
        open={beerDrawer !== null}
        title={beerDrawer?.mode === "edit" ? "编辑酒款" : "新增酒款"}
        width={640}
        onClose={() => setBeerDrawer(null)}
      >
        <BeerForm
          beer={beerDrawer?.mode === "edit" ? beerDrawer.beer : null}
          isSubmitting={isBusy}
          submitLabel={beerDrawer?.mode === "edit" ? "保存酒款" : "新增或更新酒款"}
          onSubmit={beerDrawer?.mode === "edit" ? handleSaveBeer : handleCreateBeer}
        />
      </Drawer>
    </div>
  );
}
