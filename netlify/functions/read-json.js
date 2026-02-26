import jwt from "jsonwebtoken";
import { readJsonFile } from "../../src/util/github.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const handler = async (event) => {
    try {
        const tokenHeader = event.headers["authorization"];
        if (!tokenHeader) return { statusCode: 401, body: "No JWT provided" };

        const jwtToken = tokenHeader.replace("Bearer ", "");

        let user;
        try {
            user = jwt.verify(jwtToken, JWT_SECRET);
        } catch (err) {
            console.error("Invalid JWT:", err);
            if (err.name === "TokenExpiredError") {
                return { statusCode: 401, body: JSON.stringify({ error: "JWT_EXPIRED" }) };
            }
            return { statusCode: 401, body: JSON.stringify({ error: "INVALID_JWT" }) };
        }

        const body = event.body ? JSON.parse(event.body) : {};
        const path = body?.path;
        if (!path) return { statusCode: 400, body: JSON.stringify({ error: "MISSING_PATH" }) };

        const repo = process.env.GITHUB_REPO;
        const data = await readJsonFile(process.env.GITHUB_SERVER_TOKEN, repo, path);

        if (!data) return { statusCode: 404, body: JSON.stringify({ error: "FILE_NOT_FOUND" }) };

        return { statusCode: 200, body: JSON.stringify({ data }) };
    } catch (err) {
        console.error("read-json error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
