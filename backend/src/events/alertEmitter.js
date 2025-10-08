import { EventEmitter } from 'events';

// Central emitter for threshold alert events.
// Emitted event name: 'thresholdAlert'
// Payload shape: { assetId, symbol, name, boundary: 'upper'|'lower', price, threshold, time }
export const alertEmitter = new EventEmitter();

// Avoid unhandled listener warnings in dev when hot reloading
alertEmitter.setMaxListeners(50);

export default alertEmitter;