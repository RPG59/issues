import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { Table, nullable } from '@taskany/bricks';

import { GoalByIdReturnType } from '../../trpc/inferredTypes';
import { QueryState, useUrlFilterParams } from '../hooks/useUrlFilterParams';
import { trpc } from '../utils/trpcClient';
import { refreshInterval } from '../utils/config';
import { useFMPMetric } from '../utils/telemetry';

import { useGoalPreview } from './GoalPreview/GoalPreviewProvider';
import { GoalListItem } from './GoalListItem';
import { LoadMoreButton } from './LoadMoreButton/LoadMoreButton';
import { TableRowItem, Title } from './Table';

interface GoalListProps {
    queryState?: QueryState;
    setTagFilterOutside: ReturnType<typeof useUrlFilterParams>['setTagsFilterOutside'];
}

const pageSize = 20;

export const FlatGoalList: React.FC<GoalListProps> = ({ queryState, setTagFilterOutside }) => {
    const utils = trpc.useContext();
    const { preview, setPreview, on } = useGoalPreview();

    const [, setPage] = useState(0);
    const { data, fetchNextPage, hasNextPage } = trpc.goal.getBatch.useInfiniteQuery(
        {
            limit: pageSize,
            query: queryState,
        },
        {
            getNextPageParam: (p) => p.nextCursor,
            keepPreviousData: true,
            staleTime: refreshInterval,
        },
    );

    useEffect(() => {
        const unsubUpdate = on('on:goal:update', () => {
            utils.goal.getBatch.invalidate();
        });
        const unsubDelete = on('on:goal:delete', () => {
            utils.goal.getBatch.invalidate();
        });

        return () => {
            unsubUpdate();
            unsubDelete();
        };
    }, [on, utils.goal.getBatch]);

    useFMPMetric(!!data);

    const pages = data?.pages;
    const goalsOnScreen = useMemo(() => pages?.flatMap((p) => p.items), [pages]);

    const onFetchNextPage = useCallback(() => {
        fetchNextPage();
        setPage((prev) => prev++);
    }, [fetchNextPage]);

    useEffect(() => {
        const isGoalDeletedAlready = preview && !goalsOnScreen?.some((g) => g.id === preview.id);

        if (isGoalDeletedAlready) setPreview(null);
    }, [goalsOnScreen, preview, setPreview]);

    const selectedGoalResolver = useCallback((id: string) => id === preview?.id, [preview]);

    const onGoalPreviewShow = useCallback(
        (goal: GoalByIdReturnType): MouseEventHandler<HTMLAnchorElement> =>
            (e) => {
                if (e.metaKey || e.ctrlKey || !goal?._shortId) return;

                e.preventDefault();
                setPreview(goal._shortId, goal);
            },
        [setPreview],
    );
    return (
        <>
            <Table>
                {goalsOnScreen?.map((g) => (
                    <TableRowItem
                        key={g.id}
                        title={<Title size="m">{g.title}</Title>}
                        onClick={onGoalPreviewShow(g as GoalByIdReturnType)}
                        focused={selectedGoalResolver(g.id)}
                    >
                        <GoalListItem
                            updatedAt={g.updatedAt}
                            state={g.state}
                            issuer={g.activity}
                            owner={g.owner}
                            tags={g.tags}
                            priority={g.priority}
                            comments={g._count?.comments}
                            estimate={g.estimate}
                            estimateType={g.estimateType}
                            participants={g.participants}
                            starred={g._isStarred}
                            watching={g._isWatching}
                            achivedCriteriaWeight={g._achivedCriteriaWeight}
                            onTagClick={setTagFilterOutside}
                        />
                    </TableRowItem>
                ))}
            </Table>

            {nullable(hasNextPage, () => (
                <LoadMoreButton onClick={onFetchNextPage} />
            ))}
        </>
    );
};
