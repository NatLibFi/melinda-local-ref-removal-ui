# UI for removing references to local libraries from Melinda [![Build Status](https://travis-ci.org/NatLibFi/melinda-poistot.svg?branch=master)](https://travis-ci.org/NatLibFi/melinda-poistot)

UI for removing references to local libraries from Melinda

## Building the application

Install all dependencies:
`npm install`

Run build task:
`npm run build`

This will build the application into `build` directory.


## Start the application in production

```
npm install --prod
cd build
node index.js

(Application can be configured using environment variables, like HTTP_PORT=4000 node index.js for alternate port)
```

## Configuration options

Each variable is mandatory unless it has a default value

| Variable name             | Default value                        | Description                                                          | Example                          |
|---------------------------|--------------------------------------|----------------------------------------------------------------------|----------------------------------|
| ALEPH_URL                 |                                      | url to aleph                                                         | http://my-aleph-system.tld       |
| ALEPH_INDEX_BASE          | fin01                                | aleph base for indices                                               |                                  |
| ALEPH_USER_LIBRARY        |                                      | aleph base for users                                                 | usr00                            |
| HTTP_PORT                 | 3001                                 |                                                                      |                                  |
| AMQP_HOST                 |                                      | hostname of amqp server                                              | localhost                        |
| AMQP_USERNAME             |                                      | username for the amqp server                                         | guest                            |
| AMQP_PASSWORD             |                                      | password of amqp server                                              | guest                            |
| MELINDA_API_VERSION       | null                                 |                                                                      |                                  |
| MIN_TASK_INTERVAL_SECONDS | 10                                   | Time to take per task, in seconds                                    |                                  |
| SMTP_CONNECTION_URL       |                                      | SMTP url for sending mail                                            | smtp://user:pass@smtp.server.tld |
| SMTP_FROM_EMAIL           | noreply@melinda.kansalliskirjasto.fi | Sender email address                                                 |                                  |
| SMTP_CC_ADDRESS           | ''                                   | Email CC address                                                     |                                  |
| SECRET_ENCRYPTION_KEY     | <random-generated-key>               | Key for encrypting/decrypting sessions                               |                                  |
| SUPERUSER_LOWTAGS         | ''                                   | comma separated list of LOWTAGS available for superusers             | ABC,DEF,GHI                      |
| CORS_WHITELIST            | ["http://localhost:3000"]            | json array of allowed hosts for CORS, put your frontend domain here. |                                  |
| MELINDA_LOAD_USER_FILE    | null                                 | file for melinda load users to be used when replicate option is true | ../conf/melinda-load-users.txt   |

Note on SECRET_ENCRYPTION_KEY:
All sessions will reset when the key changes. If the default value is used, then all sessions will reset every time the app restarts.

SECRET_ENCRYPTION_KEY can be generated with nodejs:
```
crypto.randomBytes(32).toString('base64')
```

## Start the application in development

`npm run dev`

This will start webpack-dev-server for frontend codebase and nodemon for the backend.

## License and copyright

Copyright (c) 2016-2019 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **GNU Affero General Public License Version 3** or any later version.
