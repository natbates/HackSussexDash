exports.handler = async (event) => {
  console.log("=== Incoming OAuth Callback ===");

  // Log query parameters
  console.log("Raw queryStringParameters:", event.queryStringParameters);

  const code = event.queryStringParameters?.code;
  console.log("Provided code:", code || "(missing)");

  if (!code) {
    return { statusCode: 400, body: "Missing code parameter" };
  }

  // Log env vars *without exposing secrets*
  console.log("Env GITHUB_CLIENT_ID exists:", !!process.env.GITHUB_CLIENT_ID);
  console.log("Env GITHUB_CLIENT_SECRET exists:", !!process.env.GITHUB_CLIENT_SECRET);

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    code,
  });

  console.log("Token exchange request body:", params.toString());

  console.log("=== Requesting access token from GitHub ===");
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    body: params,
    headers: { Accept: "application/json" },
  });

  console.log("GitHub token response HTTP status:", tokenRes.status);

  const tokenJson = await tokenRes.json();
  console.log("GitHub token response JSON:", tokenJson);

  const { access_token } = tokenJson;

  if (!access_token) {
    console.log("❌ No access token received from GitHub");
    return { statusCode: 401, body: "No access token" };
  }

  console.log("✔ Received access token");

  console.log("=== Requesting GitHub user info ===");
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `token ${access_token}` },
  });
  console.log("GitHub user response status:", userRes.status);

  const user = await userRes.json();
  console.log("GitHub user JSON:", user);

  if (!user.login) {
    console.log("❌ Missing user.login — token likely invalid");
    return { statusCode: 401, body: "Invalid access token" };
  }

  console.log(`✔ GitHub user detected: ${user.login}`);

  console.log("=== Checking collaborator status ===");
  const collabUrl = `https://api.github.com/repos/${process.env.GITHUB_REPO}/collaborators/${user.login}`;
  console.log("Collaborator check URL:", collabUrl);

  const collabRes = await fetch(collabUrl, {
    headers: { Authorization: `token ${access_token}` },
  });

  console.log("Collaborator check status:", collabRes.status);

  if (collabRes.status !== 204) {
    console.log("❌ User is NOT a collaborator");
    return { statusCode: 403, body: "Not a collaborator" };
  }

  console.log("✔ User is a collaborator");

  return {
    statusCode: 200,
    body: JSON.stringify({ access_token, user }),
  };
};
