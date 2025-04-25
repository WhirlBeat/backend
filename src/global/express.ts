import express from "express";
import bodyParser from "body-parser";
import cors from "cors";


export const expressClient = express();

export const jsonParser = bodyParser.json();
expressClient.use(cors({
    origin: true,
    credentials: true
}));
expressClient.use(jsonParser);