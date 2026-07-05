import {
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { ArrowLeft, FileSpreadsheet, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import type { EntityStatus, ImportBeerRow } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
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
import { handleRequestError } from "../../utils/errors.js";
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
    }));
  });
}

export function CompetitionDetailPage({ onLogout }: { onLogout: () => void }) {
  const { competitionId: competitionIdParam } = useParams();
  const competitionId = readCompetitionId(competitionIdParam);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [beers, setBeers] = useState<Beer[]>([]);
  const [rounds, setRounds] = useState<CompetitionRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [roundBeers, setRoundBeers] = useState<RoundBeer[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);
  const [newRoundName, setNewRoundName] = useState("");
  const [roundBeerToAdd, setRoundBeerToAdd] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? null;

  const refreshDetail = useCallback(async () => {
    if (!competitionId) {
      setError("比赛 ID 无效");
      setStatus("ready");
      return;
    }
    setError(null);
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
  }, [competitionId, selectedRoundId]);

  useEffect(() => {
    void refreshDetail().catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }, [onLogout, refreshDetail]);

  async function runAction(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setIsBusy(true);
    try {
      await action();
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onLogout));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCompetitionStatus(nextStatus: string | null) {
    if (!competitionId || !nextStatus || !competition) return;
    const confirm = competition.status === "ended" && nextStatus === "ongoing";
    if (confirm && !window.confirm("确认重新打开比赛？裁判将可以继续修改允许状态下的评分。"))
      return;
    await runAction(async () => {
      const result = await client.updateCompetitionStatus(competitionId, {
        status: nextStatus as EntityStatus,
        ...(confirm ? { confirm: true } : {}),
      });
      setCompetition(result.competition);
      setNotice(`比赛状态已更新为 ${entityStatusLabels[result.competition.status]}`);
    });
  }

  async function handleCreateBeer(values: BeerFormValues) {
    if (!competitionId) return;
    await runAction(async () => {
      const result = await client.createBeer(competitionId, values);
      await refreshDetail();
      setNotice(`已保存 #${result.beer.entryNumber} ${result.beer.entryCode}`);
    });
  }

  async function handleSaveBeer(values: BeerFormValues) {
    if (!competitionId || !editingBeer) return;
    await runAction(async () => {
      await client.updateBeer(competitionId, editingBeer.id, {
        name: values.name,
        brewery: values.brewery,
        bjcpSubcategoryCode: values.bjcpSubcategoryCode,
        description: values.description,
      });
      setEditingBeer(null);
      await refreshDetail();
      setNotice("酒款已保存");
    });
  }

  async function handleImport(file: File | null) {
    if (!competitionId || !file) return;
    await runAction(async () => {
      const rows = await parseExcelRows(file);
      const result = await client.importBeers(competitionId, { beers: rows });
      await refreshDetail();
      setNotice(`导入完成：新增 ${result.created}，更新 ${result.updated}`);
    });
  }

  async function handleCreateRound() {
    if (!competitionId || !newRoundName.trim()) return;
    await runAction(async () => {
      const result = await client.createRound(competitionId, { name: newRoundName.trim() });
      setNewRoundName("");
      await refreshDetail();
      setSelectedRoundId(result.round.id);
      setNotice("轮次已创建");
    });
  }

  async function handleRoundStatus(nextStatus: string | null) {
    if (!competitionId || !selectedRound || !nextStatus) return;
    const confirm = selectedRound.status === "ended" && nextStatus === "ongoing";
    if (confirm && !window.confirm("确认重新打开轮次？裁判将可以继续修改本轮评分。")) return;
    await runAction(async () => {
      await client.updateRoundStatus(competitionId, selectedRound.id, {
        status: nextStatus as EntityStatus,
        ...(confirm ? { confirm: true } : {}),
      });
      await refreshDetail();
      setNotice("轮次状态已更新");
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
      setNotice("酒款已加入轮次");
    });
  }

  async function handleRemoveRoundBeer(beer: RoundBeer) {
    if (!competitionId || !selectedRound) return;
    const confirm =
      beer.scoreCount > 0 &&
      !window.confirm(`该酒款已有 ${beer.scoreCount} 条评价，确认移除并软删除这些评价？`);
    if (confirm) return;
    await runAction(async () => {
      await client.removeRoundBeer(competitionId, selectedRound.id, beer.beerId, {
        confirm: beer.scoreCount > 0,
      });
      setRoundBeers((await client.listRoundBeers(competitionId, selectedRound.id)).beers);
      setNotice("已从轮次移除酒款");
    });
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <Button
            component={Link}
            leftSection={<ArrowLeft size={16} />}
            to="/competitions"
            variant="default"
          >
            返回
          </Button>
          <PageHeader eyebrow="Competition" title={competition?.name ?? "比赛详情"} />
        </Group>
        <Group>
          {competition ? (
            <Select
              allowDeselect={false}
              data={entityStatusOptions}
              value={competition.status}
              w={140}
              onChange={handleCompetitionStatus}
            />
          ) : null}
          <Button
            leftSection={<RefreshCw size={16} />}
            loading={status === "loading"}
            variant="default"
            onClick={() => {
              setStatus("loading");
              void refreshDetail().catch((unknownError) => {
                setStatus("ready");
                setError(handleRequestError(unknownError, onLogout));
              });
            }}
          >
            刷新
          </Button>
        </Group>
      </Group>

      {notice ? <InlineMessage type="success">{notice}</InlineMessage> : null}
      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

      <Tabs defaultValue="rounds">
        <Tabs.List>
          <Tabs.Tab value="rounds">轮次</Tabs.Tab>
          <Tabs.Tab value="beers">酒款</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt="lg" value="beers">
          <Stack gap="lg">
            <Paper p="lg">
              <Group justify="space-between" mb="md">
                <Text fw={800}>录入酒款</Text>
                <Group>
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
                    leftSection={<FileSpreadsheet size={16} />}
                    variant="default"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Excel 导入
                  </Button>
                </Group>
              </Group>
              <BeerForm
                isSubmitting={isBusy}
                submitLabel="新增或更新酒款"
                onSubmit={handleCreateBeer}
              />
            </Paper>

            <Paper p="lg">
              <Group justify="space-between" mb="md">
                <Text fw={800}>酒款列表</Text>
                <Text c="dimmed" size="sm">
                  {beers.length} 款酒
                </Text>
              </Group>
              <ScrollArea>
                <Table miw={980} verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>序号</Table.Th>
                      <Table.Th>参赛编号</Table.Th>
                      <Table.Th>BJCP</Table.Th>
                      <Table.Th>参赛酒名</Table.Th>
                      <Table.Th>参赛酒厂</Table.Th>
                      <Table.Th>介绍</Table.Th>
                      <Table.Th>操作</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {beers.map((beer) => (
                      <Table.Tr key={beer.id}>
                        <Table.Td>#{beer.entryNumber}</Table.Td>
                        <Table.Td>{beer.entryCode}</Table.Td>
                        <Table.Td>{beer.bjcpSubcategoryCode}</Table.Td>
                        <Table.Td>{beer.name}</Table.Td>
                        <Table.Td>{beer.brewery}</Table.Td>
                        <Table.Td>{beer.description}</Table.Td>
                        <Table.Td>
                          <Button size="xs" variant="default" onClick={() => setEditingBeer(beer)}>
                            编辑
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel pt="lg" value="rounds">
          <div className={classes.roundLayout!}>
            <Paper p="md">
              <Stack gap="sm">
                <Text fw={800}>轮次</Text>
                <Group gap="xs">
                  <TextInput
                    placeholder="轮次名"
                    value={newRoundName}
                    onChange={(event) => setNewRoundName(event.currentTarget.value)}
                  />
                  <Button leftSection={<Plus size={16} />} onClick={handleCreateRound}>
                    新增
                  </Button>
                </Group>
                <Stack gap={6}>
                  {rounds.map((round) => (
                    <Button
                      justify="space-between"
                      key={round.id}
                      variant={round.id === selectedRoundId ? "filled" : "light"}
                      onClick={() => {
                        setSelectedRoundId(round.id);
                        if (competitionId) {
                          void client
                            .listRoundBeers(competitionId, round.id)
                            .then((result) => setRoundBeers(result.beers))
                            .catch((unknownError) =>
                              setError(handleRequestError(unknownError, onLogout))
                            );
                        }
                      }}
                    >
                      {round.name}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            </Paper>

            <Paper p="lg">
              {selectedRound ? (
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group>
                      <Text fw={800}>{selectedRound.name}</Text>
                      <Badge variant="light">{entityStatusLabels[selectedRound.status]}</Badge>
                    </Group>
                    <Select
                      allowDeselect={false}
                      data={entityStatusOptions}
                      value={selectedRound.status}
                      w={140}
                      onChange={handleRoundStatus}
                    />
                  </Group>
                  <Group align="end">
                    <Select
                      data={beers.map((beer) => ({
                        label: `#${beer.entryNumber} ${beer.entryCode} ${beer.bjcpSubcategoryCode}`,
                        value: String(beer.id),
                      }))}
                      label="添加酒款到轮次"
                      placeholder="选择酒款"
                      searchable
                      value={roundBeerToAdd}
                      onChange={setRoundBeerToAdd}
                    />
                    <Button onClick={handleAddRoundBeer}>添加</Button>
                  </Group>
                  <Table verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>序号</Table.Th>
                        <Table.Th>参赛编号</Table.Th>
                        <Table.Th>BJCP</Table.Th>
                        <Table.Th>评价数</Table.Th>
                        <Table.Th>操作</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {roundBeers.map((beer) => (
                        <Table.Tr key={beer.beerId}>
                          <Table.Td>#{beer.entryNumber}</Table.Td>
                          <Table.Td>{beer.entryCode}</Table.Td>
                          <Table.Td>{beer.bjcpSubcategoryCode}</Table.Td>
                          <Table.Td>{beer.scoreCount}</Table.Td>
                          <Table.Td>
                            <Button
                              color="red"
                              leftSection={<Trash2 size={14} />}
                              size="xs"
                              variant="light"
                              onClick={() => void handleRemoveRoundBeer(beer)}
                            >
                              移除
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              ) : (
                <Text c="dimmed">暂无轮次。</Text>
              )}
            </Paper>
          </div>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={editingBeer !== null} title="编辑酒款" onClose={() => setEditingBeer(null)}>
        <BeerForm
          beer={editingBeer}
          isSubmitting={isBusy}
          submitLabel="保存酒款"
          onSubmit={handleSaveBeer}
        />
      </Modal>
    </Stack>
  );
}
