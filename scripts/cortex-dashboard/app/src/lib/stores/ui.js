import { createToggleStore, createValueStore } from './factories.js';

// Sidebar
export const sidebarOpen = createToggleStore(false);
export const cortexPath = createValueStore('cortex');

// Note viewer
export const activeNote = createValueStore(null);
export const noteEditing = createToggleStore(false);

// Search
export const searchOpen = createToggleStore(false);
