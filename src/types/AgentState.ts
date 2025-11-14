export interface AgentState {
  id?: number;
  orchestrator?: any;
  context?: any;
  data?: any;
  reasoning?: any;
  action?: any;
  summary?: string;
  errors?: string;
}
