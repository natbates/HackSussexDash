import { writeFile } from "../../src/util/github.js";
import jwt from "jsonwebtoken";

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
        const { path, base64 } = body;

        if (!path) return { statusCode: 400, body: "Missing 'path' in request" };
        if (!base64) return { statusCode: 400, body: "Missing 'base64' content in request" };

        let content = base64;
        if (base64.includes(',')) {
            content = base64.split(',')[1];
        }
        if (!content) return { statusCode: 400, body: "Invalid base64 content" };

        const decodedSize = content.length * 3 / 4;
        if (decodedSize > 1000000) return { statusCode: 400, body: "File too large, max 1MB" };

        const repo = process.env.GITHUB_REPO;
        const token = process.env.GITHUB_SERVER_TOKEN;

        console.log("Uploading file to repo:", repo, "path:", path);

        if (!repo || !token) {
            console.error("Server misconfigured: missing repo or token");
            return { statusCode: 500, body: "Server misconfigured: missing repo or token" };
        }

        const result = await writeFile(token, repo, path, content);

        console.log("writeFile result:", result);

        if (result.error) {
            console.error("GitHub write failed:", result.error);
            return { statusCode: 500, body: JSON.stringify({ error: result.error }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                url: result.content?.download_url,
                sha: result.content?.sha,
            }),
        };
    } catch (err) {
        console.error("upload-file handler error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
