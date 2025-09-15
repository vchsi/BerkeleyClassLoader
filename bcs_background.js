// bcs_background.js - Berkeley Calendar Loader background script
// vchsi, 2025


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateCalendar") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (chrome.runtime.lastError) {
                sendResponse({status: "fail", error: chrome.runtime.lastError.message});
                return;
            }
            if (!tabs || tabs.length === 0) {
                sendResponse({status: "fail", error: "No active tab"});
                return;
            }
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, {action: "generateCalendar"}, function(response) {
                if (chrome.runtime.lastError) {
                    sendResponse({status: "fail", error: chrome.runtime.lastError.message});
                    return;
                }
                if (!response) {
                    sendResponse({status: "fail", error: "No response from content script"});
                    return;
                }
                if(response.error){
                    sendResponse({status: "fail", error: response.error});
                    return;
                }
                sendResponse({
                    status: "ok",
                    page_title: response.page_title || "Unknown",
                    calendar: response.calendar || {}
                });
            });
        });
        // Indicate async response
        return true;
    } else if (request.action === "checkPage") {
        // We don't actually need the content script for this simple check; reply with tab URL/title.
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (chrome.runtime.lastError) {
                sendResponse({status: "fail", error: chrome.runtime.lastError.message});
                return;
            }
            if (!tabs || tabs.length === 0) {
                sendResponse({status: "fail", error: "No active tab"});
                return;
            }
            const tab = tabs[0];
            let url = tab.url || "";
            let title = tab.title || "";
            const isScheduler = /berkeley\.collegescheduler\.com/.test(url);
            if ((!url || !title) && isScheduler) {
                // fallback ask content script (may have better doc.title after load)
                chrome.tabs.sendMessage(tab.id, {action: "getPageTitle"}, function(resp) {
                    if (chrome.runtime.lastError) {
                        sendResponse({status: "ok", page_title: title, page_url: url, isScheduler, note: "fallback error: " + chrome.runtime.lastError.message});
                        return;
                    }
                    if (resp && resp.page_title) {
                        title = resp.page_title;
                    }
                    sendResponse({status: "ok", page_title: title, page_url: url, isScheduler});
                });
            } else {
                sendResponse({status: "ok", page_title: title, page_url: url, isScheduler});
            }
        });
        return true; // async
    }
});