import useSWR from 'swr';
import { useTranslations } from 'next-intl';

import { createFetcher } from '../../utils/createFetcher';
import { declareSsrProps, ExternalPageProps } from '../../utils/declareSsrProps';
import { Project } from '../../../graphql/@generated/genql';
import { Page, PageContent } from '../../components/Page';
import { useMounted } from '../../hooks/useMounted';
import { TabsMenu, TabsMenuItem } from '../../components/TabsMenu';
import { PageSep } from '../../components/PageSep';
import { ProjectItem } from '../../components/ProjectItem';
import { nullable } from '../../utils/nullable';
import { CommonHeader } from '../../components/CommonHeader';

const refreshInterval = 3000;

// @ts-ignore FIXME: https://github.com/taskany-inc/issues/issues/25
const fetcher = createFetcher(() => ({
    projects: {
        key: true,
        title: true,
        description: true,
        createdAt: true,
        computedActivity: {
            id: true,
            name: true,
            email: true,
            image: true,
        },
    },
}));

export const getServerSideProps = declareSsrProps(
    async ({ user }) => ({
        ssrData: await fetcher(user),
    }),
    {
        private: true,
    },
);

const ProjectsPage = ({ user, locale, ssrData }: ExternalPageProps<{ projects: Project[] }>) => {
    const mounted = useMounted(refreshInterval);
    const t = useTranslations('projects.index');

    const { data } = useSWR(mounted ? [user] : null, (...args) => fetcher(...args), {
        refreshInterval,
    });

    const projects: Project[] = data?.projects ?? ssrData.projects;

    return (
        <Page locale={locale} title={t('title')}>
            <CommonHeader
                title={t('explore')}
                description={t('see what the Taskany community is most excited about today')}
            >
                <TabsMenu>
                    <TabsMenuItem active>Projects</TabsMenuItem>
                    <TabsMenuItem>Goals</TabsMenuItem>
                    <TabsMenuItem>Issues</TabsMenuItem>
                    <TabsMenuItem>Boards</TabsMenuItem>
                </TabsMenu>
            </CommonHeader>

            <PageSep />

            <PageContent>
                {projects.map((project) =>
                    nullable(project, (p) => (
                        <ProjectItem
                            key={p.key}
                            projectKey={p.key}
                            title={p.title}
                            description={p.description}
                            createdAt={p.createdAt}
                            owner={p.computedActivity}
                        />
                    )),
                )}
            </PageContent>
        </Page>
    );
};

export default ProjectsPage;