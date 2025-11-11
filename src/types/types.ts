// @/types/types.ts

import { UIMessage } from 'ai';

type GenericType = {
  agentData: any; 
  input?: any; 
};

export type MyUIMessage = UIMessage<
  never, // metadata type
  {
    Orchestrator: GenericType; 
    Context?: GenericType;
    Data?: GenericType;
    Reasoning?: GenericType;
    Action?: any;
    Error?: GenericType;
    Summary?: string; // <-- Note: Your original type had 'Summary: string', not 'Summary?: string'
  }, // data parts type
>;