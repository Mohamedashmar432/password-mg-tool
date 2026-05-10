import { handleMessage, isKnownMessageType, requiresTabOrigin } from './message-handler.js';
import type { ExtensionMessage } from '../types/index.js';

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    if (!isKnownMessageType(message.type)) return false;
    if (requiresTabOrigin(message.type) && !sender.tab?.id) return false;

    handleMessage(message, sender)
      .then(sendResponse)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        sendResponse({ error: msg });
      });

    return true;
  }
);

chrome.runtime.onInstalled.addListener(() => {
  console.log('ZeroVault installed');
});
