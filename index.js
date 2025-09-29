const fp = require('fastify-plugin')
const { performance, monitorEventLoopDelay } = require('node:perf_hooks')

/**
 * Fastify plugin for system metrics and statistics
 * Requires Node.js 20.0.0+
 * @param {import('fastify').FastifyInstance} fastify - Fastify instance
 * @param {Object} options - Configuration options
 * @param {boolean} [options.metricsInMB=false] - Whether to return memory metrics in MB
 * @param {string} [options.uptimeRoute='/uptime'] - Route for uptime endpoint
 * @param {string} [options.metricsRoute='/metrics'] - Route for metrics endpoint
 */
async function fastifyStatistics (fastify, options = {}) {
  const config = {
    metricsInMB: false,
    uptimeRoute: '/uptime',
    metricsRoute: '/metrics',
    ...options
  }

  let eventLoopUtilization = null
  const hasEventLoopUtilization = typeof performance.eventLoopUtilization === 'function'

  if (hasEventLoopUtilization) {
    eventLoopUtilization = performance.eventLoopUtilization()
  }

  const eventLoopDelayHistogram = monitorEventLoopDelay({
    resolution: 10
  })
  eventLoopDelayHistogram.enable()

  const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

  const formatMemoryValue = (value) => {
    return config.metricsInMB ? formatMB(value) : value.toString()
  }

  const sanitizeNumber = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      return 0
    }
    return value
  }

  const getEventLoopUtilization = () => {
    if (!hasEventLoopUtilization || !eventLoopUtilization) {
      return null
    }

    const current = performance.eventLoopUtilization(eventLoopUtilization)
    const utilization = sanitizeNumber(current.utilization)

    return {
      raw: utilization,
      percentage: `${(utilization * 100).toFixed(2)}%`
    }
  }

  fastify.route({
    method: 'GET',
    url: config.uptimeRoute,
    schema: {
      summary: 'Returns process uptime',
      tags: ['statistics'],
      response: {
        200: {
          type: 'object',
          properties: {
            uptime: {
              type: 'number',
              description: 'Uptime in seconds'
            }
          }
        }
      }
    },
    handler: async (req, reply) => {
      return {
        uptime: Math.floor(process.uptime())
      }
    }
  })

  fastify.route({
    method: 'GET',
    url: config.metricsRoute,
    schema: {
      summary: 'Returns memory usage and event loop metrics',
      tags: ['statistics'],
      response: {
        200: {
          type: 'object',
          properties: {
            memory: {
              type: 'object',
              properties: {
                rss: {
                  type: 'string',
                  description: 'Resident Set Size - total physical memory'
                },
                heapTotal: {
                  type: 'string',
                  description: 'V8 heap total'
                },
                heapUsed: {
                  type: 'string',
                  description: 'V8 heap used'
                },
                external: {
                  type: 'string',
                  description: 'Memory external to V8 heap'
                }
              }
            },
            elu: {
              type: 'object',
              properties: {
                raw: {
                  type: 'number',
                  description: 'Event loop utilization as decimal (0-1)'
                },
                percentage: {
                  type: 'string',
                  description: 'Event loop utilization as percentage string (e.g., "15.23%")'
                }
              },
              required: ['raw', 'percentage']
            },
            timestamp: {
              type: 'string',
              description: 'Metrics collection timestamp'
            }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const memoryUsage = process.memoryUsage()
      const elu = getEventLoopUtilization()

      return {
        memory: {
          rss: formatMemoryValue(memoryUsage.rss),
          heapTotal: formatMemoryValue(memoryUsage.heapTotal),
          heapUsed: formatMemoryValue(memoryUsage.heapUsed),
          external: formatMemoryValue(memoryUsage.external)
        },
        elu,
        timestamp: new Date().toISOString()
      }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/stats',
    schema: {
      summary: 'Returns all system statistics',
      tags: ['statistics'],
      response: {
        200: {
          type: 'object',
          properties: {
            uptime: {
              type: 'number',
              description: 'Uptime in seconds'
            },
            memory: {
              type: 'object',
              properties: {
                rss: { type: 'string' },
                heapTotal: { type: 'string' },
                heapUsed: { type: 'string' },
                external: { type: 'string' }
              }
            },
            elu: {
              type: 'object',
              properties: {
                raw: { type: 'number' },
                percentage: { type: 'string' }
              },
              required: ['raw', 'percentage']
            },
            timestamp: { type: 'string' }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const memoryUsage = process.memoryUsage()
      const elu = getEventLoopUtilization()

      return {
        uptime: Math.floor(process.uptime()),
        memory: {
          rss: formatMemoryValue(memoryUsage.rss),
          heapTotal: formatMemoryValue(memoryUsage.heapTotal),
          heapUsed: formatMemoryValue(memoryUsage.heapUsed),
          external: formatMemoryValue(memoryUsage.external)
        },
        elu,
        timestamp: new Date().toISOString()
      }
    }
  })

  fastify.addHook('onClose', (_fastify, done) => {
    eventLoopDelayHistogram.disable()
    done()
  })
}

module.exports = fp(fastifyStatistics, {
  fastify: '5.x',
  name: 'fastify-statistics'
})

module.exports.default = fastifyStatistics
module.exports.fastifyStatistics = fastifyStatistics
