export interface Message {
    role: 'user' | 'assistant';
    content: string;
  }
  
  export interface Theme {
    mode: 'light' | 'dark';
  }