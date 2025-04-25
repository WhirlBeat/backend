import { StatusCodes } from "http-status-codes";
import { env, expressClient, getAuthHeader, isCorrectPassword, prismaClient } from "@src/global";
import { query, validationResult } from "express-validator";
import "@src/modes";



expressClient.get(
    "/api/hello",
    async (req, res) => {
        const password = getAuthHeader(req);
        if (password !== undefined) {
            const isCorrect = isCorrectPassword(password);
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