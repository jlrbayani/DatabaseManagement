Please edit this template and commit to the master branch for your user stories submission.   
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-21w2-intro-to-se/project/checkpoint-3).

## User Story 1
As a student, I want to add course data to the UI, 
so that I can query courses for the semester.

Valid ID: A non-empty sequence of characters without underline that has not been used before.

Valid Zip file: A zip file containing one directory named courses
which has the course info in the json format.

#### Definitions of Done(s)
Scenario 1: Enter a valid ID and Zip file to be added.
Given: The user is on the Modify Database page.
When: User enters a valid ID and Zip file then clicks Add Dataset.
Then: The UI shows the list of added IDs under the Result with the title "IDs of all currently added datasets:".

Scenario 2: Enter an invalid ID for a dataset to be added. 
Given: The user is on the Modify Database page. 
When: User enters an invalid ID and clicks Add Dataset.
Then: The UI remains on the Modify Database page and gets
an alert with an error message saying "Invalid ID".

Scenario 3: Enter an invalid Zip file to be added. 
Given: The user is on the Modify Database page. 
When: User enters an invalid Zip file and clicks Add Dataset.
Then: The UI remains on the Modify Database page and gets
an alert with an error saying what was the problem with the zip file.


## User Story 2
As a student, I want to see a list of courses offered by a deparment and their respective instructor(s), sorted by the average, so that I can better choose my courses.

#### Definitions of Done(s)
Scenario 1: Enters a valid ID and department.
Given: The user is on query page.
When: Enters a valid dataset ID and a valid department, and clicks query.
Then: The UI returns the list of courses of the given department with their instructor, sorted by average in a table with 4 columns.

Scenario 2: Enters an invalid ID.
Given: The user is on query page.
When: Enters an invalid dataset ID, and clicks query.
Then: The UI remains on the query page and returns an error message
saying "Dataset has not been added yet!".

Scenario 3: Enters an invalid department (ie. "math**atics").
Given: The user is on query page.
When: Enters an invalid department, and clicks query.
Then: The UI remains on the query page and returns an error message
saying "Asterisks can only be the first or last characters of a string!".

## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.  
Note: These will not be graded.

## User Story 3
As a student, I want to remove course data from the server, 
so that I can update my dataset on the UI.

Valid ID: A non-empty sequence of characters without underline that has not been used before.

Valid Zip file: A zip file containing one directory named courses
which has the course info in the json format.

#### Definitions of Done(s)
Scenario 1: Enter a valid ID to be removed. 
Given: The user is on the Modify Database page. 
When: User enters a valid ID and clicks remove.
Then: The UI shows the deleted ID under the Result with the tile "ID of the removed dataset:".

Scenario 2: Enter an invalid ID to be removed. 
Given: The user is on the Modify Database page. 
When: User enters an invalid ID and clicks Remove Dataset.
Then: The UI remains on the Modify Database page and gets
an alert with an error message saying "Invalid ID".

Scenario 3: Enter an ID that doesn't exist on the UI to be removed. 
Given: The user is on the Modify Database page. 
When: User enters an invalid ID and clicks Remove Dataset.
Then: The UI remains on the Modify Database page and gets
an alert with an error message saying "ID did not exist in the data directory!".
