# FTS-test

use kyle-reddit stack and dummy database to demo full text search. Pokedex db stolen from https://github.com/AshleyRayMaceli/pokedex/blob/master/pokedex.sql

## Features

-   whole word queries

## Work on

-   highlighting results https://www.postgresql.org/docs/current/textsearch-controls.html#TEXTSEARCH-HEADLINE
-   unaccent https://www.postgresql.org/docs/current/unaccent.html
-   trigrams for fuzzy search https://www.postgresql.org/docs/current/pgtrgm.html
-   figuring out what a dictionary does and how to use it https://www.postgresql.org/docs/current/textsearch-dictionaries.html

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
