# Requirements

Paraphrased from the BizScout take-home brief (the original PDF is private and not committed). IDs are cited in commits, plans and tests.

## Core — backend

| ID  | Requirement                                            |
| --- | ------------------------------------------------------ |
| B1  | A service pings `httpbin.org/anything` every 5 minutes |
| B2  | Each request carries a randomly generated JSON payload |
| B3  | Response data is stored in a database of our choice    |
| B4  | New data is broadcast to connected web clients         |
| B5  | REST endpoints expose historical data                  |

## Core — frontend

| ID  | Requirement                                      |
| --- | ------------------------------------------------ |
| F1  | A simple dashboard (responsive design is a plus) |
| F2  | Response data displayed in a table               |
| F3  | Real-time updates when new data arrives          |

## Testing & CI

| ID  | Requirement                                                                                      |
| --- | ------------------------------------------------------------------------------------------------ |
| T1  | CI pipeline (GitHub Actions)                                                                     |
| T2  | Pipeline runs the test suite                                                                     |
| T3  | Pipeline runs lint checks                                                                        |
| T4  | Pipeline generates test-coverage reports                                                         |
| T5  | Core parts of the app are identified and documented                                              |
| T6  | ONE core component has comprehensive tests                                                       |
| T7  | Unit tests for business logic, integration tests for key endpoints, basic E2E for critical flows |

## Technical specifications

| ID  | Requirement                                       |
| --- | ------------------------------------------------- |
| S1  | Node.js backend with Express (or similar)         |
| S2  | Any SQL/NoSQL database, choice justified          |
| S3  | Proper error handling and logging (a "huge plus") |
| S4  | React (or Next.js) frontend                       |
| S5  | Proper state management                           |
| S6  | Loading and error states handled (a "huge plus")  |
| S7  | Basic component tests (a "huge plus")             |
| S8  | Deployed to a free platform                       |
| S9  | Environment-variable configuration                |
| S10 | Deployment process documented                     |

## AI enhancement — Option A (anomaly detection system)

| ID  | Requirement                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------- |
| A1  | Rolling statistics (mean, standard deviation) over time windows: 1 hour minimum, 24 hours recommended |
| A2  | Detect anomalies with statistical methods (z-score, thresholds or similar)                            |
| A3  | Simple time-series forecast of the next expected response time                                        |
| A4  | Trigger alerts when anomalies or prediction errors exceed thresholds                                  |
| A5  | Visualise real-time data                                                                              |
| A6  | Visualise rolling averages                                                                            |
| A7  | Visualise predicted values                                                                            |
| A8  | Visualise anomaly markers                                                                             |
| A9  | Visualise confidence bands                                                                            |
| A10 | Statistical correctness and practical threshold tuning                                                |
| A11 | Efficient real-time calculations that don't block the UI                                              |
| A12 | Clear visualisation of normal vs anomalous behaviour                                                  |
| A13 | Documentation of algorithm choices and trade-offs                                                     |

## Deliverables

| ID  | Requirement                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Source code in a Git repository                                                                                                                          |
| D2  | README: setup, architecture overview, technology choices + reasoning, assumptions, future improvements, testing strategy + core component identification |
| D3  | Database schema                                                                                                                                          |
| D4  | Deployment on a free platform                                                                                                                            |
| D5  | Instructions for running locally                                                                                                                         |
| D6  | Repository shared with the three BizScout reviewers (public, or private with access granted)                                                             |

## Evaluation criteria (what reviewers look at)

Proper execution of functional requirements · clarity and readability of code · thought process and decision-making.
