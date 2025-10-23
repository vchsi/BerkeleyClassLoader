// old calendar script. Doesn't work for unenrolled schedules
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
        dayArray[i] = Array.from(element.children).slice(1); 
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
            result = seperateClasses(curclass.ariaLabel);
            classTitle = result[0];
            console.log(classTitle);
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