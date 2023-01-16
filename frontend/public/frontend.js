// document.getElementById("click-me-button").addEventListener("click", handleClickMe);
// document.getElementById("getListDatasets").addEventListener("click", handleGet);
// document.getElementById("addDataset").addEventListener("click", handleGet);

function handleClickMe() {
	alert("Button Clicked!");
}

// to be able to use one js file for every html page
function setupElements() {
	// initialize elements like buttons and other user input elements
	let clickMe = document.getElementById("click-me-button");
	let getListDatasets = document.getElementById("getListDatasets");
	let addDataset = document.getElementById("addDataset");
	let askQuery = document.getElementById("query");
	let rmDataset = document.getElementById("removeDataset");

	// have an if check to make sure element is not null
	// if not null, setup any necessary listeners
	if (clickMe !== null) {
		clickMe.addEventListener("click", handleClickMe);
	}
	if (getListDatasets !== null) {
		getListDatasets.addEventListener("click", handleGet);
	}
	if (addDataset !== null) {
		addDataset.addEventListener("click", handlePut);
	}
	if (askQuery !== null) {
		askQuery.addEventListener("click", handlePost);
	}
	if (rmDataset !== null) {
		rmDataset.addEventListener("click", handleDelete);
	}
}

// heavily referenced https://developer.mozilla.org/en-US/docs/Web/Guide/AJAX/Getting_Started#step_3_%E2%80%93_a_simple_example
let httpRequest;
function handleGet() {
	httpRequest = new XMLHttpRequest();

	if (!httpRequest) {
		alert('Cannot create XMLHTTP instance!');
		return false;
	}

	httpRequest.onreadystatechange = getListDatasets;
	httpRequest.open('GET', 'http://localhost:4321/datasets');
	httpRequest.send();
}

function getListDatasets() {
	if (httpRequest.readyState === XMLHttpRequest.DONE) {
		if (httpRequest.status === 200) {
			let headers = ["id", "kind", "numRows"];
			createTable(JSON.parse(httpRequest.responseText).result, headers);
		} else {
			alert('There was a problem with the request!');
		}
	}
}

function handlePut() {
	httpRequest = new XMLHttpRequest();

	if (!httpRequest) {
		alert('Cannot create XMLHTTP instance!');
		return false;
	}
	let idInput = document.getElementById("id");
	let id = (idInput.value.length === 0) ? " " : idInput.value;
	// let kind = document.getElementById("kind").value;
	let kind = "courses";
	let content = document.getElementById("dataset").files[0];
	httpRequest.onreadystatechange = addDatasets;
	httpRequest.open('PUT', 'http://localhost:4321/dataset' + '/' + id + '/' + kind);
	httpRequest.send(content);
}

function addDatasets() {
	if (httpRequest.readyState === XMLHttpRequest.DONE) {
		if (httpRequest.status === 200) {
			let result = document.querySelector("p");
			result.innerText = "IDs of all currently added datasets: \n" + JSON.parse(httpRequest.responseText).result;
		} else if (httpRequest.status === 400) {
			alert(JSON.parse(httpRequest.responseText).error);
		} else {
			// console.log("Status code for rejecting dataset", httpRequest.status);
			alert('There was a problem with the request!' + httpRequest.status.toString());
		}
	}
}

function handleDelete() {
	httpRequest = new XMLHttpRequest();

	if (!httpRequest) {
		alert('Cannot create XMLHTTP instance!');
		return false;
	}
	let idInput = document.getElementById("id");
	let id = (idInput.value.length === 0) ? " " : idInput.value;
	httpRequest.onreadystatechange = removeDatasets;
	httpRequest.open('DELETE', 'http://localhost:4321/dataset' + '/' + id);
	httpRequest.send();
}

function removeDatasets() {
	if (httpRequest.readyState === XMLHttpRequest.DONE) {
		if (httpRequest.status === 200) {
			let result = document.querySelector("p");
			result.innerText = "ID of the removed dataset: \n" + JSON.parse(httpRequest.responseText).result;
		} else if (httpRequest.status === 400) {
			alert(JSON.parse(httpRequest.responseText).error);
		} else if (httpRequest.status === 404) {
			alert(JSON.parse(httpRequest.responseText).error);
		} else {
			console.log("Status code for rejecting dataset", httpRequest.status);
			alert('There was a problem with the request!' + httpRequest.status.toString());
		}
	}
}

function handlePost() {
	httpRequest = new XMLHttpRequest();

	if (!httpRequest) {
		alert('Cannot create XMLHTTP instance!');
		return false;
	}

	let id = document.getElementById("id").value;
	let compareInput = `"${document.getElementById("compare").value}"`;
	let query = buildJsonQuery(id, compareInput);
	httpRequest.onreadystatechange = getResponseFromPost;
	httpRequest.open('POST', 'http://localhost:4321/query');
	httpRequest.setRequestHeader("Content-Type", "application/json");
	httpRequest.send(query);
}

function buildJsonQuery(id, compareInput) {
	if (typeof compareInput === "string") {
		let json =
			`
			{
				"WHERE": {
					"IS": {
						"${id}_dept": ${compareInput}
					}
				},
				"OPTIONS": {
					"COLUMNS": [
						"${id}_dept",
						"${id}_id",
						"${id}_instructor",
						"${id}_avg"
					],
					"ORDER": "${id}_avg"
				}
			}
			`
		;

		return json;
	} else {
		return "{}";
	}
}

function createTable(dataList, headers) {
	let table = document.getElementById("results");

	let headerRow = table.insertRow(-1);
	for (let headerIndex = 0; headerIndex < headers.length; headerIndex++) {
		let cell = headerRow.insertCell(-1);
		cell.appendChild(document.createTextNode(headers[headerIndex]));
	}

	for (let index = 0; index < dataList.length; index++) {
		let row = table.insertRow(-1);
		for (let col = 0; col < headers.length; col++) {
			let cell = row.insertCell(-1);
			cell.appendChild(document.createTextNode(dataList[index][headers[col]]));
		}
	}
}

function getResponseFromPost() {
	if (httpRequest.readyState === XMLHttpRequest.DONE) {
		if (httpRequest.status === 200) {
			let result = JSON.parse(httpRequest.responseText).result;
			let table = document.getElementById("results");
			while (table.rows.length > 0) {
				table.deleteRow(0);
			}
			if (result.length !== 0) {
				let sampleKey = Object.keys(result[0])[0];
				let id = sampleKey.split("_")[0];
				let headers = [`${id}_dept`, `${id}_id`, `${id}_instructor`, `${id}_avg`];
				createTable(result, headers);
			}
		} else if (httpRequest.status === 400) {
			alert(httpRequest.responseText);
		} else {
			console.log("Status code for rejecting dataset", httpRequest.status);
			alert('There was a problem with the request!' + httpRequest.status.toString());
		}
	}
}


// starting call to setup listeners for elements
setupElements();
