import { StatusCodes } from "http-status-codes";
import { env } from "./env";
import { expressClient } from "./express";
import { prismaClient } from "./prisma";
import { z } from "zod";
import { query, validationResult } from "express-validator";
import { Prisma } from "@prisma/client";



interface GetManyQuery {
    loadCount: number | undefined;
    centerOn: number | undefined;
}

interface GetManyPrismaRequest {
    cursor?: { id: number };
    take?: number;
    skip?: number;
    orderBy?: { score: Prisma.SortOrder };
}


interface PostSchema {
    score: number;
    username: string;
    password: string;
}

interface PostPrismaRequest {
    data: {
        score: number;
        username: string;
    };
}

abstract class ScoreTableHandler<Result> {
    public abstract performGetAll(getManyPrismaRequest: GetManyPrismaRequest): Promise<Result[]>;
    public async getAll(getManyQuery: GetManyQuery) {
        const take = getManyQuery.loadCount ?? 10;
        const orderBy: { score: Prisma.SortOrder } = { score: "desc" };

        if (getManyQuery.centerOn !== undefined) {
            const before = await this.performGetAll({
                cursor: { id: getManyQuery.centerOn },
                take: - Math.floor(take / 2),
                skip: 1,
                orderBy: orderBy
            });

            const after = await this.performGetAll({
                cursor: { id: getManyQuery.centerOn },
                take: take - before.length,
                skip: 0,
                orderBy: orderBy
            });

            return [...before, ...after];
        }

        return await this.performGetAll({
            take: take,
            orderBy: orderBy
        });
    }


    public abstract performPost(postSchema: PostPrismaRequest): Promise<Result>;
    public async post(postSchema: PostSchema) {
        return await this.performPost({
            data: {
                score: postSchema.score,
                username: postSchema.username
            }
        });
    }
}


class OneTiming extends ScoreTableHandler<
    Prisma.ScoreOneTimingGetPayload<{}>
> {
    public async performGetAll(getManyPrismaRequest: GetManyPrismaRequest): Promise<Prisma.ScoreOneTimingGetPayload<{}>[]> {
        return await prismaClient.scoreOneTiming.findMany(getManyPrismaRequest);
    }

    public async performPost(postPrismaRequest: PostPrismaRequest): Promise<{ id: number; score: number; username: string; createdOn: Date; }> {
        return await prismaClient.scoreOneTiming.create(postPrismaRequest)
    }
}
const oneTiming = new OneTiming();

class MultipleTiming extends ScoreTableHandler<
    Prisma.ScoreMultipleTimingGetPayload<{}>
> {
    public async performGetAll(getManyPrismaRequest: GetManyPrismaRequest): Promise<Prisma.ScoreMultipleTimingGetPayload<{}>[]> {
        return await prismaClient.scoreMultipleTiming.findMany(getManyPrismaRequest);
    }

    public async performPost(postPrismaRequest: PostPrismaRequest): Promise<Prisma.ScoreMultipleTimingGetPayload<{}>> {
        return await prismaClient.scoreMultipleTiming.create(postPrismaRequest)
    }
}
const multipleTiming = new MultipleTiming();



function isCorrectPassword(password: string) {
    return password === env.BACKEND_PASSWORD;
}

function getScoreTableHandler(tableName: string) {
    if (tableName === "oneTiming") return oneTiming;
    else if (tableName === "multipleTiming") return multipleTiming;
    else return undefined;
}



interface GetAllQuery {
    tableName: string;
    loadCount: string | undefined;
    centerOn: string | undefined;
}


expressClient.get("/api/scores",
    query("tableName"),
    query("loadCount").optional().isInt().toInt(),
    query("centerOn").optional().isInt().toInt(),
    async (req, res) => {
        const validation = validationResult(req);
        if (!validation.isEmpty()) {
            res.status(StatusCodes.BAD_REQUEST).send({
                message: "what is that request lol goofy ahh",
                moreInfo: validation.array()
            })
            return;
        }


        const qp = req.query as GetAllQuery;

        const scoreTableHandler = getScoreTableHandler(qp.tableName);
        if (scoreTableHandler === undefined) {
            res.status(StatusCodes.BAD_REQUEST).send({
                message: "Invalid table name."
            })
            return;
        }

        const result = await scoreTableHandler.getAll({
            centerOn: qp.centerOn ? parseInt(qp.centerOn) : undefined,
            loadCount: qp.loadCount ? parseInt(qp.loadCount) : undefined
        });
        res.status(200).json({
            message: "Success",
            moreInfo: result
        });
        return;
    }
);



interface PostZodSchema {
    tableName: string;
    score: number;
    username: string;
    password: string;
}

const postZodSchema = z.object({
    tableName: z.string().nonempty(),
    score: z.number().int(),
    username: z.string().nonempty().min(1).max(3),
    password: z.string().nonempty()
}) as z.ZodSchema<PostZodSchema>;

expressClient.post("/api/scores", async (req, res) => {
    const requestParseInfo = await postZodSchema.safeParseAsync(req.body);
    if (!requestParseInfo.success) {
        res.status(StatusCodes.BAD_REQUEST).send({
            message: "what is that request lol goofy ahh",
            moreInfo: requestParseInfo.error.errors
        })
        return;
    }

    const requestBody = requestParseInfo.data;

    if (!isCorrectPassword(requestBody.password)) {
        res.status(StatusCodes.FORBIDDEN).send({
            message: "Unauthorized."
        })
        return;
    }


    const scoreTableHandler = getScoreTableHandler(requestBody.tableName);
    if (scoreTableHandler === undefined) {
        res.status(StatusCodes.BAD_REQUEST).send({
            message: "Invalid table name."
        })
        return;
    }


    const result = await scoreTableHandler.post(requestBody);

    res.status(200).json({
        message: "Success",
        moreInfo: result
    });
    return;
})




async function main() {
    prismaClient.$connect();

    const url = `${env.HOST}:${env.PORT}`;
    expressClient.listen(
        env.PORT,
        env.HOST,
        () => {
            console.log(`Server now listening on ${url}.`);
        }
    );
}

main().catch(() => {
    prismaClient.$disconnect();
});