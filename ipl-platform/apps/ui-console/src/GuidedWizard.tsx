import { useState } from 'react';

interface GuidedWizardProps {
  domain: string;
  onComplete?: () => void;
}

interface WizardStep {
  id: string;
  phase: string;
  title: string;
  description: string;
  tasks: { id: string; label: string; required: boolean }[];
}

export default function GuidedWizard({ domain, onComplete }: GuidedWizardProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const phases = [
    { id: 'discovery', name: 'Discovery', icon: '🔍', color: '#8b5cf6' },
    { id: 'design', name: 'Design', icon: '🎨', color: '#3b82f6' },
    { id: 'build', name: 'Build', icon: '🔨', color: '#10b981' },
    { id: 'deploy', name: 'Deploy', icon: '🚀', color: '#f59e0b' },
    { id: 'operate', name: 'Operate', icon: '⚙️', color: '#ec4899' },
  ];

  const steps: WizardStep[] = [
    {
      id: 'requirements',
      phase: 'discovery',
      title: 'Define Requirements',
      description: 'Capture your application requirements and constraints.',
      tasks: [
        { id: 'domain', label: 'Select industry domain', required: true },
        { id: 'scale', label: 'Define scale and capacity', required: true },
        { id: 'compliance', label: 'Identify compliance requirements', required: true },
        { id: 'integrations', label: 'List required integrations', required: false },
      ]
    },
    {
      id: 'database',
      phase: 'discovery',
      title: 'Choose Database',
      description: 'Select the database technology that fits your needs.',
      tasks: [
        { id: 'db-type', label: 'Select database type', required: true },
        { id: 'db-config', label: 'Configure clustering options', required: false },
        { id: 'db-backup', label: 'Set backup strategy', required: true },
      ]
    },
    {
      id: 'architecture',
      phase: 'design',
      title: 'Review Architecture',
      description: 'Review and customize the generated architecture.',
      tasks: [
        { id: 'arch-review', label: 'Review architecture diagram', required: true },
        { id: 'arch-infra', label: 'Approve infrastructure specs', required: true },
        { id: 'arch-cost', label: 'Review cost estimates', required: true },
        { id: 'arch-security', label: 'Verify security requirements', required: true },
      ]
    },
    {
      id: 'schema',
      phase: 'design',
      title: 'Design Schema',
      description: 'Review and customize database schema and ERD.',
      tasks: [
        { id: 'schema-tables', label: 'Review generated tables', required: true },
        { id: 'schema-relations', label: 'Verify relationships', required: true },
        { id: 'schema-indexes', label: 'Configure indexes', required: false },
      ]
    },
    {
      id: 'api',
      phase: 'design',
      title: 'Define APIs',
      description: 'Configure API endpoints and documentation.',
      tasks: [
        { id: 'api-endpoints', label: 'Review API endpoints', required: true },
        { id: 'api-auth', label: 'Configure authentication', required: true },
        { id: 'api-docs', label: 'Generate API documentation', required: false },
      ]
    },
    {
      id: 'code-gen',
      phase: 'build',
      title: 'Generate Code',
      description: 'Generate application code and components.',
      tasks: [
        { id: 'gen-backend', label: 'Generate backend code', required: true },
        { id: 'gen-frontend', label: 'Generate frontend components', required: false },
        { id: 'gen-mobile', label: 'Generate mobile app', required: false },
        { id: 'gen-tests', label: 'Generate test suites', required: true },
      ]
    },
    {
      id: 'devops',
      phase: 'build',
      title: 'Setup DevOps',
      description: 'Configure CI/CD pipelines and infrastructure as code.',
      tasks: [
        { id: 'devops-iac', label: 'Generate infrastructure code', required: true },
        { id: 'devops-cicd', label: 'Setup CI/CD pipeline', required: true },
        { id: 'devops-docker', label: 'Create Docker configuration', required: false },
        { id: 'devops-helm', label: 'Generate Kubernetes/Helm charts', required: false },
      ]
    },
    {
      id: 'environments',
      phase: 'deploy',
      title: 'Setup Environments',
      description: 'Configure development, staging, and production environments.',
      tasks: [
        { id: 'env-dev', label: 'Setup development environment', required: true },
        { id: 'env-staging', label: 'Setup staging environment', required: true },
        { id: 'env-prod', label: 'Setup production environment', required: true },
        { id: 'env-vars', label: 'Configure environment variables', required: true },
      ]
    },
    {
      id: 'deployment',
      phase: 'deploy',
      title: 'Deploy Application',
      description: 'Deploy your application to the target environment.',
      tasks: [
        { id: 'deploy-db', label: 'Run database migrations', required: true },
        { id: 'deploy-app', label: 'Deploy application', required: true },
        { id: 'deploy-verify', label: 'Verify deployment health', required: true },
        { id: 'deploy-dns', label: 'Configure DNS/domain', required: false },
      ]
    },
    {
      id: 'monitoring',
      phase: 'operate',
      title: 'Setup Monitoring',
      description: 'Configure monitoring, logging, and alerting.',
      tasks: [
        { id: 'mon-metrics', label: 'Setup metrics collection', required: true },
        { id: 'mon-logs', label: 'Configure log aggregation', required: true },
        { id: 'mon-alerts', label: 'Define alert rules', required: true },
        { id: 'mon-dashboard', label: 'Create monitoring dashboards', required: false },
      ]
    },
    {
      id: 'maintenance',
      phase: 'operate',
      title: 'Ongoing Maintenance',
      description: 'Setup procedures for ongoing maintenance and updates.',
      tasks: [
        { id: 'maint-backup', label: 'Configure automated backups', required: true },
        { id: 'maint-updates', label: 'Setup update procedures', required: false },
        { id: 'maint-docs', label: 'Generate runbook documentation', required: false },
      ]
    },
  ];

  const currentPhaseSteps = steps.filter(s => s.phase === phases[currentPhase].id);
  const activeStep = currentPhaseSteps[currentStep] || currentPhaseSteps[0];

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const getStepProgress = (step: WizardStep) => {
    const completed = step.tasks.filter(t => completedTasks.has(t.id)).length;
    return Math.round((completed / step.tasks.length) * 100);
  };

  const getPhaseProgress = (phaseId: string) => {
    const phaseSteps = steps.filter(s => s.phase === phaseId);
    const allTasks = phaseSteps.flatMap(s => s.tasks);
    const completed = allTasks.filter(t => completedTasks.has(t.id)).length;
    return Math.round((completed / allTasks.length) * 100);
  };

  const getTotalProgress = () => {
    const allTasks = steps.flatMap(s => s.tasks);
    const completed = allTasks.filter(t => completedTasks.has(t.id)).length;
    return Math.round((completed / allTasks.length) * 100);
  };

  const canProceed = () => {
    if (!activeStep) return false;
    const requiredTasks = activeStep.tasks.filter(t => t.required);
    return requiredTasks.every(t => completedTasks.has(t.id));
  };

  const nextStep = () => {
    if (currentStep < currentPhaseSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (currentPhase < phases.length - 1) {
      setCurrentPhase(currentPhase + 1);
      setCurrentStep(0);
    } else if (onComplete) {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (currentPhase > 0) {
      setCurrentPhase(currentPhase - 1);
      const prevPhaseSteps = steps.filter(s => s.phase === phases[currentPhase - 1].id);
      setCurrentStep(prevPhaseSteps.length - 1);
    }
  };

  const totalProgress = getTotalProgress();

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #334155',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🧭</span>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 700 }}>Project Setup Wizard</div>
            <div style={{ color: '#64748b', fontSize: 11 }}>
              {domain} • {totalProgress}% complete
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 120, 
            height: 8, 
            background: '#0f172a', 
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${totalProgress}%`,
              height: '100%',
              background: totalProgress === 100 
                ? 'linear-gradient(90deg, #10b981, #059669)' 
                : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ color: '#64748b', fontSize: 16 }}>
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
            {phases.map((phase, idx) => {
              const progress = getPhaseProgress(phase.id);
              const isActive = idx === currentPhase;
              const isCompleted = progress === 100;
              
              return (
                <button
                  key={phase.id}
                  onClick={() => { setCurrentPhase(idx); setCurrentStep(0); }}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    background: isActive ? '#334155' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${phase.color}` : '2px solid transparent',
                    color: isActive ? '#e2e8f0' : (isCompleted ? '#10b981' : '#94a3b8'),
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 2 }}>
                    {isCompleted ? '✓' : phase.icon}
                  </div>
                  <div>{phase.name}</div>
                  <div style={{ 
                    fontSize: 9, 
                    color: isCompleted ? '#10b981' : '#64748b',
                    marginTop: 2
                  }}>
                    {progress}%
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex' }}>
            <div style={{ 
              width: 200, 
              borderRight: '1px solid #334155',
              background: '#0f172a',
              maxHeight: 400,
              overflow: 'auto',
            }}>
              {currentPhaseSteps.map((step, idx) => {
                const progress = getStepProgress(step);
                const isActive = idx === currentStep;
                
                return (
                  <div
                    key={step.id}
                    onClick={() => setCurrentStep(idx)}
                    style={{
                      padding: '12px 16px',
                      background: isActive ? '#1e293b' : 'transparent',
                      borderLeft: isActive ? `3px solid ${phases[currentPhase].color}` : '3px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ 
                      color: isActive ? '#e2e8f0' : '#94a3b8', 
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      marginBottom: 4
                    }}>
                      {step.title}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6 
                    }}>
                      <div style={{ 
                        flex: 1, 
                        height: 4, 
                        background: '#334155',
                        borderRadius: 2,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: progress === 100 ? '#10b981' : phases[currentPhase].color,
                        }} />
                      </div>
                      <span style={{ color: '#64748b', fontSize: 10 }}>{progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ flex: 1, padding: 20 }}>
              {activeStep && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ color: '#e2e8f0', margin: 0, marginBottom: 4 }}>
                      {activeStep.title}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                      {activeStep.description}
                    </p>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    {activeStep.tasks.map((task) => {
                      const isComplete = completedTasks.has(task.id);
                      
                      return (
                        <div
                          key={task.id}
                          onClick={() => toggleTask(task.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            background: isComplete ? 'rgba(16, 185, 129, 0.1)' : '#0f172a',
                            border: `1px solid ${isComplete ? '#10b981' : '#334155'}`,
                            borderRadius: 6,
                            marginBottom: 8,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: 4,
                            border: `2px solid ${isComplete ? '#10b981' : '#475569'}`,
                            background: isComplete ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 700,
                          }}>
                            {isComplete && '✓'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ 
                              color: isComplete ? '#10b981' : '#e2e8f0',
                              textDecoration: isComplete ? 'line-through' : 'none',
                            }}>
                              {task.label}
                            </span>
                            {task.required && !isComplete && (
                              <span style={{
                                marginLeft: 8,
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontSize: 9,
                                fontWeight: 600,
                              }}>
                                REQUIRED
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    paddingTop: 16,
                    borderTop: '1px solid #334155'
                  }}>
                    <button
                      onClick={prevStep}
                      disabled={currentPhase === 0 && currentStep === 0}
                      style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        borderRadius: 6,
                        padding: '8px 20px',
                        color: '#94a3b8',
                        cursor: currentPhase === 0 && currentStep === 0 ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        opacity: currentPhase === 0 && currentStep === 0 ? 0.5 : 1,
                      }}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={!canProceed()}
                      style={{
                        background: canProceed() 
                          ? `linear-gradient(135deg, ${phases[currentPhase].color}, ${phases[currentPhase].color}dd)`
                          : '#475569',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 20px',
                        color: 'white',
                        cursor: canProceed() ? 'pointer' : 'not-allowed',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {currentPhase === phases.length - 1 && currentStep === currentPhaseSteps.length - 1 
                        ? 'Complete Setup ✓' 
                        : 'Next Step →'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
