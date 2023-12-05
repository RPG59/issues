import { MouseEventHandler, useCallback, useEffect, useMemo } from 'react';
import { nullable } from '@taskany/bricks';

import { QueryState, useUrlFilterParams } from '../hooks/useUrlFilterParams';
import { refreshInterval } from '../utils/config';
import { GoalByIdReturnType } from '../../trpc/inferredTypes';
import { trpc } from '../utils/trpcClient';
import { useFMPMetric } from '../utils/telemetry';

import { LoadMoreButton } from './LoadMoreButton/LoadMoreButton';
import { useGoalPreview } from './GoalPreview/GoalPreviewProvider';
import { ProjectListItemConnected } from './ProjectListItemConnected';

interface GroupedGoalListProps {
    queryState?: QueryState;
    setTagFilterOutside: ReturnType<typeof useUrlFilterParams>['setTagsFilterOutside'];
}

export const projectsSize = 20;

export const GroupedGoalList: React.FC<GroupedGoalListProps> = ({ queryState, setTagFilterOutside }) => {
    const { preview, setPreview, on } = useGoalPreview();
    const utils = trpc.useContext();
    const { data, fetchNextPage, hasNextPage } = trpc.project.getAll.useInfiniteQuery(
        {
            limit: projectsSize,
            includePersonal: true,
            firstLevel: !queryState?.project.length,
            goalsQuery: queryState,
        },
        {
            getNextPageParam: (p) => p.nextCursor,
            keepPreviousData: true,
            staleTime: refreshInterval,
        },
    );

    useEffect(() => {
        const unsubUpdate = on('on:goal:update', () => {
            utils.project.getAll.invalidate();
        });
        const unsubDelete = on('on:goal:delete', () => {
            utils.project.getAll.invalidate();
        });

        return () => {
            unsubUpdate();
            unsubDelete();
        };
    }, [on, utils.project.getAll]);

    useFMPMetric(!!data);

    const onGoalPreviewShow = useCallback(
        (goal: GoalByIdReturnType): MouseEventHandler<HTMLAnchorElement> =>
            (e) => {
                if (e.metaKey || e.ctrlKey || !goal?._shortId) return;

                e.preventDefault();
                setPreview(goal._shortId, goal);
            },
        [setPreview],
    );

    const selectedGoalResolver = useCallback((id: string) => id === preview?.id, [preview]);

    const projectsOnScreen = useMemo(() => {
        const pages = data?.pages || [];

        return pages.flatMap((page) => page.projects);
    }, [data]);

    return (
        <>
            {projectsOnScreen.map((project) => (
                <ProjectListItemConnected
                    key={project.id}
                    project={project}
                    onTagClick={setTagFilterOutside}
                    onClickProvider={onGoalPreviewShow}
                    selectedResolver={selectedGoalResolver}
                    queryState={queryState}
                />
            ))}

            {nullable(hasNextPage, () => (
                <LoadMoreButton onClick={() => fetchNextPage()} />
            ))}
        </>
    );
};
