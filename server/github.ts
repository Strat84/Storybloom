const { Octokit } = require('@octokit/rest');

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function createOrGetRepository(owner, repoName) {
  const octokit = await getUncachableGitHubClient();
  
  try {
    // Try to get the repository first
    const { data: repo } = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });
    return repo;
  } catch (error) {
    if (error.status === 404) {
      // Repository doesn't exist, create it
      const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: "StoryMagic - AI-powered children's storybook creator",
        private: false,
      });
      return repo;
    }
    throw error;
  }
}

async function commitToRepository(owner, repoName, files, message) {
  const octokit = await getUncachableGitHubClient();
  
  // Check if repository has any commits
  let hasCommits = false;
  let currentCommitSha;
  
  try {
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
    });
    currentCommitSha = ref.object.sha;
    hasCommits = true;
  } catch (error) {
    if (error.status === 409 || error.status === 404) {
      hasCommits = false;
    } else {
      throw error;
    }
  }
  
  // Create blobs first before creating tree
  const blobs = [];
  for (const file of files) {
    try {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo: repoName,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      blobs.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    } catch (error) {
      if (error.status !== 409) { // Skip if blob already exists
        throw error;
      }
    }
  }
  
  // Create tree
  const { data: tree } = await octokit.rest.git.createTree({
    owner,
    repo: repoName,
    tree: blobs,
  });
  
  // Create commit
  const commitData = {
    owner,
    repo: repoName,
    message,
    tree: tree.sha,
  };
  
  if (hasCommits) {
    commitData.parents = [currentCommitSha];
  }
  
  const { data: commit } = await octokit.rest.git.createCommit(commitData);
  
  // Create or update reference
  if (hasCommits) {
    await octokit.rest.git.updateRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
      sha: commit.sha,
    });
  } else {
    await octokit.rest.git.createRef({
      owner,
      repo: repoName,
      ref: 'refs/heads/main',
      sha: commit.sha,
    });
  }
  
  return commit;
}

async function createGitTree(octokit, owner, repoName, files) {
  // Create blobs for all files
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo: repoName,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      return {
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      };
    })
  );
  
  // Create tree
  const { data: tree } = await octokit.rest.git.createTree({
    owner,
    repo: repoName,
    tree: blobs,
  });
  
  return tree;
}

module.exports = { 
  getUncachableGitHubClient, 
  createOrGetRepository, 
  commitToRepository 
};