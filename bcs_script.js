/* bcs_script.js - Berkeley Calendar Loader service worker */
// vchsi, 2025

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

function generateCalendar() {
    // TODO: Implement calendar generation logic
    console.log("generateCalendar called in service worker");
    if(document.getElementsByClassName("css-1erwsnx-blockCalendarCss").length == 0 || document.querySelectorAll("table").length == 0){
        return {"error": "No schedule found on page"};
    }
    return parseClassObject(getClassesFromTable());
}

// new script for more picky versions of Berkeley Calendar
// helper

function isCRN(val){
    if(val.length == 5 && !isNaN(parseInt(val))){
        return true;
    } return false;
}

// alternate function, for when the schedule function doesn't work.
function getClassesFromTable(){
    let table = document.getElementsByTagName("table")[0]
    let rows = table.getElementsByTagName("tbody")
    // order: Subject   Course  Section Seats Open  Instruction Mode    Instructor  Day(s) & Location(s)
    // want: 1, 2, 7

    let class_object = {}

    for (row of rows){
        main_col = row.getElementsByTagName("tr")[0]
        cur_crn = null
        vals_since_crn = -1
        for (child of main_col.children){
            /// console.log(child.innerText)

            // if it's the CRN, we start the counter
            if(isCRN(child.innerText)){
                vals_since_crn=0
                cur_crn = child.innerText
                class_object[cur_crn] = []
            }
            // subject, course
            if(vals_since_crn == 1 | vals_since_crn == 2){
                class_object[cur_crn].push(child.innerText)
            }
            // days and locations
            if(vals_since_crn == 7){
                class_object[cur_crn].push(child.querySelectorAll("span.sr-only"))
            }
            // Seen crn. keep going
            if(vals_since_crn != -1){
                vals_since_crn = vals_since_crn + 1;
            }
        }
    }
    return class_object // <- classes_object = {[key: crn]: [course subject, course number, times elements]}
}

// alternate function, for when the schedule function doesn't work.
function parseClassObject(class_object){
    
    returnObj = {}
    // format: [key = crn]: [subject, number, time]
    for (const details of Object.values(class_object)){
        if(details.includes("") || details.length != 3){
            // blank. forget it
            continue;
        }
        const [subject, number, timesArr] = details
        days = []
        const className = subject + " " + number
        if(!Object.keys(returnObj).includes(className)){
            returnObj[className] = []
        }
        let classTime, room = ["", ""]
        // todo: convert to format needed for original bcl file
        // Monday, Wednesday 1:00pm to 1:59pm at Evans 332 ->
        // day format: WEEKDAY (+, WEEKDAY) XX:XX(am/pm) to XX:XX(am/pm) at ROOM ROOM#
        // iterate through string

        for (timesEl of timesArr){
            part = 1 // <- part: 1 (beginning of string, have to seperate days from times + room). part: 2 (working with string)
            times = timesEl.innerText
            for (let i = 0; i < times.length; i++){
                // part 1: Getting the days
                if(part == 1){
                    if(!isNaN(parseInt(times[i]))){
                        part+=1
                        days = times.slice(0,i).replace(/\s/g, '').split(",")
                    }
                } else if (part == 2){
                    [classTime, room] = times.slice(i-1).split(" at ")
                    console.log(classTime + " " + room + " " + days + " " + className)
                    break
                }
            }
            for (day of days){
                returnObj[className].push([className, `${room} ${day.toLowerCase().replace(" ","").replace(",","")} from ${classTime}`])
            }
        }
    }
    return returnObj // <- Return object: Object format {className: [[className, location+time string format "[ROOM] [onedayoftheweek] [time1]-[time2]"]]}
}

// test
// console.log(parseClassObject(getClassesFromTable()))

