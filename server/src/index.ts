import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import cors from "cors";
import "dotenv-safe/config"; //takes vars in .env and makes them environment variables
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import path from "path";
import { buildSchema } from "type-graphql";
import { createConnection, getManager } from "typeorm";
import { COOKIE_NAME, __prod__ } from "./constants";
import { Pokemons } from "./entities/Pokemons";
import { HelloResolver } from "./resolvers/hello";
import { PokemonsResolver } from "./resolvers/pokemons";

const main = async () => {
    //create db connection for typeorm
    const connection = await createConnection({
        type: "postgres",
        url: process.env.DATABASE_URL,
        logging: true,
        // synchronize: true, //create the tables automatically without running a migration (good for development)
        migrations: [path.join(__dirname, "./migrations/*")],
        entities: [Pokemons], //MAKE SURE TO ADD ANY NEW ENTITIES HERE
    });

    //run the migrations inside the migrations folder
    // await connection.runMigrations();

    // create an instance of express
    const app = express();

    //initialize the redis session (for saving browser cookies and stuff so user can stay logged in after refreshing the page)
    //this needs to come before apollo middle ware b/c we're going to be using this inside of apollo
    const RedisStore = connectRedis(session);
    const redis = new Redis(process.env.REDIS_URL);

    //tell express we have 1 proxy sitting in front so cookies and sessions work
    app.set("trust proxy", 1);

    //apply cors middleware to all routes (pages)
    app.use(
        cors({
            origin: [
                process.env.CORS_ORIGIN,
                "https://studio.apollographql.com",
            ],
            methods: ["GET", "POST"],
            credentials: true,
        })
    );

    //create the express session
    const sessionMiddleware = session({
        name: COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTTL: true,
            disableTouch: true, //disables lifecylce of cookies so they last forever
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //10 years
            httpOnly: true, //make sure cookie only available on serverside
            sameSite: "lax", //protect csrf
            secure: __prod__, //cookie only works in https
            domain: __prod__ ? ".kylegodly.com" : undefined, //need to add domain b/c sometimes server doesn't always forward cookie correctly
        },
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
        resave: false, //makes sure not continuing to ping redis
    });

    app.use(sessionMiddleware);

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PokemonsResolver],
            validate: false,
        }),

        //make the orm object available to all resolvers
        context: ({ req, res }) => ({
            req,
            res,
            redis,
        }),
    });

    //creates graphql endpoint for us on express
    await apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: false,
    });

    //start the server
    app.listen(parseInt(process.env.PORT), async () => {
        const existingTriggers = await getManager().query(
            "SELECT tgname AS trigger_name, tgrelid::regclass AS table_name FROM pg_trigger;"
        );

        if (existingTriggers.length == 0) {
            // create the index column with gin indices and trigger
            const tableName = "pokemons";
            await getManager().query(`
                alter table ${tableName} add column document_with_weights tsvector;
                update ${tableName} set document_with_weights = setweight(to_tsvector(name), 'A') || setweight(to_tsvector(description), 'B') || setweight(to_tsvector(type_1), 'C') || setweight(to_tsvector(type_2), 'D');
                CREATE INDEX document_with_weights_idx ON ${tableName} USING GIN (document_with_weights);

                CREATE FUNCTION card_tsvector_trigger() RETURNS trigger AS $$
                begin
                    new.document_with_weights := 
                    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
                    setweight(to_tsvector('english', coalesce(new.type_1, '')), 'C') ||
                    setweight(to_tsvector('english', coalesce(new.type_2, '')), 'D');
                    return new;
                end
                $$ LANGUAGE plpgsql;
                CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON ${tableName} FOR EACH ROW EXECUTE PROCEDURE card_tsvector_trigger();
            `);

            console.log("created the triggers ");
        }

        console.log("FTS-test server started on localhost:" + process.env.PORT);
    });
};

main().catch((err) => {
    console.error(err);
});
