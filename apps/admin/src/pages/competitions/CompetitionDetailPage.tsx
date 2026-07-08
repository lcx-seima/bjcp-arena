import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileExcelOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  App as AntdApp,
  Button,
  Card,
  Drawer,
  Empty,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import type { EntityStatus, ImportBeerRow } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { useRequestFeedback } from "../../app/feedback.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import {
  entityStatusLabels,
  type Beer,
  type Competition,
  type CompetitionRound,
  type RoundBeer,
} from "../../modules/competitions/competitions-api.js";
import { AddRoundBeersDrawer } from "../../modules/competitions/components/AddRoundBeersDrawer.js";
import { BeerForm, type BeerFormValues } from "../../modules/competitions/components/BeerForm.js";
import classes from "./CompetitionsPage.module.css";

function readCompetitionId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function entityStatusTagColor(status: EntityStatus) {
  return status === "ongoing" ? "green" : "red";
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
  const selectedRoundIdRef = useRef<number | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [beers, setBeers] = useState<Beer[]>([]);
  const [rounds, setRounds] = useState<CompetitionRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [roundBeers, setRoundBeers] = useState<RoundBeer[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [beerDrawer, setBeerDrawer] = useState<
    { mode: "create"; beer: null } | { mode: "edit"; beer: Beer } | null
  >(null);
  const [isAddRoundBeersDrawerOpen, setIsAddRoundBeersDrawerOpen] = useState(false);
  const [isCreateRoundModalOpen, setIsCreateRoundModalOpen] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<number | null>(null);
  const [newRoundName, setNewRoundName] = useState("");
  const [roundNameDraft, setRoundNameDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? null;
  const canChangeRoundStatus = competition?.status === "ongoing";
  const isSelectedRoundWritable =
    canChangeRoundStatus && selectedRound?.status === "ongoing";

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
    const currentSelectedRoundId = selectedRoundIdRef.current;
    const nextRoundId = roundResult.rounds.some((round) => round.id === currentSelectedRoundId)
      ? currentSelectedRoundId
      : (roundResult.rounds[0]?.id ?? null);
    selectedRoundIdRef.current = nextRoundId;
    setSelectedRoundId(nextRoundId);
    if (nextRoundId) {
      setRoundBeers((await client.listRoundBeers(competitionId, nextRoundId)).beers);
    } else {
      setRoundBeers([]);
    }
    setStatus("ready");
  }, [competitionId, showError]);

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

  async function refreshRoundContext(roundId: number) {
    if (!competitionId) return;
    const [roundResult, roundBeerResult] = await Promise.all([
      client.listRounds(competitionId),
      client.listRoundBeers(competitionId, roundId),
    ]);
    setRounds(roundResult.rounds);
    setRoundBeers(roundBeerResult.beers);
  }

  function handleRoundSelect(value: string | number) {
    const roundId = Number(value);
    if (!Number.isInteger(roundId) || roundId === selectedRoundId) {
      return;
    }
    selectedRoundIdRef.current = roundId;
    setSelectedRoundId(roundId);
    setEditingRoundId(null);
    setRoundNameDraft("");
    if (competitionId) {
      void client
        .listRoundBeers(competitionId, roundId)
        .then((result) => setRoundBeers(result.beers))
        .catch(showRequestError);
    }
  }

  async function handleCompetitionStatus(nextStatus: EntityStatus) {
    if (!competitionId || !competition) return;
    await runAction(async () => {
      const result = await client.updateCompetitionStatus(competitionId, {
        status: nextStatus,
        ...(nextStatus === "ongoing" ? { confirm: true } : {}),
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
      setIsCreateRoundModalOpen(false);
      setRounds((current) => [...current, result.round]);
      selectedRoundIdRef.current = result.round.id;
      setSelectedRoundId(result.round.id);
      setRoundBeers([]);
      showSuccess("轮次已创建");
    });
  }

  function handleCloseCreateRoundModal() {
    setIsCreateRoundModalOpen(false);
    setNewRoundName("");
  }

  function handleEditRoundName() {
    if (!selectedRound) return;
    setEditingRoundId(selectedRound.id);
    setRoundNameDraft(selectedRound.name);
  }

  function handleCancelRoundNameEdit() {
    setEditingRoundId(null);
    setRoundNameDraft("");
  }

  async function handleSaveRoundName() {
    if (!competitionId || !selectedRound) return;
    const nextName = roundNameDraft.trim();
    if (!nextName || nextName === selectedRound.name) {
      handleCancelRoundNameEdit();
      return;
    }

    await runAction(async () => {
      const result = await client.updateRound(competitionId, selectedRound.id, { name: nextName });
      setRounds((current) =>
        current.map((round) => (round.id === result.round.id ? result.round : round))
      );
      handleCancelRoundNameEdit();
      showSuccess("轮次名称已更新");
    });
  }

  async function handleRoundStatus(nextStatus: EntityStatus) {
    if (!competitionId || !selectedRound) return;
    await runAction(async () => {
      const result = await client.updateRoundStatus(competitionId, selectedRound.id, {
        status: nextStatus,
        ...(nextStatus === "ongoing" ? { confirm: true } : {}),
      });
      setRounds((current) =>
        current.map((round) => (round.id === result.round.id ? result.round : round))
      );
      handleCancelRoundNameEdit();
      showSuccess("轮次状态已更新");
    });
  }

  async function handleAddRoundBeers(beerIds: number[]) {
    if (!competitionId || !selectedRound || beerIds.length === 0) return;
    await runAction(async () => {
      for (const beerId of beerIds) {
        await client.addRoundBeer(competitionId, selectedRound.id, { beerId });
      }
      setIsAddRoundBeersDrawerOpen(false);
      await refreshRoundContext(selectedRound.id);
      showSuccess(`已添加 ${beerIds.length} 款酒到轮次`);
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
      await refreshRoundContext(selectedRound.id);
      showSuccess("已从轮次移除酒款");
    });
  }

  return (
    <div className="stack-lg">
      <Flex align="center" gap={16} justify="space-between" wrap>
        <PageHeader
          title={competition?.name ?? "比赛详情"}
          titleExtra={
            competition ? (
              <Tag color={entityStatusTagColor(competition.status)}>
                {entityStatusLabels[competition.status]}
              </Tag>
            ) : undefined
          }
        />
        <Space wrap>
          {competition ? (
            <Popconfirm
              cancelText="取消"
              description={
                competition.status === "ongoing"
                  ? "结束后将不能继续修改比赛、轮次和酒款配置。"
                  : "重新打开后管理员和裁判可继续修改允许状态下的数据。"
              }
              okText="确认"
              title={competition.status === "ongoing" ? "确认结束比赛？" : "确认重新打开比赛？"}
              onConfirm={() =>
                void handleCompetitionStatus(
                  competition.status === "ongoing" ? "ended" : "ongoing"
                )
              }
            >
              <Button danger={competition.status === "ongoing"} loading={isBusy}>
                {competition.status === "ongoing" ? "结束比赛" : "重新打开比赛"}
              </Button>
            </Popconfirm>
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
              <div className={classes.roundSection!}>
                <Card>
                  <div className={classes.roundToolbar!}>
                    <div className={classes.roundSwitcher!}>
                      {rounds.length > 0 && selectedRoundId !== null ? (
                        <Segmented
                          options={rounds.map((round) => ({
                            label: `${round.name} · ${round.beerCount} 款`,
                            value: round.id,
                          }))}
                          value={selectedRoundId}
                          onChange={handleRoundSelect}
                        />
                      ) : (
                        <Typography.Text type="secondary">暂无轮次</Typography.Text>
                      )}
                    </div>
                    <Button
                      className={classes.roundCreate!}
                      icon={<PlusOutlined />}
                      loading={isBusy}
                      type="primary"
                      onClick={() => setIsCreateRoundModalOpen(true)}
                    >
                      新增轮次
                    </Button>
                  </div>
                </Card>

                {selectedRound ? (
                  <Card>
                    <div className="stack-md">
                      <div className={classes.roundPanelHeader!}>
                        <div className={classes.roundTitleGroup!}>
                          {editingRoundId === selectedRound.id ? (
                            <Space.Compact className={classes.roundNameEditor!}>
                              <Input
                                value={roundNameDraft}
                                onChange={(event) => setRoundNameDraft(event.currentTarget.value)}
                                onPressEnter={() => void handleSaveRoundName()}
                              />
                              <Button
                                icon={<CheckOutlined />}
                                loading={isBusy}
                                type="primary"
                                onClick={() => void handleSaveRoundName()}
                              />
                              <Button
                                disabled={isBusy}
                                icon={<CloseOutlined />}
                                onClick={handleCancelRoundNameEdit}
                              />
                            </Space.Compact>
                          ) : (
                            <Space size="small" wrap>
                              <Typography.Text strong>{selectedRound.name}</Typography.Text>
                              <Tag>{entityStatusLabels[selectedRound.status]}</Tag>
                              <Typography.Text type="secondary">
                                {selectedRound.beerCount} 款酒 · {selectedRound.scoreCount} 条评价
                              </Typography.Text>
                            </Space>
                          )}
                        </div>

                        <Space className={classes.roundActions!} wrap>
                          <Button
                            disabled={!isSelectedRoundWritable || editingRoundId !== null}
                            icon={<EditOutlined />}
                            onClick={handleEditRoundName}
                          >
                            修改名称
                          </Button>
                          <Popconfirm
                            cancelText="取消"
                            description={
                              selectedRound.status === "ongoing"
                                ? "结束后将不能继续修改本轮酒款。"
                                : "重新打开后裁判将可以继续修改本轮评分。"
                            }
                            okText="确认"
                            title={
                              selectedRound.status === "ongoing"
                                ? "确认结束轮次？"
                                : "确认重新打开轮次？"
                            }
                            onConfirm={() =>
                              void handleRoundStatus(
                                selectedRound.status === "ongoing" ? "ended" : "ongoing"
                              )
                            }
                          >
                            <Button
                              danger={selectedRound.status === "ongoing"}
                              disabled={!canChangeRoundStatus}
                              loading={isBusy}
                            >
                              {selectedRound.status === "ongoing" ? "结束轮次" : "重新打开轮次"}
                            </Button>
                          </Popconfirm>
                          <Button
                            disabled={!isSelectedRoundWritable}
                            icon={<PlusOutlined />}
                            type="primary"
                            onClick={() => setIsAddRoundBeersDrawerOpen(true)}
                          >
                            添加酒款
                          </Button>
                        </Space>
                      </div>

                      <Table<RoundBeer>
                        columns={[
                          {
                            dataIndex: "entryNumber",
                            render: (value: number) => `#${value}`,
                            title: "序号",
                            width: 90,
                          },
                          { dataIndex: "entryCode", title: "参赛编号", width: 140 },
                          { dataIndex: "bjcpSubcategoryCode", title: "BJCP", width: 120 },
                          { dataIndex: "scoreCount", title: "评价数", width: 110 },
                          {
                            fixed: "right",
                            render: (_, beer) => (
                              <Button
                                danger
                                disabled={!isSelectedRoundWritable}
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
                        loading={status === "loading"}
                        pagination={false}
                        rowKey="beerId"
                        scroll={{ x: 580 }}
                      />
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <Empty
                      description="暂无轮次，请先在上方创建轮次。"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </Card>
                )}
                <AddRoundBeersDrawer
                  beers={beers}
                  isSubmitting={isBusy}
                  opened={isAddRoundBeersDrawerOpen}
                  roundBeers={roundBeers}
                  roundName={selectedRound?.name ?? "当前轮次"}
                  onClose={() => setIsAddRoundBeersDrawerOpen(false)}
                  onSubmit={handleAddRoundBeers}
                />
                <Modal
                  destroyOnHidden
                  okButtonProps={{ disabled: !newRoundName.trim(), loading: isBusy }}
                  okText="创建"
                  open={isCreateRoundModalOpen}
                  title="新增轮次"
                  onCancel={handleCloseCreateRoundModal}
                  onOk={() => void handleCreateRound()}
                >
                  <Input
                    autoFocus
                    placeholder="轮次名"
                    value={newRoundName}
                    onChange={(event) => setNewRoundName(event.currentTarget.value)}
                    onPressEnter={() => void handleCreateRound()}
                  />
                </Modal>
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
