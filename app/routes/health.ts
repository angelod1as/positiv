export async function loader() {
  const startTime = Date.now()

  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: Date.now() - startTime,
    environment: process.env.NODE_ENV || "development",
  }

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}