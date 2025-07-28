const { test } = require('node:test')
const fastifyStatistics = require('..')
const Fastify = require('fastify')

test('fastify-statistics is correctly defined', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()
})

test('fastify-statistics should return uptime', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()

  const res = await fastify.inject({
    method: 'GET',
    url: '/uptime'
  })

  t.assert.equal(res.statusCode, 200)

  const json = await res.json()
  t.assert.ok(typeof json.uptime === 'number')
  t.assert.ok(json.uptime >= 0)
})

test('fastify-statistics should return metrics in bytes by default', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()

  const res = await fastify.inject({
    method: 'GET',
    url: '/metrics'
  })

  t.assert.equal(res.statusCode, 200)

  const json = await res.json()
  t.assert.ok(json.memory)
  t.assert.ok(json.timestamp)

  t.assert.ok(typeof json.memory.rss === 'string')
  t.assert.ok(typeof json.memory.heapTotal === 'string')
  t.assert.ok(typeof json.memory.heapUsed === 'string')
  t.assert.ok(typeof json.memory.external === 'string')

  t.assert.ok(!isNaN(Number(json.memory.rss)))
  t.assert.ok(!isNaN(Number(json.memory.heapTotal)))
  t.assert.ok(!isNaN(Number(json.memory.heapUsed)))
  t.assert.ok(!isNaN(Number(json.memory.external)))

  t.assert.ok(new Date(json.timestamp).toISOString() === json.timestamp)
})

test('fastify-statistics should return metrics in MB', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics, {
    metricsInMB: true
  })

  await fastify.ready()

  const res = await fastify.inject({
    method: 'GET',
    url: '/metrics'
  })

  t.assert.equal(res.statusCode, 200)

  const json = await res.json()
  t.assert.ok(json.memory)
  t.assert.ok(json.timestamp)

  t.assert.ok(json.memory.rss.endsWith(' MB'))
  t.assert.ok(json.memory.heapTotal.endsWith(' MB'))
  t.assert.ok(json.memory.heapUsed.endsWith(' MB'))
  t.assert.ok(json.memory.external.endsWith(' MB'))

  const rssValue = parseFloat(json.memory.rss.replace(' MB', ''))
  t.assert.ok(!isNaN(rssValue) && rssValue > 0)
})

test('fastify-statistics should return combined stats', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()

  const res = await fastify.inject({
    method: 'GET',
    url: '/stats'
  })

  t.assert.equal(res.statusCode, 200)

  const json = await res.json()

  t.assert.ok(typeof json.uptime === 'number')
  t.assert.ok(json.uptime >= 0)

  t.assert.ok(json.memory)
  t.assert.ok(typeof json.memory.rss === 'string')
  t.assert.ok(typeof json.memory.heapTotal === 'string')
  t.assert.ok(typeof json.memory.heapUsed === 'string')
  t.assert.ok(typeof json.memory.external === 'string')

  // Verify timestamp
  t.assert.ok(json.timestamp)
  t.assert.ok(new Date(json.timestamp).toISOString() === json.timestamp)
})

test('fastify-statistics should work with custom routes', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics, {
    uptimeRoute: '/api/uptime',
    metricsRoute: '/api/metrics'
  })

  await fastify.ready()

  const uptimeRes = await fastify.inject({
    method: 'GET',
    url: '/api/uptime'
  })
  t.assert.equal(uptimeRes.statusCode, 200)

  const uptimeJson = await uptimeRes.json()
  t.assert.ok(typeof uptimeJson.uptime === 'number')

  const metricsRes = await fastify.inject({
    method: 'GET',
    url: '/api/metrics'
  })
  t.assert.equal(metricsRes.statusCode, 200)

  const metricsJson = await metricsRes.json()
  t.assert.ok(metricsJson.memory)
  t.assert.ok(metricsJson.timestamp)

  const defaultUptimeRes = await fastify.inject({
    method: 'GET',
    url: '/uptime'
  })
  t.assert.equal(defaultUptimeRes.statusCode, 404)

  const defaultMetricsRes = await fastify.inject({
    method: 'GET',
    url: '/metrics'
  })
  t.assert.equal(defaultMetricsRes.statusCode, 404)
})

test('fastify-statistics should throw errors when memory usage fails', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)
  await fastify.ready()

  const originalMemoryUsage = process.memoryUsage
  process.memoryUsage = () => {
    throw new Error('Memory usage error')
  }

  t.after(() => {
    process.memoryUsage = originalMemoryUsage
  })

  // Test metrics endpoint error handling - should return 500 due to unhandled error
  const metricsRes = await fastify.inject({
    method: 'GET',
    url: '/metrics'
  })
  t.assert.equal(metricsRes.statusCode, 500)

  const statsRes = await fastify.inject({
    method: 'GET',
    url: '/stats'
  })
  t.assert.equal(statsRes.statusCode, 500)
})

test('fastify-statistics should work with metricsInMB in stats endpoint', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics, {
    metricsInMB: true
  })

  await fastify.ready()

  const res = await fastify.inject({
    method: 'GET',
    url: '/stats'
  })

  t.assert.equal(res.statusCode, 200)

  const json = await res.json()

  t.assert.ok(json.memory.rss.endsWith(' MB'))
  t.assert.ok(json.memory.heapTotal.endsWith(' MB'))
  t.assert.ok(json.memory.heapUsed.endsWith(' MB'))
  t.assert.ok(json.memory.external.endsWith(' MB'))
})

test('fastify-statistics should validate memory values are positive', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()

  const res = await fastify.inject({
    method: 'GET',
    url: '/metrics'
  })

  const json = await res.json()

  t.assert.ok(Number(json.memory.rss) > 0)
  t.assert.ok(Number(json.memory.heapTotal) > 0)
  t.assert.ok(Number(json.memory.heapUsed) > 0)
  t.assert.ok(Number(json.memory.external) >= 0) // external can be 0
})

test('fastify-statistics should handle different HTTP methods correctly', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()

  const postRes = await fastify.inject({
    method: 'POST',
    url: '/uptime'
  })
  t.assert.equal(postRes.statusCode, 404)

  const putRes = await fastify.inject({
    method: 'PUT',
    url: '/metrics'
  })
  t.assert.equal(putRes.statusCode, 404)

  const deleteRes = await fastify.inject({
    method: 'DELETE',
    url: '/stats'
  })
  t.assert.equal(deleteRes.statusCode, 404)
})

test('fastify-statistics should have consistent timestamp format', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()

  const metricsRes = await fastify.inject({
    method: 'GET',
    url: '/metrics'
  })

  const statsRes = await fastify.inject({
    method: 'GET',
    url: '/stats'
  })

  const metricsJson = await metricsRes.json()
  const statsJson = await statsRes.json()

  const metricsTime = new Date(metricsJson.timestamp)
  const statsTime = new Date(statsJson.timestamp)

  t.assert.ok(metricsTime instanceof Date && !isNaN(metricsTime))
  t.assert.ok(statsTime instanceof Date && !isNaN(statsTime))

  const now = Date.now()
  const metricsAge = now - metricsTime.getTime()
  const statsAge = now - statsTime.getTime()

  t.assert.ok(metricsAge < 5000)
  t.assert.ok(statsAge < 5000)
})
