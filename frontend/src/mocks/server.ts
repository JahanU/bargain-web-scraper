import { setupServer } from "msw/node";

// Handlers arrive with the data layer (phase 2). Tests add their own with server.use().
export const server = setupServer();
