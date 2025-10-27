/* 
bcs.js - Javascript for Berkeley Class Loader popup
---
This file handles the interactions between the popup GUI and the background service worker. This also handles the popup's display logic.
I will connect this to another file for the calendar generation functions (with ics.js).
*/
// vchsi, 2025
// i should really use jquery here, but idk why i dont

// Add event listener to button in popup to call background service worker
document.addEventListener("DOMContentLoaded", function() {
	const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
	const ICSDAYS = {"monday": "mo", "tuesday": "tu", "wednesday": "we", "thursday": "th", "friday": "fr"};
	const SCHEDULER_LINK = "https://berkeley.collegescheduler.com/entry";
	const SEMESTER_START_END = {
		"fa25": {start: "08/27/2025", end: "12/20/2025"},
		"sp26": {start: "01/19/2026", end: "05/11/2026"},
	};
	const COMMON_ABBREVIATIONS = {"Mathematics": "MATH", "Computer Science": "CS", "Electrical Engineering": "EECS", "Data Science, Undergraduate": "DATA", "Statistics": "STAT",
		"Economics": "ECON", "Molecular and Cell Biology": "MCB", "Chemical and Biomolecular Engineering": "CBE", "Physics": "PHYS",
		"Integrative Biology": "IB", "Environmental Science Policy and Management": "ESPM", "Mechanical Engineering": "ME", "Civil and Environmental Engineering": "CEE",
		"Psychology": "PSYCH", "Nutritional Sciences and Toxicology": "NST", "Political Science": "POL SCI",
		"History": "HIST", "Sociology": "SOC"
	};



	// provide functionality to the links (without messing with the service workers too much)
	document.getElementById("redirect-to-page").addEventListener("click", function(e) {
		e.preventDefault();
		chrome.tabs.create({ url: SCHEDULER_LINK });
	});
	document.getElementById("login-with-calcentral").addEventListener("click", function(e) {
		e.preventDefault();
		chrome.tabs.create({ url: "https://calcentral.berkeley.edu/academics" });
	});
	document.getElementById("need-help-blur").addEventListener("click", function(e) {
		e.preventDefault();
		chrome.tabs.create({ url: "https://tinyurl.com/bcs-faq-howto" });
	});

	document.getElementById("faq-link").addEventListener("click", function(e) {
		e.preventDefault();
		chrome.tabs.create({ url: "https://tinyurl.com/bcs-faq-howto" });
	});
	

	// on load, check if we are on the right page
	setTimeout(() => {
		chrome.runtime.sendMessage({action: "checkPage"}, function(response) {
			const top_message = document.getElementById("top-message-container");
			// alert("url: " + JSON.stringify(response));
			if (chrome.runtime.lastError) {
				console.warn("checkPage message error:", chrome.runtime.lastError.message);
				document.getElementById("full-page-blur").style.display = "block";
				return;
			}
			if (!response) {
				console.warn("checkPage: no response");
				document.getElementById("full-page-blur").style.display = "block";
				return;
			}
			if (response.status === "ok" && response.isScheduler) {
				top_message.innerHTML = "Ready to convert your schedule!";
				top_message.style.display = "block";
				const blur = document.getElementById("full-page-blur");
				if (blur) blur.style.display = "none";
			} else {
				const blur = document.getElementById("full-page-blur");
				if (blur) blur.style.display = "block";
			}
		});
	}, 100);
	function getTableValuesIntoObject(table){
		const obj = {};
		for(const row of table.rows){
			const className = row.cells[0].textContent; // to undo any dash replacements
			const day = row.cells[1].textContent;
			const location = row.cells[2].textContent;
			const time = row.cells[3].textContent;
			const typeSelect = row.cells[4].querySelector("select");
			const type = typeSelect ? typeSelect.value : "Lecture";
			let daysArr = [];
			// for classesObj (unbundled)
			if(!obj[className]){
				obj[className] = [];
			}
			for (const d of day.split(", ").map(d => d.toLowerCase())) {
				if (DAYS.includes(d)) {
					daysArr.push(ICSDAYS[d]);
				}
			}
			obj[className].push({
				day: daysArr,
				location: location,
				startTime: time.split(" - ")[0] || "",
				endTime: time.split(" - ")[1] || "",
				type: type
			});
		}
		return obj;
	}
	function redirectMainWindow(link){
		chrome.tabs.create({ url: link });
	}
	function displayCalendar(calendarObj){
		// Display the calendar in a user-friendly format
		if(typeof calendarObj !== "object"){
			console.error("Invalid calendar object");
			return;
		}
		const table = document.getElementById("schedule");
		const classesObj = {}; // classes organized by name (no repeats too)

		// Bundling for table display
		const bundled = {};
		for (const [className, sessions] of Object.entries(calendarObj)) {
			for (const session of sessions) {
				let details = session[1];
				if(!details){
					continue
				}
				let day = details.match(/(monday|tuesday|wednesday|thursday|friday)/)[0];
				let startTime = details.match(/from (.+) to (.+)/).slice(1)[0];
				let endTime = details.match(/to (.+)/)[1];
				let location = details.match(/(.+) (monday|tuesday|wednesday|thursday|friday)/)[1];

				// For classesObj (unbundled)
				if(classesObj[className] === undefined){
					classesObj[className] = [];
				}
				classesObj[className].push({
					day: day,
					startTime: startTime,
					endTime: endTime,
					location: location
				});

				// For table (bundled)
				const bundleKey = `${className}|${location}|${startTime}|${endTime}`;
				if (!bundled[bundleKey]) {
					bundled[bundleKey] = {
						className,
						location,
						startTime,
						endTime,
						days: []
					};
				}
				bundled[bundleKey].days.push(day);
			}
		}

		// Clear previous table rows except header
		while (table.rows.length > 1) table.deleteRow(1);

		// Insert bundled rows
		for (const key in bundled) {
			const row = table.insertRow(-1);
			const { className, location, startTime, endTime, days } = bundled[key];
			const classTitleCell = row.insertCell(0);
			const daysCell = row.insertCell(1);
			const locationCell = row.insertCell(2);
			const timeCell = row.insertCell(3);
			const typeCell = row.insertCell(4);

			// Determine type based on keywords in className
			classTitleCell.textContent = className;
			daysCell.textContent = days.join(", ");
			locationCell.textContent = location;
			timeCell.textContent = `${startTime} - ${rollOverTime(endTime, 1)}`; // just to make it clean

			// fill type cell
			let newType = document.getElementById("type_select_ex").cloneNode(true);
			typeCell.appendChild(newType);
			newType.style.display = "inline-block";
		}

		table.style.display = "block";
		// debug: alert(JSON.stringify(classesObj, null, 2));
	}

	function rollOverTime(timeString, minuteOffset){ // returns another time string
		let [hour, min] = timeString.split(":")
		let timeSuffix = min.slice(2)
		min = min.slice(0,2)
		const TIME_SUFFIXES = ["am", "pm"]

		let [hourInt, minInt] = [parseInt(hour), parseInt(min)]
		if(isNaN(hourInt) || isNaN(minInt)){
			return "Invalid"
		}

		// handle minutes addition / subtraction
		let newMinutes = minInt + minuteOffset
		if(newMinutes >= 60){
			newHours = Math.floor(newMinutes / 60)
			newMinutes = newMinutes % 60
		} else if (newMinutes < 0){
			newHours = Math.floor(newMinutes / 60)
			newMinutes = (newMinutes % 60) + 60
		} else {
			newHours = 0
		}
		newHours = newHours + hourInt
		// handle am/pm rollovers
		if(newHours >= 12){
		    if(newHours !== hourInt && hourInt !== 12){
    			timeSuffix = TIME_SUFFIXES[(TIME_SUFFIXES.indexOf(timeSuffix)+1) % 2]
		    }
		}
		if (newHours > 12){
		    newHours = newHours % 12
		}

		// rebuild time string
		return String(newHours) + ":" + String(newMinutes).padStart(2, "0") + timeSuffix

	}

	function updateTimes(table, offsetMinutes) { // offsetMinutes: +10 for berkeleytime, -10 for normal time
		for(const row of table.rows){
			const timeCell = row.cells[3];
			if(!timeCell) continue; // skip header
			const timeText = timeCell.textContent;
			const [startTime, endTime] = timeText.split(" - ");
			if(startTime == undefined || endTime == undefined){
				continue
			}
			// debug: alert(startTime + " " + endTime)
			// lets be real, no class is probably going to start 12:50, so we probably won't have to roll over the pms
			// handle it just for redundancy's sake

			// don't gotta roll over endtime
			const newStartTime = rollOverTime(startTime, offsetMinutes);
			timeCell.textContent = `${newStartTime} - ${endTime}`;
			
		}
	}

	// handle berkeley time checkbox
	document.getElementById("berkeleytime-checkbox").addEventListener("change", function(e) {
		const table = document.getElementById("schedule");
		if (e.target.checked) {
			updateTimes(table, 10); // add 10 minutes
		} else {
			updateTimes(table, -10); // subtract 10 minutes
		}
	});
	// generate calendar button event listener
	const btn = document.querySelector("button#convert");
	const top_message = document.getElementById("top-message-container");
	if (btn) {
		btn.addEventListener("click", function() {
			chrome.runtime.sendMessage({action: "generateCalendar"}, function(response) {
				if (chrome.runtime.lastError) {
					console.error("SendMessage error:", chrome.runtime.lastError.message);
					top_message.innerHTML = "Extension error: " + chrome.runtime.lastError.message;
					top_message.style.display = "block";
					return;
				}
				if (!response) {
					top_message.innerHTML = "No response from background.";
					top_message.style.display = "block";
					return;
				}
				if (response.status === "ok") {
					displayCalendar(response.calendar);
					top_message.innerHTML = "Calendar attained successfully!";
					top_message.style.display = "block";
					const exportBtn = document.getElementById("exportToCalendar");
					if (exportBtn) exportBtn.style.display = "inline-block";
					const exportIcalBtn = document.getElementById("exportToIcal");
					if (exportIcalBtn) exportIcalBtn.style.display = "inline-block";
					document.getElementById("berkeleytime-box").style.display = "block";
					window.scrollTo(0, document.body.scrollHeight)
				} else {
					//console.warn("Generation failed:", response.error);
					top_message.innerHTML = "Failed: " + (response.error || "Unknown error");

					top_message.style.backgroundColor = "#d85c5c";
					top_message.style.display = "block";
				}
			});
		});
	}
	// export event listener
	const exportBtn = document.getElementById("exportToIcal");
	exportBtn.addEventListener("click", function() {
		const tableData = getTableValuesIntoObject(document.getElementById("schedule"));
		const semester = document.getElementById("semester").value;
		const {start, end} = SEMESTER_START_END[semester] || SEMESTER_START_END["fa25"];
		// debug: alert(JSON.stringify(tableData, null, 2));
		generateICS(tableData, start, end, calendarName="doubleclick_me");
	});
	const exportGoogleBtn = document.getElementById("exportToCalendar");
	exportGoogleBtn.addEventListener("click", function() {
		const tableData = getTableValuesIntoObject(document.getElementById("schedule"));
		const semester = document.getElementById("semester").value;
		const {start, end} = SEMESTER_START_END[semester] || SEMESTER_START_END["fa25"];
		// debug: alert(JSON.stringify(tableData, null, 2));
		generateICS(tableData, start, end);
		setTimeout(() => {
			redirectMainWindow("https://calendar.google.com/calendar/u/0/r/settings/export");
		}, 300);
	});
});
