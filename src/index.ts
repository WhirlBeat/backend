import { env } from "./env";
import { expressClient } from "./express";

async function main() {
    expressClient.use(asyncErrorHandler);
    prismaClient.$connect();
    setLogger(pino({ level: "debug" }, streams));

    expressListRoutes(expressClient);

    const url = `${env.HOST}:${env.PORT}`;
    expressClient.listen(
        env.PORT,
        env.HOST,
        () => {
            ensureAdmin();
            console.log(`Server now listening on ${url}.`);
        }
    );
}

main().catch(() => {
    prismaClient.$disconnect();
});