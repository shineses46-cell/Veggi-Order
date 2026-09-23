const githubHeaders = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'User-Agent': 'veggi-order-market-scheduler',
  'X-GitHub-Api-Version': '2022-11-28'
});

async function triggerCollection(env, scheduledTime) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: githubHeaders(env.GITHUB_DISPATCH_TOKEN),
    body: JSON.stringify({
      ref: env.GITHUB_REF,
      inputs: { end_offset: '0' }
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub 작업 호출 실패 (${response.status}): ${await response.text()}`);
  }
  console.log(`GitHub 수집 작업 요청 완료: ${new Date(scheduledTime).toISOString()}`);
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(triggerCollection(env, controller.scheduledTime));
  },

  async fetch() {
    // 외부에서 임의로 수집을 시작할 수 없도록, 상태 확인만 제공한다.
    return Response.json({ service: 'Veggi Order market scheduler', status: 'active' });
  }
};
