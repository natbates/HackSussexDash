// githubWrite.js

export async function writeJsonFile(token, repo, path, updatedData) {
    try {
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;
        let sha = null;

        try {
            const fileRes = await fetch(url, {
                headers: { Authorization: `token ${token}` }
            });
            if (fileRes.ok) {
                const fileData = await fileRes.json();
                sha = fileData.sha;
            }
        } catch (err) {
        }

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(updatedData, null, 2))));

        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `${sha ? "Update" : "Create"} ${path}`,
                content,
                sha: sha || undefined
            })
        });

        if (!putRes.ok) {
            const errText = await putRes.text();
            throw new Error(`Failed to write file: ${putRes.status} ${putRes.statusText} - ${errText}`);
        }

        return await putRes.json();
    } catch (err) {
        console.error("writeJsonFile error:", err);
        return { error: err.message };
    }
}

export async function writeFile(token, repo, path, base64Content) {
    try {
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;
        let sha = null;

        try {
            const res = await fetch(url, {
                headers: { Authorization: `token ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                sha = data.sha;
            }
        } catch { }

        const putRes = await fetch(url, {
            method: "PUT",
            headers: { Authorization: `token ${token}` },
            body: JSON.stringify({
                message: `${sha ? "Update" : "Create"} ${path}`,
                content: base64Content.split(",")[1],
                sha: sha || undefined
            })
        });

        if (!putRes.ok) {
            const errText = await putRes.text();
            throw new Error(`Failed to upload file: ${putRes.status} ${putRes.statusText} - ${errText}`);
        }

        return await putRes.json();
    } catch (err) {
        console.error("writeFile error:", err);
        return { error: err.message };
    }
}

export async function readJsonFile(token, repo, path) {
    try {
        const url = `https://api.github.com/repos/${repo}/contents/${path}?v=${Date.now()}`;
        const res = await fetch(url, {
            headers: {
                Authorization: `token ${token}`,
            }
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText} - ${errText}`);
        }

        const data = await res.json();
        const content = atob(data.content);
        return JSON.parse(content);
    } catch (err) {
        console.error("readJsonFile error:", err);
        return null;
    }
}


export async function deleteFile(token, repo, path, branch = "main") {
    try {
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;

        const getRes = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });

        if (!getRes.ok) {
            const errText = await getRes.text();
            throw new Error(`Failed to fetch file for delete: ${getRes.status} ${getRes.statusText} - ${errText}`);
        }

        const fileData = await getRes.json();
        const sha = fileData.sha;

        const delRes = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Delete ${path}`,
                sha,
                branch
            })
        });

        if (!delRes.ok) {
            const errText = await delRes.text();
            throw new Error(`Failed to delete file: ${delRes.status} ${delRes.statusText} - ${errText}`);
        }

        return await delRes.json();
    } catch (err) {
        console.error("deleteFile error:", err);
        return { error: err.message };
    }
}

export const createCommit = async (token, repo, branch, files, message) => {
    if (!token) {
        throw new Error("No GitHub token provided");
    }

    const headers = {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
    };

    try {
        const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, { headers });
        if (!refRes.ok) throw new Error("Failed to get branch ref");
        const refData = await refRes.json();
        const commitSha = refData.object.sha;

        const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${commitSha}`, { headers });
        if (!commitRes.ok) throw new Error("Failed to get commit object");
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        const treeRes = await fetch(
            `https://api.github.com/repos/${repo}/git/trees/${baseTreeSha}?recursive=1`,
            { headers }
        );
        if (!treeRes.ok) throw new Error("Failed to get base tree");
        const baseTreeData = await treeRes.json();
        const baseTree = baseTreeData.tree;

        const treeChanges = [];

        for (const file of files) {

            if (file.delete) {
                treeChanges.push({
                    path: file.path,
                    mode: "100644",
                    type: "blob",
                    sha: null
                });
                continue;
            }

            const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    content: file.content,
                    encoding: file.encoding || "base64",
                }),
            });

            if (!blobRes.ok) throw new Error(`Failed to create blob for ${file.path}`);

            const blobData = await blobRes.json();

            treeChanges.push({
                path: file.path,
                mode: "100644",
                type: "blob",
                sha: blobData.sha,
            });
        }


        const newTreeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: treeChanges
            }),
        });

        if (!newTreeRes.ok) {
            const errText = await newTreeRes.text();
            throw new Error(`Failed to create new tree: ${errText}`);
        }

        const newTreeData = await newTreeRes.json();

        const commitRes2 = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                message,
                tree: newTreeData.sha,
                parents: [commitSha],
            }),
        });
        if (!commitRes2.ok) throw new Error("Failed to create commit");

        const newCommit = await commitRes2.json();

        const updateRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                sha: newCommit.sha,
                force: true
            }),
        });
        if (!updateRes.ok) {
            const errText = await updateRes.text();
            throw new Error(`Failed to update branch ref: ${updateRes.status} ${updateRes.statusText} - ${errText}`);
        }

        return newCommit;

    } catch (error) {
        console.error(error);
        throw error;
    }
};