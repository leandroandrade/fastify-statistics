const fp = require('fastify-plugin')

/**
 * Fastify plugin for system metrics and statistics
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

  const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

  const formatMemoryValue = (value) => {
    return config.metricsInMB ? formatMB(value) : value.toString()
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
      summary: 'Returns memory usage metrics',
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

      return {
        memory: {
          rss: formatMemoryValue(memoryUsage.rss),
          heapTotal: formatMemoryValue(memoryUsage.heapTotal),
          heapUsed: formatMemoryValue(memoryUsage.heapUsed),
          external: formatMemoryValue(memoryUsage.external)
        },
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
            timestamp: { type: 'string' }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const memoryUsage = process.memoryUsage()

      return {
        uptime: Math.floor(process.uptime()),
        memory: {
          rss: formatMemoryValue(memoryUsage.rss),
          heapTotal: formatMemoryValue(memoryUsage.heapTotal),
          heapUsed: formatMemoryValue(memoryUsage.heapUsed),
          external: formatMemoryValue(memoryUsage.external)
        },
        timestamp: new Date().toISOString()
      }
    }
  })
}

module.exports = fp(fastifyStatistics, {
  fastify: '>=4.x',
  name: 'fastify-statistics'
})

module.exports.default = fastifyStatistics
module.exports.fastifyStatistics = fastifyStatistics
