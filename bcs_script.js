/* bcs_script.js - Berkeley Calendar Loader service worker


*/
// Listen for messages from background (for content script)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageTitle") {
        sendResponse({page_title: document.url});
    } else if (request.action === "generateCalendar") {
        if(generateCalendar().error) {
            sendResponse({error: generateCalendar().error, page_title: document.title});
        } else {
            sendResponse({calendar: generateCalendar(), page_title: document.title});
        }
    }
});

// Stub for background calendar generation
function generateCalendar() {
    // TODO: Implement calendar generation logic
    console.log("generateCalendar called in service worker");
    
    return getSchedule();
}
function getClasses(){
    const classes = document.getElementsByClassName("css-1hyowku-columnCss"); 
    let dayArray = {}; 
    i=0;
    Array.from(classes).forEach((element) => {
        dayArray[i] = element.children; 
        i++;
    })
    return dayArray;
}
function seperateClasses(input){
    const cleaned = input
    .replace(/<\/?br\s*\/?>/gi, '') 
    .replace(/\.?\s*Hit enter to view more details\.?/, '') // Remove the ending message
    .trim(); // Clean up leading/trailing whitespace

    const parts = cleaned.split(/\s{2,}/); // Split on 2+ spaces
    
    return parts;
}

function getSchedule(){
    if(document.getElementsByClassName("css-1erwsnx-blockCalendarCss").length == 0){
        return {"error": "No schedule found on page"};
    }

    const dayArr = getClasses();
    let classesObject = {}

    for ([day, classes] of Object.entries(dayArr)){
        Array.from(classes).forEach((curclass) => {
            curString = curclass.ariaLabel
            result = seperateClasses(curString);
            classTitle = result[0]
            console.log(classTitle)
            if(Object.keys(classesObject).includes(classTitle)){
                classesObject[classTitle].push(result)
            } else {
                classesObject[classTitle] = [result]
            }
        })
    }
    // 0: class title, 1: class location, 2: class time
    // alert(JSON.stringify(classesObject, null, 2));
    return classesObject;
}