-- 1. Remove the default value from the stream columns so it doesn't default to 'engineering'
ALTER TABLE colleges ALTER COLUMN stream DROP DEFAULT;
ALTER TABLE branches ALTER COLUMN stream DROP DEFAULT;

-- 2. Backfill the correct stream for all colleges from the cutoffs table
UPDATE colleges 
SET stream = (
    SELECT stream 
    FROM cutoffs 
    WHERE cutoffs.college_code = colleges.college_code 
    LIMIT 1
);

-- 3. Backfill the correct stream for all branches from the cutoffs table
UPDATE branches 
SET stream = (
    SELECT stream 
    FROM cutoffs 
    WHERE cutoffs.course_name = branches.raw_name 
    LIMIT 1
);
