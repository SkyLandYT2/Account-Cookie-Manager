chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ accounts: [] });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['popup.js']
  });
});
