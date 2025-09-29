const fastify = require('fastify')({ logger: true })
const { createHash, randomBytes } = require('node:crypto')

async function main () {
  await fastify.register(require('..'))

  fastify.get('/slow', async (req, reply) => {
    const bytes = randomBytes(1e9)

    let hash
    for (let i = 0; i < 1e2; i++) {
      hash = createHash('sha256').update(bytes).digest('hex')
    }

    return { hash }
  })

  await fastify.listen({ port: 3000 })
}

main().catch(console.error)
