export class CourseSectionClass {
	constructor(
		dept: string,
		id: string,
		avg: number,
		instructor: string,
		title: string,
		pass: number,
		fail: number,
		audit: number,
		uuid: string,
		year: number
	) {
		this.dept = dept;
		this.id = id;
		this.avg = avg;
		this.instructor = instructor;
		this.title = title;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
		this.uuid = uuid;
		this.year = year;
	}

	public dept: string;
	public id: string;
	public avg: number;
	public instructor: string;
	public title: string;
	public pass: number;
	public fail: number;
	public audit: number;
	public uuid: string;
	public year: number;
}

function creatSectionClass(section: any): CourseSectionClass {
	let year: number = section["Year"];
	if (section["Section"] === "overall") {
		year = 1900;
	}
	let courseSection = new CourseSectionClass(
		section["Subject"],
		section["Course"],
		section["Avg"],
		section["Professor"],
		section["Title"],
		section["Pass"],
		section["Fail"],
		section["Audit"],
		section["id"],
		year
	);
	return courseSection;
}

export function parseCourseFile(file: string): CourseSectionClass[] {
	let sectionsArray: CourseSectionClass[] = [];
	try {
		const fileObj = JSON.parse(file);
		fileObj.result.forEach((sectionData: any) => {
			try {
				let sectionObj = creatSectionClass(sectionData);
				sectionsArray.push(sectionObj);
			} catch (error) {
				// Skip if the section is invalid.
			}
		});
	} catch (error) {
		// Skip if the file is invalid.
	}
	return sectionsArray;
}

export function listOfListOfSectionsToListOfSections(list: any): CourseSectionClass[] {
	let sectionsArray: CourseSectionClass[] = [];
	list.forEach((listOfSections: CourseSectionClass[]) => {
		sectionsArray = sectionsArray.concat(listOfSections);
	});
	return sectionsArray;
}
