import { ENDPOINT_URL, getAuthHeader, isCorrectPassword } from "@src/global"
import { RequestHandler, Request, Response } from "express";
import { query, validationResult } from "express-validator"
import { StatusCodes } from "http-status-codes";
import { z } from "zod";



export const MODE_ENDPOINT_URL = ENDPOINT_URL + "/scores"



export const GET_HANDLERS: RequestHandler[] = [
    query("loadCount").optional().isInt().toInt(),
    query("centerOn").optional().isInt().toInt(),

    async (req, res, next) => {
        const validation = validationResult(req);
        if (!validation.isEmpty()) {
            res.status(StatusCodes.BAD_REQUEST).send({
                message: "what is that request lol goofy ahh",
                moreInfo: validation.array()
            })
            return;
        }

        next();
    }
]

export interface GetQueryString {
    id?: string;
    loadCount?: string;
    centerOn?: string;
}

export interface GetQuery {
    id?: number;
    loadCount?: number;
    centerOn?: number;
}


export interface GetPrismaRequest {
    cursor?: { id: number };
    take?: number;
    skip?: number;
    where?: { id: number }
}

type PerformGet<PrismaGetPayload> = (getPrismaRequest: GetPrismaRequest) => Promise<PrismaGetPayload[]>


export async function generalGet<PrismaGetPayload> (
    getQueryString: GetQueryString,
    performGet: PerformGet<PrismaGetPayload>
) {
    const getQuery = {
        id: getQueryString.id ? parseInt(getQueryString.id) : undefined,
        loadCount: getQueryString.loadCount ? parseInt(getQueryString.loadCount) : undefined,
        centerOn: getQueryString.centerOn ? parseInt(getQueryString.centerOn) : undefined,
    } as GetQuery;

    if (getQuery.id !== undefined) {
        return (await performGet({ where: { id: getQuery.id }}))[0]
    }
    const take = getQuery.loadCount ?? 10;

    if (getQuery.centerOn !== undefined) {
        const before = await performGet({
            cursor: { id: getQuery.centerOn },
            take: - Math.floor(take / 2),
            skip: 1
        });

        const after = await performGet({
            cursor: { id: getQuery.centerOn },
            take: take - before.length,
            skip: 0
        });

        return [...before, ...after];
    }

    return await performGet({
        take: take
    });
}



const authorizationHandler: RequestHandler = (req, res, next) => {
    const password = getAuthHeader(req);
    if (password === undefined) {
        res.status(StatusCodes.FORBIDDEN).send({
            "message": "Missing authorization header. Use \"Bearer xxxxx\"."
        })
        return;
    }


    if (!isCorrectPassword(password)) {
        res.status(StatusCodes.FORBIDDEN).send({
            message: "Unauthorized."
        })
        return;
    }

    next();
}

function getSchemaParseHandler(schema: z.ZodSchema): RequestHandler {
    return async (req, res, next) => {
        const requestParseInfo = await schema.safeParseAsync(req.body);

        if (!requestParseInfo.success) {
            res.status(StatusCodes.BAD_REQUEST).send({
                message: "what is that request lol goofy ahh",
                moreInfo: requestParseInfo.error.errors
            })
            return;
        }

        next();
    }
}


export function getPostHandlers(schema: z.ZodSchema) {
    return [
        authorizationHandler,
        getSchemaParseHandler(schema)
    ]
}



type PerformPost<PostData, PrismaGetPayload> = (postData: PostData) => Promise<PrismaGetPayload>

export async function generalPost<PostData, PrismaGetPayload extends { id: number }>(
    body: unknown,
    schema: z.ZodSchema<PostData>,
    performPost: PerformPost<PostData, PrismaGetPayload>,
    performGetMany: PerformGet<PrismaGetPayload>,
    updatePlacements: () => Promise<void>
) {
    const requestParsed = await schema.parseAsync(body);

    const initialResult = await performPost(requestParsed);
    await updatePlacements();

    return (await performGetMany({ where: { id: initialResult.id }}))[0];
}