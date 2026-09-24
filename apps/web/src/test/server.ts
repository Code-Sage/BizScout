import { setupServer } from 'msw/node';

export const API = 'http://localhost:4000';
export const server = setupServer();
