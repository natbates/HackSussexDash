const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const GITHUB_SERVER_TOKEN = process.env.GITHUB_SERVER_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;

exports.handler = async (event) => {
  try {
    const code = event.queryStringParameters?.code;
    if (!code) return { statusCode: 400, body: "Missing code" };

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    });

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      body: params,
      headers: { Accept: "application/json" },
    });

    const { access_token } = await tokenRes.json();
    if (!access_token) return { statusCode: 401, body: "OAuth token failed" };

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user = await userRes.json();
    if (!user.login) return { statusCode: 401, body: "Invalid user token" };

    const collabUrl = `https://api.github.com/repos/${GITHUB_REPO}/collaborators/${user.login}`;
    const collabRes = await fetch(collabUrl, {
      headers: { Authorization: `token ${GITHUB_SERVER_TOKEN}` },
    });

    if (collabRes.status !== 204) {
      return {
        statusCode: 403,
        body: JSON.stringify({ authorized: false, message: "Not a collaborator" }),
      };
    }

    const token = jwt.sign(
      { username: user.login },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        authorized: true,
        username: user.login,
        token,
      }),
    };
  } catch (err) {
    console.error("OAuth callback error:", err);
    return { statusCode: 500, body: "Internal server error" };
  }
};
