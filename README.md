# FTS-test

use kyle-reddit stack and dummy database to demo full text search

#### Misc

Dump database schema

```
pg_dump -U postgres -s dbname > outputfile.db
```

Export Database

```
pg_dump dbname > outputfile.sql
```

Import Database

```
psql dbname < importfile.sql
```
