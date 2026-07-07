import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Pagination, Space, Table, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client } from "../../app/api.js";
import { useRequestFeedback } from "../../app/feedback.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import {
  entityStatusLabels,
  type Competition,
} from "../../modules/competitions/competitions-api.js";
import { type CompetitionFormValues } from "../../modules/competitions/components/CompetitionForm.js";
import { CompetitionInfoModal } from "../../modules/competitions/components/CompetitionInfoModal.js";

const competitionPageLimit = 50;

type CompetitionModalState =
  | { mode: "create"; competition: null }
  | { mode: "edit"; competition: Competition };

function EllipsisCell({ children }: { children: string }) {
  return (
    <Tooltip title={children}>
      <Typography.Text ellipsis style={{ maxWidth: "100%" }}>
        {children}
      </Typography.Text>
    </Tooltip>
  );
}

export function CompetitionsPage({ onLogout }: { onLogout: () => void }) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [competitionModal, setCompetitionModal] = useState<CompetitionModalState | null>(null);
  const [isSubmittingCompetition, setIsSubmittingCompetition] = useState(false);
  const { showRequestError, showSuccess } = useRequestFeedback(onLogout);

  const refreshCompetitions = useCallback(
    async (nextPage = page) => {
      const result = await client.listCompetitions({
        page: nextPage,
        limit: competitionPageLimit,
      });
      setCompetitions(result.competitions);
      setTotal(result.total);
      setPage(result.page);
      setStatus("ready");
    },
    [page]
  );

  useEffect(() => {
    setStatus("loading");
    void refreshCompetitions(page).catch((unknownError) => {
      setStatus("ready");
      showRequestError(unknownError);
    });
  }, [page, refreshCompetitions, showRequestError]);

  function handleRefresh() {
    setStatus("loading");
    void refreshCompetitions(page).catch((unknownError) => {
      setStatus("ready");
      showRequestError(unknownError);
    });
  }

  async function handleCompetitionSubmit(values: CompetitionFormValues) {
    if (!competitionModal) {
      return;
    }

    setIsSubmittingCompetition(true);

    try {
      if (competitionModal.mode === "create") {
        const result = await client.createCompetition({
          name: values.name.trim(),
        });
        showSuccess(`已创建比赛 ${result.competition.name}`);
        setCompetitionModal(null);
        await refreshCompetitions(1);
        return;
      }

      const result = await client.updateCompetition(competitionModal.competition.id, {
        name: values.name.trim(),
      });
      showSuccess(`已更新比赛 ${result.competition.name}`);
      setCompetitionModal(null);
      await refreshCompetitions(page);
    } catch (unknownError) {
      showRequestError(unknownError);
    } finally {
      setIsSubmittingCompetition(false);
    }
  }

  return (
    <div className="stack-lg">
      <Flex align="center" gap={16} justify="space-between" wrap>
        <PageHeader eyebrow="Competitions" title="比赛管理" />
        <Button icon={<ReloadOutlined />} loading={status === "loading"} onClick={handleRefresh}>
          刷新
        </Button>
      </Flex>

      <Card>
        <div className="stack-md">
          <Flex align="center" gap={16} justify="space-between" wrap>
            <div>
              <Typography.Text strong>比赛列表</Typography.Text>
              <br />
              <Typography.Text type="secondary">
                {status === "loading"
                  ? "加载中..."
                  : `共 ${total} 场比赛，每页 ${competitionPageLimit} 条`}
              </Typography.Text>
            </div>
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setCompetitionModal({ mode: "create", competition: null });
              }}
            >
              新建比赛
            </Button>
          </Flex>

          <Table<Competition>
            columns={[
              {
                dataIndex: "id",
                fixed: "left",
                render: (id: number) => <Typography.Text type="secondary">#{id}</Typography.Text>,
                title: "ID",
                width: 80,
              },
              {
                dataIndex: "name",
                render: (value: string) => <EllipsisCell>{value}</EllipsisCell>,
                title: "比赛名称",
                width: 280,
              },
              {
                dataIndex: "status",
                render: (status: Competition["status"]) => (
                  <Tag color={status === "ongoing" ? "processing" : "default"}>
                    {entityStatusLabels[status]}
                  </Tag>
                ),
                title: "状态",
                width: 110,
              },
              {
                dataIndex: "createdAt",
                render: (value: string) => (
                  <Typography.Text type="secondary">
                    {new Date(value).toLocaleString()}
                  </Typography.Text>
                ),
                title: "创建时间",
                width: 190,
              },
              {
                dataIndex: "updatedAt",
                render: (value: string) => (
                  <Typography.Text type="secondary">
                    {new Date(value).toLocaleString()}
                  </Typography.Text>
                ),
                title: "更新时间",
                width: 190,
              },
              {
                fixed: "right",
                render: (_, competition) => (
                  <Space>
                    <Button icon={<EyeOutlined />}>
                      <Link to={`/competitions/${competition.id}`}>进入详情</Link>
                    </Button>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => {
                        setCompetitionModal({ mode: "edit", competition });
                      }}
                    >
                      编辑
                    </Button>
                  </Space>
                ),
                title: "操作",
                width: 230,
              },
            ]}
            dataSource={competitions}
            loading={status === "loading"}
            pagination={false}
            rowKey="id"
            scroll={{ x: 1080 }}
          />

          <Flex justify="flex-end">
            <Pagination
              current={page}
              disabled={status === "loading"}
              pageSize={competitionPageLimit}
              showSizeChanger={false}
              total={total}
              onChange={setPage}
            />
          </Flex>
        </div>
      </Card>

      <CompetitionInfoModal
        competition={competitionModal?.competition ?? null}
        isSubmitting={isSubmittingCompetition}
        mode={competitionModal?.mode ?? "create"}
        opened={competitionModal !== null}
        onClose={() => {
          setCompetitionModal(null);
        }}
        onSubmit={handleCompetitionSubmit}
      />
    </div>
  );
}
