import jwt from "jsonwebtoken";
import { writeJsonFile } from "../../src/util/github.js";

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
            return { statusCode: 401, body: "Invalid JWT" };
        }

        const body = event.body ? JSON.parse(event.body) : {};
        const { path, data } = body;

        if (!path) return { statusCode: 400, body: "Missing 'path' in request" };
        if (!data) return { statusCode: 400, body: "Missing 'data' in request" };

        const repo = process.env.GITHUB_REPO;
        const token = process.env.GITHUB_SERVER_TOKEN;

        const result = await writeJsonFile(token, repo, path, data);

        if (result.error) {
            console.error("GitHub write failed:", result.error);
            return { statusCode: 500, body: JSON.stringify(result) };
        }

        return { statusCode: 200, body: JSON.stringify({ success: true, result }) };
    } catch (err) {
        console.error("write-json error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
