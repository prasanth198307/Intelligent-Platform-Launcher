export interface CostOptimizerContext {
  domain: string;
  tier: string;
  cloudProvider: string;
  currentCost: number;
  appServers: number;
  dbReplicas: number;
  cacheNodes: number;
  storageGB: number;
  monthlyEgressGB: number;
}

interface Recommendation {
  category: string;
  title: string;
  description: string;
  estimatedSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  implementation: string[];
}

interface CostOptimizationReport {
  currentMonthlyCost: number;
  optimizedMonthlyCost: number;
  totalSavings: number;
  savingsPercentage: number;
  recommendations: Recommendation[];
  quickWins: Recommendation[];
  longTermOptimizations: Recommendation[];
}

export function generateCostOptimizations(ctx: CostOptimizerContext): CostOptimizationReport {
  const recommendations: Recommendation[] = [];
  let totalSavings = 0;
  
  if (ctx.appServers >= 2) {
    const savings = ctx.currentCost * 0.3 * 0.4;
    totalSavings += savings;
    recommendations.push({
      category: 'Compute',
      title: 'Use Spot/Preemptible Instances',
      description: 'Replace 30-40% of on-demand instances with spot instances for non-critical workloads',
      estimatedSavings: Math.round(savings),
      effort: 'medium',
      impact: 'high',
      implementation: [
        'Identify stateless, fault-tolerant workloads suitable for spot instances',
        `Configure ${ctx.cloudProvider === 'aws' ? 'EC2 Spot Fleet' : ctx.cloudProvider === 'azure' ? 'Azure Spot VMs' : 'Preemptible VMs'}`,
        'Implement graceful shutdown handling for spot termination',
        'Use mixed instance types to improve availability',
        'Set up automatic fallback to on-demand when spot unavailable',
      ],
    });
  }
  
  {
    const savings = ctx.currentCost * 0.15;
    totalSavings += savings;
    recommendations.push({
      category: 'Compute',
      title: 'Right-size Compute Resources',
      description: 'Analyze actual CPU and memory usage to optimize instance sizes',
      estimatedSavings: Math.round(savings),
      effort: 'low',
      impact: 'medium',
      implementation: [
        'Enable detailed monitoring for CPU, memory, and network metrics',
        'Analyze 30-day usage patterns to identify over-provisioned resources',
        'Downsize instances with <40% average utilization',
        `Use ${ctx.cloudProvider === 'aws' ? 'AWS Compute Optimizer' : ctx.cloudProvider === 'azure' ? 'Azure Advisor' : 'Google Cloud Recommender'}`,
        'Implement auto-scaling based on actual demand',
      ],
    });
  }
  
  if (ctx.tier !== 'Small') {
    const savings = ctx.currentCost * 0.25;
    totalSavings += savings;
    recommendations.push({
      category: 'Commitment',
      title: 'Reserved Instance/Savings Plans',
      description: 'Commit to 1-3 year reserved capacity for predictable workloads',
      estimatedSavings: Math.round(savings),
      effort: 'low',
      impact: 'high',
      implementation: [
        'Analyze baseline compute needs over past 6 months',
        'Purchase 1-year reserved instances for stable workloads (30-40% savings)',
        'Consider 3-year commitment for 50-60% savings if applicable',
        `Use ${ctx.cloudProvider === 'aws' ? 'AWS Savings Plans' : ctx.cloudProvider === 'azure' ? 'Azure Reservations' : 'Committed Use Discounts'}`,
        'Set up renewal alerts 60 days before expiration',
      ],
    });
  }
  
  if (ctx.storageGB > 1000) {
    const savings = ctx.storageGB * 0.015;
    totalSavings += savings;
    recommendations.push({
      category: 'Storage',
      title: 'Implement Storage Tiering',
      description: 'Move infrequently accessed data to cheaper storage tiers',
      estimatedSavings: Math.round(savings),
      effort: 'medium',
      impact: 'medium',
      implementation: [
        'Analyze data access patterns to identify cold data',
        `Enable ${ctx.cloudProvider === 'aws' ? 'S3 Intelligent Tiering' : ctx.cloudProvider === 'azure' ? 'Blob Storage Tiering' : 'Cloud Storage Classes'}`,
        'Move data not accessed for 30+ days to infrequent access tier',
        'Archive data not accessed for 90+ days to glacier/archive tier',
        'Implement lifecycle policies for automatic tiering',
      ],
    });
  }
  
  if (ctx.monthlyEgressGB > 1000) {
    const savings = ctx.monthlyEgressGB * 0.05;
    totalSavings += savings;
    recommendations.push({
      category: 'Network',
      title: 'Optimize Data Transfer',
      description: 'Reduce egress costs through CDN and compression',
      estimatedSavings: Math.round(savings),
      effort: 'medium',
      impact: 'medium',
      implementation: [
        'Implement CDN for static assets and cacheable content',
        'Enable gzip/brotli compression for API responses',
        'Use regional endpoints to minimize cross-region transfers',
        'Implement data compression for large payloads',
        'Consider Private Link for inter-service communication',
      ],
    });
  }
  
  if (ctx.dbReplicas > 0) {
    const savings = ctx.currentCost * 0.1;
    totalSavings += savings;
    recommendations.push({
      category: 'Database',
      title: 'Database Optimization',
      description: 'Optimize database usage and consider serverless options',
      estimatedSavings: Math.round(savings),
      effort: 'medium',
      impact: 'medium',
      implementation: [
        'Analyze query patterns and add appropriate indexes',
        'Consider Aurora Serverless/Azure SQL Serverless for variable workloads',
        'Implement connection pooling to reduce connection overhead',
        'Review and optimize expensive queries',
        'Consider read replicas in same region to reduce primary load',
      ],
    });
  }
  
  {
    const savings = ctx.currentCost * 0.08;
    totalSavings += savings;
    recommendations.push({
      category: 'Operations',
      title: 'Scheduled Scaling',
      description: 'Scale down resources during off-peak hours',
      estimatedSavings: Math.round(savings),
      effort: 'low',
      impact: 'medium',
      implementation: [
        'Identify off-peak hours from traffic analysis',
        'Implement scheduled scaling for non-production environments',
        'Scale down dev/staging environments outside business hours',
        'Use auto-scaling with aggressive scale-down policies',
        'Shut down non-critical services during nights/weekends',
      ],
    });
  }
  
  {
    const savings = ctx.currentCost * 0.05;
    totalSavings += savings;
    recommendations.push({
      category: 'Cleanup',
      title: 'Remove Unused Resources',
      description: 'Identify and delete orphaned resources',
      estimatedSavings: Math.round(savings),
      effort: 'low',
      impact: 'low',
      implementation: [
        'Audit for unattached EBS volumes/disks',
        'Remove unused elastic IPs and load balancers',
        'Delete old snapshots and backups beyond retention',
        'Clean up unused security groups and network resources',
        'Set up automated tagging and cleanup policies',
      ],
    });
  }
  
  const quickWins = recommendations.filter(r => r.effort === 'low');
  const longTermOptimizations = recommendations.filter(r => r.effort !== 'low');
  
  return {
    currentMonthlyCost: ctx.currentCost,
    optimizedMonthlyCost: Math.round(ctx.currentCost - totalSavings),
    totalSavings: Math.round(totalSavings),
    savingsPercentage: Math.round((totalSavings / ctx.currentCost) * 100),
    recommendations,
    quickWins,
    longTermOptimizations,
  };
}
