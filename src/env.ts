import "dotenv/config";
import { parseEnvironmentVariables } from "@absxn/process-env-parser";

const result = parseEnvironmentVariables({
    PORT: {
        parser: parseInt,
        default: 9320
    },
    HOST: {},
    DATABASE_URL: {},
    BACKEND_PASSWORD: {}
});

if (!result.success) throw new Error("Invalid .env file, or you didn't make one yet.");

export const env = result.env;