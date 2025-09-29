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
  t.assert.ok(Number(json.memory.external) >= 0)
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
})

test('fastify-statistics should return valid event loop utilization in metrics', async (t) => {
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

  t.assert.ok(typeof json.elu === 'object')
  t.assert.ok(typeof json.elu.raw === 'number')
  t.assert.ok(typeof json.elu.percentage === 'string')

  t.assert.ok(json.elu.raw >= 0 && json.elu.raw <= 1)
  t.assert.ok(json.elu.percentage.endsWith('%'))

  const percentage = parseFloat(json.elu.percentage.replace('%', ''))
  t.assert.ok(!isNaN(percentage))
  t.assert.ok(percentage >= 0 && percentage <= 100)

  const expectedPercentage = (json.elu.raw * 100).toFixed(2)
  t.assert.equal(json.elu.percentage, `${expectedPercentage}%`)
})

test('fastify-statistics should return valid event loop utilization in stats', async (t) => {
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

  t.assert.ok(typeof json.elu === 'object')
  t.assert.ok(typeof json.elu.raw === 'number')
  t.assert.ok(typeof json.elu.percentage === 'string')

  t.assert.ok(json.elu.raw >= 0 && json.elu.raw <= 1)
  t.assert.ok(json.elu.percentage.endsWith('%'))

  const percentage = parseFloat(json.elu.percentage.replace('%', ''))
  t.assert.ok(!isNaN(percentage))
  t.assert.ok(percentage >= 0 && percentage <= 100)
})

test('fastify-statistics should maintain consistent ELU baseline across multiple calls', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()

  const responses = []
  for (let i = 0; i < 3; i++) {
    const res = await fastify.inject({
      method: 'GET',
      url: '/metrics'
    })
    responses.push(await res.json())

    await new Promise(resolve => setTimeout(resolve, 50))
  }

  const eluValues = responses.map(r => r.elu).filter(elu => elu !== null)

  eluValues.forEach(elu => {
    t.assert.ok(typeof elu.raw === 'number')
    t.assert.ok(elu.raw >= 0 && elu.raw <= 1)
    t.assert.ok(typeof elu.percentage === 'string')
  })
})

test('fastify-statistics should handle event loop utilization with blocked event loop', async (t) => {
  const fastify = Fastify()
  t.after(async () => { await fastify.close() })

  await fastify.register(fastifyStatistics)

  await fastify.ready()

  const baselineRes = await fastify.inject({
    method: 'GET',
    url: '/metrics'
  })
  const baseline = await baselineRes.json()

  const blockStart = Date.now()
  while (Date.now() - blockStart < 100) {
    // Busy wait to block event loop
  }

  const afterBlockRes = await fastify.inject({
    method: 'GET',
    url: '/metrics'
  })
  const afterBlock = await afterBlockRes.json()

  t.assert.ok(afterBlock.elu.raw >= baseline.elu.raw,
    `ELU should increase after blocking: baseline=${baseline.elu.raw}, after=${afterBlock.elu.raw}`)
})
