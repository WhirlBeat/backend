import { StatusCodes } from "http-status-codes";
import { env, expressClient, prismaClient } from "@src/global";
import { z } from "zod";
import { query, validationResult } from "express-validator";
import { Prisma } from "@prisma";



interface GetQuery {
    id: number;
}
interface GetPrismaRequest {
    where: { id: number };
}


interface GetManyQuery {
    loadCount: number | undefined;
    centerOn: number | undefined;
}
interface GetManyPrismaRequest {
    cursor?: { id: number };
    take?: number;
    skip?: number;
    orderBy?: { score: Prisma.SortOrder } | Prisma.ScoreTimingFindManyArgs["orderBy"];
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


interface UpdatePlacementsSchema {
    id: number;
    placement: number;
}
interface UpdatePlacementsPrismaRequest {
    where: { id: number };
    data: {
        placement: number;
    };

}

abstract class ScoreTableHandler<Result> {
    public abstract performGet(getPrismaRequest: GetPrismaRequest): Promise<Result>;
    public async get(getQuery: GetQuery) {
        return await this.performGet({
            where: { id: getQuery.id }
        });
    }

    public abstract performGetAll(getManyPrismaRequest: GetManyPrismaRequest): Promise<Result[]>;
    public async getAll(getManyQuery: GetManyQuery) {
        const take = getManyQuery.loadCount ?? 10;
        const orderBy: { placement: Prisma.SortOrder } = { placement: "asc" };

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

    public abstract performUpdatePlacements(updatePlacementsPrismaRequest: UpdatePlacementsPrismaRequest): Prisma.PrismaPromise<Result>;
    public updatePlacements(updatePlacementsSchema: UpdatePlacementsSchema) {
        return this.performUpdatePlacements({
            where: { id: updatePlacementsSchema.id },
            data: {
                placement: updatePlacementsSchema.placement
            }
        });
    }
}


type TimingResult = Prisma.ScoreTimingGetPayload<{}>;
class TimingScoreTable extends ScoreTableHandler<TimingResult> {
    public async performGet(getPrismaRequest: GetPrismaRequest): Promise<TimingResult> {
        return await prismaClient.scoreTiming.findUnique(getPrismaRequest) as TimingResult;
    }

    public async performGetAll(getManyPrismaRequest: GetManyPrismaRequest): Promise<TimingResult[]> {
        return await prismaClient.scoreTiming.findMany(getManyPrismaRequest);
    }

    public async performPost(postPrismaRequest: PostPrismaRequest): Promise<TimingResult> {
        return await prismaClient.scoreTiming.create(postPrismaRequest)
    }

    public performUpdatePlacements(updatePlacementsPrismaRequest: UpdatePlacementsPrismaRequest): Prisma.PrismaPromise<TimingResult> {
        return prismaClient.scoreTiming.update(updatePlacementsPrismaRequest);
    }
}
const timingScoreTable = new TimingScoreTable();



function isCorrectPassword(password: string) {
    return password === env.BACKEND_PASSWORD;
}

function getScoreTableHandler(tableName: string) {
    if (tableName === "timing") return timingScoreTable;
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



async function updatePlacements<Result>(scoreTableHandler: ScoreTableHandler<Result>) {
    const results = await scoreTableHandler.performGetAll({
        orderBy: [
            { score: "desc" },
            { createdOn: "asc"}
        ],
    });

    const transactions: Prisma.PrismaPromise<unknown>[] = [];
    for (let idx = 0; idx < results.length; idx++) {
        const result = results[idx];
        const placement = idx + 1;

        transactions.push(
            scoreTableHandler.updatePlacements({
                id: (result as { id: number }).id,
                placement: placement
            })
        )
    }

    await prismaClient.$transaction(transactions);
}



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


    const initialResult = await scoreTableHandler.post(requestBody);
    await updatePlacements(scoreTableHandler);

    const result = await scoreTableHandler.get({ id: initialResult.id });

    res.status(200).json({
        message: "Success",
        moreInfo: result
    });
    return;
})



expressClient.get(
    "/api/hello",
    query("password").optional().isString(),
    async (req, res) => {
        const validation = validationResult(req);
        if (!validation.isEmpty()) {
            res.status(StatusCodes.BAD_REQUEST).send({
                message: "what is that request lol goofy ahh",
                moreInfo: validation.array()
            })
            return;
        }

        const qp = req.query as { password: string | undefined };
        if (qp.password !== undefined) {
            const isCorrect = isCorrectPassword(qp.password);
            res.status(isCorrect ? StatusCodes.OK : StatusCodes.FORBIDDEN).send({
                message: isCorrect ? "Correct password." : "Incorrect password."
            });
            return;
        }

        res.status(StatusCodes.OK).send({
            "message": "Hello world!"
        })
    }
)




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