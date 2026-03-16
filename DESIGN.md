# DESIGN.md — Meeting Room Booking Service

## Table of Contents
1. Tech Stack & Why
2. Project Structure
3. Data Model
4. How Overlaps Are Prevented
5. Error Handling Strategy
6. Idempotency Implementation
7. Concurrency Handling
8. Utilization Formula & Assumptions
9. Business Rules Summary
10. How to Run
11. How to Run Tests


## TECH STACK & WHY

For this project, the goal was to build a simple and reliable REST API for managing meeting room bookings. 
The stack was chosen to keep the service lightweight, easy to test, and easy to maintain.

Luxon
Handling time in JavaScript with the native Date API can be confusing. Luxon provides clearer APIs for
working with timezones, weekday checks, and time calculations such as differences between timestamps.

express-validator
Used for validating incoming requests in the routing layer. This helps keep controllers and services clean
because validation logic stays near the route definitions.

dotenv
Used to store environment variables such as database connection strings outside of the source code.

Jest + Supertest
Jest is used for running tests while Supertest allows HTTP endpoint testing. Together they provide a good
environment for writing both unit and integration tests.

mongodb-memory-server
During testing, an in-memory MongoDB instance is used so tests can run without connecting to a real
database. This ensures tests are isolated and do not affect production data.


## PROJECT STRUCTURE

The project uses a layered architecture where each folder has a clear responsibility.

src/
config/        Database connection configuration
controllers/   Handles HTTP request and response
services/      Business logic layer
models/        Mongoose schemas and indexes
routes/        API routes and request validation
middlewares/   Error handling and validation middleware
utils/         Utility functions such as business hours validation

tests/
unit/          Tests for pure business logic
integration/   Tests for full API behavior using in-memory MongoDB

This separation ensures each layer has one responsibility.

Routes define endpoints and validate requests.
Controllers receive requests and call services.
Services contain all business logic and database operations.
Models define database schema and constraints.

Keeping business logic inside the service layer makes the system easier to test and maintain.


# DATA MODEL

## Room Model

{
  "_id": "ObjectId",
  "name": "string",
  "capacity": "number",
  "floor": "number",
  "amenities": ["string"],
  "createdAt": "Date",
  "updatedAt": "Date"
}

Indexes

A unique index is created on the room name with case-insensitive comparison.
This ensures names like "Room A", "room a", and "ROOM A" are treated as the same.


## Booking Model

{
  "_id": "ObjectId",
  "roomId": "ObjectId",
  "title": "string",
  "organizerEmail": "string",
  "startTime": "Date",
  "endTime": "Date",
  "status": "confirmed | cancelled",
  "createdAt": "Date",
  "updatedAt": "Date"
}

Indexes

A compound index on {roomId, startTime, endTime} is used to quickly detect overlapping bookings.

An index on organizerEmail is also created to speed up queries when listing bookings for a specific user.


## IdempotencyKey Model

{
  "_id": "ObjectId",
  "key": "string",
  "organizerEmail": "string",
  "status": "processing | completed",
  "bookingId": "ObjectId",
  "responseBody": "Mixed",
  "createdAt": "Date",
  "updatedAt": "Date"
}

Indexes

A compound unique index is created on {key, organizerEmail}.
This ensures the same request cannot create duplicate bookings.


## HOW OVERLAPS ARE PREVENTED

Two bookings overlap if one booking starts before the other ends.

The following MongoDB query is used to detect overlap:

Booking.exists({
  roomId,
  status: 'confirmed',
  startTime: { $lt: endTime },
  endTime: { $gt: startTime }
})

Cancelled bookings are ignored because they should not block new bookings.

## Booking validation steps:

1. Check if the room exists
2. Ensure the start time is not in the past
3. Validate booking duration (15 minutes to 4 hours)
4. Ensure booking falls within business hours
5. Check for overlapping confirmed bookings
6. Create booking


## ERROR HANDLING STRATEGY

All errors follow the same response format.

{
  "error": "ErrorType",
  "message": "Human readable description"
}

## HTTP Status Codes

400  ValidationError   Invalid request input
404  NotFoundError     Room or booking not found
409  ConflictError     Overlapping booking or duplicate record
500  InternalServerError Unexpected errors

Services throw errors with statusCode and errorType.
A global error handler middleware formats the final response.


## IDEMPOTENCY IMPLEMENTATION

Idempotency ensures retrying the same request does not create duplicate bookings.

Keys are scoped by:

(key + organizerEmail)

Idempotency flow:

Client sends request with Idempotency-Key header.

1. Check if key already exists
2. If status is completed return stored response
3. If status is processing return 409 conflict
4. If no record exists insert processing record
5. Create booking
6. Update record to completed
7. Return booking response

All idempotency data is stored in MongoDB so it survives server restarts.


## CONCURRENCY HANDLING

If two requests with the same idempotency key arrive at the same time,
both may attempt to insert a record.

MongoDB's unique index ensures only one insert succeeds.

Request A -> Insert success -> booking created
Request B -> Duplicate key error -> returns 409

This approach avoids in-memory locks and works safely across multiple servers.


## UTILIZATION FORMULA

Room utilization measures how much of the available business time is used.

utilizationPercent = totalBookingHours / totalBusinessHours

totalBookingHours

Bookings that partially overlap the requested range are clamped.

Example logic:

clampedStart = max(booking.startTime, from)
clampedEnd   = min(booking.endTime, to)

Hours are calculated from the clamped range.

Business Hours

Business hours are Monday to Friday from 08:00 to 20:00.

Each day has 12 business hours.

## Example

Booking: 09:00 to 11:00
Business hours: 08:00 to 20:00

Booking hours = 2
Total business hours = 12

Utilization = 2 / 12 = 16.67%


## BUSINESS RULES SUMMARY

Room name must be unique and case insensitive.
Room capacity must be at least 1.
Bookings allowed only Monday to Friday.
Booking hours must be between 08:00 and 20:00.
Minimum booking duration is 15 minutes.
Maximum booking duration is 4 hours.
Bookings cannot start in the past.
Overlapping bookings are not allowed.
Cancellation must happen at least 1 hour before start time.
Cancelled bookings should not block new bookings.


## HOW TO RUN

Clone the repository

git clone https://github.com/RV-raghul/EverQuint-BackendTask.git
cd EverQuint-BackendTask

Install dependencies

npm install

Create .env file

PORT=3000
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development

Start the server

npm run dev

Health check endpoint

GET /health

Expected response

{ "status": "ok" }


## HOW TO RUN TESTS

Tests use an in-memory MongoDB instance so no external database is required.

Run tests with

npm test

Expected output

Test Suites: 2 passed
Tests: 20 passed
