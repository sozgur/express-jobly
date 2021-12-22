"use strict";

const db = require("../db.js");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new job",
    salary: 20000,
    equity: "1.0",
    companyHandle: "c2",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      id: expect.any(Number),
      title: "new job",
      salary: 20000,
      equity: "1.0",
      companyHandle: "c2",
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${job.id}`
    );
    expect(result.rows[0]).toEqual(newJob);
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 10000,
        equity: "0.123",
        company: {
          handle: "c1",
          name: "C1",
        },
      },
      {
        id: expect.any(Number),
        title: "j2",
        salary: 30000,
        equity: null,
        company: {
          handle: "c3",
          name: "C3",
        },
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 20000,
        equity: "0",
        company: {
          handle: "c1",
          name: "C1",
        },
      },
    ]);
  });

  test("works: with all filters", async function () {
    let searchFilters = { title: "j", minSalary: 10000, hasEquity: true };
    let jobs = await Job.findAll(searchFilters);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 10000,
        equity: "0.123",
        company: {
          handle: "c1",
          name: "C1",
        },
      },
    ]);
  });

  test("works: with partial filters with title", async function () {
    let searchFilters = { title: "j2" };
    let jobs = await Job.findAll(searchFilters);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j2",
        salary: 30000,
        equity: null,
        company: {
          handle: "c3",
          name: "C3",
        },
      },
    ]);
  });

  test("works: with partial filters with equity", async function () {
    let searchFilters = { hasEquity: true };
    let jobs = await Job.findAll(searchFilters);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 10000,
        equity: "0.123",
        company: {
          handle: "c1",
          name: "C1",
        },
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const newJob = {
      title: "new job",
      salary: 20000,
      equity: "1.0",
      companyHandle: "c2",
    };
    let existJob = await Job.create(newJob);

    let job = await Job.get(existJob.id);

    expect(job).toEqual({
      id: expect.any(Number),
      title: "new job",
      salary: 20000,
      equity: "1.0",
      company: {
        handle: "c2",
        name: "C2",
      },
    });
  });

  test("not found if no such company", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "update job",
    salary: 100,
    equity: "0.1",
  };

  test("works", async function () {
    let job = await Job.update(testJobIds[0], updateData);
    expect(job).toEqual({
      id: expect.any(Number),
      companyHandle: "c1",
      ...updateData,
    });

    const result = await db.query(
      `SELECT j.id, j.title, j.salary, j.equity, c.handle AS "companyHandle"
          FROM jobs AS j
          JOIN companies AS c ON c.handle = j.company_handle
          WHERE  j.id = ${testJobIds[0]}`
    );

    expect(result.rows[0]).toEqual({
      id: expect.any(Number),
      companyHandle: "c1",
      ...updateData,
    });
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "update job",
      salary: null,
      equity: null,
    };

    let job = await Job.update(testJobIds[0], updateDataSetNulls);
    expect(job).toEqual({
      id: expect.any(Number),
      companyHandle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT j.id, j.title, j.salary, j.equity, c.handle AS "companyHandle"
          FROM jobs AS j
          JOIN companies AS c ON c.handle = j.company_handle
          WHERE  j.id = ${testJobIds[0]}`
    );

    expect(result.rows[0]).toEqual({
      id: expect.any(Number),
      title: "update job",
      salary: null,
      equity: null,
      companyHandle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(testJobIds[0], {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("bad request with wrong data", async function () {
    try {
      await Job.update(testJobIds[0], { company_handle: "c7" });
      fail();
    } catch (err) {
      expect(err instanceof ForbiddenError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(testJobIds[0]);
    const res = await db.query(
      `SELECT id FROM jobs WHERE id= ${testJobIds[0]}`
    );
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
