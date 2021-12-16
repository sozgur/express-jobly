const { sqlForPartialUpdate } = require("./sql.js");
const { BadRequestError } = require("../expressError");

describe("Create setting column names and values", function () {
    test("with data", function () {
        let dataToUpdate = {
            firstName: "Sumeyra",
            lastName: "Ozgur",
            age: 25,
        };

        let jsToSql = {
            firstName: "first_name",
            lastName: "last_name",
        };
        let result = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(result.setCols).toEqual(
            '"first_name"=$1, "last_name"=$2, "age"=$3'
        );
        expect(result.values).toEqual(["Sumeyra", "Ozgur", 25]);
    });

    test("with empty dataToUpdate", function () {
        try {
            let result = sqlForPartialUpdate({}, {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});
