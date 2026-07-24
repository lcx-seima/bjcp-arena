import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileExcelOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { judgeTypeLabels, type CompetitionStatus, type EntityStatus } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { useRequestFeedback } from "../../app/feedback.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import {
  competitionStatusLabels,
  bjcpStyleOptions,
  roundStatusLabels,
  type Beer,
  type Competition,
  type CompetitionRound,
  type RoundBeer,
} from "../../modules/competitions/competitions-api.js";
import {
  beerDescriptionToPlainText,
  filterBeerList,
  isRoundBeerSortField,
  sortRoundBeers,
  type BeerListFilters,
  type RoundBeerSort,
} from "../../modules/competitions/beer-list.js";
import { AddRoundBeersDrawer } from "../../modules/competitions/components/AddRoundBeersDrawer.js";
import { BeerForm, type BeerFormValues } from "../../modules/competitions/components/BeerForm.js";
import { ImportBeersDrawer } from "../../modules/competitions/components/ImportBeersDrawer.js";
import {
  buildImportBeerRows,
  parseBeerImportFile,
  type BeerImportMapping,
  type ParsedBeerImportFile,
} from "../../modules/competitions/beer-import.js";
import classes from "./CompetitionsPage.module.css";

function readCompetitionId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function competitionStatusTagColor(status: CompetitionStatus) {
  if (status === "ongoing") return "green";
  if (status === "ended") return "red";
  return "default";
}

export function CompetitionDetailPage({ onLogout }: { onLogout: () => void }) {
  const { modal } = AntdApp.useApp();
  const [beerFilterForm] = Form.useForm<BeerListFilters>();
  const [roundBeerFilterForm] = Form.useForm<BeerListFilters>();
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
  const [isParsingBeerImport, setIsParsingBeerImport] = useState(false);
  const [parsedBeerImport, setParsedBeerImport] = useState<ParsedBeerImportFile | null>(null);
  const [beerFilters, setBeerFilters] = useState<BeerListFilters>({});
  const [roundBeerFilters, setRoundBeerFilters] = useState<BeerListFilters>({});
  const [roundBeerSort, setRoundBeerSort] = useState<RoundBeerSort | null>(null);
  const [isMasked, setIsMasked] = useState(true);

  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? null;
  const isCompetitionWritable = competition?.status === "ongoing";
  const canChangeRoundStatus = isCompetitionWritable;
  const isSelectedRoundWritable = canChangeRoundStatus && selectedRound?.status === "ongoing";
  const filteredBeers = useMemo(() => filterBeerList(beers, beerFilters), [beerFilters, beers]);
  const filteredRoundBeers = useMemo(
    () => filterBeerList(roundBeers, roundBeerFilters),
    [roundBeerFilters, roundBeers]
  );
  const sortedRoundBeers = useMemo(
    () => sortRoundBeers(filteredRoundBeers, roundBeerSort),
    [filteredRoundBeers, roundBeerSort]
  );

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

  async function handleCompetitionStatus(nextStatus: CompetitionStatus) {
    if (!competitionId || !competition) return;
    await runAction(async () => {
      const result = await client.updateCompetitionStatus(competitionId, {
        status: nextStatus,
        ...(nextStatus === "ongoing" || nextStatus === "archived" ? { confirm: true } : {}),
      });
      setCompetition(result.competition);
      showSuccess(`比赛状态已更新为 ${competitionStatusLabels[result.competition.status]}`);
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

  async function handleReadImportFile(file: File | null) {
    if (!file) return;
    setIsParsingBeerImport(true);
    try {
      setParsedBeerImport(await parseBeerImportFile(file));
    } catch (unknownError) {
      showError(unknownError instanceof Error ? unknownError.message : "Excel 文件解析失败");
    } finally {
      setIsParsingBeerImport(false);
    }
  }

  async function handleImport(mapping: BeerImportMapping) {
    if (!competitionId || !parsedBeerImport) return;
    let rows;
    try {
      rows = buildImportBeerRows(parsedBeerImport, mapping);
    } catch (unknownError) {
      showError(unknownError instanceof Error ? unknownError.message : "Excel 数据校验失败");
      return;
    }
    await runAction(async () => {
      const result = await client.importBeers(competitionId, { beers: rows });
      await refreshDetail();
      setParsedBeerImport(null);
      showSuccess(`导入完成：新增 ${result.created}，更新 ${result.updated}`);
    });
  }

  function handleBeerFilterSubmit(values: BeerListFilters) {
    const keyword = values.keyword?.trim();
    setBeerFilters({
      ...(keyword ? { keyword } : {}),
      ...(values.bjcpSubcategoryCode ? { bjcpSubcategoryCode: values.bjcpSubcategoryCode } : {}),
    });
  }

  function handleBeerFilterReset() {
    beerFilterForm.resetFields();
    setBeerFilters({});
  }

  function handleRoundBeerFilterSubmit(values: BeerListFilters) {
    const keyword = values.keyword?.trim();
    setRoundBeerFilters({
      ...(keyword ? { keyword } : {}),
      ...(values.bjcpSubcategoryCode ? { bjcpSubcategoryCode: values.bjcpSubcategoryCode } : {}),
    });
  }

  function handleRoundBeerFilterReset() {
    roundBeerFilterForm.resetFields();
    setRoundBeerFilters({});
  }

  const handleRoundBeerTableChange: TableProps<RoundBeer>["onChange"] = (
    _pagination,
    _filters,
    sorter
  ) => {
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (!activeSorter?.order || !isRoundBeerSortField(activeSorter.field)) {
      setRoundBeerSort(null);
      return;
    }
    setRoundBeerSort({
      field: activeSorter.field,
      direction: activeSorter.order === "ascend" ? "asc" : "desc",
    });
  };

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
    const confirmed = await modal.confirm({
      content:
        beer.scoreCount > 0
          ? `该酒款已有 ${beer.scoreCount} 条评价，移除后将软删除这些评价。`
          : "该操作只会将酒款从当前轮次移除，不会删除酒款本身。",
      okButtonProps: { danger: true },
      okText: "确认移除",
      title: "确认从轮次移除酒款？",
    });
    if (!confirmed) return;

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
              <Tag color={competitionStatusTagColor(competition.status)}>
                {competitionStatusLabels[competition.status]}
              </Tag>
            ) : undefined
          }
        />
        <Space wrap>
          <Space size="small">
            <Typography.Text>脱敏</Typography.Text>
            <Switch
              aria-label="切换酒名和酒厂脱敏显示"
              checked={isMasked}
              checkedChildren="开"
              unCheckedChildren="关"
              onChange={setIsMasked}
            />
          </Space>
          {competition?.status === "ongoing" ? (
            <Popconfirm
              cancelText="取消"
              description="关闭后将不能继续修改比赛、轮次和酒款配置。"
              okText="确认"
              title="确认关闭比赛？"
              onConfirm={() => void handleCompetitionStatus("ended")}
            >
              <Button danger loading={isBusy}>
                关闭比赛
              </Button>
            </Popconfirm>
          ) : null}
          {competition?.status === "ended" ? (
            <>
              <Popconfirm
                cancelText="取消"
                description="恢复后管理员和裁判可继续修改允许状态下的数据。"
                okText="确认"
                title="确认恢复比赛进行中？"
                onConfirm={() => void handleCompetitionStatus("ongoing")}
              >
                <Button loading={isBusy}>恢复进行中</Button>
              </Popconfirm>
              <Popconfirm
                cancelText="取消"
                description="归档后裁判将无法查询本场比赛，管理端仅可查看和恢复。"
                okText="确认归档"
                title="确认归档比赛？"
                onConfirm={() => void handleCompetitionStatus("archived")}
              >
                <Button danger loading={isBusy}>
                  归档比赛
                </Button>
              </Popconfirm>
            </>
          ) : null}
          {competition?.status === "archived" ? (
            <Popconfirm
              cancelText="取消"
              description="恢复后比赛回到已关闭状态，裁判可以查看但仍不能提交评分。"
              okText="确认恢复"
              title="恢复为已关闭？"
              onConfirm={() => void handleCompetitionStatus("ended")}
            >
              <Button loading={isBusy}>恢复为已关闭</Button>
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

      {competition?.status === "archived" ? (
        <Alert
          showIcon
          description="当前比赛仅可查看。恢复为已关闭后仍不可编辑，如需修改数据，需再恢复为进行中。"
          message="比赛已归档"
          type="info"
        />
      ) : null}

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
                      disabled={!isCompetitionWritable}
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
                              <Tag>{roundStatusLabels[selectedRound.status]}</Tag>
                              <Typography.Text type="secondary">
                                筛选结果 {filteredRoundBeers.length} 款，共 {roundBeers.length} 款 ·{" "}
                                {selectedRound.scoreCount} 条评价
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

                      <Form<BeerListFilters>
                        className={`${classes.beerFilterForm!} ${classes.roundBeerFilterForm!}`}
                        form={roundBeerFilterForm}
                        layout="inline"
                        onFinish={handleRoundBeerFilterSubmit}
                      >
                        <Form.Item label="关键词" name="keyword">
                          <Input
                            allowClear
                            className={classes.beerFilterKeyword!}
                            placeholder="参赛编号、酒名或酒厂"
                            size="small"
                          />
                        </Form.Item>
                        <Form.Item label="BJCP" name="bjcpSubcategoryCode">
                          <Select
                            allowClear
                            className={classes.beerFilterSelect!}
                            options={bjcpStyleOptions}
                            placeholder="全部 BJCP 类型"
                            showSearch
                            size="small"
                          />
                        </Form.Item>
                        <Flex className={classes.beerFilterActions!} gap={8}>
                          <Button size="small" onClick={handleRoundBeerFilterReset}>
                            重置
                          </Button>
                          <Button
                            htmlType="submit"
                            icon={<SearchOutlined />}
                            size="small"
                            type="primary"
                          >
                            查询
                          </Button>
                        </Flex>
                      </Form>

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
                          {
                            dataIndex: "name",
                            render: (value: string) => (isMasked ? "***" : value),
                            title: "参赛酒名",
                            width: 180,
                          },
                          {
                            dataIndex: "brewery",
                            render: (value: string) => (isMasked ? "***" : value),
                            title: "参赛酒厂",
                            width: 180,
                          },
                          {
                            children: [
                              {
                                dataIndex: "professionalScoreCount",
                                sorter: true,
                                sortOrder:
                                  roundBeerSort?.field === "professionalScoreCount"
                                    ? roundBeerSort.direction === "asc"
                                      ? "ascend"
                                      : "descend"
                                    : null,
                                title: "评价数",
                                width: 110,
                              },
                              {
                                dataIndex: "professionalAverageScore",
                                render: (value: number | null) =>
                                  value === null ? "--" : value.toFixed(2),
                                sorter: true,
                                sortOrder:
                                  roundBeerSort?.field === "professionalAverageScore"
                                    ? roundBeerSort.direction === "asc"
                                      ? "ascend"
                                      : "descend"
                                    : null,
                                title: "平均分",
                                width: 110,
                              },
                            ],
                            title: judgeTypeLabels.professional,
                          },
                          {
                            children: [
                              {
                                dataIndex: "consumerScoreCount",
                                sorter: true,
                                sortOrder:
                                  roundBeerSort?.field === "consumerScoreCount"
                                    ? roundBeerSort.direction === "asc"
                                      ? "ascend"
                                      : "descend"
                                    : null,
                                title: "评价数",
                                width: 110,
                              },
                              {
                                dataIndex: "consumerAverageScore",
                                render: (value: number | null) =>
                                  value === null ? "--" : value.toFixed(2),
                                sorter: true,
                                sortOrder:
                                  roundBeerSort?.field === "consumerAverageScore"
                                    ? roundBeerSort.direction === "asc"
                                      ? "ascend"
                                      : "descend"
                                    : null,
                                title: "平均分",
                                width: 110,
                              },
                            ],
                            title: judgeTypeLabels.consumer,
                          },
                          {
                            dataIndex: "weightedFiftyPointAverageScore",
                            render: (value: number | null) =>
                              value === null ? "--" : value.toFixed(2),
                            sorter: true,
                            sortOrder:
                              roundBeerSort?.field === "weightedFiftyPointAverageScore"
                                ? roundBeerSort.direction === "asc"
                                  ? "ascend"
                                  : "descend"
                                : null,
                            title: "50分制加权平均",
                            width: 160,
                          },
                          {
                            children: [
                              {
                                dataIndex: "publicScoreCount",
                                sorter: true,
                                sortOrder:
                                  roundBeerSort?.field === "publicScoreCount"
                                    ? roundBeerSort.direction === "asc"
                                      ? "ascend"
                                      : "descend"
                                    : null,
                                title: "评价数",
                                width: 110,
                              },
                              {
                                dataIndex: "publicAverageScore",
                                render: (value: number | null) =>
                                  value === null ? "--" : value.toFixed(2),
                                sorter: true,
                                sortOrder:
                                  roundBeerSort?.field === "publicAverageScore"
                                    ? roundBeerSort.direction === "asc"
                                      ? "ascend"
                                      : "descend"
                                    : null,
                                title: "平均分",
                                width: 110,
                              },
                            ],
                            title: judgeTypeLabels.public,
                          },
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
                        dataSource={sortedRoundBeers}
                        loading={status === "loading"}
                        onChange={handleRoundBeerTableChange}
                        pagination={{
                          defaultPageSize: 20,
                          pageSizeOptions: [20, 50, 100],
                          showSizeChanger: true,
                          showTotal: (total) => `共 ${total} 款`,
                        }}
                        rowKey="beerId"
                        scroll={{ x: 1660 }}
                        size="small"
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
                  isSubmitting={isBusy || !isCompetitionWritable}
                  opened={isAddRoundBeersDrawerOpen}
                  roundBeers={roundBeers}
                  roundName={selectedRound?.name ?? "当前轮次"}
                  onClose={() => setIsAddRoundBeersDrawerOpen(false)}
                  onSubmit={handleAddRoundBeers}
                />
                <Modal
                  destroyOnHidden
                  okButtonProps={{
                    disabled: !isCompetitionWritable || !newRoundName.trim(),
                    loading: isBusy,
                  }}
                  okText="创建"
                  open={isCreateRoundModalOpen}
                  title="新增轮次"
                  onCancel={handleCloseCreateRoundModal}
                  onOk={() => void handleCreateRound()}
                >
                  <Input
                    autoFocus
                    disabled={!isCompetitionWritable}
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
                      <Typography.Text type="secondary">
                        筛选结果 {filteredBeers.length} 款，共 {beers.length} 款
                      </Typography.Text>
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
                          void handleReadImportFile(file);
                        }}
                      />
                      <Button
                        disabled={!isCompetitionWritable || isBusy}
                        icon={<FileExcelOutlined />}
                        loading={isBusy || isParsingBeerImport}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Excel 导入
                      </Button>
                      <Button
                        disabled={!isCompetitionWritable}
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
                  <Form<BeerListFilters>
                    className={classes.beerFilterForm!}
                    form={beerFilterForm}
                    layout="inline"
                    onFinish={handleBeerFilterSubmit}
                  >
                    <Form.Item label="关键词" name="keyword">
                      <Input
                        allowClear
                        className={classes.beerFilterKeyword!}
                        placeholder="参赛编号、酒名或酒厂"
                        size="small"
                      />
                    </Form.Item>
                    <Form.Item label="BJCP" name="bjcpSubcategoryCode">
                      <Select
                        allowClear
                        className={classes.beerFilterSelect!}
                        options={bjcpStyleOptions}
                        placeholder="全部 BJCP 类型"
                        showSearch
                        size="small"
                      />
                    </Form.Item>
                    <Flex className={classes.beerFilterActions!} gap={8}>
                      <Button size="small" onClick={handleBeerFilterReset}>
                        重置
                      </Button>
                      <Button
                        htmlType="submit"
                        icon={<SearchOutlined />}
                        size="small"
                        type="primary"
                      >
                        查询
                      </Button>
                    </Flex>
                  </Form>
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
                      {
                        dataIndex: "name",
                        render: (value: string) => (isMasked ? "***" : value),
                        title: "参赛酒名",
                        width: 180,
                      },
                      {
                        dataIndex: "brewery",
                        render: (value: string) => (isMasked ? "***" : value),
                        title: "参赛酒厂",
                        width: 180,
                      },
                      {
                        dataIndex: "description",
                        ellipsis: true,
                        render: (description: string) => {
                          const summary = beerDescriptionToPlainText(description) || "—";
                          return (
                            <Tooltip title={summary}>
                              <Typography.Text className={classes.beerDescriptionText!}>
                                {summary}
                              </Typography.Text>
                            </Tooltip>
                          );
                        },
                        title: "介绍",
                        width: 260,
                      },
                      {
                        fixed: "right",
                        render: (_, beer) => (
                          <Button
                            disabled={!isCompetitionWritable}
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
                    dataSource={filteredBeers}
                    loading={status === "loading"}
                    pagination={{
                      defaultPageSize: 20,
                      pageSizeOptions: [20, 50, 100],
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 款`,
                    }}
                    rowKey="id"
                    scroll={{ x: 1040 }}
                    size="small"
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      <ImportBeersDrawer
        file={parsedBeerImport}
        isSubmitting={isBusy}
        onClose={() => setParsedBeerImport(null)}
        onSubmit={handleImport}
      />

      <Drawer
        destroyOnClose
        open={beerDrawer !== null}
        size={640}
        title={beerDrawer?.mode === "edit" ? "编辑酒款" : "新增酒款"}
        onClose={() => setBeerDrawer(null)}
      >
        <BeerForm
          beer={beerDrawer?.mode === "edit" ? beerDrawer.beer : null}
          isSubmitting={isBusy || !isCompetitionWritable}
          submitLabel={beerDrawer?.mode === "edit" ? "保存酒款" : "新增或更新酒款"}
          onSubmit={beerDrawer?.mode === "edit" ? handleSaveBeer : handleCreateBeer}
        />
      </Drawer>
    </div>
  );
}
