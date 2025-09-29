# fastify-statistics

A lightweight Fastify plugin that provides system statistics and metrics endpoints for monitoring your Node.js application, including memory usage and event loop utilization metrics.

## Installation

```bash
npm install fastify-statistics
```

## Usage

Add it to your project with register and you are done!

```javascript
const fastify = require('fastify')({ logger: true })

// Register the plugin
await fastify.register(require('fastify-statistics'))

// Start the server
await fastify.listen({ port: 3000 })
```

## API Endpoints

### GET /uptime

Returns the application uptime in seconds.

**Response:**
```json
{
  "uptime": 3600
}
```

### GET /metrics

Returns memory usage metrics, event loop utilization, and timestamp.

**Response (default - bytes):**
```json
{
  "memory": {
    "rss": "52428800",
    "heapTotal": "20971520",
    "heapUsed": "18874368",
    "external": "1089024"
  },
  "elu": {
    "raw": 0.05,
    "percentage": "5.00%"
  },
  "timestamp": "2025-07-25T10:30:00.000Z"
}
```

**Response (MB format):**
```json
{
  "memory": {
    "rss": "50.00 MB",
    "heapTotal": "20.00 MB",
    "heapUsed": "18.00 MB",
    "external": "1.04 MB"
  },
  "elu": {
    "raw": 0.05,
    "percentage": "5.00%"
  },
  "timestamp": "2025-07-25T10:30:00.000Z"
}
```

### GET /stats

Returns combined statistics including uptime, memory metrics, event loop utilization, and timestamp.

**Response:**
```json
{
  "uptime": 3600,
  "memory": {
    "rss": "52428800",
    "heapTotal": "20971520",
    "heapUsed": "18874368",
    "external": "1089024"
  },
  "elu": {
    "raw": 0.05,
    "percentage": "5.00%"
  },
  "timestamp": "2025-07-25T10:30:00.000Z"
}
```

## Configuration Options

```javascript
await fastify.register(require('fastify-statistics'), {
  // Format memory values in MB instead of bytes
  metricsInMB: true,
  
  // Customize route paths
  uptimeRoute: '/api/uptime',
  metricsRoute: '/api/metrics'
})
```

### Options

| Option          | Type        | Default      | Description                                    |
|-----------------|-------------|--------------|------------------------------------------------|
| `metricsInMB`   | `boolean`   | `false`      | Format memory values in MB instead of bytes    |
| `uptimeRoute`   | `string`    |  `'/uptime'` | Custom path for uptime endpoint                |
| `metricsRoute`  | `string`    | `'/metrics'` | Custom path for metrics endpoint               |

## Examples

### Basic Usage

```javascript
const fastify = require('fastify')({ logger: true })

await fastify.register(require('fastify-statistics'))

await fastify.listen({ port: 3000 })

// Test the endpoints
// GET http://localhost:3000/uptime
// GET http://localhost:3000/metrics
// GET http://localhost:3000/stats
```

### Custom Configuration

```javascript
const fastify = require('fastify')({ logger: true })

await fastify.register(require('fastify-statistics'), {
  metricsInMB: true,
  uptimeRoute: '/health/uptime',
  metricsRoute: '/health/metrics'
})

await fastify.listen({ port: 3000 })

// Endpoints are now available at:
// GET http://localhost:3000/health/uptime
// GET http://localhost:3000/health/metrics
// GET http://localhost:3000/stats (always available)
```


## Metrics Explained

### Memory Metrics

| Metric      | Description                                                          |
|-------------|----------------------------------------------------------------------|
| `rss`       | Resident  Set Size - Total physical memory used by the process       |
| `heapTotal` | Total V8 heap size allocated                                         |
| `heapUsed`  | V8 heap memory currently in use                                      |
| `external`  | Memory used by C++ objects bound to JavaScript objects managed by V8 |

### Event Loop Utilization (ELU)

Event Loop Utilization provides insights into how much time the event loop is spending on synchronous work vs. waiting for I/O operations.

| Field            | Type     | Description                                                      |
|------------------|----------|------------------------------------------------------------------|
| `elu.raw`        | `number` | Event loop utilization as a decimal between 0 and 1              |
| `elu.percentage` | `string` | Event loop utilization formatted as a percentage (e.g., "5.00%") |

## Error Handling

The plugin follows Fastify's error handling patterns. If system metrics cannot be retrieved, errors will be thrown and handled by Fastify's default error handler.

## License

[MIT License](https://github.com/leandroandrade/fastify-statistics/blob/main/LICENSE/)
