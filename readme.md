# Jobly Backend

This is the Express backend for Jobly, version 2. Written in Node using the Express web framework and a PostgreSQL database.

To install:

    npm install

Create a database (with a small amount of starter data) and a test database:

    psql < jobly.sql

To run this:

    node server.js

To run the tests:

    jest -i
