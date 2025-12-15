export interface BenchmarkConfig {
  targetUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  concurrentUsers: number;
  duration: number; // seconds
  rampUp: number; // seconds
}

export interface BenchmarkResult {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    requestsPerSecond: number;
    bytesTransferred: number;
  };
  timeline: Array<{
    timestamp: number;
    responseTime: number;
    status: number;
    success: boolean;
  }>;
  errors: Array<{
    message: string;
    count: number;
  }>;
  recommendations: Array<{
    category: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function makeRequest(config: BenchmarkConfig): Promise<{
  responseTime: number;
  status: number;
  success: boolean;
  bytes: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    const fetchOptions: RequestInit = {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    };
    
    if (config.body && ['POST', 'PUT'].includes(config.method)) {
      fetchOptions.body = config.body;
    }
    
    const response = await fetch(config.targetUrl, fetchOptions);
    const responseTime = performance.now() - start;
    const text = await response.text();
    
    return {
      responseTime,
      status: response.status,
      success: response.ok,
      bytes: text.length,
    };
  } catch (error: any) {
    return {
      responseTime: performance.now() - start,
      status: 0,
      success: false,
      bytes: 0,
      error: error.message,
    };
  }
}

export async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  const timeline: BenchmarkResult['timeline'] = [];
  const errors: Map<string, number> = new Map();
  let bytesTransferred = 0;
  
  const startTime = Date.now();
  const endTime = startTime + (config.duration * 1000);
  const rampUpEnd = startTime + (config.rampUp * 1000);
  
  const runRequests = async () => {
    while (Date.now() < endTime) {
      const elapsed = Date.now() - startTime;
      let currentUsers = config.concurrentUsers;
      
      if (elapsed < config.rampUp * 1000) {
        currentUsers = Math.ceil((elapsed / (config.rampUp * 1000)) * config.concurrentUsers);
      }
      
      const promises: Promise<void>[] = [];
      for (let i = 0; i < Math.max(1, currentUsers); i++) {
        promises.push(
          makeRequest(config).then(result => {
            timeline.push({
              timestamp: Date.now() - startTime,
              responseTime: result.responseTime,
              status: result.status,
              success: result.success,
            });
            bytesTransferred += result.bytes;
            
            if (result.error) {
              errors.set(result.error, (errors.get(result.error) || 0) + 1);
            }
          })
        );
      }
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  
  await runRequests();
  
  const responseTimes = timeline.map(t => t.responseTime);
  const successfulRequests = timeline.filter(t => t.success).length;
  const failedRequests = timeline.filter(t => !t.success).length;
  const totalRequests = timeline.length;
  const actualDuration = (timeline[timeline.length - 1]?.timestamp || config.duration * 1000) / 1000;
  
  const summary = {
    totalRequests,
    successfulRequests,
    failedRequests,
    successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
    avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
    minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    p50: percentile(responseTimes, 50),
    p95: percentile(responseTimes, 95),
    p99: percentile(responseTimes, 99),
    requestsPerSecond: actualDuration > 0 ? totalRequests / actualDuration : 0,
    bytesTransferred,
  };
  
  const recommendations = generateRecommendations(summary, config);
  
  return {
    summary,
    timeline,
    errors: Array.from(errors.entries()).map(([message, count]) => ({ message, count })),
    recommendations,
  };
}

function generateRecommendations(
  summary: BenchmarkResult['summary'],
  config: BenchmarkConfig
): BenchmarkResult['recommendations'] {
  const recommendations: BenchmarkResult['recommendations'] = [];
  
  if (summary.successRate < 99) {
    recommendations.push({
      category: 'Reliability',
      title: 'High Error Rate Detected',
      description: 'Success rate is below 99%. Check server logs, increase timeout values, or scale up resources.',
      priority: 'high',
    });
  }
  
  if (summary.p99 > 1000) {
    recommendations.push({
      category: 'Latency',
      title: 'High P99 Latency',
      description: 'P99 latency exceeds 1 second. Consider adding caching, optimizing database queries, or using a CDN.',
      priority: 'high',
    });
  } else if (summary.p99 > 500) {
    recommendations.push({
      category: 'Latency',
      title: 'Moderate P99 Latency',
      description: 'P99 latency is between 500ms-1s. Review slow endpoints and consider async processing.',
      priority: 'medium',
    });
  }
  
  if (summary.p95 > summary.avgResponseTime * 3) {
    recommendations.push({
      category: 'Consistency',
      title: 'High Latency Variance',
      description: 'P95 is significantly higher than average. This indicates inconsistent performance under load.',
      priority: 'medium',
    });
  }
  
  if (summary.requestsPerSecond < 10 && config.concurrentUsers >= 10) {
    recommendations.push({
      category: 'Throughput',
      title: 'Low Throughput',
      description: 'Requests per second is low for the given concurrency. Server may be bottlenecked.',
      priority: 'high',
    });
  }
  
  if (summary.avgResponseTime < 100 && summary.successRate > 99) {
    recommendations.push({
      category: 'Performance',
      title: 'Excellent Performance',
      description: 'Average response time under 100ms with high success rate. Your app handles this load well.',
      priority: 'low',
    });
  }
  
  if (summary.maxResponseTime > summary.avgResponseTime * 10) {
    recommendations.push({
      category: 'Outliers',
      title: 'Extreme Latency Outliers',
      description: 'Some requests take 10x longer than average. Check for cold starts, GC pauses, or connection issues.',
      priority: 'medium',
    });
  }
  
  return recommendations;
}

export function generateBenchmarkReport(result: BenchmarkResult, config: BenchmarkConfig): string {
  const report = `
# Performance Benchmark Report

## Test Configuration
- **Target URL**: ${config.targetUrl}
- **Method**: ${config.method}
- **Concurrent Users**: ${config.concurrentUsers}
- **Duration**: ${config.duration} seconds
- **Ramp-up**: ${config.rampUp} seconds

## Summary Results

| Metric | Value |
|--------|-------|
| Total Requests | ${result.summary.totalRequests.toLocaleString()} |
| Successful | ${result.summary.successfulRequests.toLocaleString()} |
| Failed | ${result.summary.failedRequests.toLocaleString()} |
| Success Rate | ${result.summary.successRate.toFixed(2)}% |
| Requests/sec | ${result.summary.requestsPerSecond.toFixed(2)} |
| Data Transferred | ${(result.summary.bytesTransferred / 1024).toFixed(2)} KB |

## Response Time Analysis

| Percentile | Latency |
|------------|---------|
| Average | ${result.summary.avgResponseTime.toFixed(2)} ms |
| Minimum | ${result.summary.minResponseTime.toFixed(2)} ms |
| P50 (Median) | ${result.summary.p50.toFixed(2)} ms |
| P95 | ${result.summary.p95.toFixed(2)} ms |
| P99 | ${result.summary.p99.toFixed(2)} ms |
| Maximum | ${result.summary.maxResponseTime.toFixed(2)} ms |

## Performance Grade

${getPerformanceGrade(result.summary)}

## Recommendations

${result.recommendations.map(r => `### ${r.priority.toUpperCase()}: ${r.title}
**Category**: ${r.category}
${r.description}
`).join('\n')}

${result.errors.length > 0 ? `## Errors

| Error | Count |
|-------|-------|
${result.errors.map(e => `| ${e.message} | ${e.count} |`).join('\n')}
` : ''}

---
*Generated by IPL Platform Benchmarking Tool*
`;

  return report.trim();
}

function getPerformanceGrade(summary: BenchmarkResult['summary']): string {
  let score = 100;
  
  if (summary.successRate < 99) score -= 30;
  else if (summary.successRate < 99.9) score -= 10;
  
  if (summary.p99 > 1000) score -= 25;
  else if (summary.p99 > 500) score -= 15;
  else if (summary.p99 > 200) score -= 5;
  
  if (summary.avgResponseTime > 500) score -= 20;
  else if (summary.avgResponseTime > 200) score -= 10;
  else if (summary.avgResponseTime > 100) score -= 5;
  
  let grade: string;
  let emoji: string;
  
  if (score >= 90) { grade = 'A'; emoji = '🏆'; }
  else if (score >= 80) { grade = 'B'; emoji = '✅'; }
  else if (score >= 70) { grade = 'C'; emoji = '⚠️'; }
  else if (score >= 60) { grade = 'D'; emoji = '🔶'; }
  else { grade = 'F'; emoji = '❌'; }
  
  return `**Grade: ${grade}** ${emoji} (Score: ${score}/100)`;
}
