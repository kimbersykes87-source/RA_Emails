// Simplest possible worker to test deployment
export default {
  async fetch(request, env, ctx) {
    return new Response('Hello from worker!', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

