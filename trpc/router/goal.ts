import z from 'zod';
import { TRPCError } from '@trpc/server';

import { prisma } from '../../src/utils/prisma';
import { protectedProcedure, router } from '../trpcBackend';
import { addCalclulatedGoalsFields, calcGoalsMeta, goalDeepQuery, goalsFilter } from '../queries/goals';
import {
    goalChangeProjectSchema,
    goalCommonSchema,
    goalUpdateSchema,
    toogleGoalArchiveSchema,
    toogleGoalDependencySchema,
    userGoalsSchema,
} from '../../src/schema/goal';
import { ToggleSubscriptionSchema } from '../../src/schema/common';
import { connectionMap } from '../queries/connections';
import { createGoal, changeGoalProject } from '../../src/utils/db';

export const goal = router({
    suggestions: protectedProcedure.input(z.string()).query(async ({ input }) => {
        const splittedInput = input.split('-');
        let selectParams = {};

        if (splittedInput.length === 2 && Number.isNaN(+splittedInput[1])) {
            selectParams = {
                AND: [
                    {
                        projectId: {
                            contains: splittedInput[0],
                            mode: 'insensitive',
                        },
                    },
                    {
                        scopeId: {
                            contains: splittedInput[1],
                            mode: 'insensitive',
                        },
                    },
                ],
            };
        }

        return prisma.goal.findMany({
            take: 10,
            where: {
                OR: [
                    selectParams,
                    {
                        title: {
                            contains: input,
                            mode: 'insensitive',
                        },
                    },
                ],
                AND: {
                    OR: [
                        {
                            archived: false,
                        },
                        {
                            archived: null,
                        },
                    ],
                },
            },
            include: {
                owner: {
                    include: {
                        user: true,
                        ghost: true,
                    },
                },
                activity: {
                    include: {
                        user: true,
                        ghost: true,
                    },
                },
                tags: true,
                state: true,
                project: {
                    include: {
                        flow: true,
                    },
                },
                reactions: {
                    include: {
                        activity: {
                            include: {
                                user: true,
                                ghost: true,
                            },
                        },
                    },
                },
                estimate: true,
                watchers: true,
                stargizers: true,
                dependsOn: {
                    include: {
                        state: true,
                    },
                },
                relatedTo: {
                    include: {
                        state: true,
                    },
                },
                blocks: {
                    include: {
                        state: true,
                    },
                },
                comments: {
                    include: {
                        activity: {
                            include: {
                                user: true,
                                ghost: true,
                            },
                        },
                        reactions: true,
                    },
                },
                participants: {
                    include: {
                        user: true,
                        ghost: true,
                    },
                },
            },
        });
    }),
    getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
        // try to recognize shot id like: FRNTND-23
        const [projectId, scopeIdStr] = input.split('-');

        if (!projectId) return null;

        const scopeId = parseInt(scopeIdStr, 10);

        if (!scopeId) return null;

        try {
            const goal = await prisma.goal.findFirst({
                where: {
                    projectId,
                    scopeId,
                    archived: false,
                },
                include: {
                    ...goalDeepQuery,
                },
            });

            if (!goal) return null;

            return {
                ...goal,
                ...addCalclulatedGoalsFields(goal, ctx.session.user.activityId),
            };
        } catch (error: any) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(error.message), cause: error });
        }
    }),
    getUserGoals: protectedProcedure.input(userGoalsSchema).query(async ({ ctx, input }) => {
        const { activityId } = ctx.session.user;

        const userDashboardGoals = {
            AND: {
                OR: [
                    // all projects where the user is a participant
                    {
                        project: {
                            participants: {
                                some: {
                                    id: activityId,
                                },
                            },
                        },
                    },
                    // all projects where the user is a watcher
                    {
                        project: {
                            watchers: {
                                some: {
                                    id: activityId,
                                },
                            },
                        },
                    },
                    // all projects where the user is owner
                    {
                        project: {
                            activityId,
                        },
                    },
                    // all goals where the user is a participant
                    {
                        participants: {
                            some: {
                                id: activityId,
                            },
                        },
                    },
                    // all goals where the user is a watcher
                    {
                        watchers: {
                            some: {
                                id: activityId,
                            },
                        },
                    },
                    // all goals where the user is issuer
                    {
                        activityId,
                    },
                    // all goals where the user is owner
                    {
                        ownerId: activityId,
                    },
                ],
            },
        };

        const [allUserGoals, filtredUserGoals] = await Promise.all([
            prisma.goal.findMany({
                ...goalsFilter(
                    {
                        priority: [],
                        state: [],
                        tag: [],
                        estimate: [],
                        owner: [],
                        project: [],
                        sort: {},
                        query: '',
                    },
                    {
                        ...userDashboardGoals,
                    },
                ),
                include: {
                    ...goalDeepQuery,
                },
            }),
            prisma.goal.findMany({
                ...goalsFilter(input, {
                    ...userDashboardGoals,
                }),
                include: {
                    ...goalDeepQuery,
                },
            }),
        ]);

        return {
            goals: filtredUserGoals.map((g) => ({
                ...g,
                ...addCalclulatedGoalsFields(g, ctx.session.user.activityId),
            })),
            meta: calcGoalsMeta(allUserGoals),
        };
    }),
    create: protectedProcedure.input(goalCommonSchema).mutation(async ({ ctx, input }) => {
        if (!input.owner.id) return null;
        if (!input.parent.id) return null;

        const { activityId } = ctx.session.user;

        try {
            return createGoal(activityId, input);

            // await mailServer.sendMail({
            //     from: `"Fred Foo 👻" <${process.env.MAIL_USER}>`,
            //     to: 'bar@example.com, baz@example.com',
            //     subject: 'Hello ✔',
            //     text: `new post '${title}'`,
            //     html: `new post <b>${title}</b>`,
            // });
        } catch (error: any) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(error.message), cause: error });
        }
    }),
    changeProject: protectedProcedure.input(goalChangeProjectSchema).mutation(async ({ input }) => {
        return changeGoalProject(input.id, input.projectId);
    }),
    update: protectedProcedure.input(goalUpdateSchema).mutation(async ({ ctx, input }) => {
        const actualGoal = await prisma.goal.findUnique({
            where: { id: input.id },
            include: { participants: true, project: true, tags: true },
        });

        if (!actualGoal) return null;

        // FIXME: move out to separated mutations
        let participantsToDisconnect: Array<{ id: string }> = [];
        let tagsToDisconnect: Array<{ id: string }> = [];

        if (input.participants?.length) {
            participantsToDisconnect =
                actualGoal.participants?.filter((p) => !input.participants?.some((pa) => pa.id === p.id)) || [];
        }

        if (input.tags?.length) {
            tagsToDisconnect = actualGoal.tags?.filter((t) => !input.tags?.some((tag) => tag.id === t.id)) || [];
        }

        try {
            return prisma.goal.update({
                where: { id: actualGoal.id },
                data: {
                    ownerId: input.owner?.id,
                    projectId: input.parent?.id,
                    title: input.title,
                    description: input.description,
                    stateId: input.state?.id,
                    priority: input.priority,
                    // FIXME: looks like we are creating new every update
                    estimate: input.estimate
                        ? {
                              create: {
                                  ...input.estimate,
                                  activityId: ctx.session.user.activityId,
                              },
                          }
                        : undefined,
                    tags: input.tags?.length
                        ? {
                              connect: input.tags.map((t) => ({ id: t.id })),
                              disconnect: tagsToDisconnect,
                          }
                        : undefined,
                    participants: input.participants?.length
                        ? {
                              connect: input.participants.map((p) => ({ id: p.id })),
                              disconnect: participantsToDisconnect,
                          }
                        : undefined,
                },
            });

            // await mailServer.sendMail({
            //     from: `"Fred Foo 👻" <${process.env.MAIL_USER}>`,
            //     to: 'bar@example.com, baz@example.com',
            //     subject: 'Hello ✔',
            //     text: `new post '${title}'`,
            //     html: `new post <b>${title}</b>`,
            // });
        } catch (error: any) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(error.message), cause: error });
        }
    }),
    toggleStargizer: protectedProcedure
        .input(ToggleSubscriptionSchema)
        .mutation(({ ctx, input: { id, direction } }) => {
            const connection = { id };

            try {
                return prisma.activity.update({
                    where: { id: ctx.session.user.activityId },
                    data: {
                        goalStargizers: { [connectionMap[String(direction)]]: connection },
                    },
                });
            } catch (error: any) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(error.message), cause: error });
            }
        }),
    toggleWatcher: protectedProcedure.input(ToggleSubscriptionSchema).mutation(({ ctx, input: { id, direction } }) => {
        const connection = { id };

        try {
            return prisma.activity.update({
                where: { id: ctx.session.user.activityId },
                data: {
                    goalWatchers: { [connectionMap[String(direction)]]: connection },
                },
            });
        } catch (error: any) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(error.message), cause: error });
        }
    }),
    toggleDependency: protectedProcedure
        .input(toogleGoalDependencySchema)
        .mutation(({ input: { id, target, direction, kind } }) => {
            const connection = { id: target };

            try {
                return prisma.goal.update({
                    where: { id },
                    data: {
                        id, // this is hack to force updatedAt field
                        [kind]: { [connectionMap[String(direction)]]: connection },
                    },
                });

                // await mailServer.sendMail({
                //     from: `"Fred Foo 👻" <${process.env.MAIL_USER}>`,
                //     to: 'bar@example.com, baz@example.com',
                //     subject: 'Hello ✔',
                //     text: `new post '${title}'`,
                //     html: `new post <b>${title}</b>`,
                // });
            } catch (error: any) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(error.message), cause: error });
            }
        }),
    toggleArchive: protectedProcedure.input(toogleGoalArchiveSchema).mutation(({ input: { id, archived } }) => {
        try {
            return prisma.goal.update({
                where: { id },
                data: {
                    archived,
                },
            });

            // await mailServer.sendMail({
            //     from: `"Fred Foo 👻" <${process.env.MAIL_USER}>`,
            //     to: 'bar@example.com, baz@example.com',
            //     subject: 'Hello ✔',
            //     text: `new post '${title}'`,
            //     html: `new post <b>${title}</b>`,
            // });
        } catch (error: any) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(error.message), cause: error });
        }
    }),
});
