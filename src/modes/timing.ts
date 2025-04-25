import { expressClient, prismaClient } from "@src/global";
import { generalGet, generalPost, GET_HANDLERS, getPostHandlers, GetPrismaRequest, GetQueryString, MODE_ENDPOINT_URL } from "./base";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { Prisma } from "@prisma";



const ENDPOINT = MODE_ENDPOINT_URL + "/timing";


const performGet = async (getPrismaRequest: GetPrismaRequest) => {
    return await prismaClient.scoreTiming.findMany({
        ...getPrismaRequest,
        orderBy: { placement: "asc" },
    })
}

const performPost = async (postData: TimingPostData) => {
    return await prismaClient.scoreTiming.create({
        data: postData
    })
}

async function updatePlacements() {
    const results = await prismaClient.scoreTiming.findMany({
        orderBy: [
            { score: "desc" },
            { createdOn: "asc"}
        ],
    })

    const transactions: Prisma.PrismaPromise<unknown>[] = [];
    for (let idx = 0; idx < results.length; idx++) {
        const result = results[idx];
        const placement = idx + 1;

        transactions.push(
            prismaClient.scoreTiming.update({
                where: { id: result.id },
                data: {
                    placement: placement
                }
            })
        )
    }

    await prismaClient.$transaction(transactions);
}



expressClient.get(ENDPOINT, ...GET_HANDLERS, async (req, res) => {
    const result = await generalGet(req.query as GetQueryString, performGet);

    res.status(200).json({
        message: "Success",
        moreInfo: result
    });
    return;
})



interface TimingPostData {
    score: number;
    username: string;
    multiplier?: number;
    mods?: string[];
}

const timingPostDataSchema = z.object({
    score: z.number().int(),
    username: z.string().nonempty().min(1).max(3),
    multiplier: z.number().optional(),
    mods: z.string().array().optional()
}) as z.ZodSchema<TimingPostData>;

expressClient.post(ENDPOINT, ...getPostHandlers(timingPostDataSchema), async (req, res) => {
    const result = await generalPost(
        req.body, timingPostDataSchema,
        performPost, performGet,
        updatePlacements
    )

    res.status(200).json({
        message: "Success",
        moreInfo: result
    });
    return;
})