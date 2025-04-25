import express, { Request } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { StatusCodes } from "http-status-codes";


export const expressClient = express();

export const jsonParser = bodyParser.json();
expressClient.use(cors({
    origin: true,
    credentials: true
}));
expressClient.use(jsonParser);



export function getAuthHeader(req: Request) {
    const authHeader = req.headers['authorization'];
    if (authHeader === undefined || Array.isArray(authHeader)) {
        return undefined;
    }
    const password = authHeader.split(" ")[1];
    return password;
}