"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOfListOfSectionsToListOfSections = exports.parseCourseFile = exports.CourseSectionClass = void 0;
class CourseSectionClass {
    constructor(dept, id, avg, instructor, title, pass, fail, audit, uuid, year) {
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
}
exports.CourseSectionClass = CourseSectionClass;
function creatSectionClass(section) {
    let year = section["Year"];
    if (section["Section"] === "overall") {
        year = 1900;
    }
    let courseSection = new CourseSectionClass(section["Subject"], section["Course"], section["Avg"], section["Professor"], section["Title"], section["Pass"], section["Fail"], section["Audit"], section["id"], year);
    return courseSection;
}
function parseCourseFile(file) {
    let sectionsArray = [];
    try {
        const fileObj = JSON.parse(file);
        fileObj.result.forEach((sectionData) => {
            try {
                let sectionObj = creatSectionClass(sectionData);
                sectionsArray.push(sectionObj);
            }
            catch (error) {
            }
        });
    }
    catch (error) {
    }
    return sectionsArray;
}
exports.parseCourseFile = parseCourseFile;
function listOfListOfSectionsToListOfSections(list) {
    let sectionsArray = [];
    list.forEach((listOfSections) => {
        sectionsArray = sectionsArray.concat(listOfSections);
    });
    return sectionsArray;
}
exports.listOfListOfSectionsToListOfSections = listOfListOfSectionsToListOfSections;
//# sourceMappingURL=Course.js.map