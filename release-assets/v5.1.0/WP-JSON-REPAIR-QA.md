# Hosted JSON adapter repair

QA API and worker deployed v2. Explicit postgres-js JSON parameters parse already serialized JSON before sql.json serialization. Objects are encoded once. Model and response contract unchanged.

Fresh session qa-v510-wp-hosted-r2; copied clean 56-game QA genesis with new session/run identity. Previous 616 malformed observations preserved, original cron remains stopped. Chairman grant added for fresh session.

Hosted worker requests 369219 and 369272: HTTP 200, 56 records each. SQL: 112 records, 56 games, all record values JSON objects; all 56 head states objects; all 3 receipt bodies/responses objects. All observations correctly BLOCKED/PREGAME_INPUTS_MISSING. Second invocation reads prior state successfully. No approved prior loaded or football advanced.

This repairs the demonstrated record/head/receipt serialization defect. Prior writes, positive browser JWT requests, source command wiring, continuous scheduler operation and sustained gameplay/load/recovery remain NOT TESTED. Not ready for live UI acceptance. No production/UI/football change.
